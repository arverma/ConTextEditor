# Tasks: Comfortable writing and ownership

Status: Tasks 1–8 implemented and verified, plus the requested UI review. See ownership-verification.md. Details in plan.md and writing-verification.md.
Each slice requires focused tests, type checks, and a working build.

## 1. Centered writing and Full width — medium
Dependencies: none. Likely files: index.html, editor.css, editor.ts or a focused
writing-layout module, layout tests.
- [x] Center the text area around 750px by default, aligned across Edit/Preview.
- [x] Add accessible Full width control/command and remember its preference.
- [x] Preserve model, undo, selection, scroll, and source; keep wide content contained.
Verification: layout tests plus browser widths 320–1600 with prose/code/Mermaid.

## 2. Focus mode — medium
Dependencies: 1. Likely files: writing-layout module, editor.css, shortcuts.ts,
index.html, focus tests.
- [x] Hide nonessential controls while retaining a persistent labeled exit.
- [x] Preserve sidebar/width preferences and honor modal/editor Escape precedence.
- [x] Keep shortcuts available; opening history exits focus safely.
Verification: keyboard/touch-style browser flows and focus-state regression tests.

## 3. Copy Markdown — small
Dependencies: none; final integration after 2. Likely files: copy module,
index.html, shortcuts.ts, copy tests.
- [x] Copy complete pending raw text from either view using a user gesture.
- [x] Report success/failure truthfully and provide selectable manual fallback.
- [x] Preserve content, selection, focus, timestamps, and existing shortcuts.
Verification: exact-content tests, clipboard failures, real browser copy checks.

## Checkpoint A: Writing experience
- [x] Centered/full-width/focus/copy flows work together without editor regressions.
- [x] Existing test suite remains green; real browser review is ready.

## 4. Durable recovery protocol — medium
Dependencies: none. Likely files: storage.ts, recovery journal module,
note-session.ts, journal/failure tests.
- [x] Use one atomic collection write for active/Trash transitions; no intermediate states.
- [x] Atomically move between active and Trash states while retaining original snapshots.
- [x] Prove idempotence and no-loss behavior at every failed/interrupted write.
Verification: fault-injection tests, repeated reconciliation, re-delete/restore
identity collisions, and cross-tab stale-state tests.

## Checkpoint B: Storage safety
- [x] Interrupted operations always leave recoverable content and truthful UI state.
- [x] Existing active-note data stays compatible and is not reset or silently lost.
- [x] Replace the proposed multi-key journal with atomic collection storage, meeting
  the no-loss contract without migration or a custom recovery database.

## 5. Trash UI — medium
Dependencies: 4. Likely files: history/trash panel, recovery.ts, editor.css,
shortcuts.ts, recovery UI tests.
- [x] Add searchable Trash, persistent count, deletion time, and safe Restore.
- [x] Connect the 10-second Undo fast path to the same persistent recovery record.
- [x] Retain records across reload; confirm individual permanent deletion.
Verification: reload/Undo/restore, inactive notes, ID conflicts, focus, quota failure.

## 6. Markdown import — medium
Dependencies: 4, 5. Likely files: file-import module, storage/session transition,
import review dialog, shortcuts.ts, import tests; split presentation if needed.
- [x] Validate selected UTF-8 .md/.markdown batch and explicit size budget.
- [x] Review and commit new notes without changing source or existing notes.
- [x] Preserve drafts/data on errors and integrate success with search/selection.
Verification: Unicode/line-ending/fence fixtures, malformed input, partial-write
faults, large files, and actual browser file-picker flow.

## 7. Complete backup export — medium
Dependencies: 4, 5. Likely files: backup serialization module, export.ts,
actions/review UI, backup tests.
- [x] Versioned JSON includes active notes, Trash, metadata, and recognized settings.
- [x] Snapshot latest in-memory edits even if local saving remains unavailable.
- [x] Download locally with truthful feedback; preserve existing TXT/PDF actions.
Verification: exact snapshot tests, failing persistence, real downloaded backup.

## 8. Safe backup restore — medium
Dependencies: 6, 7. Likely files: backup validation/merge module, restore review,
storage commit path, conflict tests; split validation and presentation as needed.
- [x] Validate the complete file/version/budget before any mutation.
- [x] Review additive merge; dedupe identical IDs and copy conflicts without overwrite.
- [x] Preserve Trash boundaries, timestamps, active selection, and opt-in settings.
Verification: round trip into empty/nonempty storage, stale review, conflicts,
interrupted writes, failed quota, and actual browser restore.

## Checkpoint C: Ownership and integration
- [x] Write/copy/import/delete/reload/restore/backup flows preserve exact source.
- [x] Existing and new tests, type checks, website builds, and diff checks pass.
- [x] Browser checks at 320/390/751/1280/1600, light/dark, both widths, focus and modals.
- [x] Document retention, browser-data limits, backup format, testing results, and limits.
- [x] Final IDE preview is ready; no user-note mutation, commit, or deployment by default.
