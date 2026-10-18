# Architecture

ConText Editor is a standalone static website hosted at
`https://arverma.github.io/ConTextEditor/`. The application runs in the browser;
there is no application server, account service, or note synchronization service.

## Build and deployment

`vite.editor.config.ts` uses `src/editor/` as the source root and `/ConTextEditor/`
as the public base path. `npm run build` creates the deployable `dist-editor/`
website. GitHub Pages deployment uploads that directory on pushes to `main`.
The `build:editor`, `dev:editor`, and `preview:editor` script aliases still work.

The build includes the editor root, `privacy.html`, and bundled assets.
`public/sitemap.xml` lists the two public pages. `public/editor.html` preserves
old bookmarks by redirecting to the root; it is excluded from the sitemap.
Monaco workers and application dependencies are bundled locally.

## Runtime

- `editor.ts` initializes Monaco, theme, view state, export, and feature controllers.
- `note-session.ts` owns draft saving and note transitions, preserving pending
  edits when persistence fails.
- `storage.ts` stores active notes and Trash together in browser localStorage.
- `history-panel.ts`, `sidebar.ts`, and `trash-panel.ts` manage note navigation,
  responsive dialogs, search, and recovery.
- `writing-layout.ts` and `focus-mode.ts` preserve editor state while changing
  width or hiding surrounding controls.
- `shortcuts.ts` provides keyboard commands and the searchable command menu.
- `markdown-preview.ts` renders Markdown through marked and DOMPurify, loading
  Mermaid when needed. Raw imported HTML remains source text until previewed.
- `copy-markdown.ts` copies the complete live source, with a manual fallback.
- `export.ts` downloads raw text or invokes browser printing for PDF.
- `ownership.ts` validates imports/backups and prepares additive merges;
  `ownership-panel.ts` handles file selection, review, and confirmation.
- `editor.css` defines the writing interface; `ownership.css` styles library
  actions and utility dialogs using the same theme tokens.

## Full-text mirror

Monaco virtualizes its visible lines. The visually hidden `#full-text-mirror`
contains the complete raw Markdown so browser tab-content tools can read the
whole note. The app does not send that text to any external service. A user may
choose to share browser content through other tools independently.

## Local data and recovery

Browser storage is scoped to the website origin and profile. Important keys are:

- `context-editor.snippets` — records containing `id`, `content`, `updatedAt`,
  and optional `trash` metadata (`id`, `deletedAt`, `wasActive`).
- `context-editor.activeSnippetId` — selected active note.
- `context-editor.viewMode` — Edit or Preview.
- `context-editor.theme` — Light or Dark; absence follows the system theme.
- `context-editor.fullWidth` and `context-editor.sidebarOpen` — layout preferences.

Titles derive from the first Markdown line. Active and Trash records share one
array, so a deletion, restoration, purge, or reviewed batch import commits in one
atomic localStorage write. Failed writes preserve the previous complete array.
The short Undo notification references the same persistent Trash operation ID.
Trash has no automatic expiration; permanent deletion requires confirmation.

Storage is last-write-wins across simultaneous tabs. Import and restore reviews
carry a collection token and refuse to commit if notes changed after review.
This protects stale batch operations without promising collaborative editing.
Keep an unsaved draft open if storage fails; retry or download a backup.

## Import and backups

Markdown import accepts local UTF-8 `.md`/`.markdown` batches up to 5 MiB, removing
only an initial BOM and preserving remaining source. Files are validated and
reviewed before any batch commit.

Version 1 JSON backups include active notes, Trash, IDs/timestamps, active-note
reference, and recognized preferences. Export includes a pending draft even if
local saving fails, provided the existing collection is readable. Download
feedback reports a request; the browser controls the final file destination.

Restore validates the whole backup before an additive merge. Identical records
are skipped, ID conflicts become copies, and Trash stays separate. Appearance
restore is opt-in and applied after notes commit, with separate failure feedback.
Backups are unencrypted local files. Clearing site data removes notes and Trash,
while downloaded files remain until deleted separately.

## Theme and validation

System/Light/Dark themes use CSS tokens and matching Monaco themes. A small
head script applies the saved preference before paint. Focus mode is session-only.

Use `npm test`, `npx tsc --noEmit`, and `npm run build` for verification. Test tools
live in the independent `tests/` package; browser checks use disposable local
origins. See `tasks/` for plans and recorded runtime evidence.
