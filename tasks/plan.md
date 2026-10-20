# Implementation Plan: Mobile Rich Default and View Terminology

## Overview
Make Rich (the current Preview view) the default view on mobile, prevent the formatting toolbar from appearing in Markdown (the current Edit view), and rename the user-facing view labels and related shortcut text from Edit/Preview to Markdown/Rich without changing desktop layout behavior.

## Architecture Decisions
- Keep the existing internal `edit`/`preview` view state values and storage key for backward compatibility; change only user-facing labels and mobile default selection.
- Gate the formatting toolbar on the active Rich view so it is hidden whenever Markdown is active, including on mobile.
- Detect the mobile default at startup from the existing compact-layout media query, while preserving a user's explicitly stored view choice.
- Keep desktop's existing default and selection-based toolbar behavior unchanged.

## Task List

### Phase 1: Contracts and visibility
- [x] Update view labels, accessibility text, shortcut copy, and tests to use Markdown/Rich.
- [x] Make the formatting toolbar visibility follow the active Rich view.

### Checkpoint: View contract
- [x] Focused tests pass.
- [x] Desktop toolbar behavior remains covered.

### Phase 2: Mobile default
- [x] Select Rich by default on mobile when no view preference exists, without overriding an explicit stored preference.
- [x] Add regression coverage for mobile startup and Markdown toolbar visibility.

### Checkpoint: Complete
- [x] Full test suite passes apart from the pre-existing empty test artifact.
- [x] Production build succeeds.
- [x] Browser verification passes at mobile and desktop widths.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Existing stored `preview`/`edit` values are renamed incorrectly | High | Preserve internal values and storage key; only change visible terminology. |
| Toolbar remains visible after switching to Markdown | High | Hide it centrally in `applyViewMode` and test both directions. |
| Mobile default overrides user preference | Medium | Use Rich only when the view key is absent or invalid. |

## Open Questions
- None; “Rich” maps to the existing Preview/Tiptap editor and “Markdown” maps to the existing source editor.
