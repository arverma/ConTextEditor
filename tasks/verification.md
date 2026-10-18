# Verification: Note safety and history usability

Validated on 2026-10-18. All six planned improvements are implemented.

## Automated checks

- 27 tests across six suites pass using Node 24.19.0.
- `npx tsc --noEmit` passes.
- `npm run build` passes for the website. The existing large-chunk
  advisory remains; this change does not alter the bundling strategy.
- `git diff --check` passes.
- A clean `npm ci` of the isolated tests package succeeds from its lockfile.
- Test dependencies have no invalid Vite peers and reported zero vulnerabilities
  on installation. The app's original package-lock.json is unchanged.

Coverage includes pending saves before selection/deletion, stable timestamps on
load, final-note editing, failed saves and retries, malformed-storage protection,
external deletion with unsaved edits, selection-preference failure, identity-safe
restore, inactive-note restore, independent Undo expiry/pause, literal title/body
search, focus retention across refresh/reordering, 40-note histories, mobile
breakpoint cleanup, Undo inside the modal, ARIA selected states, modifier-only
shortcut cancellation, exact raw export content, and PDF print/title handling.

## Actual IDE browser

Used a separate origin on port 5174 with disposable notes. The user's notes on
port 5173 were not edited, deleted, or replaced by these checks.

- Reload preserved saved note text.
- Keyboard deletion and trash click exposed the same Undo action.
- Undo restored the complete latest note content and preserved current selection
  when restoring an inactive note.
- Search matched a literal body substring; keyboard search opened/focused history.
- With 13 notes, the list scrolled. End moved focus without selecting; Enter
  selected the focused note and loaded its content.
- Cmd+Option switched to preview; Markdown and Mermaid rendered and the raw mirror
  retained the Markdown source.
- Light/dark theme buttons exposed correct selected states.
- At widths 320, 390, 751, and 1280, shell scrollWidth matched viewport width and
  all header/titlebar buttons stayed inside the viewport.
- Mobile history used a native modal with focus containment; Escape cleared search
  first; command menu and history did not remain open together; tapping the
  backdrop dismissed history and restored focus. Mobile Undo stayed interactive.
- Temporary viewport overrides were reset and the isolated test tab was closed.
  The ordinary development preview remains running on port 5173.

A stale development dependency cache briefly prevented a Mermaid dynamic import
following dependency restoration. Restarting the local preview with a fresh cache
resolved it; the actual rendered SVG was then verified. No runtime dependency
upgrade was kept in the app.

## Practical limits

Undo is in memory for 10 seconds per deletion, paused while hovered/focused; it is
not a durable Trash and does not survive reload. Multi-tab same-note simultaneous
edits remain last-write-wins; external deletion preserves pending local text as a
new note. Browser testing used desktop macOS with viewport emulation, not physical
mobile devices or other OS shortcut handling. PDF invocation/title restoration
was tested with a print stub; an actual OS Save as PDF dialog was not automated.

Test tooling is isolated under tests/ so the app retains its existing build
versions and Node requirement. Tests use supported Node 20.19/22.12 or Node 24+;
Node 24 LTS was used here. See README.md for installation and commands.
