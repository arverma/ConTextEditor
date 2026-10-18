import { COMPACT_LAYOUT_QUERY } from "./responsive";
import { initMobileActions } from "./mobile-actions";
import { initOwnershipPanel } from "./ownership-panel";
import { initTrashPanel } from "./trash-panel";
import { getTrashEntries } from "./storage";
import "./monaco-setup";
import { initFocusMode } from "./focus-mode";
import { initWritingLayout, updateWritingLayout } from "./writing-layout";
import { initCopyMarkdown } from "./copy-markdown";
import { initShortcuts, shortcutLabel } from "./shortcuts";
// Import the minimal core editor API rather than the "monaco-editor" barrel,
// which eagerly registers every bundled language and inflates the build.
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { deriveTitle, onSnippetsChanged } from "./storage";
import { NoteSession } from "./note-session";
import { initRecovery } from "./recovery";
import { initSidebar } from "./sidebar";
import { initHistoryPanel } from "./history-panel";
import { setPreviewContent } from "./markdown-preview";
import { exportPdf, exportTxt } from "./export";
import { registerEmojiCompletions } from "./emoji-completions";

const VIEW_MODE_KEY = "context-editor.viewMode";

type ViewMode = "edit" | "preview";

const container = document.getElementById("monaco-container")!;
const previewEl = document.getElementById("markdown-preview")!;
const viewToggleEl = document.getElementById("view-toggle")!;
const exportBtn = document.getElementById("export-btn") as HTMLButtonElement;
const mirror = document.getElementById("full-text-mirror")!;
const newSnippetBtn = document.getElementById("new-snippet-btn")!;
const noteTitleEl = document.getElementById("note-title")!;
const noteCountsEl = document.getElementById("note-counts")!;
const saveStatusEl = document.getElementById("save-status")!;
const themeToggleEl = document.getElementById("theme-toggle")!;
const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Custom Monaco themes whose backgrounds match the CSS --editor-bg values so the
// editor surface blends into the app shell. Hardcoded (not read from the live CSS
// var) so each theme is correct regardless of which scheme is active at load.
monaco.editor.defineTheme("ce-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: { "editor.background": "#131318" },
});
monaco.editor.defineTheme("ce-light", {
  base: "vs",
  inherit: true,
  rules: [],
  colors: { "editor.background": "#ffffff" },
});

// ---- theme selection (System / Light / Dark), persisted in localStorage ----
type ThemeMode = "system" | "light" | "dark";
const THEME_KEY = "context-editor.theme";
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

function getThemeMode(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

function effectiveScheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") return prefersDark.matches ? "dark" : "light";
  return mode;
}

function applyTheme(mode: ThemeMode): void {
  if (mode === "system") {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem(THEME_KEY);
  } else {
    document.documentElement.dataset.theme = mode;
    localStorage.setItem(THEME_KEY, mode);
  }
  monaco.editor.setTheme(effectiveScheme(mode) === "dark" ? "ce-dark" : "ce-light");
  themeToggleEl.querySelectorAll<HTMLElement>(".theme-opt").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.themeValue === mode);
    btn.setAttribute("aria-pressed", String(btn.dataset.themeValue === mode));
  });
  if (!previewEl.hidden) void setPreviewContent(previewEl, editor.getValue());
}

const initialMode = getThemeMode();

const compactEditor = window.matchMedia(COMPACT_LAYOUT_QUERY);
const editor = monaco.editor.create(container, {
  value: "",
  language: "markdown",
  theme: effectiveScheme(initialMode) === "dark" ? "ce-dark" : "ce-light",
  automaticLayout: true,
  minimap: { enabled: false },
  fontSize: compactEditor.matches ? 16 : 14,
  lineHeight: compactEditor.matches ? 24 : 22,
  fontFamily: cssVar("--font-mono") || undefined,
  wordWrap: "on",
  padding: { top: 16, bottom: 16 },
  scrollBeyondLastLine: false,
  renderLineHighlight: "none",
  smoothScrolling: true,
  find: {
    seedSearchStringFromSelection: "always",
  },
  suggest: {
    showIcons: false,
  },
});

compactEditor.addEventListener("change", () => {
  updateWritingLayout(editor, () => editor.updateOptions({
    fontSize: compactEditor.matches ? 16 : 14,
    lineHeight: compactEditor.matches ? 24 : 22,
  }));
});
registerEmojiCompletions();
initWritingLayout(editor);

