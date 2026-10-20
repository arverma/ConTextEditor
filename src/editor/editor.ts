import { COMPACT_LAYOUT_QUERY } from "./responsive";
import { initMobileActions } from "./mobile-actions";
import { initOwnershipPanel } from "./ownership-panel";
import { initTrashPanel } from "./trash-panel";
import { getTrashEntries } from "./storage";
import { initFocusMode } from "./focus-mode";
import { initWritingLayout, updateWritingLayout } from "./writing-layout";
import { initCopyMarkdown } from "./copy-markdown";
import { initShortcuts, shortcutLabel } from "./shortcuts";
import { deriveTitle, onSnippetsChanged } from "./storage";
import { NoteSession } from "./note-session";
import { initRecovery } from "./recovery";
import { initSidebar } from "./sidebar";
import { initHistoryPanel } from "./history-panel";
import { exportPdf, exportTxt } from "./export";
import { createSourceEditor } from "./source-editor";
import { previewEditor, type PreviewCommand } from "./preview-editor";
import { selectionToolbar } from "./selection-toolbar";

const VIEW_MODE_KEY = "context-editor.viewMode";

type ViewMode = "edit" | "preview";

const container = document.getElementById("source-editor")!;
const previewEl = document.getElementById("markdown-preview")!;
const viewToggleEl = document.getElementById("view-toggle")!;
const mobileViewToggleEl = document.getElementById("mobile-view-toggle") as HTMLButtonElement;
const exportBtn = document.getElementById("export-btn") as HTMLButtonElement;
const mirror = document.getElementById("full-text-mirror")!;
const newSnippetBtn = document.getElementById("new-snippet-btn")!;
const noteTitleEl = document.getElementById("note-title")!;
const noteCountsEl = document.getElementById("note-counts")!;
const saveStatusEl = document.getElementById("save-status")!;
const themeToggleEl = document.getElementById("theme-toggle")!;

type ThemeMode = "system" | "light" | "dark";
const THEME_KEY = "context-editor.theme";
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

function getThemeMode(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

function applyTheme(mode: ThemeMode): void {
  if (mode === "system") {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem(THEME_KEY);
  } else {
    document.documentElement.dataset.theme = mode;
    localStorage.setItem(THEME_KEY, mode);
  }
  themeToggleEl.querySelectorAll<HTMLElement>(".theme-opt").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.themeValue === mode);
    btn.setAttribute("aria-pressed", String(btn.dataset.themeValue === mode));
  });
  if (viewMode === "preview") rich.repaint();
}

const initialMode = getThemeMode();
const compactEditor = window.matchMedia(COMPACT_LAYOUT_QUERY);
let loadingModel = false;
let viewMode: ViewMode = "edit";
let previewWriting = false;

const editor = createSourceEditor(container, {
  compact: compactEditor.matches,
  onChange() {
    syncMirror();
    if (!loadingModel && editor.getValue() !== session.content) session.edit(editor.getValue());
  },
});
const rich = previewEditor(previewEl, () => editor.getValue(), (raw) => {
  previewWriting = true;
  try { editor.replace(raw); } finally { previewWriting = false; }
});

compactEditor.addEventListener("change", () => {
  updateWritingLayout(editor, () => editor.setCompact(compactEditor.matches));
});
initWritingLayout(editor);

window.addEventListener("keydown", (event) => {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "r" || event.altKey || event.shiftKey) return;
  if (!editor.hasFocus() && !container.contains(document.activeElement)) return;
  event.preventDefault();
  editor.openReplace();
}, true);

prefersDark.addEventListener("change", () => {
  if (getThemeMode() === "system") applyTheme("system");
});

themeToggleEl.addEventListener("click", (event) => {
  const btn = (event.target as HTMLElement).closest<HTMLElement>(".theme-opt");
  if (!btn) return;
  applyTheme((btn.dataset.themeValue as ThemeMode) ?? "system");
});

function getStoredViewMode(): ViewMode {
  return localStorage.getItem(VIEW_MODE_KEY) === "preview" ? "preview" : "edit";
}

function updateExportButton(): void {
  const isPreview = viewMode === "preview";
  const label = compactEditor.matches ? "Share PDF" : isPreview ? "Export PDF" : "Export Raw";
  exportBtn.setAttribute("aria-label", label);
  document.getElementById("export-label")!.textContent = label;
  exportBtn.title = `${label} (${shortcutLabel("Mod+Shift+E")})`;
}

