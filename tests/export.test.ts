import { afterEach, expect, it, vi } from "vitest";
import { exportPdf } from "../src/editor/export";
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
it("opens print for PDF and restores the document title afterward", () => {
  vi.useFakeTimers(); document.title = "Editor";
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  exportPdf("Report"); expect(print).toHaveBeenCalledOnce(); expect(document.title).toBe("Report");
  window.dispatchEvent(new Event("afterprint")); expect(document.title).toBe("Editor");
  vi.runAllTimers(); expect(document.title).toBe("Editor");
});
