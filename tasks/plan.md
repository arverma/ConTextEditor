# Plan: Comfortable writing and ownership of notes

Status: Implemented and verified, including persistent Trash, import, backup/restore, and the requested UI review. See tasks/ownership-verification.md and tasks/writing-verification.md.
Checklist: tasks/todo.md.
Previous completed phase: tasks/completed-history-usability/plan.md.
Previous validation evidence: tasks/verification.md (applies to the completed phase).

## Outcome

Make ConText a comfortable place to write and a dependable place to keep raw
Markdown: centered writing by default, optional full width and focus mode,
one-action Copy Markdown, local Markdown import, complete backup/restore, and
recoverable deletion across reloads. Keep the small, local-first application;
no accounts, synchronization service, rich-text rewrite, or built-in AI chat.

## Existing contracts to preserve

- Preserve existing raw content, note IDs, timestamps, and compatible storage.
  Existing notes must open without a destructive migration or reset.
- Keep Monaco editing, undo/redo within a note, Markdown/Mermaid preview, raw DOM
  mirror, TXT/PDF export, search, keyboard navigation, theme selection, mobile
  modal behavior, and all current shortcuts, including Cmd+Option release.
- Neither layout changes nor copying, searching, backing up, or previewing may
  change note content, timestamps, or note order.
- Keep all file parsing and storage local. Use browser-mediated file selection
  and downloads; do not add host filesystem access or browser permissions.
- Preserve the current pending-save and quota-failure protections. Never report
  a successful copy, import, backup, deletion, or restore before it succeeds.
- Tests use the existing isolated tests package and disposable browser origins.
  Do not use the user's current notes as destructive test fixtures.

## Product decisions

### Writing width and typography

Default to a centered writing column targeting a 750px maximum text area inside
whatever space remains after the sidebar. Maintain comfortable responsive side
padding; at narrow widths it naturally fills the available space. Keep the clean
background, with no imitation paper, page breaks, or document shadows.

Apply the same writing-area bounds to Edit and Preview, allowing for Monaco's
gutter. Fonts may wrap differently; the visual text column should feel aligned.
Retain the monospace source editor and its familiar editing behavior. Refine
preview typography using the existing font system, with readable line spacing
and clear heading/list rhythm; do not load external fonts.

Provide a discoverable Full width toggle, exposing its pressed state and a command
menu action. Remember width preference per origin. Code blocks and tables scroll
inside the content area instead of widening the whole page. Mermaid diagrams fit
the column; Full width remains available for larger diagrams. Resizing changes
layout without recreating the editor model, losing selection, or moving the
reader unexpectedly to the beginning of a note.

### Focus mode

Provide a command/menu control to hide sidebar and nonessential app bars while
keeping the writing surface. A persistent, labeled exit control remains visible,
including on touch screens. Escape exits focus only when no higher-priority
interaction (command menu, history drawer, editor find widget, or composition)
needs it. Do not intercept ordinary typing or editor shortcuts.

Entering focus mode preserves the prior sidebar preference and width choice;
leaving restores them. Opening note history from focus mode exits focus first.
Command search and Edit/Preview shortcuts remain available. Focus mode is session
state, so reloading cannot strand a user in a hidden-controls layout.

### Copy Markdown

Add a minimal Copy Markdown button and command action that always copies the
complete current raw editor text, including pending edits, regardless of view.
Copying must not copy rendered HTML, lose fenced code, or reformat whitespace.

Use the browser clipboard API from a direct user action, with no new permissions.
Announce Copied only after success. If clipboard access is unavailable or denied,
show clear feedback and offer a selectable, read-only raw-text fallback so the
user can copy manually. Restore focus when the fallback closes. Do not overwrite
the editable note or clear its selection just to implement copying.

Use native Tab/Enter activation and the command menu for discovery. Do not assign
a new global shortcut that overrides developer tools or standard editor actions.

### Persistent Trash

Keep the short Undo toast as a fast path, backed by persistent recovery records.
After its 10-second window ends or the page reloads, a deleted note remains
available in Trash. Retain Trash until explicit permanent deletion; do not silently
purge it on a timer or to make room for a storage write.

Add a Trash destination with a count, title/preview/deletion time, search, and
Restore. Exclude Trash from normal note search. Restoring an inactive note does
not switch the editor; restoring a formerly active note follows the current
safe transition behavior after saving intervening edits. If an ID is already in
use, never overwrite it; offer restoration as a new copy. Use a focused
confirmation for permanent deletion, and avoid an Empty Trash bulk action in the
first release. Explain that clearing browser site data still removes local notes
and Trash, and that a downloaded backup is the independent recovery mechanism.

### Markdown import

Use a native file picker for one or more .md/.markdown files. Read UTF-8 locally,
strip only an initial encoding BOM, and preserve all remaining source characters,
line endings, fenced blocks, and Markdown without wrapping or rendering it first.
Reject invalid encoding or unsupported files with actionable feedback; do not
silently import replacement characters. Treat imported HTML as inert source and
continue sanitizing it only when previewed.

Show a lightweight review listing filenames and file count before committing.
The selected batch is validated before any note write. Each file creates a new
note with a fresh ID; existing notes remain intact. Derive the displayed note
title with the existing first-line rule, avoiding invented headings in content.
Do not silently deduplicate separate Markdown files or truncate large files.
Use a named configurable total import byte budget, initially 5 MiB, reject an
oversized batch before parsing, and still handle actual storage quota failure.
After success clear the active search and open the first imported note. On
failure preserve the existing note, editor draft, and storage collection.

