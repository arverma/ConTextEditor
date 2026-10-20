# ConText Editor

A local-first Markdown editor website with a comfortable writing surface,
live preview, persistent note history, and complete backups. Open it in your
browser and start writing; no installation or account is required.

**Live editor:** [Open ConText Editor](https://editor.arverma.dev/)

Notes stay in browser storage on the editor origin and are never uploaded by
this app. [Privacy policy](https://editor.arverma.dev/privacy.html).

## Features

- Markdown editing with Edit/Preview, sanitized HTML, and Mermaid diagrams
- Centered writing, Full width, and distraction-free Focus mode
- Searchable note history, autosave, persistent Trash, and quick Undo
- Copy Markdown, raw text download, and PDF export through browser printing
- UTF-8 Markdown import and complete JSON backup/restore
- System, Light, and Dark themes; keyboard commands and responsive layouts

See [the architecture](docs/ARCHITECTURE.md) for implementation details.

## Development

Use Node.js 24 LTS (the tests also support Node 20.19+ or 22.12+).

```bash
npm ci
npm run dev       # http://localhost:5173/ConTextEditor/
npm run build     # standalone website in dist-editor/
npm run preview   # production build at http://localhost:4173/
```

GitHub Pages deploys the website on pushes to `main`. The editor root, privacy
page, and sitemap are included in the production build. `localStorage` is
per-origin: localhost notes do not appear on the deployed website.

## Usage

- **New note** — sidebar “+ New note”
- **Switch / edit** — click a note; edits autosave (~0.6s)
- **Markdown / Rich** — title bar toggle. Markdown changes the raw Markdown. Rich is the same note as a document: bold, italic, strikethrough, link, lists, quote, and inline code appear when text is selected. Opening Rich does not change the file. The first edit there can normalize ordinary Markdown; front matter, fenced code, and HTML blocks stay as written until that block changes.
- **Format text** — in Edit, Ctrl/Cmd+B and Ctrl/Cmd+I toggle bold and italic. In Preview, select text for bold, italic, strikethrough, link, lists, quote, and inline code.
- **Export** — TXT in Edit; PDF (print → Save as PDF) in Preview
- **Download image** — use the download icon in a Mermaid diagram’s top-right corner or beside a centered Markdown table’s top-right edge. The expanded diagram also has a download icon. Images include the full content in the current theme.
- **Delete** — trash icon on a note; Undo is available for 10 seconds
- **Focus mode** — hide surrounding controls; use Exit focus or Escape to return. Available in the toolbar and command menu.
- **Full width** — expand the centered writing column for wide code or diagrams
- **Copy Markdown** — copy the complete raw note from Edit or Preview; manual copy opens if clipboard access is unavailable
- **Theme** — System / Light / Dark (top-right)

On phones, the header keeps note history, save status, and **More note actions**
visible. Edit/Preview stays beside the note title. Open More for Copy, Export,
Focus mode, Full width, Commands, Privacy, and appearance choices. Desktop controls
return to their usual positions when the window grows.

On phones, Mermaid diagrams can be scrolled without shrinking their labels. Choose **Expand**
for a larger view, use its zoom controls, and close it to return to the same
reading position. Invalid diagrams show their source and an error message.

## Keyboard shortcuts

Open **Commands & shortcuts** using the keyboard icon, **Cmd/Ctrl+K**, or
**Cmd/Ctrl+Shift+/**. Search for an action, use Up/Down to navigate, Enter to
run it, and Escape to close. Button tooltips show their shortcuts.

- **Cmd/Ctrl+Shift+Enter** — new note
- **Cmd/Ctrl+\** — toggle note history
- **Cmd/Ctrl+Shift+F** — open history and search notes
- **Cmd/Ctrl+E** — switch Markdown / Rich
- **Cmd+Option** (Mac) — press together and release to switch Markdown / Rich;
  adding another key cancels the toggle so other shortcuts keep working
- **Cmd/Ctrl+Shift+E** — export raw text in Edit, PDF in Preview
- **Cmd/Ctrl+S** — save immediately (autosave stays enabled)
- **Cmd/Ctrl+Shift+Backspace** — delete current note (Undo available)
- **Alt/Option+Shift+1 / 2 / 3** — System / Light / Dark theme
- **Alt/Option+Shift+P** — privacy policy

Standard editor shortcuts remain available, including undo/redo, cut/copy/paste,
select all, **Cmd/Ctrl+F** to find, and **Cmd/Ctrl+R** to replace while editing.

Mac editor navigation follows the usual writing keys while the source editor has focus:

- **Cmd+← / →** — start/end of the current line.
- **Cmd+↑ / ↓** — start/end of the document.
- **Option+← / →** — previous/next word boundary.
- **Option+↑ / ↓** — move the current line or selected lines up/down.
- Add **Shift** to word navigation or Command-arrow navigation to extend selection.
- **Option+Shift+↑ / ↓** — copy the current line or selected lines up/down.

## History and recovery

Search matches note titles and raw content locally, ignoring case. Arrow keys
move focus through notes; Enter or Space opens one. Escape clears search before
closing the mobile history drawer. Search does not change the note being edited.

Deletion uses the same Undo action for mouse and keyboard. Each deletion can be
undone for 10 seconds, newest first; hovering or focusing the notification pauses
the timer. After the toast expires or the page reloads, the note remains in
**Trash** until you explicitly delete it forever. Restore keeps the original source
and timestamps; an occupied note ID can be restored as a new copy. Typing after
deleting the last note creates a saved note.
If saving fails, keep the tab open, export your draft, and use Retry save.

## Import and backups

Open **Import & backup** at the bottom of note history, or use the command menu.
Markdown imports accept UTF-8 `.md` and `.markdown` files, up to 5 MiB per batch.
Review the complete batch before adding it. Only an initial encoding BOM is
removed; remaining source, line endings, and code fences are preserved.

**Download backup** saves version 1 JSON containing all notes, Trash, original
IDs/timestamps, active-note reference, and recognized appearance preferences.
If local saving fails, the download still includes the latest in-memory draft
when the existing collection can be read. Check the browser downloads; the app
cannot confirm where the browser ultimately saves the file. Backups are plain
JSON, not encrypted or uploaded to a cloud service.

**Restore backup** accepts ConText JSON up to 5 MiB. Review the additive merge:
identical IDs/content are skipped, conflicts become copies, and Trash stays
separate from active notes. Existing work is never replaced. Appearance restore
is optional. A changed collection invalidates a pending review; close and review
again. All collection changes use one atomic local save. A failed save leaves
the previous collection intact. Appearance settings are applied separately after
note restoration and failures are reported without undoing restored notes.

Notes and Trash belong to this browser origin. Clearing site data removes both;
keep a downloaded backup for independent recovery. Reload older editor tabs
before using these features. Simultaneous multi-tab edits remain last-write-wins.

## Tests

The test tools are isolated from the app's build dependencies. Use Node 24 LTS
(or supported Node 20.19+/22.12+ releases):

```bash
npm ci --prefix tests
npm test
npx tsc --noEmit
npm run build
```

Tests use isolated browser-like storage and cover note lifecycle, failed saves,
Undo timing, history focus/search, mobile drawer transitions, export, and shortcuts.
Browser checks should use a separate local origin with disposable notes, rather
than deleting or replacing existing user notes. Simultaneous edits to the same
note in multiple tabs still use last-write-wins storage; this is not collaborative
editing. Unsaved local edits are preserved as a new note after external deletion.

## Scripts

- `npm run dev` — local website with live updates.
- `npm run build` — production website in `dist-editor/`.
- `npm run preview` — build and serve a production preview.
- `npm test` — run the isolated test suite after installing `tests/` dependencies.
- The existing `dev:editor`, `build:editor`, and `preview:editor` aliases remain available.

## Troubleshooting

- **Page will not load** — confirm GitHub Pages is available, or run the local development server.
- **Notes seem missing** — check the browser profile and website origin. Browser storage is separate for each.
- **Saving fails** — keep the page open, download a backup of your draft, and retry after freeing space.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[Apache License 2.0](LICENSE). Copyright 2026 Aman Ranjan Verma.
