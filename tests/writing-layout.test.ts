import { beforeEach, expect, it, vi } from "vitest";
import { initWritingLayout } from "../src/editor/writing-layout";
beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<main id="main"><button id="writing-width-btn"></button><article id="markdown-preview"></article></main>';
});
function editor() { return { saveViewState: vi.fn(() => ({ cursorState: [], viewState: { scrollLeft: 0, firstPosition: { lineNumber: 1, column: 1 }, firstPositionDeltaTop: 0 }, contributionsState: {} })), restoreViewState: vi.fn(), layout: vi.fn() }; }
it("defaults to centered writing and preserves editor view and preview scroll when toggled", () => {
  const ed = editor(); const preview = document.getElementById("markdown-preview")!; preview.scrollTop = 180;
  initWritingLayout(ed); document.getElementById("writing-width-btn")!.click();
  expect(document.getElementById("main")!.dataset.fullWidth).toBe("true");
  expect(document.getElementById("writing-width-btn")!.getAttribute("aria-pressed")).toBe("true");
  expect(ed.restoreViewState).toHaveBeenCalledWith(ed.saveViewState.mock.results[0].value);
  expect(preview.scrollTop).toBe(180); expect(localStorage.getItem("context-editor.fullWidth")).toBe("true");
  document.getElementById("writing-width-btn")!.click(); expect(document.getElementById("main")!.dataset.fullWidth).toBe("false");
});
it("loads the saved preference and still toggles when preference storage fails", () => {
  localStorage.setItem("context-editor.fullWidth", "true"); initWritingLayout(editor());
  expect(document.getElementById("main")!.dataset.fullWidth).toBe("true");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("quota"); });
  document.getElementById("writing-width-btn")!.click(); expect(document.getElementById("main")!.dataset.fullWidth).toBe("false");
});
