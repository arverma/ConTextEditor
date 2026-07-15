import { marked } from "marked";
import DOMPurify from "dompurify";
import type { Tokens } from "marked";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function effectivePreviewTheme(): "dark" | "default" {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "dark") return "dark";
  if (explicit === "light") return "default";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "default";
}

marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    code({ text, lang, escaped }: Tokens.Code) {
      const language = (lang ?? "").trim().split(/\s+/)[0]?.toLowerCase();
      if (language === "mermaid") {
        const body = escaped ? text : escapeHtml(text);
        return `<pre class="mermaid">${body}</pre>\n`;
      }
      // Fall through to marked's default fenced-code renderer.
      return false;
    },
  },
});

let mermaidReady: Promise<typeof import("mermaid").default> | null = null;
let previewGeneration = 0;

async function getMermaid(): Promise<typeof import("mermaid").default> {
  if (!mermaidReady) {
    mermaidReady = import("mermaid").then((mod) => mod.default);
  }
  return mermaidReady;
}

async function renderMermaidBlocks(el: HTMLElement): Promise<void> {
  const nodes = [...el.querySelectorAll<HTMLElement>("pre.mermaid")];
  if (nodes.length === 0) return;

  const mermaid = await getMermaid();
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: effectivePreviewTheme(),
  });

  try {
    await mermaid.run({ nodes });
  } catch {
    // Invalid diagrams shouldn't blank the whole preview — leave source or mark failures.
    for (const node of nodes) {
      if (node.querySelector("svg")) continue;
      node.classList.add("mermaid-error");
      if (!node.dataset.errorNote) {
        node.dataset.errorNote = "1";
        const note = document.createElement("p");
        note.className = "markdown-preview-empty";
        note.textContent = "Couldn't render this diagram.";
        node.insertAdjacentElement("afterend", note);
      }
    }
  }
}

export function renderMarkdown(source: string): string {
  const raw = marked.parse(source || "", { async: false }) as string;
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["class"],
  });
}

export async function setPreviewContent(el: HTMLElement, source: string): Promise<void> {
  const gen = ++previewGeneration;
  const html = renderMarkdown(source);
  el.innerHTML = html || `<p class="markdown-preview-empty">Nothing to preview yet.</p>`;
  if (gen !== previewGeneration) return;
  await renderMermaidBlocks(el);
}