function flushPreview(): void {
  rich.flush();
}

function applyViewMode(mode: ViewMode, { persist = true } = {}): void {
  const leavingPreview = viewMode === "preview" && mode !== "preview";
  if (leavingPreview) rich.enable(false);
  viewMode = mode;
  if (persist) localStorage.setItem(VIEW_MODE_KEY, mode);

  const isPreview = mode === "preview";
  container.hidden = isPreview;
  previewEl.hidden = !isPreview;
  if (!isPreview) previewToolbar.hidden = true;

  viewToggleEl.querySelectorAll<HTMLElement>(".view-opt").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.viewValue === mode);
    btn.setAttribute("aria-pressed", String(btn.dataset.viewValue === mode));
  });
  const mobilePreview = mode === "preview";
  mobileViewToggleEl.setAttribute("aria-label", mobilePreview ? "Switch to Edit" : "Switch to Preview");
  mobileViewToggleEl.setAttribute("aria-pressed", String(mobilePreview));
  mobileViewToggleEl.querySelector(".mobile-view-toggle-label")!.textContent = mobilePreview ? "Preview" : "Edit";
  updateExportButton();

  if (isPreview) rich.enable(true);
  else editor.focus();
  floatingPreview.schedule();
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
  mirror.textContent = value;
  noteTitleEl.textContent = deriveTitle(value);
  updateNoteCounts(value);
}

const previewToolbar = document.querySelector<HTMLElement>(".preview-tools")!;
const linkField = previewToolbar.querySelector<HTMLInputElement>("#preview-link-url")!;
const previewCommandName: Record<string, string> = {
  bold: "bold", italic: "italic", strike: "strike", link: "link",
  bullet: "bulletList", ordered: "orderedList", quote: "blockquote", code: "code",
};
const floatingPreview = selectionToolbar(previewToolbar, () => {
  if (viewMode !== "preview") return null;
  const rect = rich.selectionRect();
  const focused = previewToolbar.contains(document.activeElement);
  if (!rect || (!rich.editor.isFocused && !focused)) return null;
  for (const button of previewToolbar.querySelectorAll<HTMLButtonElement>("[data-command]")) {
    button.setAttribute("aria-pressed", String(rich.active(previewCommandName[button.dataset.command ?? ""] ?? "")));
  }
  const href = rich.linkHref();
  if (document.activeElement !== linkField) linkField.value = href;
  linkField.hidden = !href && document.activeElement !== linkField;
  return {
    rect,
    bounds: previewEl.getBoundingClientRect(),
    key: `preview:${rect.left}:${rect.top}:${rect.right}:${rect.bottom}`,
    editor: rich.editor.view.dom,
  };
}, {
  isMobile: () => compactEditor.matches,
  mobileKeyboard: {
    isOpen: () => {
      const viewport = window.visualViewport;
      const viewportShrunk = !!viewport && window.innerHeight - viewport.height > 100;
      // iOS Chrome can keep the visual viewport height unchanged while the
      // keyboard covers the lower part of the page. A focused contenteditable
      // is the reliable fallback because focusing it invokes the keyboard.
      return viewportShrunk || rich.editor.isFocused;
    },
    anchor: () => {
      if (!rich.editor.isFocused) return null;
      const bounds = previewEl.getBoundingClientRect();
      return {
        rect: { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom },
        bounds,
        key: "preview:mobile-keyboard",
        editor: rich.editor.view.dom,
      };
    },
    bottomInset: () => {
      const userAgent = navigator.userAgent;
      const isIPhoneOrIPad = /iPhone|iPad|iPod/.test(userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      return isIPhoneOrIPad ? 104 : 0;
    },
  },
});
rich.editor.on("selectionUpdate", () => floatingPreview.schedule());
rich.editor.on("update", () => floatingPreview.schedule());
let previewTouch = false;
function applyPreview(target: EventTarget | null): void {
  const command = target instanceof Element ? target.closest<HTMLButtonElement>("[data-command]")?.dataset.command as PreviewCommand | undefined : undefined;
  if (command === "link") { linkField.hidden = false; linkField.focus(); floatingPreview.schedule(); return; }
  if (command) rich.command(command, linkField.value);
}
previewToolbar.addEventListener("pointerdown", (event) => {
  if (!(event.target instanceof Element) || !event.target.closest("button")) return;
  event.preventDefault();
  previewTouch = event.pointerType === "touch" || event.pointerType === "pen";
  if (previewTouch) applyPreview(event.target);
});
previewToolbar.addEventListener("click", (event) => {
  if (previewTouch && event.detail !== 0) return;
  applyPreview(event.target);
});
linkField.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  rich.command("link", linkField.value);
});

