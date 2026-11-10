function sanitizeFilename(title: string): string {
  const cleaned = title
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return cleaned || "note";
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
