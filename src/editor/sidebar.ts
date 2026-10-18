import { COMPACT_LAYOUT_QUERY } from "./responsive";
import { shortcutLabel } from "./shortcuts";

export function initSidebar(options: { beforeOpen?: () => void } = {}) {
  const sidebar = document.getElementById("sidebar")!;
  const toggle = document.getElementById("sidebar-toggle")!;
  const close = document.getElementById("sidebar-close")!;
  const toast = document.getElementById("undo-toast");
  const toastHome = toast?.parentElement;
  const announcement = document.getElementById("recovery-status");
  const announcementHome = announcement?.parentElement;
  const body = document.getElementById("body")!;
  const mobile = window.matchMedia(COMPACT_LAYOUT_QUERY);
  const dialog = document.createElement("dialog");
  dialog.className = "history-dialog";
  dialog.setAttribute("aria-label", "Note history");
  document.body.append(dialog);
  let desktopOpen = true;
  let suppressed = false;
  let previousFocus: HTMLElement | null = null;
  try { desktopOpen = localStorage.getItem("context-editor.sidebarOpen") !== "false"; } catch {}

  function update(open: boolean): void {
    open = open && !suppressed;
    sidebar.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    const label = open ? "Hide note history" : "Show note history";
    toggle.setAttribute("aria-label", label);
    toggle.title = `${label} (${shortcutLabel("Mod+\\")})`;
  }
  function setOpen(open: boolean, restoreFocus = true): void {
    if (open) options.beforeOpen?.();
    if (mobile.matches) {
      if (open && !dialog.open) {
        previousFocus = document.activeElement as HTMLElement | null;
        if (toast) dialog.append(toast);
        if (announcement) dialog.append(announcement);
        update(true); dialog.showModal();
        document.getElementById("note-search")!.focus();
      } else if (!open) {
        dialog.close(); update(false);
        if (toast && toastHome) toastHome.append(toast);
        if (announcement && announcementHome) announcementHome.append(announcement);
        if (restoreFocus) (previousFocus?.isConnected ? previousFocus : toggle)?.focus();
      }
    } else {
      if (!open && sidebar.contains(document.activeElement)) toggle.focus();
      desktopOpen = open; update(open);
      try { localStorage.setItem("context-editor.sidebarOpen", String(open)); } catch {}
    }
  }
  function layout(): void {
    const hadFocus = sidebar.contains(document.activeElement);
    dialog.close();
    if (toast && toastHome) toastHome.append(toast);
    if (announcement && announcementHome) announcementHome.append(announcement);
    if (mobile.matches) {
      dialog.append(sidebar); update(false);
      if (hadFocus) toggle.focus();
    } else {
      body.prepend(sidebar); update(desktopOpen);
      if (hadFocus && !desktopOpen) toggle.focus();
    }
  }
  toggle.addEventListener("click", () => setOpen(sidebar.hidden));
  close.addEventListener("click", () => setOpen(false));
  dialog.addEventListener("cancel", event => { event.preventDefault(); setOpen(false); });
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setOpen(false);
  });
  mobile.addEventListener("change", layout);
  layout();
  function setSuppressed(value: boolean): void {
    suppressed = value;
    if (value && mobile.matches) setOpen(false, false);
    update(!mobile.matches && desktopOpen);
  }
  function setPreference(open: boolean): void {
    desktopOpen = open;
    localStorage.setItem("context-editor.sidebarOpen", String(open));
    if (!mobile.matches) update(open);
  }
  return { setPreference, setSuppressed, setOpen, isMobile: () => mobile.matches, closeMobile(restoreFocus = false) { if (mobile.matches) setOpen(false, restoreFocus); } };
}