### Complete backup and safe restore

Offer a single downloaded, versioned JSON backup containing all active notes,
Trash recovery records, original IDs/timestamps, the active note reference, and
recognized presentation preferences. Include a format identifier, schema version,
and export time. Include Trash explicitly in the review text so people understand
what is in the backup. Keep existing single-note TXT/PDF exports unchanged.

Before backup, try to flush the active draft. If storage remains unavailable,
create the backup snapshot with the in-memory latest draft merged into it and
clearly report that local saving still needs attention. Do not replace the latest
text with an older stored version or claim a backup succeeded if download failed.
Document that a browser download is not automatic cloud backup or encryption.

Support restoring this backup, not merely exporting it. Validate the entire file,
version, field types, finite timestamps, duplicate IDs, size, and content before
any mutation. Reject unsupported versions and malformed records without partial
writes. Use the same initial 5 MiB input budget with explicit failure feedback.

Default restore is an additive merge with a review of added, identical, and
conflicting notes. An identical ID/content record is skipped. A differing record
with an occupied ID is imported as a new copy with an explicit mapping; existing
notes are never overwritten. Preserve valid backup IDs and timestamps when they
are free. Treat active and Trash records consistently and avoid restoring Trash
into the active collection by accident. Restoring presentation preferences is a
separate opt-in; otherwise retain the user's current layout and active note.
An empty installation can select the backup's active note when that mapping is
valid. Destructive Replace all is outside this phase.

## Storage safety design

Keep the current active-note collection readable. Avoid treating a second
localStorage write as an atomic transaction with the first.

Implementation decision: the initial separate-key journal proposal was replaced
with a simpler atomic collection design. Active and trashed notes remain in the
same existing array; optional Trash metadata records a unique deletion operation,
original source, timestamp, and prior selection state. Legacy active records stay
compatible and no migration/reset is needed. A single localStorage setItem moves
a note into or out of Trash, or commits an entire reviewed import/backup merge.
An interrupted or failed write therefore leaves either the old complete collection
or the new complete collection, without an intermediate state needing replay.

Undo references the same persistent operation ID. Re-deleting a restored note gets
a new operation ID, so stale Undo cannot revive a later deletion. Restoration
checks current identities and never overwrites an active note. Fault-injection
tests cover failed deletion, restoration, permanent deletion, import, and merge,
plus repeated restore, stale review, malformed metadata, and preserved legacy data.

Preferences remain independent best-effort writes; after a successful merge,
appearance failures are reported as such without falsely reporting failed note
restoration. Backup export uses the live pending draft if saving is unavailable.

This phase does not promise simultaneous multi-tab editing or conflict-free
concurrent writes. Retain the existing explicit last-write-wins limitation, detect
stale import/restore review state by re-reading before commit, and refresh/review
rather than blindly apply a merge to a changed collection. All tabs must
refresh Trash collection events as well as active collection changes.

## Implementation order and checkpoints

1. Centered/full-width writing surface, with cursor/selection/scroll preservation.
2. Focus mode and discoverable exits, integrated with all modal/keyboard behavior.
3. Copy Markdown, including failure feedback and manual fallback.
4. Atomic persistent recovery and crash/failure tests before changing deletion.
5. Trash UI, using the tested recovery records and existing Undo flow.
6. Markdown import with validation/review and safe batch commit.
7. Complete backup export and additive restore with conflict review.
8. Combined regression, documentation, and real browser verification.

Each step must leave a working app. Review data safety after step 4 before wiring
Trash/import/restore, and review the complete interaction before shipping. Implementation was subsequently authorized, including all remaining items and a
final UI review. Committing and publishing remain separate actions.

## Verification and acceptance

Preserve the existing 27 passing tests. Extend tests for:

- Layout toggles preserve source, Monaco undo, selection, focus, scroll, and note
  timestamps; normal/full-width Edit and Preview remain usable at all breakpoints.
- Focus mode can always be exited; modal/editor Escape precedence works; opening
  history and commands never creates conflicting focus traps.
- Copy uses the full raw current draft in either view; empty notes, whitespace,
  Unicode, fenced code, denied clipboard access, and manual fallback all work.
- Every collection write can fail. A reload before or after the atomic write retains
  the note in active storage or recovery, without duplication or stale overwrite.
- Trash survives reload, distinguishes successive deletions of the same ID, and
  restores active/inactive notes safely. Permanent deletion requires confirmation.
- Imports preserve exact text, validate multi-file batches before any write,
  reject malformed/oversized input, and retain existing data on quota failure.
- Export/restore round trips active notes, Trash, metadata, and preferences.
  Conflicts, duplicate IDs, malformed/unknown versions, stale review state,
  interrupted restore, and pending unsaved drafts never overwrite current work.
- Cross-feature flows: focus → preview → copy; edit → delete → reload → restore;
  import → search → edit → backup → restore into nonempty storage.

Run the existing tests, type checks, website build, and diff checks.
Use disposable origins for real browser checks at 320, 390, 751, 1280, and 1600px,
light/dark themes, both width modes, long prose, wide code/tables, and Mermaid.
Verify actual clipboard permission failures and download/import flows where the
browser permits; document any OS or automation limitation instead of guessing.
No changes to browser permissions, runtime dependency versions, or hosting are
expected. Add dependencies only if a concrete storage/test requirement needs one.

## Recommended defaults for review

Centered 750px writing, remembered Full width preference, session-only focus mode,
raw copying in both views, additive file/backup imports, and Trash retained until
explicit deletion. These defaults are proposals and can be revised before coding.
