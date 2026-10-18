import { type Snippet, deriveTitle, getSnippets } from "./storage";
import { shortcutLabel } from "./shortcuts";

interface HistoryPanelCallbacks {
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function filterNotes(notes: Snippet[], query: string): Snippet[] {
  const needle = query.trim().toLowerCase();
  return needle ? notes.filter(note => `${deriveTitle(note.content)}\n${note.content}`.toLowerCase().includes(needle)) : notes;
}

function relativeTime(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

export function initHistoryPanel(callbacks: HistoryPanelCallbacks) {
  const list = document.getElementById("snippet-list")!;
  const search = document.getElementById("note-search") as HTMLInputElement;
  const clear = document.getElementById("clear-search")!;
  const count = document.getElementById("search-status")!;
  const rows = new Map<string, HTMLLIElement>();
  let activeId: string | null = null;
  function refresh(id: string | null = activeId): void {
    activeId = id;
    const all = getSnippets();
    const notes = filterNotes(all, search.value);
    const focused = document.activeElement as HTMLElement | null;
    const oldRows = [...list.querySelectorAll<HTMLLIElement>("li[data-id]")];
    const focusedRow = focused?.closest<HTMLLIElement>("li[data-id]");
    const oldIndex = focusedRow ? oldRows.indexOf(focusedRow) : -1;
    const scroll = list.scrollTop;
    clear.hidden = !search.value;
    count.textContent = search.value.trim() ? `${notes.length} matching ${notes.length === 1 ? "note" : "notes"}` : "";
    for (const [key, row] of rows) {
      if (!notes.some(note => note.id === key)) { row.remove(); rows.delete(key); }
    }
    list.querySelector(".sidebar-empty")?.remove();
    for (const [index, note] of notes.entries()) {
      let row = rows.get(note.id);
      if (!row) {
        row = document.createElement("li");
        row.dataset.id = note.id;
        row.innerHTML = '<button type="button" class="snippet-select"><span class="snippet-item-title"></span><span class="snippet-item-preview"></span><span class="snippet-item-meta"></span></button><button type="button" class="snippet-delete-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
        row.querySelector(".snippet-select")!.addEventListener("click", () => callbacks.onSelect(note.id));
        row.querySelector(".snippet-delete-btn")!.addEventListener("click", () => callbacks.onDelete(note.id));
        rows.set(note.id, row);
      }
      const title = deriveTitle(note.content);
      const selected = note.id === id;
      row.className = `snippet-item${selected ? " active" : ""}`;
      const select = row.querySelector<HTMLButtonElement>(".snippet-select")!;
      select.setAttribute("aria-current", String(selected));
      select.setAttribute("aria-label", `Open note: ${title}`);
      row.querySelector(".snippet-item-title")!.textContent = title;
      row.querySelector(".snippet-item-preview")!.textContent = note.content.split("\n").slice(1).find(line => line.trim())?.trim().slice(0, 80) || "No additional text";
      row.querySelector(".snippet-item-meta")!.textContent = relativeTime(note.updatedAt);
      const del = row.querySelector<HTMLButtonElement>(".snippet-delete-btn")!;
      del.setAttribute("aria-label", `Delete note: ${title}`);
      del.title = `Delete note${selected ? ` (${shortcutLabel("Mod+Shift+Backspace")})` : ""}`;
      if (list.children[index] !== row) list.insertBefore(row, list.children[index] ?? null);
    }
    if (!notes.length) {
      const empty = document.createElement("li");
      empty.className = "sidebar-empty";
      empty.textContent = all.length ? "No matching notes" : "No notes yet. Create a new note or start typing.";
      list.append(empty);
    }
    if (oldIndex >= 0 && focused && document.activeElement !== focused) {
      if (focused.isConnected) focused.focus({ preventScroll: true });
      else {
        const fallback = list.querySelectorAll<HTMLButtonElement>(".snippet-select")[Math.min(oldIndex, notes.length - 1)];
        (fallback ?? search).focus({ preventScroll: true });
      }
    }
    list.scrollTop = scroll;
  }
  search.addEventListener("input", () => refresh());
  clear.addEventListener("click", () => { search.value = ""; refresh(); search.focus(); });
  search.addEventListener("keydown", event => {
    if (event.isComposing) return;
    if (event.key === "Escape" && search.value) {
      event.preventDefault(); event.stopPropagation(); search.value = ""; refresh();
    } else if (event.key === "ArrowDown") {
      event.preventDefault(); list.querySelector<HTMLButtonElement>(".snippet-select")?.focus();
    }
  });
  document.getElementById("sidebar")?.addEventListener("keydown", event => {
    if (event.key === "Escape" && !event.isComposing && search.value) {
      event.preventDefault(); event.stopPropagation();
      search.value = ""; refresh(); search.focus();
    }
  });
  list.addEventListener("keydown", event => {
    if (event.isComposing || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const buttons = [...list.querySelectorAll<HTMLButtonElement>(".snippet-select")];
    const row = (event.target as HTMLElement).closest("li");
    const index = buttons.findIndex(button => button.parentElement === row);
    if (index < 0) return;
    const next = { ArrowDown: Math.min(index + 1, buttons.length - 1), ArrowUp: Math.max(index - 1, 0), Home: 0, End: buttons.length - 1 }[event.key];
    if (next !== undefined) { event.preventDefault(); buttons[next]?.focus(); }
  });
  return {
    refresh,
    clearSearch() { search.value = ""; refresh(); },
    focusSearch() { search.focus(); search.select(); },
  };
}
