# ConText Editor

A local-first Markdown editor that runs in the browser. One note string is the source of truth: **Markdown** is a CodeMirror view of that string, and **Rich** is a Tiptap document that writes Markdown back only after an edit. Notes, Trash, and appearance settings stay in `localStorage` on the page origin. The app does not upload them.

**Live editor:** [editor.arverma.dev](https://editor.arverma.dev/) · [Privacy policy](https://editor.arverma.dev/privacy.html) · [Source](https://github.com/arverma/ConTextEditor)

## Stack

| Piece | Role |
| --- | --- |
| [Vite 5](https://vite.dev/) | Dev server and production build |
| TypeScript (strict, `noEmit`) | App source under `src/` |
| [CodeMirror 6](https://codemirror.net/) | Markdown source editor, find/replace, emoji completions |
| [Tiptap 3](https://tiptap.dev/) | Rich editor and Markdown parse/serialize |
| [DOMPurify](https://github.com/cure53/DOMPurify) | Sanitize raw HTML blocks shown in Rich mode |
| [Mermaid](https://mermaid.js.org/) | Diagrams in Rich mode (`securityLevel: "strict"`) |
| `diff`, `sql-formatter`, `yaml` | Local diff checker (text, JSON, YAML, SQL) |

There is no backend, account, or remote app script. Assets are bundled with the site.

## Requirements

Node.js must satisfy the test package: **20.19+**, **22.12+**, or **24+**. GitHub Actions builds with Node 22. The root `package.json` `engines` field (`>=18`) is looser than Vitest allows; use a version the tests accept.

Install both lockfiles. Tests are a separate package so Vitest, jsdom, and Playwright stay out of the site bundle.

```bash
npm ci
npm ci --prefix tests
```

## Quick start

```bash
npm run dev       # http://localhost:5173/ConTextEditor/
npm run build     # static site in dist-editor/
npm run preview   # rebuild, then http://localhost:4173/
```

The dev server is the only mode that uses the `/ConTextEditor/` base path. `vite preview` and production use `/`, so asset URLs differ. `localStorage` is per origin: notes created on localhost do not appear on [editor.arverma.dev](https://editor.arverma.dev/).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with live reload |
| `npm run build` | Production build into `dist-editor/` |
| `npm run preview` | Build, then serve that output |
| `npm test` | Vitest in `tests/` (jsdom). Requires `npm ci --prefix tests` |
| `npx tsc --noEmit` | Typecheck `src/` only |
| `npm --prefix tests run test:browser` | Playwright smoke test. Start `npm run dev` first |

`dev:editor`, `build:editor`, and `preview:editor` are aliases of the scripts above.

`make` wraps the same steps: `install`, `dev`, `build`, `preview`, `test`, `test-browser`, `typecheck`, `verify` (test + typecheck + build), and `clean` (deletes `dist-editor/`).

The browser test opens `http://127.0.0.1:5173/ConTextEditor/` unless `EDITOR_BASE_URL` is set. It needs the dev server running and Playwright’s Chromium (`npx --prefix tests playwright install chromium`).

## Repository layout

```
src/editor/                 Vite root (HTML, CSS, TypeScript)
  editor.ts                 Theme, view mode, and panel wiring
  note-session.ts           Active note, 600ms autosave, delete and restore
  source-editor.ts          CodeMirror Markdown editor
  preview-editor.ts         Tiptap rich editor
  markdown-document.ts      Parse and serialize; protected slices stay verbatim
  storage.ts                localStorage notes and Trash
  ownership.ts              UTF-8 Markdown import and version-1 JSON backup
  recovery.ts               10-second undo toast after delete
  shortcuts.ts              Command palette and shortcut bindings
  diff-checker.ts           Local diff and format tool
  public/                   Copied as-is: sitemap.xml, robots.txt, editor.html
vite.editor.config.ts       Build config. Output is dist-editor/
tests/                      Vitest package, plus tests/browser/editor-preview.mjs
docs/ARCHITECTURE.md        Editing model in more detail
.github/workflows/deploy-pages.yml
```

`src/editor/public/editor.html` redirects old `/editor.html` links to the site root. `index.html` and `privacy.html` are Rollup inputs; everything else in `public/` is copied unchanged. Do not commit `dist-editor/`.

## Editing model

`NoteSession` owns the current note string. UI loads must not be treated as edits.

- **Markdown** edits that string directly. Line endings, a leading BOM, and CodeMirror undo history stay intact.
- **Rich** parses the string into a Tiptap document. Switching modes without typing does not change the file. The first Rich edit can normalize ordinary Markdown. Front matter, fenced code, and HTML blocks are copied back verbatim until that block itself changes.
- Autosave, copy, export, note switching, and closing the tab flush Rich first, so the stored string includes the last edit.
- History, Trash, import, and backup operate on the stored string. They do not know which surface is open.
- A failed save leaves the previous collection intact and keeps the draft on screen.

Raw HTML blocks in Rich mode are sanitized with DOMPurify before they are inserted. Mermaid runs with `securityLevel: "strict"`. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Browser storage

Keys on the editor origin:

| Key | Contents |
| --- | --- |
| `context-editor.snippets` | Notes and Trash in one collection |
| `context-editor.activeSnippetId` | Selected note |
| `context-editor.theme` | `light` or `dark`. System theme removes the key |
| `context-editor.viewMode` | `edit` or `preview` |
| `context-editor.fullWidth` | `true` or `false` |
| `context-editor.sidebarOpen` | `true` or `false` |
| `context-editor.diffChecker` | Diff checker text and options |

Import accepts UTF-8 `.md` and `.markdown` files, 5 MiB per batch. Backups are plain JSON (`format: "context-editor-backup"`, `version: 1`), also capped at 5 MiB. Restore merges; it does not replace existing notes. Clearing site data deletes notes and Trash. Two tabs editing the same note are last-write-wins.

Use a separate origin and disposable notes when testing storage. Do not wipe a profile that already has real notes.

## Tests

```bash
npm test
npx tsc --noEmit
npm run build
```

`make verify` runs those three. Tests use isolated browser-like storage and cover note lifecycle, failed saves, undo timing, history search, export, shortcuts, Rich editing, and the diff checker. The Playwright script checks that typing in Markdown, switching to Rich, and editing there keeps one document.

CI does not run tests. `.github/workflows/deploy-pages.yml` only installs, builds, and deploys.

## Deployment

A push to `main` (or a manual run of **Deploy website to GitHub Pages**) builds with Node 22 and publishes `dist-editor/` to GitHub Pages. The public site is [https://editor.arverma.dev/](https://editor.arverma.dev/). Confirm the artifact contains `index.html`, `privacy.html`, `sitemap.xml`, `robots.txt`, and `editor.html`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep storage local, preserve exact Markdown source, sanitize raw HTML blocks, and test failed saves when storage behavior changes. Shortcut bindings live in `src/editor/shortcuts.ts`.

## License

[Apache License 2.0](LICENSE). Copyright 2026 Aman Ranjan Verma.
