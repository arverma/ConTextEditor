# Contributing

Small project — keep it lean.

## Setup

```bash
npm install
npm run build
```

Load `dist/` unpacked at `chrome://extensions`. Default icon target is live Pages.

```bash
npm run dev:editor          # http://localhost:5173/ConTextEditor/
npm run preview:editor      # http://localhost:4173/ConTextEditor/
```

`background.ts` / `manifest.json` changes need `npm run build:extension` and a
reload in `chrome://extensions`.

Local E2E against Vite preview:

```bash
npm run preview:editor   # keep running
VITE_EDITOR_ORIGIN=http://127.0.0.1:4173 VITE_EDITOR_BASE=/ConTextEditor npm run build:extension
```

## Layout

```
manifest.json                  MV3 extension
vite.extension.config.ts       → dist/
vite.editor.config.ts          → dist-editor/
src/background/background.ts   Open/reuse editor tab
src/editor/                    Editor app (docs/ARCHITECTURE.md)
scripts/                       package zip, icon regen
docs/STORE.md                  Web Store checklist
```

## Conventions

- Strict TypeScript (`npx tsc --noEmit`).
- Manifest stays at `"tabs"` only unless there's a strong reason.
- Notes stay in `localStorage` via `storage.ts` — no upload.
- No CDNs / remote app code; bundle assets (incl. Monaco worker).
- Comments explain *why*, not *what*.

## Icons

```bash
npm run icons && npm run build:extension
```

Edit `scripts/make-icons.cjs`; keep colors aligned with `--accent` in `editor.css`.

## Before a PR

- `npx tsc --noEmit` and `npm run build` pass.
- Spot-check the flow you touched (open tab, edit/save, switch notes, theme).
