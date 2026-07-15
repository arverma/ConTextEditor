import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({
  gfm: true,
  breaks: false,
});

export function renderMarkdown(source: string): string {
  const raw = marked.parse(source || "", { async: false }) as string;
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
  });
}

export function setPreviewContent(el: HTMLElement, source: string): void {
  const html = renderMarkdown(source);
  el.innerHTML = html || `<p class="markdown-preview-empty">Nothing to preview yet.</p>`;
}
