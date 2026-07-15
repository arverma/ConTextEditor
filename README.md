# Context Editor Tab

A Chrome extension that opens a persistent, Monaco-powered code/text editor in its
own browser tab — a scratchpad you compose in so that browser-native AI assistants
(specifically **Gemini in Chrome**, via its "@" tab-context picker) can read it as
context. Click the toolbar icon, write, and point the AI at the tab.

No copy-paste, no DOM injection into other sites. The extension's only job is to open
a well-formed, readable tab; your notes live entirely in your browser (`localStorage`)
on the editor origin and are never uploaded by this app.

**Live editor:** [https://arverma.github.io/ConTextEditor/](https://arverma.github.io/ConTextEditor/)

---

## Why it's built this way

Gemini in Chrome's tab-context "@" picker **excludes `chrome-extension://` pages by
URL scheme** — it won't let you share an extension page regardless of its content. So
the editor cannot simply be an extension page. Instead:

- The **editor is a static web app** hosted on GitHub Pages
  (`https://arverma.github.io/ConTextEditor/`), which Gemini's picker *does* accept
  (like any normal https tab).
- The **Chrome extension is a thin launcher**: clicking its icon opens (or re-focuses)
  that tab.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design and rationale.

---

## Features

- **Monaco Markdown editor** (the engine behind VS Code) in a full browser tab,
  with an **Edit | Preview** toggle (sanitized rendered Markdown).
- **History**: multiple saved notes with title/preview/timestamp; create, switch,
  edit, and delete. Autosaved to `localStorage`.
- **Theme selector**: System / Light / Dark, remembered across sessions, applied
  before first paint (no flash).
- **Tab reuse**: clicking the icon focuses the existing editor tab instead of piling
  up duplicates.
- **Fully private notes**: kept in `localStorage` on your device; the host only
  serves static HTML/JS/CSS.
- **Privacy FAB**: floating link (bottom-right) to the privacy policy page.
- **Stats panel**: a live dashboard (bar-chart icon, top-right) of session and note
  storage internals. Updates only while open; see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Install (users)

1. Install **Context Editor Tab** from the Chrome Web Store (once published), or for
   development load an unpacked build (see below).
2. Pin the toolbar icon and click it — the editor opens at
   `https://arverma.github.io/ConTextEditor/`.
3. In Gemini in Chrome, type `@` and pick the **Context Editor** tab.

Privacy policy: [privacy.html](https://arverma.github.io/ConTextEditor/privacy.html).
Store listing checklist for maintainers: [docs/STORE.md](docs/STORE.md).

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm
- Google Chrome (for loading the unpacked extension / Gemini testing)

### Setup

```bash
npm install
npm run build            # dist/ (extension) + dist-editor/ (editor site)
```

Load `dist/` as an unpacked extension: `chrome://extensions` → Developer mode →
Load unpacked → select `./dist`, then pin the icon.

By default the extension opens the **live GitHub Pages** editor URL. The editor site
is deployed automatically on push to `main` (see `.github/workflows/deploy-pages.yml`).

### Local editor iteration

```bash
npm run dev:editor
# open http://localhost:5173/ConTextEditor/
```

Production-like local preview:

```bash
npm run preview:editor
# open http://localhost:4173/ConTextEditor/
```

Optional: point a local extension build at the Vite preview server:

```bash
VITE_EDITOR_ORIGIN=http://127.0.0.1:4173 VITE_EDITOR_BASE=/ConTextEditor npm run build:extension
```

Then load that `dist/` and run `npm run preview:editor` in another terminal.

### Origin / notes migration

`localStorage` is scoped per origin. Notes saved under the old localhost origin
(`http://127.0.0.1:43117`) do **not** move automatically to
`https://arverma.github.io`. Copy anything you still need before clearing site data.

If you previously installed the macOS LaunchAgent from an older build, unload it:

```bash
launchctl bootout "gui/$(id -u)/com.contexteditor.localserver" 2>/dev/null || true
rm -f ~/Library/LaunchAgents/com.contexteditor.localserver.plist
```

---

## Usage

- **New note** — the "+ New note" button in the sidebar.
- **Switch / edit** — click a note in the sidebar; edits autosave (~0.6s debounce).
- **Edit / Preview** — toggle in the note title bar; Preview shows rendered Markdown.
- **Delete** — the trash icon on a note (appears on hover / when active).
- **Theme** — the System / Light / Dark control in the top-right; your choice is
  remembered.
- **Privacy** — the floating “Privacy” button (bottom-right) opens the privacy policy.

---

## Scripts

| Script | What it does |
| --- | --- |
| `npm run build` | Build both the extension (`dist/`) and the editor site (`dist-editor/`). |
| `npm run build:extension` | Build only the extension shell. |
| `npm run build:editor` | Build only the editor static site (Pages path `/ConTextEditor/`). |
| `npm run dev:editor` | Vite HMR server for the editor. |
| `npm run preview:editor` | Build editor + Vite preview (production-like). |
| `npm run package` | Build extension + zip `dist/` for Web Store upload. |
| `npm run icons` | Regenerate the extension PNG icons. |

---

## Troubleshooting

- **Editor tab fails to load** — check that GitHub Pages is deployed
  (`https://arverma.github.io/ConTextEditor/`). For local work use
  `npm run dev:editor` or `preview:editor`.
- **Gemini's "@" picker doesn't list the tab** — make sure the tab is an
  `https://arverma.github.io/...` URL (not `chrome-extension://`). See
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **New toolbar icon not showing** — reload the unpacked extension at
  `chrome://extensions` (Chrome caches the old icon).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, code layout, and conventions.

## License

Licensed under the [Apache License 2.0](LICENSE). Copyright 2026 Aman Ranjan Verma.
