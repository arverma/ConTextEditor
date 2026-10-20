# Implementation Plan: Intelligent Diff Checker Formatting

## Overview

Upgrade the desktop-only Diff Checker so formatting is explicit and efficient: Auto Format runs on paste or when manually invoked, specific formats run only their selected formatter, the last successful formatter is shared across both panes, and the formatter list includes every SQL dialect supported by DevToolBoxPro's `sql-formatter` v15 integration.

## Confirmed behavior

- The Format dropdown contains Auto Format, Plain text, JSON, YAML, and all 19 SQL dialects as direct options.
- SQL defaults to Trino / Presto, matching DevToolBoxPro.
- Auto Format uses a deterministic candidate order with cheap prechecks before parser attempts.
- A paste in either pane triggers Auto Format for both panes.
- The remembered successful formatter is shared by both panes.
- Auto Format first tries the remembered formatter; if it fails, it retries the full candidate set.
- Successful Auto detection switches the dropdown to the detected specific formatter.
- If all automatic attempts fail, raw text is preserved and the dropdown switches to Plain text without an error message.
- The Format button formats both panes. A specific selection uses only that formatter; Auto Format re-runs detection.
- Formatting does not run on normal input changes.
- Current diff content and formatter selection remain browser-persisted as one current state, with no history.
- Mobile behavior remains unchanged; the Diff Checker stays desktop-only.

## Architecture decisions

- Keep formatting and detection as pure functions in `src/editor/diff-checker.ts` so they can be covered without DOM setup.
- Represent SQL dialects as a single typed registry shared by dropdown construction, explicit formatting, and Auto Format candidate iteration.
- Separate the user-selected format from the remembered Auto Format fast path. This prevents switching to a specific formatter from accidentally disabling Auto Format semantics and makes persistence explicit.
- Treat formatting success as a validated result, not merely “the parser did not throw.” Empty input remains unchanged, and failed formatting always returns the original text.
- Use deterministic ordering for ambiguity: JSON first, YAML second, SQL dialects in the DevToolBoxPro order, then Plain text fallback. Add lightweight content guards so ordinary prose is not sent through all SQL parsers.
- Apply the detected formatter independently to each pane while using the same detected formatter selection. If one pane cannot be formatted, preserve that pane's raw value instead of discarding it.
- Keep the existing two-pane overlay diff rendering and current-state localStorage key; extend the state shape only as needed for the selected format and shared remembered formatter.

## SQL dialect registry

The direct SQL options must cover:

1. Trino / Presto (`trino`)
2. Standard SQL (`sql`)
3. PostgreSQL (`postgresql`)
4. MySQL (`mysql`)
5. MariaDB (`mariadb`)
6. BigQuery (`bigquery`)
7. Snowflake (`snowflake`)
8. Spark SQL (`spark`)
9. Apache Hive (`hive`)
10. SQL Server / T-SQL (`transactsql`)
11. Oracle PL/SQL (`plsql`)
12. Amazon Redshift (`redshift`)
13. IBM DB2 (`db2`)
14. IBM DB2i (`db2i`)
15. SQLite (`sqlite`)
16. ClickHouse (`clickhouse`)
17. TiDB (`tidb`)
18. SingleStoreDB (`singlestoredb`)
19. Couchbase N1QL (`n1ql`)

## Task list

### Phase 1: Formatting contracts and pure logic

#### Task 1: Define formatter registry and state contract

**Description:** Replace the current two-dialect/single-language model with typed format options for Auto Format, Plain text, JSON, YAML, and all DevToolBoxPro SQL dialects. Add the shared remembered formatter to the current-state contract with backward-compatible parsing for existing saved state.

**Acceptance criteria:**
- [ ] Every listed SQL dialect has a stable value and user-facing label.
- [ ] Trino / Presto is the initial SQL default.
- [ ] Existing saved states with PostgreSQL/MySQL remain readable.
- [ ] Invalid or historical state remains rejected without breaking startup.

**Verification:**
- [ ] Add focused unit tests for registry values and state parsing.
- [ ] Run `npm --prefix tests test -- diff-checker.test.ts`.

**Dependencies:** None.

**Files likely touched:**
- `src/editor/diff-checker.ts`
- `src/editor/index.html`
- `tests/diff-checker.test.ts`

**Estimated scope:** Medium.

#### Task 2: Implement deterministic Auto Format detection

**Description:** Add pure detection/formatting helpers that try the remembered formatter first, then the deterministic JSON → YAML → SQL dialect sequence when required, with content prechecks and raw fallback. Return enough metadata for the UI to update the selected format and shared fast path.

**Acceptance criteria:**
- [ ] Valid JSON, YAML, and each supported SQL dialect can be formatted explicitly.
- [ ] Auto Format chooses a deterministic formatter and returns its identity.
- [ ] A remembered formatter is attempted first and is invalidated only after failure.
- [ ] Invalid/ambiguous/plain content is returned unchanged without an error.
- [ ] No formatter is attempted on ordinary input changes.

**Verification:**
- [ ] Add tests for explicit formatting, Auto Format success, remembered-fast-path reuse, retry after failure, and raw fallback.
- [ ] Include representative SQL syntax for dialects with distinct parser behavior.
- [ ] Run the focused Diff Checker test file.