// Cmd/Ctrl+F comes from findController. Map Cmd/Ctrl+R to Replace and stop the
// browser from reloading the tab while the editor is focused.
editor.addAction({
  id: "context-editor.startFindReplace",
  label: "Replace",
  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR],
  precondition: "editorFocus",
  run: (ed) => {
    void ed.getAction("editor.action.startFindReplaceAction")?.run();
  },
});

// Capture Cmd/Ctrl+R at the window when Monaco has focus (reload is otherwise
// handled by the browser before the editor action in some cases).
window.addEventListener(
  "keydown",
  (e) => {
    if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "r" || e.altKey || e.shiftKey) {
      return;
    }
    if (!editor.hasTextFocus() && !container.contains(document.activeElement)) {
      return;
    }
    e.preventDefault();
    void editor.getAction("editor.action.startFindReplaceAction")?.run();
  },
  true
);

// Re-apply Monaco's theme on OS change only while in System mode.
prefersDark.addEventListener("change", () => {
  if (getThemeMode() === "system") applyTheme("system");
});

themeToggleEl.addEventListener("click", (event) => {
  const btn = (event.target as HTMLElement).closest<HTMLElement>(".theme-opt");
  if (!btn) return;
  applyTheme((btn.dataset.themeValue as ThemeMode) ?? "system");
});

applyTheme(initialMode);

let loadingModel = false;
let viewMode: ViewMode = "edit";

function getStoredViewMode(): ViewMode {
  return localStorage.getItem(VIEW_MODE_KEY) === "preview" ? "preview" : "edit";
}

function updateExportButton(): void {
  const isPreview = viewMode === "preview";
  const label = isPreview ? "Export PDF" : "Export Raw";
  exportBtn.setAttribute("aria-label", label);
  document.getElementById("export-label")!.textContent = label;
  exportBtn.title = `${label} (${shortcutLabel("Mod+Shift+E")})`;
}

function applyViewMode(mode: ViewMode, { persist = true } = {}): void {
  viewMode = mode;
  if (persist) localStorage.setItem(VIEW_MODE_KEY, mode);

  const isPreview = mode === "preview";
  container.hidden = isPreview;
  previewEl.hidden = !isPreview;

  viewToggleEl.querySelectorAll<HTMLElement>(".view-opt").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.viewValue === mode);
    btn.setAttribute("aria-pressed", String(btn.dataset.viewValue === mode));
  });
  updateExportButton();

  if (isPreview) {
    void setPreviewContent(previewEl, editor.getValue());
  } else {
    editor.layout();
    editor.focus();
  }
}

function toggleViewMode(): void {
  applyViewMode(viewMode === "edit" ? "preview" : "edit");
}

