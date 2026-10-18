export interface Snippet {
  id: string;
  content: string;
  updatedAt: number;
}

export interface TrashEntry { id: string; note: Snippet; deletedAt: number; wasActive: boolean }
export interface StoredSnippet extends Snippet { trash?: { id: string; deletedAt: number; wasActive: boolean } }
interface StorageShape {
  snippets: StoredSnippet[];
  activeSnippetId: string | null;
}

const SNIPPETS_KEY = "context-editor.snippets";
const ACTIVE_ID_KEY = "context-editor.activeSnippetId";

/** First-line title for UI / export; strips a leading ATX heading marker. */
export function deriveTitle(content: string): string {
  const firstLine = content.split("\n", 1)[0]?.trim() ?? "";
  const cleaned = firstLine.replace(/^#{1,6}\s+/, "");
  return cleaned ? cleaned.slice(0, 60) : "Untitled";
}

// Notes belong to this website origin and stay in the current browser.
function normalizeSnippet(raw: Partial<StoredSnippet> & { id?: string }): StoredSnippet | null {
  if (!raw || typeof raw !== "object" || !raw.id || typeof raw.id !== "string") return null;
  if (raw.trash !== undefined && (!raw.trash || typeof raw.trash.id !== "string" || !raw.trash.id ||
    (!Number.isFinite(raw.trash.deletedAt) || Math.abs(raw.trash.deletedAt) > 8640000000000000) || typeof raw.trash.wasActive !== "boolean")) {
    throw new Error("Stored Trash could not be read. Your saved data has not been changed.");
  }
  return {
    ...(raw.trash ? { trash: { ...raw.trash } } : {}),
    id: raw.id,
    content: typeof raw.content === "string" ? raw.content : "",
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
  };
}

function readAll(): StorageShape {
  const rawSnippets = localStorage.getItem(SNIPPETS_KEY);
  const parsed: unknown = rawSnippets ? JSON.parse(rawSnippets) : [];
  if (!Array.isArray(parsed)) throw new Error("Stored notes could not be read. Export your draft before retrying.");
  const snippets = parsed
    .map((s) => normalizeSnippet(s as Partial<Snippet>))
    .filter((s): s is StoredSnippet => s !== null);
  const activeSnippetId = localStorage.getItem(ACTIVE_ID_KEY);
  return { snippets, activeSnippetId };
}

function writeSnippets(snippets: StoredSnippet[]): void {
  localStorage.setItem(SNIPPETS_KEY, JSON.stringify(snippets));
}

function writeActiveId(id: string | null): void {
  if (id === null) {
    localStorage.removeItem(ACTIVE_ID_KEY);
  } else {
    localStorage.setItem(ACTIVE_ID_KEY, id);
  }
}

// Selection is a preference, not a reason to report a successful content write
// as failed (which could duplicate a note on retry).
function rememberActive(id: string | null): void {
  try { writeActiveId(id); } catch { /* Content remains saved if preference storage fails. */ }
}

function activeNotes(snippets: StoredSnippet[]): Snippet[] {
  return snippets.filter(note => !note.trash);
}
export function getTrashEntries(): TrashEntry[] {
  return readAll().snippets.flatMap(({ trash, ...note }) => trash ? [{ ...trash, note }] : [])
    .sort((a, b) => b.deletedAt - a.deletedAt);
}
export function restoreTrashEntry(id: string, asCopy = false): Snippet {
  const { snippets } = readAll();
  const index = snippets.findIndex(note => note.trash?.id === id);
  if (index < 0) throw new Error("That Trash entry is no longer available.");
  const { trash: _trash, ...snapshot } = snippets[index];
  if (activeNotes(snippets).some(note => note.id === snapshot.id) && !asCopy) {
    throw new Error("That note already exists. Use Restore as copy to keep both notes.");
  }
  const restored = { ...snapshot, id: asCopy ? crypto.randomUUID() : snapshot.id };
  // One atomic collection write both restores the note and removes its Trash record.
  writeSnippets(snippets.map((note, i) => i === index ? restored : note));
  return restored;
}
export function permanentlyDeleteTrashEntry(id: string): void {
  const { snippets } = readAll();
  writeSnippets(snippets.filter(note => note.trash?.id !== id));
}

function sortByUpdated(snippets: Snippet[]): Snippet[] {
  return [...snippets].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getSnippets(): Snippet[] {
  return sortByUpdated(activeNotes(readAll().snippets));
}

export function getActiveSnippet(): Snippet | null {
  const data = readAll();
  const snippets = activeNotes(data.snippets);
  const activeSnippetId = data.activeSnippetId;
  if (snippets.length === 0) return null;

  const active = snippets.find((s) => s.id === activeSnippetId);
  if (active) return active;

  // Active id missing/stale (e.g. it was deleted) — fall back to most recent.
  return sortByUpdated(snippets)[0];
}

export function createSnippet(content = ""): Snippet {
  const { snippets } = readAll();
  const snippet: Snippet = {
    id: crypto.randomUUID(),
    content,
    updatedAt: Date.now(),
  };
  writeSnippets([...snippets, snippet]);
  rememberActive(snippet.id);
  return snippet;
}

export function updateSnippetContent(id: string, content: string): void {
  const { snippets } = readAll();
  if (!snippets.some(note => note.id === id && !note.trash)) throw new Error("Note no longer exists.");
  writeSnippets(
    snippets.map((s) => (s.id === id && !s.trash ? { ...s, content, updatedAt: Date.now() } : s))
  );
}

export function deleteSnippet(id: string, wasActive?: boolean): TrashEntry | null {
  const { snippets, activeSnippetId } = readAll();
  const note = activeNotes(snippets).find(note => note.id === id);
  if (!note) return null;
  const trash = { id: crypto.randomUUID(), deletedAt: Date.now(), wasActive: wasActive ?? activeSnippetId === id };
  writeSnippets(snippets.map(item => item === note ? { ...item, trash } : item));
  if (activeSnippetId === id) rememberActive(sortByUpdated(activeNotes(snippets).filter(item => item.id !== id))[0]?.id ?? null);
  return { ...trash, note: { ...note } };
}

export function setActiveSnippetId(id: string | null): void {
  rememberActive(id);
}

// Fires only for changes made in OTHER tabs/windows on this origin (the spec's
// `storage` event never fires in the tab that made the write) — good enough to
// keep a second open editor tab's sidebar in sync with edits made elsewhere.
export function onSnippetsChanged(callback: () => void): void {
  window.addEventListener("storage", (event) => {
    if (event.key === null || event.key === SNIPPETS_KEY || event.key === ACTIVE_ID_KEY) {
      callback();
    }
  });
}

/** Review tokens prevent an import/restore from replacing a collection changed since review. */
export function readCollection(): { notes: StoredSnippet[]; token: string | null } {
  return { notes: readAll().snippets, token: localStorage.getItem(SNIPPETS_KEY) };
}
export function commitCollection(notes: StoredSnippet[], expectedToken: string | null): void {
  if (localStorage.getItem(SNIPPETS_KEY) !== expectedToken) {
    throw new Error('Notes changed since this review. Close and review the file again.');
  }
  writeSnippets(notes);
}
