# Mobile UI audit and fixes

Reviewed the reported 440×956 screenshot and the live interface on October 18, 2026.
Kept the existing palette and note-storage behavior.

## Issues identified and addressed

1. **Header overcrowding:** three large theme buttons and a keyboard icon competed
   with the product name and save status. Phones now show history, the name, a
   readable status, and More. Appearance and Commands remain in a labeled action sheet.
2. **Toolbar hierarchy:** layout toggles, Copy, Export, and view mode shared an
   uneven row of small icons. Title + Edit/Preview now form one stable 56px row;
   secondary actions use the same original controls in More, with visible labels.
3. **Touch sizing depended on pointer emulation:** narrow screens did not reliably
   receive the same target sizes. Primary controls are explicitly at least 44px,
   action-sheet rows 48px, with larger history/delete/dialog controls.
4. **Tiny/faint type and inconsistent padding:** source and preview use 16px on
   compact screens, primary labels 13–14px, and status/inactive controls use the
   stronger muted token. Reading padding is 20px, with consistent heading rhythm.
5. **Diagrams were scaled into illegibility:** mobile diagrams retain natural
   label size inside a bounded scroll region. A visible hint and Expand action
   open a larger pan/zoom view; closing it restores the SVG, styling, focus, and
   reading position. The SVG is moved rather than cloned, avoiding duplicate IDs.
6. **Invalid diagrams could show a giant error illustration:** malformed Mermaid
   now leaves readable source with a concise error message, rather than artwork.
7. **Theme changes left diagrams stale:** visible preview is regenerated for a
   theme change while preserving raw source.
8. **Dialogs and drawers were cramped:** consistent padding, close targets,
   bounded heights, a wider history drawer, and 16px search/copy fields improve
   touch use and avoid the small-font input zoom trigger.
9. **Phone landscape fell back to desktop controls:** the compact layout also
   applies to screens up to 1000px wide and 500px tall. Reparenting preserves
   preferences, node identity, and listeners across rotation/desktop transitions.
10. **Floating privacy action covered reading space:** it is available in More
    on phones, and returns to its desktop placement on larger screens.
11. **Copy feedback disappeared with its hidden action:** phones now show a short
    visible status toast. Manual-copy close clears stale feedback, and an active
    Undo toast has separate vertical space.
12. **Long content and error messages could widen the reading area:** links and
    prose wrap, code remains locally scrollable, and save errors can wrap safely.
13. **Device-edge/keyboard constraints:** viewport-fit and safe-area spacing
    protect content edges; compatible browsers receive resizes-content behavior.
    Expanded diagrams and utility dialogs allow for safe-area insets.
14. **Modal/action transitions:** the action sheet closes before Focus, Copy,
    Export, or Commands executes; diagram viewing blocks background app shortcuts.
    Escape closes native modals and focus returns to their trigger.

15. **Find was almost unusable on small screens:** Monaco's collapsed widget left
    a 54px query field at 320px. The compact widget now uses the editor width,
    with a measured 188px query field and readable 16px input at 320px, while
    retaining native Find/Replace commands.

## Verification

79 tests pass, including original regressions, real Monaco command loading,
mobile control identity/pressed state and desktop restoration, close-before-action,
16px editor typography and model preservation on resize, theme refresh, diagram
zoom/restore/print handling, invalid diagram fallback, and sanitization.
Type checks, production build, and diff checks pass.

Real IDE-browser checks used disposable notes on port 5174, not the user's notes.
Measured 320×568, 375×812, 390×844, 440×956, and 956×440: no page or preview
horizontal overflow, primary targets >=44px, and a stable 56px+56px header
(48px+48px in short landscape). Verified More → Focus, More → Commands,
More → Copy with visible success, and history → Import & backup with one modal.
Checked a small utility dialog at 320px and restored original controls at 1280px;
the raw note stayed identical. Desktop editor text returned to 14px.

Reviewed light/dark preview, action sheet, and expanded diagram with working
zoom and Escape. The original source and SVG return after expansion. No new
runtime dependencies, note migration, commit, or deployment.

Browser emulation verifies layout and interaction, not a physical iPhone keyboard
or device-specific safe-area values. Those remain useful physical-device checks.

Screenshots: /private/tmp/context-mobile-light.png,
/private/tmp/context-mobile-dark.png, /private/tmp/context-mobile-actions.png.

## Follow-up: lighter mobile controls

The first pass still made Edit/Preview visually 52px tall and left a large
full-width New note button. Refined those controls without shrinking touch targets:

- Edit/Preview uses a 30px visual track within separate 44px targets, with a quiet
  selected surface. Both header rows are now 48px in portrait and landscape.
- New note is an accessible plus button beside Notes, using the same original
  control and listeners. Desktop restores its original labeled placement.
- Search has a lighter 36px visual field inside a 44px input; focus stays visible.
  Note rows have tighter padding, with smaller delete icons inside 44px targets.

80 tests pass, including a new compact/desktop New note identity and click test.
Type checks, production build, and diff checks pass. IDE browser verified view
switching, 320/390/440px portrait, 956px landscape, and 1280px desktop restoration.
No horizontal overflow; measured mobile headers 48+48px and history controls 44px.
Screenshots: /private/tmp/context-compact-mobile.png and
/private/tmp/context-compact-history.png.
