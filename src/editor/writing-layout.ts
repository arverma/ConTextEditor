import type { editor } from "monaco-editor/esm/vs/editor/editor.api";

export type EditorView = Pick<editor.IStandaloneCodeEditor, "saveViewState" | "restoreViewState" | "layout">;

/** Keep the current editing/reading position while shell geometry changes. */
export function updateWritingLayout(editor: EditorView, change: () => void): void {
  const state = editor.saveViewState();
  const preview = document.getElementById("markdown-preview")!;
  const scrollTop = preview.scrollTop;
  change();
  editor.layout();
  if (state) editor.restoreViewState(state);
  preview.scrollTop = scrollTop;
}

export function initWritingLayout(editor: EditorView): void {
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
