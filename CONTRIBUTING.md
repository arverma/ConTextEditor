# Contributing

Keep the website small, accessible, and local-first.

## Setup

Use Node.js 24 LTS, then install the website and isolated test dependencies:

```bash
npm ci
npm ci --prefix tests
npm run dev
```

Open `http://localhost:5173/ConTextEditor/`. Use `npm run preview` for a production
build served at `http://localhost:4173/`. Browser storage belongs to
the origin, so use a separate local port and disposable notes for data-flow tests.

## Project layout

- `src/editor/` — website source, editor, preview, styles, and local storage.
- `src/editor/public/` — sitemap and legacy `editor.html` redirect, copied as-is.
- `vite.editor.config.ts` — website build into `dist-editor/`.
- `tests/` — isolated regression-test package.
- `.github/workflows/deploy-pages.yml` — GitHub Pages deployment.
- `docs/ARCHITECTURE.md` — runtime and data-safety design.
- `tasks/` — existing implementation plans and verification evidence.

## Conventions

- Use strict TypeScript and preserve existing saved note data.
- Keep note storage, imports, and backup parsing local; never upload notes.
- Bundle app assets and Monaco workers; do not introduce remote app code.
- Preserve exact Markdown source and sanitize rendered preview output.
- Test failed saves and recovery paths when changing storage behavior.
- Comments should explain why a choice exists.

## Before a pull request

```bash
npm test
npx tsc --noEmit
npm run build
```

Check the affected browser flow, keyboard access, narrow layouts, and both themes.
Verify `dist-editor/` includes `index.html`, `privacy.html`, and `sitemap.xml`.
Do not commit generated output or use existing user notes as destructive fixtures.
