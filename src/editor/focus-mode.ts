import { type LayoutEditor, updateWritingLayout } from "./writing-layout";

export function initFocusMode(
  editor: LayoutEditor,
  sidebar: { setSuppressed: (suppressed: boolean) => void },
  focusContent: () => void,
  stateChanged: (active: boolean) => void = () => {},
) {
  const app = document.getElementById("app")!;
  const button = document.getElementById("focus-mode-btn")!;
  const exitButton = document.getElementById("focus-exit")!;
  let active = false;
  const blockedEscapes = new WeakSet<KeyboardEvent>();
  function paint(): void {
    app.dataset.focusMode = String(active);
    button.setAttribute("aria-pressed", String(active));
    exitButton.hidden = !active;
    stateChanged(active);
  }
  function setActive(value: boolean): void {
    if (value === active) return;
    updateWritingLayout(editor, () => {
      active = value;
      sidebar.setSuppressed(active);
      paint();
    });
    focusContent();
  }
  const toggle = () => setActive(!active);
  const exit = () => setActive(false);
  function captureEscape(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    // Capture before the editor removes an overlay; bubbling Escape must not
    // also leave focus mode on the same keypress that closed Find or Suggest.
    if (document.querySelector("dialog[open], #source-editor:not([hidden]) .cm-search, .cm-tooltip-autocomplete")) {
      blockedEscapes.add(event);
    }
  }
  function handleEscape(event: KeyboardEvent): void {
    if (!active || event.key !== "Escape" || event.isComposing || event.defaultPrevented || blockedEscapes.has(event)) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    exit();
  }
  paint();
  button.addEventListener("click", toggle);
  exitButton.addEventListener("click", exit);
  window.addEventListener("keydown", captureEscape, true);
  window.addEventListener("keydown", handleEscape);
  return {
    exit,
    isActive: () => active,
    dispose() {
      button.removeEventListener("click", toggle);
      exitButton.removeEventListener("click", exit);
      window.removeEventListener("keydown", captureEscape, true);
      window.removeEventListener("keydown", handleEscape);
    },
  };
}
