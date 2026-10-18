import type { DeletedNote } from "./note-session";

interface Entry { deleted: DeletedNote; remaining: number }
/** Independent expiry for each deletion; pausing preserves all eligible entries. */
export class Recovery {
  private entries: Entry[] = [];
  private last = Date.now();
  private paused = false;
  constructor(private changed: () => void) {}
  private tick(): void {
    const now = Date.now();
    if (!this.paused) this.entries.forEach(entry => { entry.remaining -= now - this.last; });
    this.last = now;
    this.entries = this.entries.filter(entry => entry.remaining > 0);
  }
  add(deleted: DeletedNote): void {
    this.tick(); this.entries.push({ deleted, remaining: 10000 }); this.changed();
  }
  prune(ids: Set<string>): void {
    const before = this.entries.length;
    this.entries = this.entries.filter(entry => ids.has(entry.deleted.id));
    if (this.entries.length !== before) this.changed();
  }
  peek(): DeletedNote | null { this.tick(); return this.entries.at(-1)?.deleted ?? null; }
  get count(): number { this.tick(); return this.entries.length; }
  pause(paused: boolean): void { this.tick(); this.paused = paused; }
  undo(restore: (deleted: DeletedNote) => boolean): boolean {
    const entry = this.peek();
    if (!entry || !restore(entry)) return false;
    this.entries = this.entries.filter(item => item.deleted.id !== entry.id); this.changed(); return true;
  }
}

export function initRecovery(restore: (deleted: DeletedNote) => boolean): Recovery {
  const toast = document.getElementById("undo-toast")!;
  const message = document.getElementById("undo-message")!;
  const undo = document.getElementById("undo-btn")!;
  const announcement = document.getElementById("recovery-status")!;
  let previousFocus: HTMLElement | null = null;
  let previousCount = 0;
  const recovery = new Recovery(render);
  function restoreFocus(): void {
    const modal = toast.closest("dialog[open]");
    const previousUsable = previousFocus?.isConnected && !previousFocus.closest("[hidden]") && (!modal || modal.contains(previousFocus));
    if (previousUsable) previousFocus!.focus();
    else (modal?.querySelector<HTMLElement>("#note-search") ?? document.getElementById("sidebar-toggle"))?.focus();
  }
  function render(): void {
    const count = recovery.count;
    if (count > previousCount) {
      if (!toast.contains(document.activeElement)) previousFocus = document.activeElement as HTMLElement | null;
      announcement.textContent = `${count > 1 ? `${count} notes` : "Note"} moved to Trash. Undo available for 10 seconds.`;
    }
    previousCount = count;
    if (!count && toast.contains(document.activeElement)) restoreFocus();
    toast.hidden = !count;
    message.textContent = count > 1 ? `${count} notes deleted` : "Note deleted";
  }
  const pause = () => recovery.pause(toast.matches(":hover") || toast.contains(document.activeElement));
  toast.addEventListener("mouseenter", pause);
  toast.addEventListener("mouseleave", pause);
  toast.addEventListener("focusin", pause);
  toast.addEventListener("focusout", () => queueMicrotask(pause));
  undo.addEventListener("click", () => {
    if (recovery.undo(restore)) {
      announcement.textContent = "Note restored.";
      if (!recovery.count) restoreFocus();
    }
  });
  // Timers only update visibility; status announcements occur on user actions.
  window.setInterval(render, 250);
  return recovery;
}
