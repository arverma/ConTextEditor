import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
const shell = readFileSync("../src/editor/index.html", "utf8");
import { createSnippet, getSnippets, deleteSnippet } from "../src/editor/storage";

const model = vi.hoisted(() => ({ value: "", listeners: [] as Array<() => void> }));
vi.mock("../src/editor/monaco-setup", () => ({}));
vi.mock("../src/editor/emoji-completions", () => ({ registerEmojiCompletions: vi.fn() }));
vi.mock("../src/editor/markdown-preview", () => ({ setPreviewContent: vi.fn(async () => {}) }));
vi.mock("../src/editor/export", () => ({ exportTxt: vi.fn(), exportPdf: vi.fn() }));
vi.mock("monaco-editor/esm/vs/editor/editor.api", () => ({
  KeyMod: { CtrlCmd: 1 }, KeyCode: { KeyR: 1, Escape: 9 },
  editor: {
    defineTheme: vi.fn(), setTheme: vi.fn(),
    create: () => ({
      getValue: () => model.value,
      setValue: (value: string) => { model.value = value; model.listeners.forEach(fn => fn()); },
      onDidChangeModelContent: (fn: () => void) => model.listeners.push(fn),
      createContextKey: () => ({ set: vi.fn() }), saveViewState: () => null, restoreViewState: vi.fn(), addAction: vi.fn(), layout: vi.fn(), focus: vi.fn(), hasTextFocus: () => true,
    }),
  },
}));
let listeners: Array<[string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined]>;
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); localStorage.clear();
  document.documentElement.innerHTML = shell.replace(/^[\s\S]*?<html[^>]*>|<\/html>[\s\S]*$/g, "");
  model.value = ""; model.listeners = []; listeners = [];
  const add = window.addEventListener.bind(window);
  vi.spyOn(window, "addEventListener").mockImplementation((type, fn, options) => { listeners.push([type, fn, options]); add(type, fn, options); });
  vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn() }));
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };
});
afterEach(() => {
  for (const [type, fn, options] of listeners) window.removeEventListener(type, fn, options);
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
function edit(value: string) { model.value = value; model.listeners.forEach(fn => fn()); }
function key(type: string, key: string, code: string, options: KeyboardEventInit = {}) {
  window.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true, ...options }));
}
it("saves typing after deleting the final note through the actual UI", async () => {
  await import("../src/editor/editor");
  document.querySelector<HTMLButtonElement>(".snippet-delete-btn")!.click();
  edit("New draft"); edit("New draft with changes"); vi.advanceTimersByTime(600);
  expect(getSnippets()).toHaveLength(1); expect(getSnippets()[0].content).toBe("New draft with changes");
  expect(document.getElementById("full-text-mirror")!.textContent).toBe("New draft with changes");
});
it("loads without resaving and restores latest pending text through Undo", async () => {
  const original = createSnippet("Original"); vi.advanceTimersByTime(1000);
  await import("../src/editor/editor"); vi.advanceTimersByTime(1000);
  expect(getSnippets()[0].updatedAt).toBe(original.updatedAt);
  edit("Latest pending edit"); document.querySelector<HTMLButtonElement>(".snippet-delete-btn")!.click();
  document.getElementById("undo-btn")!.click();
  expect(getSnippets()[0].id).toBe(original.id); expect(model.value).toBe("Latest pending edit");
});
it("preserves a dirty draft on write failure and retries without duplicating it", async () => {
  await import("../src/editor/editor"); edit("Keep me");
  const fail = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("quota"); });
  vi.advanceTimersByTime(600);
  expect(document.getElementById("save-error")!.hidden).toBe(false); expect(model.value).toBe("Keep me");
  document.getElementById("new-snippet-btn")!.click(); expect(getSnippets()).toHaveLength(1);
  fail.mockRestore(); document.getElementById("retry-save")!.click();
  expect(getSnippets()[0].content).toBe("Keep me"); expect(document.getElementById("save-error")!.hidden).toBe(true);
});
it("retains local edits when another tab deletes the active note", async () => {
  await import("../src/editor/editor"); const id = getSnippets()[0].id; edit("Recovered local text");
  deleteSnippet(id); window.dispatchEvent(new StorageEvent("storage", { key: "context-editor.snippets" }));
  expect(getSnippets()[0].id).not.toBe(id); expect(getSnippets()[0].content).toBe("Recovered local text");
});
it("exposes pressed states and only toggles for the modifier-only gesture", async () => {
  await import("../src/editor/editor");
  const pressed = () => document.querySelector('[data-view-value="preview"]')!.getAttribute("aria-pressed");
  expect(pressed()).toBe("false");
  key("keydown", "Meta", "MetaLeft", { metaKey: true });
  key("keydown", "Alt", "AltLeft", { metaKey: true, altKey: true });
  key("keyup", "Alt", "AltLeft", { metaKey: true }); key("keyup", "Meta", "MetaLeft");
  expect(pressed()).toBe("true");
  key("keydown", "Meta", "MetaLeft", { metaKey: true });
  key("keydown", "Alt", "AltLeft", { metaKey: true, altKey: true });
  key("keydown", "x", "KeyX", { metaKey: true, altKey: true });
  key("keyup", "x", "KeyX", { metaKey: true, altKey: true });
  key("keyup", "Alt", "AltLeft", { metaKey: true }); key("keyup", "Meta", "MetaLeft");
  expect(pressed()).toBe("true");
  document.querySelector<HTMLButtonElement>('[data-theme-value="light"]')!.click();
  expect(document.querySelector('[data-theme-value="light"]')!.getAttribute("aria-pressed")).toBe("true");
});