let mobileActions: ReturnType<typeof initMobileActions> | null = null;
let focusMode: ReturnType<typeof initFocusMode> | null = null;
const sidebar = initSidebar({ beforeOpen: () => focusMode?.exit() });
const history = initHistoryPanel({
  onSelect(id) {
    flushPreview();
    if (session.select(id)) {
      sidebar.closeMobile();
      if (sidebar.isMobile()) focusContent();
    }
  },
  onDelete: id => removeNote(id),
});
const recovery = initRecovery((deleted) => { flushPreview(); return session.restore(deleted); });
const session = new NoteSession(renderSession);
const errorEl = document.getElementById("save-error")!;
const trash = initTrashPanel({
  beforeOpen: () => { focusMode?.exit(); sidebar.closeMobile(true); },
  restore: (entry, asCopy) => { flushPreview(); return session.restore(entry, asCopy); },
  purge: id => session.purge(id),
  error: () => session.message,
});

function focusContent(): void {
  if (viewMode === "edit") editor.focus();
  else rich.focus();
}
function renderSession(): void {
  if (!previewWriting && editor.getValue() !== session.content) {
    loadingModel = true;
    try { editor.setValue(session.content); } finally { loadingModel = false; }
    if (viewMode === "preview") rich.load(session.content);
  }
  syncMirror();
  setSaveStatus(session.status);
  errorEl.hidden = session.status !== "error";
  document.getElementById("save-error-message")!.textContent = session.status === "error"
    ? `Could not save changes. Keep this tab open, export your draft, or retry. ${session.message}` : "";
  try { history.refresh(session.id); trash.refresh(); recovery.prune(new Set(getTrashEntries().map(entry => entry.id))); } catch { /* A corrupt store must not replace the visible draft. */ }
}
function removeNote(id: string): void {
  flushPreview();
  const deleted = session.remove(id);
  if (deleted) recovery.add(deleted);
}
document.getElementById("retry-save")!.addEventListener("click", () => { flushPreview(); session.flush(); });
onSnippetsChanged(() => session.reconcile());

viewToggleEl.addEventListener("click", (event) => {
  const btn = (event.target as HTMLElement).closest<HTMLElement>(".view-opt");
  if (!btn?.dataset.viewValue) return;
  const next = btn.dataset.viewValue === "preview" ? "preview" : "edit";
  applyViewMode(next);
});
mobileViewToggleEl.addEventListener("click", toggleViewMode);

exportBtn.addEventListener("click", () => {
  flushPreview();
  const content = editor.getValue();
  const title = deriveTitle(content);
  if (compactEditor.matches) {
    exportPdf(title);
    return;
  }
  if (viewMode === "edit") {
    exportTxt(content, title);
    return;
  }
  exportPdf(title);
});

newSnippetBtn.addEventListener("click", () => {
  flushPreview();
  if (!session.create()) return;
  history.clearSearch();
  sidebar.closeMobile();
  focusContent();
});

window.addEventListener("beforeunload", event => {
  flushPreview();
  if (!session.flush()) { event.preventDefault(); event.returnValue = ""; }
});

initOwnershipPanel(session, {
  beforeOpen: () => { focusMode?.exit(); sidebar.closeMobile(true); },
  imported: id => { flushPreview(); history.clearSearch(); session.select(id); },
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
applyTheme(initialMode);
session.start();
applyViewMode(getStoredViewMode(), { persist: false });
focusMode = initFocusMode(editor, sidebar, focusContent);
initCopyMarkdown(() => { flushPreview(); return editor.getValue(); }, () => {
  sidebar.closeMobile(true);
  document.querySelector<HTMLDialogElement>(".command-dialog:not(.copy-dialog)[open]")?.close();
});
initShortcuts({
  toggleView: toggleViewMode,
  save: () => { flushPreview(); session.flush(); },
  deleteNote: () => { if (session.id) removeNote(session.id); },
  searchNotes: () => { sidebar.setOpen(true); history.focusSearch(); },
  beforeOpen: () => { mobileActions?.close(false); sidebar.closeMobile(true); },
});

mobileActions = initMobileActions();
