export function sanitizeFilename(title: string): string {
  const cleaned = title
    .replace(/^#{1,6}\s+/, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return cleaned || "note";
}

export function exportTxt(content: string, title: string): void {
  const name = sanitizeFilename(title);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.txt`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportPdf(title: string): void {
  const prevTitle = document.title;
  document.title = sanitizeFilename(title);
  const restore = () => {
    document.title = prevTitle;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
  // Fallback if afterprint never fires in some environments.
  window.setTimeout(restore, 2000);
}
