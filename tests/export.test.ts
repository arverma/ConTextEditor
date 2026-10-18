import { afterEach, expect, it, vi } from "vitest";
import { exportTxt, exportPdf } from "../src/editor/export";
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
it("exports the exact raw Markdown as a safely named text file", async () => {
  const source = "# Title\n\n```mermaid\nA-->B\n```";
  let blob: Blob;
  const create = vi.fn((value: Blob) => { blob = value; return "blob:test"; });
  const revoke = vi.fn();
  vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: revoke });
  let filename = "";
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { filename = this.download; });
  exportTxt(source, "Bad/name: title");
  const content = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(blob!); });
  expect(content).toBe(source); expect(filename).toBe("Badname title.txt");
  expect(revoke).toHaveBeenCalledWith("blob:test"); expect(document.querySelector('a[download]')).toBeNull();
});
it("opens print for PDF and restores the document title afterward", () => {
  vi.useFakeTimers(); document.title = "Editor";
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  exportPdf("Report"); expect(print).toHaveBeenCalledOnce(); expect(document.title).toBe("Report");
  window.dispatchEvent(new Event("afterprint")); expect(document.title).toBe("Editor");
  vi.runAllTimers(); expect(document.title).toBe("Editor");
});
