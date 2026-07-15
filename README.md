# Context Editor Tab

A Chrome extension that opens a Monaco editor in a normal browser tab so
**Gemini in Chrome** can pick it up via `@` tab context. Click the toolbar icon,
write, and point the AI at the tab.

Notes stay in `localStorage` on the editor origin — never uploaded by this app.

**Live editor:** [https://arverma.github.io/ConTextEditor/](https://arverma.github.io/ConTextEditor/)

## Why this shape

Gemini's `@` picker **excludes `chrome-extension://` pages by URL scheme**. So:

- The **editor** is a static site on GitHub Pages (`https://…`).
- The **extension** only opens or re-focuses that tab.

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Features

- Monaco Markdown editor with **Edit | Preview** (sanitized HTML; Mermaid fences in Preview)
- Multi-note history, autosaved locally
- System / Light / Dark theme
- Tab reuse (icon focuses the existing editor tab)
- Word/char counts; Export TXT (Edit) or PDF via print (Preview)
- Privacy FAB → policy page

## Install

1. Install from the Chrome Web Store (once published), or load unpacked `dist/` (see below).
2. Pin the icon and click it → `https://arverma.github.io/ConTextEditor/`.
3. In Gemini, type `@` and pick the **Context Editor** tab.

Privacy: [privacy.html](https://arverma.github.io/ConTextEditor/privacy.html).  
Store checklist: [docs/STORE.md](docs/STORE.md).

## Development

Requires Node.js 18+ and Chrome.

```bash
npm install
npm run build            # dist/ (extension) + dist-editor/ (editor site)
```

Load `dist/` at `chrome://extensions` → Developer mode → Load unpacked. By default
the extension opens the live Pages URL. Pages deploy on push to `main`.

**Editor iteration**

```bash
npm run dev:editor       # http://localhost:5173/ConTextEditor/
npm run preview:editor   # http://localhost:4173/ConTextEditor/
```

Point a local extension build at the preview server:

```bash
VITE_EDITOR_ORIGIN=http://127.0.0.1:4173 VITE_EDITOR_BASE=/ConTextEditor npm run build:extension
```

`localStorage` is per-origin — notes on localhost do not appear on Pages.

## Usage

- **New note** — sidebar “+ New note”
- **Switch / edit** — click a note; edits autosave (~0.6s)
- **Edit / Preview** — title bar toggle
- **Export** — TXT in Edit; PDF (print → Save as PDF) in Preview
- **Delete** — trash icon on a note
- **Theme** — System / Light / Dark (top-right)

## Scripts

| Script | What it does |
| --- | --- |
| `npm run build` | Extension + editor |
| `npm run build:extension` | Extension → `dist/` |
| `npm run build:editor` | Editor site → `dist-editor/` |
| `npm run dev:editor` | Vite HMR |
| `npm run preview:editor` | Production-like preview |
| `npm run package` | Zip `dist/` for Web Store |
| `npm run icons` | Regenerate toolbar PNGs |

## Troubleshooting

- **Tab won't load** — confirm Pages is up, or use `dev:editor` / `preview:editor`.
- **Gemini `@` missing the tab** — URL must be `https://arverma.github.io/...`, not `chrome-extension://`.
- **Stale toolbar icon** — reload the unpacked extension at `chrome://extensions`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[Apache License 2.0](LICENSE). Copyright 2026 Aman Ranjan Verma.
