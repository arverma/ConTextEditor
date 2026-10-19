# Architecture

ConText Editor is a local-first website. Notes, Trash, and appearance settings stay in `localStorage` on the editor origin. Nothing in the editor uploads a note.

## Editing

One note string is the source of truth, owned by `NoteSession`.

- **Edit** is a CodeMirror view of that string. Line endings, a leading BOM, and undo history keep the original spelling. Find, replace, emoji shortcodes, and the documented line and word keys live here.
- **Preview** is a Tiptap document parsed from that string. It writes Markdown back only after an edit, one history step per burst. Switching back without typing leaves the file unchanged. The first Preview edit can normalize ordinary Markdown. Front matter, fenced code, and HTML blocks are copied back verbatim until that block itself changes.
- Autosave, copy, export, note switching, and closing the tab flush Preview first, so the last edit is the string that gets stored.

Rendered HTML is sanitized. Mermaid diagrams and tables can be downloaded as images from Preview. Print uses the visible Preview.

## Notes

History, Trash, import, and backup operate on the stored string. They do not know which editor surface is open. A failed save leaves the previous collection intact and keeps the draft on screen.