function setSaveStatus(state: "saved" | "saving" | "error"): void {
  saveStatusEl.dataset.state = state;
  saveStatusEl.textContent = state === "error" ? "Not saved" : state === "saving" ? "Saving…" : "Saved";
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function updateNoteCounts(value: string): void {
  const words = countWords(value);
  const chars = value.length;
  noteCountsEl.textContent = `${words.toLocaleString()} words · ${chars.toLocaleString()} chars`;
}

function syncMirror(): void {
  const value = editor.getValue();
  // Always raw Markdown — Gemini reads this, not the rendered preview.
  mirror.textContent = value;
  noteTitleEl.textContent = deriveTitle(value);
  updateNoteCounts(value);
  if (viewMode === "preview") {
    void setPreviewContent(previewEl, value);
  }
}

let mobileActions: ReturnType<typeof initMobileActions> | null = null;
let focusMode: ReturnType<typeof initFocusMode> | null = null;
const sidebar = initSidebar({ beforeOpen: () => focusMode?.exit() });
const history = initHistoryPanel({
  onSelect(id) {
    if (session.select(id)) {
      sidebar.closeMobile();
      if (sidebar.isMobile()) focusContent();
    }
  },
  onDelete: id => removeNote(id),
});
const recovery = initRecovery(deleted => session.restore(deleted));
const session = new NoteSession(renderSession);
const errorEl = document.getElementById("save-error")!;
const trash = initTrashPanel({
  beforeOpen: () => { focusMode?.exit(); sidebar.closeMobile(true); },
  restore: (entry, asCopy) => session.restore(entry, asCopy),
  purge: id => session.purge(id),
  error: () => session.message,
});

function focusContent(): void {
  if (viewMode === "edit") editor.focus();
  else previewEl.focus();
}
function renderSession(): void {
  if (editor.getValue() !== session.content) {
    loadingModel = true;
    try { editor.setValue(session.content); } finally { loadingModel = false; }
  }
  syncMirror();
  setSaveStatus(session.status);
  errorEl.hidden = session.status !== "error";
  document.getElementById("save-error-message")!.textContent = session.status === "error"
    ? `Could not save changes. Keep this tab open, export your draft, or retry. ${session.message}` : "";
  try { history.refresh(session.id); trash.refresh(); recovery.prune(new Set(getTrashEntries().map(entry => entry.id))); } catch { /* A corrupt store must not replace the visible draft. */ }
}
function removeNote(id: string): void {
  const deleted = session.remove(id);
  if (deleted) recovery.add(deleted);
}
editor.onDidChangeModelContent(() => {
  if (!loadingModel) session.edit(editor.getValue());
});
document.getElementById("retry-save")!.addEventListener("click", () => session.flush());
onSnippetsChanged(() => session.reconcile());

viewToggleEl.addEventListener("click", (event) => {
  const btn = (event.target as HTMLElement).closest<HTMLElement>(".view-opt");
  if (!btn?.dataset.viewValue) return;
  const next = btn.dataset.viewValue === "preview" ? "preview" : "edit";
  applyViewMode(next);
});

exportBtn.addEventListener("click", () => {
  const content = editor.getValue();
  const title = deriveTitle(content);
  if (viewMode === "edit") {
    exportTxt(content, title);
    return;
  }
  void setPreviewContent(previewEl, content).then(() => exportPdf(title));
});

newSnippetBtn.addEventListener("click", () => {
  if (!session.create()) return;
  history.clearSearch();
  sidebar.closeMobile();
  focusContent();
});

window.addEventListener("beforeunload", event => {
  if (!session.flush()) { event.preventDefault(); event.returnValue = ""; }
});

initOwnershipPanel(session, {
  beforeOpen: () => { focusMode?.exit(); sidebar.closeMobile(true); },
  imported: id => { history.clearSearch(); session.select(id); },
  applySettings: settings => {
    for (const [key, value] of Object.entries(settings)) localStorage.setItem(key, value);
    const theme = settings[THEME_KEY]; if (theme) applyTheme(theme as ThemeMode);
    const view = settings[VIEW_MODE_KEY]; if (view) applyViewMode(view as ViewMode);
    const width = settings["context-editor.fullWidth"];
    if (width !== undefined && document.getElementById("writing-width-btn")!.getAttribute("aria-pressed") !== width) document.getElementById("writing-width-btn")!.click();
    const sidebarOpen = settings["context-editor.sidebarOpen"];
    if (sidebarOpen !== undefined) sidebar.setPreference(sidebarOpen === "true");
  },
});
session.start();
applyViewMode(getStoredViewMode(), { persist: false });
const focusContext = editor.createContextKey<boolean>("contextEditorFocusMode", false);
focusMode = initFocusMode(editor, sidebar, focusContent, active => focusContext.set(active));
// Monaco consumes Escape internally, so register the exit in its keybinding
// service too. Selection and transient editor tools retain their first Escape.
editor.addAction({
  id: "context-editor.exitFocusMode",
  label: "Exit focus mode",
  keybindings: [monaco.KeyCode.Escape],
  precondition: "contextEditorFocusMode && editorTextFocus && !findWidgetVisible && !suggestWidgetVisible && !inSnippetMode && !editorHasSelection && !editorHasMultipleSelections",
  run: () => focusMode?.exit(),
});
initCopyMarkdown(() => editor.getValue(), () => {
  sidebar.closeMobile(true);
  document.querySelector<HTMLDialogElement>(".command-dialog:not(.copy-dialog)[open]")?.close();
});
initShortcuts({
  toggleView: toggleViewMode,
  save: () => { session.flush(); },
  deleteNote: () => { if (session.id) removeNote(session.id); },
  searchNotes: () => { sidebar.setOpen(true); history.focusSearch(); },
  beforeOpen: () => { mobileActions?.close(false); sidebar.closeMobile(true); },
});

mobileActions = initMobileActions();