**Dependencies:** Task 1.

**Files likely touched:**
- `src/editor/diff-checker.ts`
- `tests/diff-checker.test.ts`

**Estimated scope:** Medium.

### Checkpoint: Pure formatting foundation

- [ ] Focused tests pass.
- [ ] All 19 SQL dialect values are covered.
- [ ] No DOM behavior has changed yet.

### Phase 2: Desktop UI and interaction wiring

#### Task 3: Add format controls and direct SQL options

**Description:** Update the Diff Checker controls to expose Auto Format, Plain text, JSON, YAML, and all direct SQL options, plus a clearly labeled Format button. Keep the existing desktop-only section and current visual language.

**Acceptance criteria:**
- [ ] Auto Format is available as a selectable option.
- [ ] All 19 SQL dialects are directly selectable without a secondary SQL dialect control.
- [ ] The Format button is keyboard accessible and visually consistent.
- [ ] The old SQL dialect-only control is removed or no longer conflicts with the direct format selection.

**Verification:**
- [ ] Add/adjust DOM-oriented tests for option values, labels, and button presence.
- [ ] Build the editor and inspect the desktop controls in the browser.

**Dependencies:** Task 1.

**Files likely touched:**
- `src/editor/index.html`
- `src/editor/editor.css`
- `tests/diff-checker.test.ts`

**Estimated scope:** Medium.

#### Task 4: Wire paste-only Auto Format and manual Format

**Description:** Refactor Diff Checker event handling so paste invokes Auto Format for both panes, manual Format applies the selected behavior to both panes, and ordinary input changes only re-render/persist the diff. Keep sidebar closing, current-state persistence, focus, scrolling, and desktop gating intact.

**Acceptance criteria:**
- [ ] Pasting into either pane formats both panes once after the paste settles.
- [ ] Manual Format formats both panes using the selected explicit formatter.
- [ ] Manual Format in Auto mode re-runs detection and updates the selection to the detected formatter or Plain text.
- [ ] Editing text without paste does not invoke formatting.
- [ ] A failed formatter preserves the affected pane's raw text and shows no error.
- [ ] The remembered formatter and selected format persist across reload.

**Verification:**
- [ ] Add event-level tests with controlled textareas and localStorage.
- [ ] Run focused tests and the production build.
- [ ] Verify the paste/manual flows in the shared desktop browser page.

**Dependencies:** Tasks 2 and 3.

**Files likely touched:**
- `src/editor/diff-checker.ts`
- `src/editor/index.html`
- `tests/diff-checker.test.ts`

**Estimated scope:** Large; keep implementation and tests in one focused slice.

### Checkpoint: Desktop interaction

- [ ] Two editable panes remain the only visible editor surfaces.
- [ ] Sidebar closes when Diff opens.
- [ ] Paste and manual Format behavior matches the confirmed contract.
- [ ] Production build succeeds.

### Phase 3: Regression and polish

#### Task 5: Add performance and compatibility regression coverage

**Description:** Validate that Auto Format short-circuits correctly, does not retry unnecessarily, and handles legacy persisted state and browser storage failures without user-facing errors.

**Acceptance criteria:**
- [ ] Remembered-success cases do not iterate every formatter.
- [ ] Remembered-failure cases retry in the documented deterministic order.
- [ ] Plain text fallback does not produce parser errors or visible alerts.
- [ ] Existing current-state restoration remains compatible.

**Verification:**
- [ ] Run focused tests.
- [ ] Run the full repository test command and record any unrelated pre-existing failures separately.
- [ ] Run the production build.
- [ ] Browser-check long content, both panes, selection changes, and mobile hiding.

**Dependencies:** Task 4.

**Files likely touched:**
- `tests/diff-checker.test.ts`
- `src/editor/diff-checker.ts` (only if regression evidence identifies a defect)

**Estimated scope:** Small to Medium.

### Checkpoint: Complete

- [ ] All confirmed acceptance criteria pass.
- [ ] Focused tests, full test command, and production build have been run.
- [ ] Browser verification confirms desktop-only behavior and no new console errors.
- [ ] No unrelated worktree changes were modified.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| YAML accepts many plain-text-like inputs | High | Use deterministic ordering and conservative YAML guards; preserve raw text when confidence is low. |
| Trying 19 SQL dialects can be expensive | High | Use JSON/YAML prechecks, SQL-shape guards, remembered fast path, and stop at first validated success. |
| Applying a detected formatter to both panes can rewrite intentionally raw content | High | Preserve each pane independently when formatting fails; make the shared formatter selection explicit. |
| Existing localStorage state lacks the new fields | Medium | Version/validate the state shape with safe defaults and retain legacy dialect compatibility. |
| Direct SQL options make the dropdown long | Medium | Use native grouped options or compact labels while keeping every dialect directly selectable. |
| Formatter library behavior differs across dialects | Medium | Test representative dialect-specific syntax and rely on the reference registry rather than hand-maintained partial support. |

## Open questions

- None blocking. The product behavior has been confirmed; implementation can begin from Task 1.
