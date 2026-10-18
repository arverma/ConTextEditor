# Plan: Note safety, accessible history, search, and responsive controls

Status: Implemented and verified. See tasks/verification.md for evidence and limits.
Task checklist: tasks/completed-history-usability/todo.md.

## Objective

Deliver the six agreed improvements together: recoverable deletion, keyboard note
navigation, reliable saving after the final note is deleted, narrow-screen layout,
accessible toggle states, and note search. Implement in verified slices and review
the combined experience before considering the work complete.

## Current evidence

- history-panel.ts deletes immediately on mouse click. shortcuts.ts confirms only
  keyboard deletion. Note selection is attached to a non-focusable list item.
- editor.ts leaves currentSnippetId null after the final deletion. Subsequent
  typing updates the screen but does not schedule a save.
- loadSnippet calls editor.setValue without suppressing the change listener;
  loading a note schedules a write and changes its updatedAt timestamp.
- The history renderer replaces every row during autosave, which would disrupt
  focused controls and keyboard selection if left unchanged.
- storage.ts persists notes and active selection separately. There is no existing
  automated test script. Cross-tab events refresh the list, not the editor model.
- Mobile sidebar overlays the editor without a backdrop. Theme and view buttons
  expose their selection through CSS classes only.

## Invariants

- Existing note IDs, contents, timestamps, and localStorage keys remain readable.
  No destructive migration or reset. Notes remain local with no remote service.
- Raw Markdown mirror, Monaco editing/undo, Mermaid preview, TXT/PDF export,
  theme persistence, sidebar preference, and autosave continue to work.
- Loading, searching, focusing, previewing, and changing themes must not alter
  note content or updatedAt. A deliberate restored note keeps its prior timestamp.
- User edits must survive immediate selection, deletion, Undo, export, and reload.
- Preserve Cmd/Ctrl+E and the requested Mac Cmd+Option release gesture. An extra
  key, composition, lost focus, or an open command dialog cancels that gesture.
- Search stays within the local note collection. Command search stays a separate
  action-oriented menu. No new browser permissions or hosted dependencies.

## Decisions and interaction contract

### 1. Fix note lifecycle first

Distinguish programmatic model loads from user edits. Flush pending edits before
switching notes or taking a deletion snapshot. Keep save status truthful: display
Saved only after a successful write; retain unsaved content if persistence fails.

After deleting the last note, show an empty editor with a New note affordance.
The first real edit creates exactly one note containing that text, then follows
normal autosave. Programmatic clearing, initialization, and preview do not create
extra notes. Reload may keep the existing startup behavior of creating one blank
note; it must not discard a newly typed draft.

Reconcile an active note deleted in another tab without writing it back under its
old ID. If there are local unsaved edits, preserve them as a new local note before
loading the fallback. This is narrow lifecycle protection, not a general realtime
collaboration system; simultaneous edits to the same existing note remain outside
this change's conflict-resolution scope.

### 2. Consistent recoverable deletion

Use one deletion action for mouse, shortcut, and command menu. Replace the native
keyboard-only confirmation with a nonmodal "Note deleted — Undo" notification.
Undo is available for 10 seconds; pause expiration while the notification is
hovered or has keyboard focus. Announce it politely without stealing focus.

Keep an in-memory stack of independent deletion snapshots, including ID, content,
updatedAt, and whether the note was active. The notification exposes Undo for the
most recent eligible deletion; undoing it reveals the next eligible deletion.
A new deletion never overwrites another still-eligible snapshot. Show a count when
multiple deletions can be undone. Expiration/reload ends recovery; describe this
limit in the documentation. A durable Trash is explicitly deferred.

Restore using a fresh read of current storage, preserving unrelated notes and
never duplicating or overwriting an existing ID. Restoring the formerly active
note selects it after saving any intervening edits. Restoring an inactive note
keeps the current note selected. On a failed storage write, leave the visible note
and recovery snapshot intact and show an actionable error.

### 3. Keyboard-accessible note history

Render each row as a native note-selection button plus a separate delete button;
no nested interactive elements. Mark the current note with aria-current and give
controls meaningful accessible names. Use Up/Down and Home/End within the list to
move focus; Enter/Space opens the focused note. Arrow keys do not change notes.
Tab reaches search, note controls, and deletion normally.

Preserve the focused note/control by ID across autosave, filtering, Undo, and
list refresh. If the focused row disappears, move to the nearest remaining row
or search/New note when empty. Flush before selecting; render fresh storage
rather than a captured stale collection.

### 4. Local note search

