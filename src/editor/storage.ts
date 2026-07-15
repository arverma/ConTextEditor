export interface Snippet {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface StorageShape {
  snippets: Snippet[];
  activeSnippetId: string | null;
}

const SNIPPETS_KEY = "context-editor.snippets";
const ACTIVE_ID_KEY = "context-editor.activeSnippetId";

function deriveTitle(content: string): string {
  const firstLine = content.split("\n", 1)[0]?.trim();
  return firstLine ? firstLine.slice(0, 60) : "Untitled";
}

// Uses window.localStorage rather than chrome.storage.local: this page is served
// as a normal https origin (GitHub Pages), not chrome-extension://, so Gemini in
// Chrome's "@" tab-context picker can select it — extension pages are excluded
// from that picker by URL scheme, regardless of their DOM content.
function readAll(): StorageShape {
  const rawSnippets = localStorage.getItem(SNIPPETS_KEY);
  const snippets: Snippet[] = rawSnippets ? JSON.parse(rawSnippets) : [];
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

export async function getSnippets(): Promise<Snippet[]> {
  const { snippets } = readAll();
  return [...snippets].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getActiveSnippet(): Promise<Snippet | null> {
  const { snippets, activeSnippetId } = readAll();
  if (snippets.length === 0) return null;

  const active = snippets.find((s) => s.id === activeSnippetId);
  if (active) return active;

  // Active id missing/stale (e.g. it was deleted) — fall back to most recent.
  return [...snippets].sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

export async function createSnippet(): Promise<Snippet> {
  const { snippets } = readAll();
  const now = Date.now();
  const snippet: Snippet = {
    id: crypto.randomUUID(),
    title: "Untitled",
    content: "",
    createdAt: now,
    updatedAt: now,
  };
  writeSnippets([...snippets, snippet]);
  writeActiveId(snippet.id);
  return snippet;
}

export async function updateSnippetContent(id: string, content: string): Promise<void> {
  const { snippets } = readAll();
  const next = snippets.map((s) =>
    s.id === id ? { ...s, content, title: deriveTitle(content), updatedAt: Date.now() } : s
  );
  writeSnippets(next);
}

export async function deleteSnippet(id: string): Promise<Snippet | null> {
  const { snippets, activeSnippetId } = readAll();
  const next = snippets.filter((s) => s.id !== id);

  let nextActiveId = activeSnippetId;
  if (activeSnippetId === id) {
    const fallback = [...next].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    nextActiveId = fallback?.id ?? null;
  }

  writeSnippets(next);
  writeActiveId(nextActiveId);

  if (next.length === 0) return null;
  return next.find((s) => s.id === nextActiveId) ?? next[0];
}

export async function setActiveSnippetId(id: string): Promise<void> {
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
