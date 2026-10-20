import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NoteSession, STARTER_NOTE_CONTENT } from "../src/editor/note-session";
import { getSnippets, createSnippet, deleteSnippet } from "../src/editor/storage";

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
afterEach(() => vi.useRealTimers());
function session() { const session = new NoteSession(vi.fn()); session.start(); return session; }

describe("note lifecycle", () => {
  it("starts the first note with editor feature examples", () => {
    const s = session();
    expect(s.content).toBe(STARTER_NOTE_CONTENT);
    expect(s.content).toContain("**Bold**");
    expect(s.content).toContain("*italic*");
    expect(s.content).toContain("`inline code`");
    expect(s.content).toContain("- ");
  });
  it("starts every newly created note with the same feature examples", () => {
    const s = session();
    expect(s.create()).toBe(true);
    expect(s.content).toBe(STARTER_NOTE_CONTENT);
  });
  it("saves pending edits before selecting another note without touching its timestamp", () => {
    const s = session(); const a = s.id!; s.edit("A latest");
    const b = createSnippet("B"); const timestamp = b.updatedAt;
    vi.advanceTimersByTime(50); expect(s.select(b.id)).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(getSnippets().find(n => n.id === a)?.content).toBe("A latest");
    expect(getSnippets().find(n => n.id === b.id)?.updatedAt).toBe(timestamp);
  });
  it("creates exactly one saved note when typing after the final deletion", () => {
    const s = session(); s.remove(s.id!); expect(s.id).toBeNull();
    s.edit("first"); s.edit("first second"); vi.advanceTimersByTime(600);
    expect(getSnippets()).toHaveLength(1); expect(getSnippets()[0].content).toBe("first second");
    const reload = new NoteSession(vi.fn()); reload.start(); expect(reload.content).toBe("first second");
  });
  it("does not update note timestamps on load", () => {
    const original = createSnippet("Existing"); vi.advanceTimersByTime(1000);
    const s = session(); vi.advanceTimersByTime(1000);
    expect(s.content).toBe("Existing"); expect(getSnippets()[0].updatedAt).toBe(original.updatedAt);
  });
  it("retains dirty content and blocks selection after a failed save, then retries", () => {
    const s = session(); const b = createSnippet("B"); s.edit("unsaved");
    const fail = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("quota"); });
    expect(s.select(b.id)).toBe(false); expect(s.content).toBe("unsaved"); expect(s.status).toBe("error");
    fail.mockRestore(); expect(s.flush()).toBe(true); expect(getSnippets().some(n => n.content === "unsaved")).toBe(true);
  });
  it("preserves unsaved edits under a new ID after external deletion", () => {
    const s = session(); const deleted = s.id; s.edit("local draft"); deleteSnippet(deleted!);
    s.reconcile(); expect(s.id).not.toBe(deleted); expect(getSnippets()[0].content).toBe("local draft");
  });
  it("moves to a fallback after an external deletion with no local edits", () => {
    const s = session(); const b = createSnippet("Fallback"); deleteSnippet(s.id!);
    s.reconcile(); expect(s.id).toBe(b.id); expect(s.content).toBe("Fallback");
  });
});

describe("deletion and restore", () => {
  it("snapshots latest edits, restores identity and timestamp, and keeps intervening edits", () => {
    const s = session(); const a = s.id!; const b = createSnippet("B"); s.edit("A newest");
    const deleted = s.remove(a)!; expect(deleted.note.content).toBe("A newest"); expect(s.id).toBe(b.id);
    s.edit("B newest"); expect(s.restore(deleted)).toBe(true);
    expect(s.id).toBe(a); expect(getSnippets().find(n => n.id === b.id)?.content).toBe("B newest");
    expect(getSnippets().find(n => n.id === a)?.updatedAt).toBe(deleted.note.updatedAt);
    expect(s.restore(deleted)).toBe(false); expect(getSnippets()).toHaveLength(2);
  });
  it("restores inactive notes without switching the editor", () => {
    const s = session(); const active = s.id; const b = createSnippet("B");
    const deleted = s.remove(b.id)!; expect(s.restore(deleted)).toBe(true); expect(s.id).toBe(active);
  });
  it("keeps visible note and storage after a deletion write failure", () => {
    const s = session(); const id = s.id;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("quota"); });
    expect(s.remove(id!)).toBeNull(); expect(s.id).toBe(id); expect(getSnippets()).toHaveLength(1);
  });
});
it("does not overwrite malformed stored data while preserving the typed draft", () => {
  localStorage.setItem("context-editor.snippets", "{broken");
  const s = new NoteSession(vi.fn()); s.start(); s.edit("Emergency draft");
  expect(s.status).toBe("error"); expect(s.content).toBe("Emergency draft");
  expect(localStorage.getItem("context-editor.snippets")).toBe("{broken");
});
it("does not duplicate saved content if only the active-selection preference fails", () => {
  const set = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
    if (key === "context-editor.activeSnippetId") throw Error("preference failed");
    set.call(this, key, value);
  });
  const s = session(); s.edit("Saved content"); s.flush(); s.flush();
  expect(getSnippets()).toHaveLength(1); expect(s.status).toBe("saved");
});
