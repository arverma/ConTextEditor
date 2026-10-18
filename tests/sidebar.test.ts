import { beforeEach, expect, it, vi } from "vitest";
import { initSidebar } from "../src/editor/sidebar";
let mobile = false;
let change: () => void;
beforeEach(() => {
  localStorage.clear(); mobile = false;
  document.body.innerHTML = '<button id="sidebar-toggle"></button><div id="body"><aside id="sidebar"><button id="sidebar-close"></button><input id="note-search"></aside><main><button id="other">Other</button></main></div>';
  vi.stubGlobal("matchMedia", () => ({ get matches() { return mobile; }, addEventListener: (_: string, fn: () => void) => { change = fn; } }));
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
it("keeps desktop preference independent from mobile open/close and cleans up on resize", () => {
  const sidebar = initSidebar(); sidebar.setOpen(false);
  expect(localStorage.getItem("context-editor.sidebarOpen")).toBe("false");
  mobile = true; change(); sidebar.setOpen(true);
  expect(document.querySelector("dialog")?.open).toBe(true);
  expect(document.activeElement?.id).toBe("note-search");
  sidebar.setOpen(false); expect(document.querySelector("dialog")?.open).toBe(false);
  expect(localStorage.getItem("context-editor.sidebarOpen")).toBe("false");
  mobile = false; change(); expect(document.querySelector<HTMLElement>("#sidebar")?.hidden).toBe(true);
  expect(document.querySelector("#sidebar")?.parentElement?.id).toBe("body");
});
it("closes a modal drawer on cancel and restores focus to opener", () => {
  mobile = true; const sidebar = initSidebar(); const toggle = document.getElementById("sidebar-toggle")!;
  toggle.focus(); sidebar.setOpen(true);
  document.querySelector("dialog")!.dispatchEvent(new Event("cancel", { cancelable: true }));
  expect(document.querySelector("dialog")!.open).toBe(false); expect(document.activeElement).toBe(toggle);
});
it("keeps Undo and its live announcement inside the mobile modal while open", () => {
  document.body.insertAdjacentHTML("beforeend", '<div id="undo-toast"><button>Undo</button></div><div id="recovery-status"></div>');
  mobile = true; const sidebar = initSidebar(); sidebar.setOpen(true);
  expect(document.querySelector("dialog #undo-toast")).not.toBeNull();
  expect(document.querySelector("dialog #recovery-status")).not.toBeNull();
  sidebar.setOpen(false);
  expect(document.querySelector("dialog #undo-toast")).toBeNull();
  expect(document.querySelector("#undo-toast")?.parentElement).toBe(document.body);
});
it("temporarily suppresses history across breakpoints without changing its saved preference", () => {
  const beforeOpen = vi.fn(); const sidebar = initSidebar({ beforeOpen });
  sidebar.setOpen(true); expect(localStorage.getItem("context-editor.sidebarOpen")).toBe("true");
  sidebar.setSuppressed(true); expect(document.getElementById("sidebar")!.hidden).toBe(true);
  expect(document.getElementById("sidebar-toggle")!.getAttribute("aria-expanded")).toBe("false");
  mobile = true; change(); mobile = false; change();
  expect(document.getElementById("sidebar")!.hidden).toBe(true);
  sidebar.setSuppressed(false); expect(document.getElementById("sidebar")!.hidden).toBe(false);
  expect(localStorage.getItem("context-editor.sidebarOpen")).toBe("true");
  expect(beforeOpen).toHaveBeenCalled();
});
