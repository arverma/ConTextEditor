import "./monaco-setup";
// Import the minimal core editor API rather than the "monaco-editor" barrel,
// which eagerly registers every bundled language and inflates the build.
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { type Snippet, getActiveSnippet, createSnippet, updateSnippetContent } from "./storage";
import { initHistoryPanel, refreshHistoryPanel } from "./history-panel";
import { setPreviewContent } from "./markdown-preview";
import { exportPdf, exportTxt } from "./export";

const AUTOSAVE_DELAY_MS = 600;
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
  });
}

const initialMode = getThemeMode();

const editor = monaco.editor.create(container, {
  value: "",
  language: "markdown",
  theme: effectiveScheme(initialMode) === "dark" ? "ce-dark" : "ce-light",
  automaticLayout: true,
  minimap: { enabled: false },
  fontSize: 14,
  lineHeight: 22,
  fontFamily: cssVar("--font-mono") || undefined,
  wordWrap: "on",
  padding: { top: 16, bottom: 16 },
  scrollBeyondLastLine: false,
  renderLineHighlight: "none",
  smoothScrolling: true,
  find: {
    seedSearchStringFromSelection: "always",
  },
});

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
// handled by Chrome before the editor action in some cases).
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

let currentSnippetId: string | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave: { id: string; content: string } | null = null;
let viewMode: ViewMode = "edit";

function getStoredViewMode(): ViewMode {
  return localStorage.getItem(VIEW_MODE_KEY) === "preview" ? "preview" : "edit";
}

function updateExportButton(): void {
  const isPreview = viewMode === "preview";
  exportBtn.textContent = isPreview ? "Export PDF" : "Export TXT";
  exportBtn.setAttribute(
    "aria-label",
    isPreview ? "Export note as PDF" : "Export note as text file"
  );
}

function applyViewMode(mode: ViewMode, { persist = true } = {}): void {
  viewMode = mode;
  if (persist) localStorage.setItem(VIEW_MODE_KEY, mode);

  const isPreview = mode === "preview";
  container.hidden = isPreview;
  previewEl.hidden = !isPreview;

  viewToggleEl.querySelectorAll<HTMLElement>(".view-opt").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.viewValue === mode);
  });
  updateExportButton();

  if (isPreview) {
    void setPreviewContent(previewEl, editor.getValue());
  } else {
    editor.layout();
    editor.focus();
  }
}

function setSaveStatus(state: "saved" | "saving"): void {
  saveStatusEl.dataset.state = state;
  saveStatusEl.textContent = state === "saving" ? "Saving…" : "Saved";
}

function deriveTitle(content: string): string {
  const firstLine = content.split("\n", 1)[0]?.trim();
  // Strip a leading ATX heading marker so titles look clean for Markdown notes.
  const cleaned = firstLine?.replace(/^#{1,6}\s+/, "") ?? "";
  return cleaned ? cleaned.slice(0, 60) : "Untitled";
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

function flushPendingSave(): void {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (pendingSave) {
    const { id, content } = pendingSave;
    pendingSave = null;
    void updateSnippetContent(id, content).then(() => {
      setSaveStatus("saved");
      return refreshHistoryPanel(id);
    });
  }
}

function scheduleSave(id: string, content: string): void {
  pendingSave = { id, content };
  setSaveStatus("saving");
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushPendingSave, AUTOSAVE_DELAY_MS);
}

editor.onDidChangeModelContent(() => {
  syncMirror();
  if (currentSnippetId) {
    scheduleSave(currentSnippetId, editor.getValue());
  }
});

function loadSnippet(snippet: Snippet): void {
  currentSnippetId = snippet.id;
  editor.setValue(snippet.content);
  syncMirror();
  setSaveStatus("saved");
  if (viewMode === "preview") {
    void setPreviewContent(previewEl, snippet.content);
  }
}

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

async function init(): Promise<void> {
  applyViewMode(getStoredViewMode(), { persist: false });

  let active = await getActiveSnippet();
  if (!active) {
    active = await createSnippet();
  }
  loadSnippet(active);

  initHistoryPanel({
    onSelect: (snippet) => {
      flushPendingSave();
      loadSnippet(snippet);
    },
    onActiveDeleted: (fallback) => {
      flushPendingSave();
      if (fallback) {
        loadSnippet(fallback);
      } else {
        currentSnippetId = null;
        editor.setValue("");
        syncMirror();
      }
    },
  });

  await refreshHistoryPanel(active.id);
  if (viewMode === "edit") editor.focus();
}

newSnippetBtn.addEventListener("click", async () => {
  flushPendingSave();
  const snippet = await createSnippet();
  loadSnippet(snippet);
  await refreshHistoryPanel(snippet.id);
  if (viewMode === "edit") editor.focus();
});

window.addEventListener("beforeunload", flushPendingSave);

void init();
