import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { initFocusMode } from "../src/editor/focus-mode";
let cleanup: () => void;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"><button id="focus-mode-btn"></button><button id="mobile-focus-mode-btn"></button><button id="focus-exit" hidden></button><article id="markdown-preview"></article><div id="source-editor"></div></div>';
});
afterEach(() => cleanup?.());
function setup() {
  const sidebar = { setSuppressed: vi.fn() };
  const ed = { scrollTop: vi.fn(() => 0), setScrollTop: vi.fn() };
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
  expect(ed.setScrollTop).toHaveBeenCalledTimes(2);
});
it("can enter focus mode from the mobile toolbar trigger", () => {
  const { mode } = setup();
  document.getElementById("mobile-focus-mode-btn")!.click();
  expect(mode.isActive()).toBe(true);
  expect(document.getElementById("focus-mode-btn")!.getAttribute("aria-pressed")).toBe("true");
  expect(document.getElementById("mobile-focus-mode-btn")!.getAttribute("aria-pressed")).toBe("true");
});
it("lets Escape exit focus only when nothing else claims it", () => {
  const { mode } = setup(); document.getElementById("focus-mode-btn")!.click();
  document.body.insertAdjacentHTML("beforeend", '<dialog open></dialog>');
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); expect(mode.isActive()).toBe(true);
  document.querySelector("dialog")!.remove();
  const overlay = document.createElement("div"); overlay.className = "cm-search"; document.getElementById("source-editor")!.append(overlay);
  const claimed = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  // Model an editor closing its find widget during the same event dispatch.
  overlay.addEventListener("keydown", () => overlay.remove()); overlay.dispatchEvent(claimed);
  expect(mode.isActive()).toBe(true);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", isComposing: true })); expect(mode.isActive()).toBe(true);
  const prevented = new KeyboardEvent("keydown", { key: "Escape", cancelable: true }); prevented.preventDefault(); window.dispatchEvent(prevented);
  expect(mode.isActive()).toBe(true);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true })); expect(mode.isActive()).toBe(false);
  document.getElementById("focus-mode-btn")!.click();
  const container = document.getElementById("source-editor")!;
  container.hidden = true; container.innerHTML = '<div class="cm-search"></div>';
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
  expect(mode.isActive()).toBe(false);
  mode.dispose(); cleanup = () => {};
  const second = setup(); expect(second.mode.isActive()).toBe(false);
});
