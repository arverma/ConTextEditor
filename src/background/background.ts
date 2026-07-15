// Opens the editor as a normal https tab (not chrome-extension://). Gemini in
// Chrome's "@" tab-context picker excludes extension pages by URL scheme, but
// accepts plain http(s) tabs. Production serves the static editor from GitHub
// Pages; override with VITE_EDITOR_ORIGIN / VITE_EDITOR_BASE for local E2E.
const ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN ?? "https://arverma.github.io";
const BASE = import.meta.env.VITE_EDITOR_BASE ?? "/ConTextEditor";

const EDITOR_URL = `${ORIGIN}${BASE}/editor.html`;

// chrome.tabs.query url match patterns can't contain a port, so we match on the
// host and filter to the exact editor URL (ignoring any trailing #hash) in JS.
const EDITOR_HOST_PATTERN = `${ORIGIN}/*`;

chrome.action.onClicked.addListener(async () => {
  const candidates = await chrome.tabs.query({ url: EDITOR_HOST_PATTERN });
  const existing = candidates.find(
    (tab) => tab.url === EDITOR_URL || tab.url?.startsWith(EDITOR_URL + "#")
  );

  if (existing?.id !== undefined) {
    await chrome.tabs.update(existing.id, { active: true });
    if (existing.windowId !== undefined) {
      await chrome.windows.update(existing.windowId, { focused: true });
    }
    return;
  }

  await chrome.tabs.create({ url: EDITOR_URL });
});
