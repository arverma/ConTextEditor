# Tasks: Note safety and history usability

Implementation and verification complete. See plan.md for behavior decisions and edge cases.

## 1. Reliable note lifecycle — medium
Dependencies: none.
Likely files: package.json, package-lock.json, editor.ts, focused lifecycle tests,
small test configuration if needed.
- [x] Add npm test with a minimal Vite-compatible Vitest setup.
- [x] Separate user edits from loads; flush before transitions; preserve timestamps.
- [x] Create a note on first edit after final deletion; show truthful save failures.
- [x] Protect unsaved edits when another tab deletes the current note.
Verification: lifecycle regression tests, type check, editor build.

## 2. Shared deletion and Undo — medium
Dependencies: 1.
Likely files: storage.ts, history-panel.ts, editor.ts, shortcuts.ts, recovery module
and focused tests as needed (split notification presentation into a follow-on
slice if file scope grows).
- [x] One deletion action for click, keyboard, and palette; flush before snapshot.
- [x] Independent 10-second snapshots, identity-safe restoration, failure handling.
- [x] Accessible Undo notification, count, timer pause, and stable focus.
Verification: fake-timer recovery tests; active/inactive/last-note/rapid deletion
and Undo after intervening edits; isolated browser notification check.

## Checkpoint A: Note safety
- [x] Latest edits survive selection, deletion/Undo, empty state, and reload.
- [x] Tests and build pass; existing notes require no destructive migration.

## 3. Keyboard history — medium
Dependencies: 1, 2.
Likely files: history-panel.ts, editor.css, focus behavior tests.
- [x] Separate native select/delete buttons with current-note semantics.
- [x] Arrow/Home/End focus movement; Enter/Space selection; normal Tab navigation.
- [x] Retain or deliberately restore focus across saves, deletion, and Undo.
Verification: keyboard-only browser flow and focus regression tests.

## 4. Search notes — medium
Dependencies: 3.
Likely files: history-panel.ts, index.html, editor.css, shortcuts.ts, search tests.
- [x] Local literal title/body filtering and distinct empty/no-match states.
- [x] Cmd/Ctrl+Shift+F and command action open/focus search.
- [x] Preserve active editor/query and implement Clear/Escape/create/Undo rules.
Verification: search tests and keyboard flow through filtered results.

## Checkpoint B: History integration
- [x] Search, selection, autosave, deletion, and Undo preserve data and focus.
- [x] Existing commands and Cmd+Option gesture continue to work.

## 5. Responsive drawer and shell — medium
Dependencies: 3, 4.
Likely files: index.html, editor.css, editor.ts, sidebar controller if extraction
is needed for clarity, drawer tests.
- [x] Modal mobile drawer with backdrop, close control, inert background/focus return.
- [x] Escape priority and command-dialog coordination; clean breakpoint transitions.
- [x] 320px controls fit; coarse-pointer targets and reduced motion supported.
Verification: 320/390/751/1280px browser checks, focus/dismissal tests, light/dark.

## 6. Accessible states and final integration — medium
Dependencies: 1–5.
Likely files: editor.ts, shortcuts.ts, history-panel.ts, README.md, state tests.
- [x] aria-pressed/current/expanded and valid shortcut hints track real state.
- [x] Update guide with search, Undo duration/reload limits, and mobile behavior.
- [x] Verify raw mirror, preview/Mermaid, TXT/PDF, themes, autosave, and shortcuts.
Verification: npm test; npx tsc --noEmit; npm run build; git diff --check;
isolated-browser end-to-end flows without modifying the user's notes.

## Checkpoint C: Ready for review
- [x] All six improvements and cross-feature acceptance cases pass.
- [x] No note reset, new browser permissions, or remote note transmission.
- [x] Record validation results and any remaining limits; show final IDE preview.
