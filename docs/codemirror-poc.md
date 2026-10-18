# Isolated CodeMirror proof of concept

User-authorized evaluation; Monaco remains the main editor. Existing work and plans stay intact.

## Acceptance checklist

- [x] A separate development-only page, with disposable content and no access to note storage.
- [x] Raw Markdown is authoritative; preserve untouched syntax, whitespace, CRLF/LF/mixed line endings, and final newline.
- [x] Formatting selections: bold, italic, inline code; Enter inserts a line break in Visual; undo/redo restores exact source.
- [x] Drag handles reorder whole Markdown blocks (including lists, tables, and Mermaid fences) without reserializing them.
- [x] Existing sanitized preview, Mermaid viewer, table/diagram PNG downloads, raw download, and print/PDF work in the prototype.
- [x] Browser checks at desktop and phone widths; report touch dragging and physical mobile-keyboard checks separately.
- [x] Existing tests, type checking, and production build pass; prototype excluded from production build.

## Build order

Source-preserving CodeMirror state and regression tests → isolated page and reused preview/export → source-based block moves → browser validation.

This is an evaluation, not a migration or a promise of feature parity. Native phone IME, clipboard, and touch dragging require device validation before a production decision.

## Verified results — 18 October 2026

- Node 24: 114 tests across 22 files pass, including existing Monaco regressions; TypeScript and production build pass.
- Chromium and WebKit: exact UTF-8 raw downloads (BOM, Unicode, mixed line endings, empty file), formatting, keyboard shortcuts, undo/redo, mixed-ending paste, block buttons and desktop drag, stale drag rejection, unsafe move rejection, invalid/oversized import rejection, sanitized HTML, invalid Mermaid fallback, table/diagram PNG, expanded diagrams, print/PDF, light/dark layouts, 320–1440px widths, and the 50 KiB large fixture pass.
- Emulated Chromium touch: drag, cancel, undo, tap-based reorder, 320/390px phones and landscape pass.
- Block source tests: all move permutations for lists/tables/fences; whitespace and final-newline preservation; CRLF/LF/CR; full-history restoration; multi-edit transactions; 120 seeded random edits; BOM stays first; YAML frontmatter is pinned.
- Isolation tests: prototype modules have no note-storage imports or browser-storage API calls; prototype is excluded from production build entries and output. Runtime sentinel note storage remains unchanged.
- Dependency audit: no CodeMirror advisories reported. The eight reported vulnerabilities are in existing dependencies; their versions match the pre-prototype lockfile. This evaluation does not resolve those existing advisories.

## Remaining acceptance work before migration

- [ ] Firefox: local headless Firefox fails during launch with graphics/sandbox errors; no application result is claimed.
- [ ] Physical iPhone/Safari and Android/Chrome: native keyboard, IME composition, dictation, OS clipboard, selection handles, accessibility gestures, and real touch dragging.
- [ ] Keyboard/screen-reader usability and long-session editing/memory profiling beyond the current fixture size.
- [ ] Decide whether separate block organization is acceptable. The proof of concept uses an organizer beside source editing, not inline Notion-style visual block handles.

## Deliberate prototype limits

- Monaco remains the main editor. The separate page is development-only and stores nothing across reloads.
- All note history, Trash, backup/restore, and save-failure behavior remain owned by the existing app; they have not been migrated.
- Raw source snapshots in undo history and full-document replacements for formatting/moves favor correctness for this evaluation. A production adapter needs incremental edits and memory/performance validation.
- Block moves operate on top-level source slices. Nested lists move as whole lists; metadata cannot be moved away from the document start. Moves that change parsing boundaries or block types are refused.
- The large fixture is about 50 KiB; accepting files up to 5 MiB is not a performance claim for that size.

## Repeatable checks

Use Node 24 and install dependencies in the app and tests packages. Install Playwright browsers with `npx --prefix tests playwright install chromium firefox webkit` if they are not already available.

1. Start the disposable server: `npm run dev -- --host 127.0.0.1 --port 5174`.
2. Open `http://127.0.0.1:5174/ConTextEditor/poc.html`.
3. Run `npm test`, `npx tsc --noEmit`, and `npm run build`.
4. Run `POC_BROWSERS=chromium,webkit npm --prefix tests run test:poc:browser`.
5. Run `npm --prefix tests run test:poc:touch`.
6. On a machine with working headless Firefox, run `POC_BROWSERS=firefox npm --prefix tests run test:poc:browser`.