Add a labeled search field above the history list and a "Search notes" command.
Cmd/Ctrl+Shift+F opens history and focuses search; the command palette exposes the
same action. Filter title and full raw content, case-insensitively, with trimmed
literal substring matching; empty query shows all notes in their existing order.
Keep the query in memory only, including while the sidebar is temporarily hidden.

Searching never changes the active editor. If the active note is filtered out,
keep editing it. Show "No matching notes" with Clear search, distinct from an empty
collection. Escape clears a nonempty search first, then closes a mobile drawer.
On selection from mobile search, close the drawer and focus the editor or preview.
New note clears search so the created note is discoverable. Undo preserves the
query and announces restoration even when the restored note does not match.

### 5. Responsive app shell

Retain the desktop inline sidebar and remembered desktop preference. At 700px and
below use a closed-by-default modal history drawer, without overwriting desktop
preference. Give it a backdrop, accessible close control, Escape dismissal, focus
containment, and focus return to its opener. Background content must be inert
while the drawer is open; explicitly coordinate with the command dialog so two
modal focus traps cannot remain active simultaneously.

When changing breakpoint, clean up backdrop/inert/focus state and apply the
appropriate desktop/mobile mode. The drawer stays scrollable with many notes.

At 320px allow titlebar wrapping and compact controls rather than clipping or
hiding essential actions. Prioritize editor space; keep export, view toggle,
commands, theme, and history reachable. Use 44px touch targets for icon buttons
on coarse pointers, preserve focus rings, and respect reduced motion. Constrain
app width to the viewport with no horizontal shell overflow.

### 6. Accessible toggle states and command hints

Use aria-pressed on each Edit/Preview and System/Light/Dark button, updated by
both clicks and shortcuts. System remains the selected preference when the OS
scheme changes. Keep sidebar aria-expanded in sync with actual visibility.

Expose shortcuts on actual actionable controls where aria-keyshortcuts has a
valid key combination, plus platform-aware tooltips. Explain Cmd+Option as a
press-and-release gesture in the menu; do not encode it as an invalid ARIA key.
Keep native editing shortcuts and input composition working. Add Search notes
to the palette and update documentation together with implementation.

## Implementation order

1. Add focused test support and fix save/load/empty-state lifecycle.
2. Implement shared deletion, snapshot restoration, and Undo notification.
3. Implement semantic history controls and stable keyboard focus.
4. Add note search and its shortcut/command entry.
5. Implement responsive drawer and narrow-screen controls.
6. Complete selected-state semantics, hints, and integration verification.

This is one coordinated scope with independent checkpoints, not one unverified
bulk edit. No commits, deployment, or publishing are included unless requested.

## Verification strategy

Use an isolated tests package with patched Vitest and its own Vite version, using
Node 24 LTS, fake timers, and a localStorage fixture for lifecycle, deletion, and search tests.
Avoid asserting generated CSS or internal implementation structure. Introduce
DOM testing only for focus/state behavior that cannot be covered by pure logic.
No CI threshold weakening or disabled checks to make the suite pass.

Required cases:

- Edit A then immediately select B: both texts survive reload, no stale list.
- Loading/selecting/previewing/searching does not change updatedAt.
- Delete the last note, type immediately, reload: exact text saved once.
- Delete before autosave fires, Undo: latest text restored under the same ID.
- Delete active/inactive notes and several notes quickly; Undo and expiration
  behave independently; hover/focus pauses expiry; no duplicate IDs.
- Undo after editing a fallback note saves both notes correctly.
- Storage write failure preserves editor content/recovery and reports failure.
- External deletion of the active note, including with pending local edits.
- Navigate, delete, filter, and Undo with keyboard only; autosave retains focus.
- Search is literal/case-insensitive across title/body; no-match, clearing,
  filtered active note, creation, and restoration behave as specified.
- Click/shortcut/theme changes expose correct ARIA state; IME and other
  Cmd+Option combinations do not toggle preview unexpectedly.
- Mobile backdrop, Escape precedence, focus return, breakpoint transitions,
  search-to-editor flow, and command-menu/drawer interaction.

Run npm test (introduced by this work), npx tsc --noEmit, npm run build, and
 git diff --check. Verify the actual IDE browser at 320, 390, 751, and 1280px,
light/dark themes, long titles, many notes, Edit and Preview, and keyboard-only
use. Use disposable test notes in an isolated browser/storage context; do not
delete or replace the user's current notes to validate behavior. Record any
browser/OS interception limits rather than claim universal shortcut coverage.

## Completion criteria

All six flows work together, existing notes still load unchanged, focused tests
and project checks pass, and the final IDE browser preview is ready for review.
The planning step created only planning documents; implementation is now complete.
