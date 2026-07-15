# Contributing

Thanks for improving Context Editor Tab! This is a small, dependency-light project;
please keep it that way.

## Dev setup

```bash
npm install
npm run build            # builds dist/ (extension) and dist-editor/ (editor site)
```

Load `dist/` as an unpacked extension (`chrome://extensions` → Developer mode →
Load unpacked), then click the toolbar icon. By default it opens the live GitHub
Pages editor.

For fast iteration on the editor UI:

```bash
npm run dev:editor
# http://localhost:5173/ConTextEditor/editor.html
```

Or a production-like local check:

```bash
npm run preview:editor
# http://127.0.0.1:4173/ConTextEditor/editor.html
```

Changes to `background.ts` or `manifest.json` require `npm run build:extension`
**and** reloading the extension in `chrome://extensions`.

Optional local E2E (extension → Vite preview instead of Pages):

```bash
npm run preview:editor   # keep running
VITE_EDITOR_ORIGIN=http://127.0.0.1:4173 VITE_EDITOR_BASE=/ConTextEditor npm run build:extension
# then reload the unpacked dist/
```

## Code layout

```
manifest.json                 Extension manifest (MV3)
vite.extension.config.ts       Builds the extension → dist/
vite.editor.config.ts          Builds the editor site → dist-editor/ (base /ConTextEditor/)
src/background/background.ts    Icon-click handler: open/reuse the editor tab
src/editor/                     The editor web app (see docs/ARCHITECTURE.md)
scripts/package-extension.cjs   Zip dist/ for Web Store upload
scripts/make-icons.cjs          Regenerate PNG toolbar icons
.github/workflows/              GitHub Pages deploy
docs/ARCHITECTURE.md            Design + rationale — read this first
docs/STORE.md                   Chrome Web Store publish checklist
```

## Conventions

- **TypeScript strict** for all `src/` code (`tsconfig.json`). Run `npx tsc --noEmit`
  before submitting.
- **Keep extension permissions minimal.** The manifest requests only `"tabs"`; don't
  add `host_permissions` or broaden scope without a strong reason.
- **Notes stay local.** Storage goes through [`storage.ts`](src/editor/storage.ts)
  (`localStorage`); don't add network calls that upload note content.
- **No CDNs / remote code in the app bundle.** Assets (incl. Monaco's worker and the
  favicon) are bundled/inlined so the app is self-contained once downloaded.
- Match the surrounding style; keep comments focused on *why*, not *what*.

## Regenerating icons

The toolbar icons are procedurally generated (no image tooling needed):

```bash
npm run icons            # writes public/icons/icon-{16,48,128}.png
npm run build:extension  # copies them into dist/
```

Edit the color/mark in [`scripts/make-icons.cjs`](scripts/make-icons.cjs); keep it in
sync with the app accent (`--accent` in `editor.css`) and the `<>` brand mark.

## Before opening a PR

- `npx tsc --noEmit` passes.
- `npm run build` succeeds.
- Manually verify the flow you touched (open the tab, edit/save, switch notes, theme
  toggle) — see the verification steps in the PR description or the architecture doc.