`POC_BASE_URL` can override the server URL; `POC_ARTIFACTS` can override the screenshot/PDF destination (default `/private/tmp/context-poc-browser`). Browser contexts are disposable and seeded with sentinel data, never with the user's actual notes.

Official API references used: [CodeMirror state](https://codemirror.net/docs/ref/#state), [history effects](https://codemirror.net/docs/ref/#commands.invertedEffects), and [Markdown language](https://github.com/codemirror/lang-markdown). Installed package type definitions were checked where the documentation site rejected access.


## Editable Visual mode milestone

The standalone page offers Source and Visual modes sharing the same raw Markdown and CodeMirror undo history. Source retains the split editor/preview and block organizer. Visual hides the source pane and makes supported text blocks editable. The selection toolbar offers bold, italic and inline code; Enter adds a line break in Visual. Undo, redo, Cmd/Ctrl+B and Cmd/Ctrl+I work in both modes.

Visible text is mapped to raw source offsets using the Markdown parser. Edits replace source slices rather than serializing the entire preview. Untouched Markdown, metadata, link destinations and original line endings remain intact. Typed/pasted punctuation is escaped so ordinary text does not silently become Markdown syntax. Enter inserts a Markdown hard break. Clipboard HTML and dropping content into Visual are blocked.

This is deliberately a limited proof of concept: tables, diagrams, raw HTML, images, strikethrough, padded/multiline code spans, duplicate text blocks, and complex inline constructs stay Source-only. Cross-style selections and structural changes are refused. Visual mode does not yet offer creating/deleting paragraphs, link destination editing, or Notion-style inline block handles. Native IME composition has a reconciliation path but still requires physical-device testing. Undo/redo restores source and rerenders preview; caret restoration through undo is not implemented.

Validation for this milestone: 120 unit tests pass, TypeScript and production build pass; the existing Chromium/WebKit suite still passes for exports, formatting, history, block moves, safety, responsive widths and storage isolation. The new `npm --prefix tests run test:poc:visual` checks browser typing, bold/italic/code, deletion, line breaks, safe paste, source/visual switching and guarded selections. The drag regression scrolls the organizer into view before dragging so layout changes cannot select a neighboring handle during auto-scroll. Main Monaco and user notes remain outside the prototype.


## Selection and contextual formatting follow-up

Fixed a visible source-selection defect: the opaque active-line background covered CodeMirror's selection layer. The active line now uses a translucent background, and both themes use a stronger selection highlight. Verified desktop dragging in the open in-app browser as well as isolated Chromium and WebKit.

Bold, italic and inline code now appear in a floating toolbar beside a nonempty selection in Source and supported Visual text blocks. The toolbar stays inside the viewport/editor, waits until pointer selection ends, follows scrolling/resizing, and hides when the selection collapses or focus leaves. Pointer actions retain editor focus. Alt+F10 focuses the toolbar for keyboard use; Escape dismisses it. Visual formatting retains the selected text for consecutive formatting actions. A WebKit touch path applies formatting once on pointer-down because preventing focus can suppress its synthesized click.

`npm --prefix tests run test:poc:selection` checks real desktop mouse dragging, visible source selection, source/visual formatting, retained Visual selection, keyboard access/dismissal, mobile placement, and touch activation in Chromium and WebKit. Physical trackpads and native mobile selection handles still need manual testing. Existing Visual structural limitations remain; this improves selection and formatting rather than completing general rich-text editing.

## Plan-style rendered editing follow-up

Visual mode now supports direct text editing in paragraphs, headings, ordinary list items, nested list items, and checklists. Enter inserts a line break within the same item; the selection toolbar contains only bold, italic and inline code. Checklist controls and nested lists remain intact while editing item text. Source offsets are mapped back to the original Markdown, including list continuation indentation and mixed line endings, so an edit does not rewrite unrelated source. Edits that would change a Markdown block boundary or formatting unexpectedly are refused. `npm --prefix tests run test:poc:plan` exercises these interactions in Chromium and WebKit. This remains an isolated prototype, separate from the Monaco editor and saved notes.
