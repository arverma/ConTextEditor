import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { initCopyMarkdown } from "../src/editor/copy-markdown";
afterEach(() => vi.unstubAllGlobals());
beforeEach(() => {
  document.body.innerHTML = '<button id="copy-markdown-btn" aria-label="Copy Markdown"></button><span id="copy-status"></span>';
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };
});
it("copies the exact current raw draft, not the rendered preview or last saved value", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  let text = "saved"; const copy = initCopyMarkdown(() => text);
  text = "# Unsaved\n\n```js\nconst a = 1;\n```\n\tUnicode: café 🚀  "; await copy();
  expect(writeText).toHaveBeenCalledWith(text);
  expect(document.getElementById("copy-status")!.textContent).toBe("Markdown copied.");
});
it("opens an inert-source manual fallback when clipboard permission is denied", async () => {
  vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(Error("denied")) } });
  const text = "<script>not executable</script>";
  const copy = initCopyMarkdown(() => text); const button = document.getElementById("copy-markdown-btn")!; button.focus();
  await copy();
  const field = document.querySelector<HTMLTextAreaElement>(".copy-dialog textarea")!;
  expect(field.value).toBe(text); expect(field.readOnly).toBe(true); expect(document.querySelector(".copy-dialog script")).toBeNull();
  expect(document.activeElement).toBe(field); expect(field.selectionEnd).toBe(text.length);
  document.querySelector<HTMLButtonElement>(".copy-dialog button")!.click(); expect(document.activeElement).toBe(button);
  expect(document.getElementById("copy-status")!.textContent).toBe("");
});
it("supports empty notes and reports success only after the clipboard write resolves", async () => {
  let done!: () => void; const writeText = vi.fn(() => new Promise<void>(resolve => { done = resolve; }));
  vi.stubGlobal("navigator", { clipboard: { writeText } }); const copy = initCopyMarkdown(() => "");
  const pending = copy(); expect(document.getElementById("copy-status")!.textContent).not.toBe("Markdown copied.");
  expect((document.getElementById("copy-markdown-btn") as HTMLButtonElement).disabled).toBe(true);
  done(); await pending; expect(writeText).toHaveBeenCalledWith("");
  expect((document.getElementById("copy-markdown-btn") as HTMLButtonElement).disabled).toBe(false);
});
