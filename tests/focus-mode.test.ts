import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { initFocusMode } from "../src/editor/focus-mode";
let cleanup: () => void;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"><button id="focus-mode-btn"></button><button id="focus-exit" hidden></button><article id="markdown-preview"></article><div id="monaco-container"></div></div>';
});
afterEach(() => cleanup?.());
function setup() {
  const sidebar = { setSuppressed: vi.fn() };
  const ed = { saveViewState: vi.fn(() => null), restoreViewState: vi.fn(), layout: vi.fn() };
  const focus = vi.fn(); const mode = initFocusMode(ed, sidebar, focus); cleanup = mode.dispose;
  return { mode, sidebar, ed, focus };
}
it("enters and exits without persisting mode, with visible exit and view-preserving layout", () => {
  const { mode, sidebar, ed, focus } = setup();
  document.getElementById("focus-mode-btn")!.click();
  expect(mode.isActive()).toBe(true); expect(document.getElementById("focus-exit")!.hidden).toBe(false);
  expect(sidebar.setSuppressed).toHaveBeenLastCalledWith(true); expect(focus).toHaveBeenCalled();
  document.getElementById("focus-exit")!.click();
  expect(mode.isActive()).toBe(false); expect(sidebar.setSuppressed).toHaveBeenLastCalledWith(false);
  expect(ed.layout).toHaveBeenCalledTimes(2);
});
it("lets an open dialog, editor find widget, and composition consume Escape first", () => {
  const { mode } = setup(); document.getElementById("focus-mode-btn")!.click();
  document.body.insertAdjacentHTML("beforeend", '<dialog open></dialog>');
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); expect(mode.isActive()).toBe(true);
  document.querySelector("dialog")!.remove();
  const overlay = document.createElement("div"); overlay.className = "find-widget visible"; document.getElementById("monaco-container")!.append(overlay);
  const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  // Model an editor closing its find widget during the same event dispatch.
  overlay.addEventListener("keydown", () => overlay.remove()); overlay.dispatchEvent(event);
  expect(mode.isActive()).toBe(true);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", isComposing: true })); expect(mode.isActive()).toBe(true);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true })); expect(mode.isActive()).toBe(false);
});
it("honors prevented editor Escape and starts each new session outside focus mode", () => {
  const { mode } = setup(); document.getElementById("focus-mode-btn")!.click();
  const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true }); event.preventDefault(); window.dispatchEvent(event);
  expect(mode.isActive()).toBe(true); mode.dispose(); cleanup = () => {};
  const second = setup(); expect(second.mode.isActive()).toBe(false);
});

it("does not let a hidden editor Find widget block exiting focus from preview", () => {
  const { mode } = setup(); document.getElementById("focus-mode-btn")!.click();
  const container = document.getElementById("monaco-container")!;
  container.hidden = true; container.innerHTML = '<div class="find-widget visible"></div>';
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
  expect(mode.isActive()).toBe(false);
});
