# Native editor navigation verification

The slim Monaco editor API omitted wordOperations and linesOperations. Modified
arrow keys consequently fell through to browser textarea behavior instead of
Monaco's native word commands and line editing. Enabled those two existing
bundled contributions; no custom global arrow interception or new dependency.

Regression tests first failed because the native commands were unregistered.
They now verify the real command/keybinding registries for word navigation,
word selection, moving lines, and copying lines. All 68 tests, TypeScript checks,
and the website production build pass.

Real IDE-browser checks used disposable notes on port 5174. Verified:

- Command+Up/Down to exact document boundaries.
- Command+Left/Right to exact line boundaries.
- Option+Left/Right to exact word boundaries.
- Shift+Option+Left/Right selects the expected word range.
- Shift+Command+Left/Right selects to the corresponding line boundary.
- Shift+Command+Up/Down selects to the corresponding document boundary.
- Option+Up/Down moves the current line (the user's selected VS Code behavior).
- Two independent Undo operations reverse the two line movements and restore
  the original source exactly.

The user's note on port 5173 was not edited. Command-arrow behavior already
worked in the isolated reproduction and remains handled by Monaco's core.
