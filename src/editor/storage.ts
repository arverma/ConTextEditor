export interface Snippet {
  id: string;
  content: string;
  updatedAt: number;
}

interface StorageShape {
  snippets: Snippet[];
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

// Uses window.localStorage rather than chrome.storage.local: this page is served
// as a normal https origin (GitHub Pages), not chrome-extension://, so Gemini in
// Chrome's "@" tab-context picker can select it — extension pages are excluded
// from that picker by URL scheme, regardless of their DOM content.
function normalizeSnippet(raw: Partial<Snippet> & { id?: string }): Snippet | null {
  if (!raw?.id || typeof raw.id !== "string") return null;
  return {
    id: raw.id,
    content: typeof raw.content === "string" ? raw.content : "",
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
  };
}

function readAll(): StorageShape {
  const rawSnippets = localStorage.getItem(SNIPPETS_KEY);
  const parsed: unknown[] = rawSnippets ? JSON.parse(rawSnippets) : [];
  const snippets = parsed
    .map((s) => normalizeSnippet(s as Partial<Snippet>))
    .filter((s): s is Snippet => s !== null);
  const activeSnippetId = localStorage.getItem(ACTIVE_ID_KEY);
  return { snippets, activeSnippetId };
}

function writeSnippets(snippets: Snippet[]): void {
  localStorage.setItem(SNIPPETS_KEY, JSON.stringify(snippets));
}

function writeActiveId(id: string | null): void {
  if (id === null) {
    localStorage.removeItem(ACTIVE_ID_KEY);
  } else {
    localStorage.setItem(ACTIVE_ID_KEY, id);
  }
}

function sortByUpdated(snippets: Snippet[]): Snippet[] {
  return [...snippets].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getSnippets(): Snippet[] {
  return sortByUpdated(readAll().snippets);
}

export function getActiveSnippet(): Snippet | null {
  const { snippets, activeSnippetId } = readAll();
  if (snippets.length === 0) return null;

  const active = snippets.find((s) => s.id === activeSnippetId);
  if (active) return active;

  // Active id missing/stale (e.g. it was deleted) — fall back to most recent.
  return sortByUpdated(snippets)[0];
}

export function createSnippet(): Snippet {
  const { snippets } = readAll();
  const snippet: Snippet = {
    id: crypto.randomUUID(),
    content: "",
    updatedAt: Date.now(),
  };
  writeSnippets([...snippets, snippet]);
  writeActiveId(snippet.id);
  return snippet;
}

export function updateSnippetContent(id: string, content: string): void {
  const { snippets } = readAll();
  writeSnippets(
    snippets.map((s) => (s.id === id ? { ...s, content, updatedAt: Date.now() } : s))
  );
}

export function deleteSnippet(id: string): Snippet | null {
  const { snippets, activeSnippetId } = readAll();
  const next = snippets.filter((s) => s.id !== id);

  let nextActiveId = activeSnippetId;
  if (activeSnippetId === id) {
    nextActiveId = sortByUpdated(next)[0]?.id ?? null;
  }

  writeSnippets(next);
  writeActiveId(nextActiveId);

  if (next.length === 0) return null;
  return next.find((s) => s.id === nextActiveId) ?? next[0];
}

export function setActiveSnippetId(id: string): void {
  writeActiveId(id);
}

// Fires only for changes made in OTHER tabs/windows on this origin (the spec's
// `storage` event never fires in the tab that made the write) — good enough to
// keep a second open editor tab's sidebar in sync with edits made elsewhere.
export function onSnippetsChanged(callback: () => void): void {
  window.addEventListener("storage", (event) => {
    if (event.key === SNIPPETS_KEY || event.key === ACTIVE_ID_KEY) {
      callback();
    }
  });
}
