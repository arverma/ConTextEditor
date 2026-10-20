import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { openSearchPanel, closeSearchPanel, search } from "@codemirror/search";
import { VSCodeSearchPanel } from "../src/editor/vscode-search-panel";

function createTestEditor(initialText = "hello world\nhello tests\nanother hello") {
  const parent = document.createElement("div");
  document.body.appendChild(parent);

  const state = EditorState.create({
    doc: initialText,
    extensions: [
      search({
        top: true,
        createPanel: (view) => new VSCodeSearchPanel(view),
      }),
    ],
  });

  const view = new EditorView({ state, parent });
  return { view, parent };
}

describe("VSCodeSearchPanel", () => {
  it("renders the floating VS Code search panel with find and replace elements", () => {
    const { view, parent } = createTestEditor();
    openSearchPanel(view);

    const panel = parent.querySelector<HTMLElement>(".cm-vscode-search");
    expect(panel).not.toBeNull();
    expect(panel?.classList.contains("cm-search")).toBe(true);

    // Inputs
    const searchInput = panel?.querySelector<HTMLInputElement>('input[name="search"]');
    const replaceInput = panel?.querySelector<HTMLInputElement>('input[name="replace"]');
    expect(searchInput).not.toBeNull();
    expect(searchInput?.getAttribute("main-field")).toBe("true");
    expect(replaceInput).not.toBeNull();

    // Toggle Replace chevron
    const toggleReplaceBtn = panel?.querySelector<HTMLButtonElement>(".cm-search-toggle-replace");
    expect(toggleReplaceBtn).not.toBeNull();
    expect(toggleReplaceBtn?.getAttribute("aria-expanded")).toBe("false");

    // Replace row should be hidden initially
    const replaceRow = panel?.querySelector<HTMLElement>(".cm-replace-row");
    expect(replaceRow?.hidden).toBe(true);

    // Inline option buttons
    expect(panel?.querySelector(".cm-opt-case")).not.toBeNull();
    expect(panel?.querySelector(".cm-opt-word")).not.toBeNull();
    expect(panel?.querySelector(".cm-opt-regex")).not.toBeNull();
    expect(panel?.querySelector(".cm-opt-preserve-case")).not.toBeNull();

    // Action buttons
    expect(panel?.querySelector(".cm-btn-prev")).not.toBeNull();
    expect(panel?.querySelector(".cm-btn-next")).not.toBeNull();
    expect(panel?.querySelector(".cm-btn-select-all")).not.toBeNull();
    expect(panel?.querySelector(".cm-btn-close")).not.toBeNull();
    expect(panel?.querySelector(".cm-btn-replace")).not.toBeNull();
    expect(panel?.querySelector(".cm-btn-replace-all")).not.toBeNull();

    view.destroy();
    parent.remove();
  });

  it("expands and collapses replace row via chevron toggle", () => {
    const { view, parent } = createTestEditor();
    openSearchPanel(view);

    const panel = parent.querySelector<HTMLElement>(".cm-vscode-search")!;
    const toggleReplaceBtn = panel.querySelector<HTMLButtonElement>(".cm-search-toggle-replace")!;
    const replaceRow = panel.querySelector<HTMLElement>(".cm-replace-row")!;

    expect(replaceRow.hidden).toBe(true);
    expect(toggleReplaceBtn.getAttribute("aria-expanded")).toBe("false");

    // Expand
    toggleReplaceBtn.click();
    expect(replaceRow.hidden).toBe(false);
    expect(toggleReplaceBtn.getAttribute("aria-expanded")).toBe("true");

    // Collapse
    toggleReplaceBtn.click();
    expect(replaceRow.hidden).toBe(true);
    expect(toggleReplaceBtn.getAttribute("aria-expanded")).toBe("false");

    view.destroy();
    parent.remove();
  });

  it("toggles case, word, and regex search options", () => {
    const { view, parent } = createTestEditor();
    openSearchPanel(view);

    const panel = parent.querySelector<HTMLElement>(".cm-vscode-search")!;
    const caseBtn = panel.querySelector<HTMLButtonElement>(".cm-opt-case")!;
    const wordBtn = panel.querySelector<HTMLButtonElement>(".cm-opt-word")!;
    const regexBtn = panel.querySelector<HTMLButtonElement>(".cm-opt-regex")!;

    expect(caseBtn.getAttribute("aria-pressed")).toBe("false");
    caseBtn.click();
    expect(caseBtn.getAttribute("aria-pressed")).toBe("true");
    expect(caseBtn.classList.contains("cm-active")).toBe(true);

    expect(wordBtn.getAttribute("aria-pressed")).toBe("false");
    wordBtn.click();
    expect(wordBtn.getAttribute("aria-pressed")).toBe("true");

    expect(regexBtn.getAttribute("aria-pressed")).toBe("false");
    regexBtn.click();
    expect(regexBtn.getAttribute("aria-pressed")).toBe("true");

    view.destroy();
    parent.remove();
  });

  it("calculates live match count accurately and updates status", () => {
    const { view, parent } = createTestEditor("foo bar foo baz foo");
    openSearchPanel(view);

    const panel = parent.querySelector<HTMLElement>(".cm-vscode-search")!;
    const searchInput = panel.querySelector<HTMLInputElement>('input[name="search"]')!;
    const countEl = panel.querySelector<HTMLElement>(".cm-search-count")!;

    // Initial empty search
    expect(countEl.textContent).toBe("");

    // Search for 'foo' (3 matches)
    searchInput.value = "foo";
    searchInput.dispatchEvent(new Event("input"));

    expect(countEl.textContent).toMatch(/3 matches|1 of 3/);

    // Search for non-existent text
    searchInput.value = "nonexistent";
    searchInput.dispatchEvent(new Event("input"));
    expect(countEl.textContent).toBe("No results");

    // Invalid regex
    const regexBtn = panel.querySelector<HTMLButtonElement>(".cm-opt-regex")!;
    regexBtn.click();
    searchInput.value = "[unclosed";
    searchInput.dispatchEvent(new Event("input"));
    expect(countEl.textContent).toBe("Invalid regex");

    view.destroy();
    parent.remove();
  });

  it("closes the panel when the close button is clicked", () => {
    const { view, parent } = createTestEditor();
    openSearchPanel(view);

    expect(parent.querySelector(".cm-vscode-search")).not.toBeNull();

    const closeBtn = parent.querySelector<HTMLButtonElement>(".cm-btn-close")!;
    closeBtn.click();

    expect(parent.querySelector(".cm-vscode-search")).toBeNull();

    view.destroy();
    parent.remove();
  });
});
