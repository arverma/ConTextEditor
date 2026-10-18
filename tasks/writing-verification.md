# Writing and copy slice verification

Implemented scope: centered writing with remembered Full width, focus mode, and
Copy Markdown. Subsequent Trash/import/backup completion is documented in
ownership-verification.md (64 tests total).

- 39 tests pass, preserving the previous 27 tests and adding layout, copy, and focus coverage.
- Type checking, website build, and diff checks pass.
- Layout toggles save and restore Monaco view state without changing its model.
  Tests verify preview scroll retention and unchanged note timestamps.
- Copy reads the live editor source, including pending edits while in Preview.
  Tests cover Unicode, whitespace, fenced code, empty notes, delayed success,
  denied clipboard access, inert manual fallback text, and focus return.
- In the actual IDE browser, the centered editor frame measured 806px inside a
  1336px workspace, expanding to the full workspace when enabled. The preview's
  internal padding produces a 750px text column. Source and preview share bounds.
- Browser checks at 320, 390, 751, 1280, and 1600px found no page overflow and all
  titlebar controls inside the viewport. Both actions appear in the command menu.
- Native clipboard writes resolved with visible success feedback in Edit and
  Preview. Exact write contents were verified by unit/integration tests. The
  automation virtual clipboard did not reflect the page clipboard, so an actual
  OS paste round trip is not claimed. Clipboard permission override was unsupported;
  denied-permission behavior was verified with controlled test mocks instead.
- Existing user notes were not used as test fixtures. Browser checks used a
  separate local origin with disposable notes. Temporary viewport overrides reset.

No runtime dependencies, browser permissions, or storage formats changed.
The existing large-bundle advisory remains. Normal preview remains on port 5173.

## Centered-column boundary refinement

Added tinted workspace gutters, faint side edges, and a soft shadow when there
is enough workspace around the centered frame. Verified light Preview and dark
Edit in the actual browser. Full width and narrow-screen surfaces have no shadow;
390px verification had no page overflow. Surface feedback uses a brief shadow /
background transition; the existing reduced-motion override disables it. Print
explicitly removes the shadow. Editor build and all 33 tests pass.

## Focus-mode slice

Focus mode is implemented as session-only shell state with a visible exit control.
It preserves editor view state, the width preference, and the saved desktop sidebar
choice. Save failures and Undo notifications remain reachable. Copy announcements
remain outside the hidden toolbars. The command menu includes Toggle focus mode.

- 39 tests pass, including focus state, sidebar suppression across breakpoints,
  Escape priority, hidden Find widgets, and history/width preservation.
- Type checking, website build, and diff checks pass.
- Actual browser verification: first Escape closes Find or cancels a selection;
  the next Escape exits focus. Monaco's own keybinding routing handles editor focus.
- Cmd+Option still toggles preview; commands remain usable; Escape closes the
  command dialog without exiting focus. Opening note search exits focus first.
- At 320px the exit control stays inside the viewport and there is no page
  overflow. Reload leaves focus mode off. Prior desktop sidebar/width state is
  preserved; screenshots use disposable local-origin notes.
- Normal preview remains on port 5173. No dependency or storage-format changes.

Subsequent slices are complete; see ownership-verification.md for storage, import,
backup/restore and the final designer review.