it("changes width without rewriting the note and copies pending raw source in preview", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  const original = createSnippet("Original");
  await import("../src/editor/editor");
  document.getElementById("writing-width-btn")!.click();
  expect(getSnippets()[0].updatedAt).toBe(original.updatedAt);
  edit("# Pending source\n\n```md\nraw text\n```");
  document.querySelector<HTMLButtonElement>('[data-view-value="preview"]')!.click();
  document.getElementById("copy-markdown-btn")!.click();
  await Promise.resolve();
  expect(writeText).toHaveBeenCalledWith(model.value);
  expect(document.getElementById("full-text-mirror")!.textContent).toBe(model.value);
});

it("preserves sidebar and width choices in focus mode, and exits when searching notes", async () => {
  localStorage.setItem("context-editor.sidebarOpen", "false");
  localStorage.setItem("context-editor.fullWidth", "true");
  const original = createSnippet("Focus draft");
  await import("../src/editor/editor");
  const enter = document.getElementById("focus-mode-btn")!;
  enter.click();
  expect(document.getElementById("app")!.dataset.focusMode).toBe("true");
  expect(document.getElementById("focus-exit")!.hidden).toBe(false);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
  expect(document.getElementById("app")!.dataset.focusMode).toBe("false");
  expect(document.getElementById("sidebar")!.hidden).toBe(true);
  expect(localStorage.getItem("context-editor.fullWidth")).toBe("true");
  expect(getSnippets()[0].updatedAt).toBe(original.updatedAt);
  enter.click(); key("keydown", "F", "KeyF", { metaKey: true, shiftKey: true });
  expect(document.getElementById("app")!.dataset.focusMode).toBe("false");
  expect(document.activeElement?.id).toBe("note-search");
});
it('uses the same persistent record for Trash and Undo, without a second restore', async () => {
  createSnippet('Persistent note'); await import('../src/editor/editor');
  document.querySelector<HTMLButtonElement>('.snippet-delete-btn')!.click();
  document.getElementById('trash-btn')!.click();
  document.querySelector<HTMLButtonElement>('.trash-dialog [data-action="restore"]')!.click();
  expect(document.getElementById('undo-toast')!.hidden).toBe(true);
  expect(getSnippets().filter(note => note.content === 'Persistent note')).toHaveLength(1);
});
it('labels export visibly for the current view and separates it from view controls', async () => {
 await import('../src/editor/editor');
 expect(document.getElementById('export-label')!.textContent).toBe('Export Raw');
 document.querySelector<HTMLButtonElement>('[data-view-value="preview"]')!.click();
 expect(document.getElementById('export-label')!.textContent).toBe('Export PDF');
 expect(document.querySelector('.toolbar-actions #export-btn')).not.toBeNull();
 expect(document.querySelector('.toolbar-actions #view-toggle')).toBeNull();
});
