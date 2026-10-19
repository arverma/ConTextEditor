function effectivePreviewTheme(): "dark" | "default" {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "dark") return "dark";
  if (explicit === "light") return "default";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "default";
}

let mermaidReady: Promise<typeof import("mermaid").default> | null = null;

async function getMermaid(): Promise<typeof import("mermaid").default> {
  if (!mermaidReady) {
    mermaidReady = import("mermaid").then((mod) => mod.default);
  }
  return mermaidReady;
}

export async function renderMermaidBlocks(el: HTMLElement): Promise<void> {
  const nodes = [...el.querySelectorAll<HTMLElement>("pre.mermaid")];
  if (nodes.length === 0) return;

  const sources = new Map(nodes.map(node => [node, node.textContent ?? ""]));
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
      const rendered = node.querySelector("svg");
      if (rendered && !rendered.querySelector(".error-icon, .error-text")) continue;
      node.textContent = sources.get(node) ?? "";
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
