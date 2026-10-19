export interface LayoutEditor {
  scrollTop(): number;
  setScrollTop(top: number): void;
}

/** Keep the current editing and reading position while shell geometry changes. */
export function updateWritingLayout(editor: LayoutEditor, change: () => void): void {
  const top = editor.scrollTop();
  const preview = document.getElementById("markdown-preview")!;
  const previewTop = preview.scrollTop;
  change();
  editor.setScrollTop(top);
  preview.scrollTop = previewTop;
}

export function initWritingLayout(editor: LayoutEditor): void {
  const main = document.getElementById("main")!;
  const button = document.getElementById("writing-width-btn")!;
  let fullWidth = false;
  try { fullWidth = localStorage.getItem("context-editor.fullWidth") === "true"; } catch {}
  function apply(): void {
    main.dataset.fullWidth = String(fullWidth);
    button.setAttribute("aria-pressed", String(fullWidth));
    button.title = fullWidth ? "Full width on — switch to centered writing" : "Full width";
  }
  apply();
  button.addEventListener("click", () => {
    updateWritingLayout(editor, () => { fullWidth = !fullWidth; apply(); });
    try { localStorage.setItem("context-editor.fullWidth", String(fullWidth)); } catch {}
  });
}
