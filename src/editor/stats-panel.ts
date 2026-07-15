import { getSnippets } from "./storage";

export interface StatsPanelDeps {
  getCurrentNoteContent: () => string;
  getThemeMode: () => string;
}

const POLL_MS = 1000;
const PAGE_LOAD_TIME = Date.now();

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

function formatDuration(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function chromeVersion(): string {
  const match = navigator.userAgent.match(/Chrome\/([\d.]+)/);
  return match ? match[1] : "unknown";
}

// `description` becomes the native title-attribute tooltip for the whole row
// (hovering the label or the value both show it) — plain-English explanation
// of what the metric means, no jargon.
function row(label: string, value: string, description: string): string {
  return (
    `<div class="stats-row" title="${description.replace(/"/g, "&quot;")}">` +
    `<span class="stats-row-label">${label}</span>` +
    `<span class="stats-row-value">${value}</span>` +
    `</div>`
  );
}

function section(title: string, bodyHtml: string): string {
  return `<div class="stats-section"><div class="stats-section-title">${title}</div>${bodyHtml}</div>`;
}

export function initStatsPanel(deps: StatsPanelDeps): void {
  const btn = document.getElementById("stats-btn")!;
  const closeBtn = document.getElementById("stats-close-btn")!;
  const overlay = document.getElementById("stats-overlay")!;
  const panel = document.getElementById("stats-panel")!;
  const body = document.getElementById("stats-body")!;

  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let isOpen = false;

  async function render(): Promise<string> {
    const snippets = await getSnippets();
    const totalChars = snippets.reduce((sum, s) => sum + s.content.length, 0);
    const totalWords = snippets.reduce((sum, s) => sum + countWords(s.content), 0);

    const snippetsRaw = localStorage.getItem("context-editor.snippets") ?? "";
    const activeIdRaw = localStorage.getItem("context-editor.activeSnippetId") ?? "";
    const storageBytes = utf8ByteLength(snippetsRaw) + utf8ByteLength(activeIdRaw);

    const currentContent = deps.getCurrentNoteContent();
    const currentLines = currentContent.length ? currentContent.split("\n").length : 0;

    const sessionSec = (Date.now() - PAGE_LOAD_TIME) / 1000;

    const sessionSection = section(
      "Session",
      row("Time open", formatDuration(sessionSec), "How long this browser tab has been open.") +
        row(
          "Viewport",
          `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`,
          "The size of the browser window's content area, and how many physical pixels the screen packs into each CSS pixel."
        ) +
        row("Chrome", chromeVersion(), "The version of Chrome you're currently using.") +
        row(
          "Monaco",
          __MONACO_VERSION__,
          "The version of Monaco, the code-editing engine that powers this app (also used by VS Code)."
        ) +
        row("Theme mode", deps.getThemeMode(), "Your current color theme setting: System, Light, or Dark.")
    );

    const notesSection = section(
      "Notes & storage",
      row("Notes", String(snippets.length), "How many notes you currently have saved.") +
        row("Total chars", totalChars.toLocaleString(), "Combined character count across every saved note.") +
        row("Total words", totalWords.toLocaleString(), "Combined word count across every saved note.") +
        row(
          "Storage used",
          formatBytes(storageBytes),
          "How much of the browser's local storage your notes are taking up on this device."
        ) +
        row(
          "Current note chars",
          currentContent.length.toLocaleString(),
          "Character count of the note you're editing right now."
        ) +
        row(
          "Current note words",
          countWords(currentContent).toLocaleString(),
          "Word count of the note you're editing right now."
        ) +
        row(
          "Current note lines",
          currentLines.toLocaleString(),
          "Line count of the note you're editing right now."
        )
    );

    return sessionSection + notesSection;
  }

  async function tick(): Promise<void> {
    const html = await render();
    if (!isOpen) return;
    body.innerHTML = html;
  }

  function open(): void {
    if (isOpen) return;
    isOpen = true;
    overlay.hidden = false;
    overlay.classList.add("open");
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    void tick();
    pollTimer = setInterval(() => void tick(), POLL_MS);
  }

  function close(): void {
    if (!isOpen) return;
    isOpen = false;
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    overlay.classList.remove("open");
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    setTimeout(() => {
      if (!isOpen) overlay.hidden = true;
    }, 200);
  }

  btn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) close();
  });
}
