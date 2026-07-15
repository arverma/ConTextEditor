import "./monaco-setup";
// Import the minimal core editor API rather than the "monaco-editor" barrel,
// which eagerly registers every bundled language and inflates the build.
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { type Snippet, getActiveSnippet, createSnippet, updateSnippetContent } from "./storage";
import { initHistoryPanel, refreshHistoryPanel } from "./history-panel";
import { initStatsPanel } from "./stats-panel";

const AUTOSAVE_DELAY_MS = 600;

const container = document.getElementById("monaco-container")!;
const mirror = document.getElementById("full-text-mirror")!;
const newSnippetBtn = document.getElementById("new-snippet-btn")!;
const noteTitleEl = document.getElementById("note-title")!;
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
  language: "plaintext",
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
});

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

initStatsPanel({
  getCurrentNoteContent: () => editor.getValue(),
  getThemeMode: () => getThemeMode(),
});

let currentSnippetId: string | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave: { id: string; content: string } | null = null;

function setSaveStatus(state: "saved" | "saving"): void {
  saveStatusEl.dataset.state = state;
  saveStatusEl.textContent = state === "saving" ? "Saving…" : "Saved";
}

function deriveTitle(content: string): string {
  const firstLine = content.split("\n", 1)[0]?.trim();
  return firstLine ? firstLine.slice(0, 60) : "Untitled";
}

function syncMirror(): void {
  const value = editor.getValue();
  mirror.textContent = value;
  noteTitleEl.textContent = deriveTitle(value);
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
}

async function init(): Promise<void> {
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
  editor.focus();
}

newSnippetBtn.addEventListener("click", async () => {
  flushPendingSave();
  const snippet = await createSnippet();
  loadSnippet(snippet);
  await refreshHistoryPanel(snippet.id);
  editor.focus();
});

window.addEventListener("beforeunload", flushPendingSave);

void init();
