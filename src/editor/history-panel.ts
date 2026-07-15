import {
  type Snippet,
  deriveTitle,
  getSnippets,
  deleteSnippet,
  setActiveSnippetId,
  onSnippetsChanged,
} from "./storage";

interface HistoryPanelCallbacks {
  onSelect: (snippet: Snippet) => void;
  onActiveDeleted: (fallback: Snippet | null) => void;
}

let listEl: HTMLUListElement;
let callbacks: HistoryPanelCallbacks;
let currentActiveId: string | null = null;

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function previewLine(content: string): string {
  return (
    content
      .split("\n")
      .slice(1)
      .find((l) => l.trim().length > 0)
      ?.trim()
      .slice(0, 80) ?? ""
  );
}

export function initHistoryPanel(cb: HistoryPanelCallbacks): void {
  callbacks = cb;
  listEl = document.getElementById("snippet-list") as HTMLUListElement;

  onSnippetsChanged(() => {
    refreshHistoryPanel(currentActiveId);
  });
}

export function refreshHistoryPanel(activeId: string | null): void {
  currentActiveId = activeId;
  renderList(getSnippets());
}

function renderList(snippets: Snippet[]): void {
  listEl.innerHTML = "";

  if (snippets.length === 0) {
    const empty = document.createElement("li");
    empty.className = "sidebar-empty";
    empty.textContent = "No notes yet";
    listEl.appendChild(empty);
    return;
  }

  for (const snippet of snippets) {
    const li = document.createElement("li");
    li.className = "snippet-item" + (snippet.id === currentActiveId ? " active" : "");

    const titleEl = document.createElement("div");
    titleEl.className = "snippet-item-title";
    titleEl.textContent = deriveTitle(snippet.content);

    const previewEl = document.createElement("div");
    previewEl.className = "snippet-item-preview";
    previewEl.textContent = previewLine(snippet.content) || "No additional text";

    const metaEl = document.createElement("div");
    metaEl.className = "snippet-item-meta";
    metaEl.textContent = formatRelativeTime(snippet.updatedAt);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "snippet-delete-btn";
    deleteBtn.type = "button";
    deleteBtn.title = "Delete note";
    deleteBtn.setAttribute("aria-label", "Delete note");
    deleteBtn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7" ' +
      'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    li.append(titleEl, previewEl, metaEl, deleteBtn);

    li.addEventListener("click", (event) => {
      if (deleteBtn.contains(event.target as Node)) return;
      currentActiveId = snippet.id;
      setActiveSnippetId(snippet.id);
      callbacks.onSelect(snippet);
      renderList(snippets);
    });

    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const wasActive = snippet.id === currentActiveId;
      const fallback = deleteSnippet(snippet.id);
      if (wasActive) {
        currentActiveId = fallback?.id ?? null;
        callbacks.onActiveDeleted(fallback);
      }
      refreshHistoryPanel(currentActiveId);
    });

    listEl.appendChild(li);
  }
}
