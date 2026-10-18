import { beforeEach, expect, it, vi } from "vitest";
import { createSnippet, updateSnippetContent } from "../src/editor/storage";
import { filterNotes, initHistoryPanel } from "../src/editor/history-panel";
beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<input id="note-search"><button id="clear-search">Clear</button><span id="search-status"></span><ul id="snippet-list"></ul>';
});
it("searches raw body and derived title literally without changing source order", () => {
  const notes = [{ id: "1", content: "# Alpha\nA [test] body", updatedAt: 1 }, { id: "2", content: "Beta", updatedAt: 2 }];
  expect(filterNotes(notes, " ALPHA ")).toEqual([notes[0]]);
  expect(filterNotes(notes, "[test]")).toEqual([notes[0]]);
  expect(filterNotes(notes, ".*")).toEqual([]); expect(filterNotes(notes, " ")).toBe(notes);
});
it("arrows move focus without selecting; click selects by current identity", () => {
  const a = createSnippet("A"), b = createSnippet("B"); const select = vi.fn();
  const panel = initHistoryPanel({ onSelect: select, onDelete: vi.fn() }); panel.refresh(a.id);
  const buttons = document.querySelectorAll<HTMLButtonElement>(".snippet-select"); buttons[0].focus();
  buttons[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  expect(document.activeElement).toBe(buttons[1]); expect(select).not.toHaveBeenCalled();
  buttons[1].click(); expect(select).toHaveBeenCalledWith(buttons[1].parentElement!.dataset.id);
  expect(document.querySelector(`[data-id="${a.id}"] .snippet-select`)?.getAttribute("aria-current")).toBe("true");
  expect([a.id, b.id]).toHaveLength(2);
});
it("keeps focus across refresh, moves it when that note is filtered out, and distinguishes no-match from empty", () => {
  const notes = Array.from({ length: 40 }, (_, i) => createSnippet(`Note ${i}\nBody ${i}`));
  const panel = initHistoryPanel({ onSelect: vi.fn(), onDelete: vi.fn() }); panel.refresh(notes[10].id);
  const button = document.querySelector<HTMLButtonElement>(`[data-id="${notes[10].id}"] .snippet-delete-btn`)!;
  button.focus(); updateSnippetContent(notes[10].id, "Renamed\nNew body"); panel.refresh(notes[10].id);
  expect(document.activeElement).toBe(button); expect(document.querySelectorAll(".snippet-select")).toHaveLength(40);
  const search = document.getElementById("note-search") as HTMLInputElement;
  search.value = "Body 0"; search.dispatchEvent(new Event("input"));
  const remaining = document.querySelectorAll(".snippet-select");
  expect(remaining).toHaveLength(1); expect(document.activeElement).toBe(remaining[0]);
  search.value = "no result"; search.dispatchEvent(new Event("input"));
  expect(document.querySelector(".sidebar-empty")!.textContent).toBe("No matching notes");
  expect(document.getElementById("clear-search")!.hidden).toBe(false);
});
