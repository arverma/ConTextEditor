import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Recovery } from "../src/editor/recovery";
const deleted = (id: string) => ({ id, deletedAt: 1, note: { id, content: id, updatedAt: 1 }, wasActive: true });
beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers());
it("expires each deletion independently and undoes newest first", () => {
  const r = new Recovery(vi.fn()); r.add(deleted("a")); vi.advanceTimersByTime(6000); r.add(deleted("b"));
  vi.advanceTimersByTime(5000); expect(r.count).toBe(1); expect(r.peek()?.note.id).toBe("b");
  expect(r.undo(() => false)).toBe(false); expect(r.count).toBe(1);
  expect(r.undo(() => true)).toBe(true); expect(r.count).toBe(0);
});
it("pauses all eligible snapshots without extending a newer entry over an older one", () => {
  const r = new Recovery(vi.fn()); r.add(deleted("a")); vi.advanceTimersByTime(4000); r.pause(true);
  vi.advanceTimersByTime(20000); r.add(deleted("b")); expect(r.count).toBe(2); r.pause(false);
  vi.advanceTimersByTime(5999); expect(r.count).toBe(2); vi.advanceTimersByTime(2); expect(r.count).toBe(1);
});
it('does not discard another Undo when restoring also prunes persistent entries', () => {
 const r = new Recovery(vi.fn()); r.add(deleted('a')); r.add(deleted('b'));
 expect(r.undo(() => { r.prune(new Set(['a'])); return true; })).toBe(true);
 expect(r.peek()?.id).toBe('a');
});
