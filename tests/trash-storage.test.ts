import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import * as store from '../src/editor/storage';
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
it('keeps deleted source and metadata across module reloads, outside active history', async () => {
  const note = store.createSnippet('# Source\n\n```js\nconst x = 1;\n```');
  const entry = store.deleteSnippet(note.id)!;
  expect(store.getSnippets()).toEqual([]);
  const reloaded = await import('../src/editor/storage');
  expect(reloaded.getTrashEntries()[0]).toEqual(entry);
  expect(entry.note).toEqual(note);
  expect(store.restoreTrashEntry(entry.id)).toEqual(note);
  expect(store.getTrashEntries()).toEqual([]);
  expect(() => store.restoreTrashEntry(entry.id)).toThrow();
  expect(store.getSnippets()).toEqual([note]);
});
it('failed delete, restore, and permanent deletion leave the prior collection intact', () => {
  const note = store.createSnippet('safe');
  const fail = () => vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  let spy = fail(); expect(() => store.deleteSnippet(note.id)).toThrow(); spy.mockRestore();
  expect(store.getSnippets()).toEqual([note]); expect(store.getTrashEntries()).toEqual([]);
  const entry = store.deleteSnippet(note.id)!;
  spy = fail(); expect(() => store.restoreTrashEntry(entry.id)).toThrow(); spy.mockRestore();
  expect(store.getTrashEntries()).toEqual([entry]);
  spy = fail(); expect(() => store.permanentlyDeleteTrashEntry(entry.id)).toThrow(); spy.mockRestore();
  expect(store.getTrashEntries()).toEqual([entry]);
  store.permanentlyDeleteTrashEntry(entry.id); expect(store.getTrashEntries()).toEqual([]);
});
it('uses a new deletion identity so a stale Undo cannot restore a later deletion', () => {
  const note = store.createSnippet('same note'); const first = store.deleteSnippet(note.id)!;
  store.restoreTrashEntry(first.id); const second = store.deleteSnippet(note.id)!;
  expect(second.id).not.toBe(first.id);
  expect(() => store.restoreTrashEntry(first.id)).toThrow(); expect(store.getTrashEntries()).toEqual([second]);
});
it('preserves legacy notes and Trash during unrelated edits and creates', () => {
  localStorage.setItem('context-editor.snippets', JSON.stringify([{ id: 'legacy', content: 'old', updatedAt: 1 }]));
  const entry = store.deleteSnippet('legacy')!; const active = store.createSnippet('new');
  store.updateSnippetContent(active.id, 'edited'); expect(store.getTrashEntries()).toEqual([entry]);
  expect(store.getSnippets()[0].content).toBe('edited');
});
it('never overwrites an ID conflict and offers an explicit copy restore', () => {
  const note = store.createSnippet('original'); const entry = store.deleteSnippet(note.id)!;
  const raw = JSON.parse(localStorage.getItem('context-editor.snippets')!);
  raw.push({ ...note, content: 'existing' }); localStorage.setItem('context-editor.snippets', JSON.stringify(raw));
  expect(() => store.restoreTrashEntry(entry.id)).toThrow(/already exists/);
  const copy = store.restoreTrashEntry(entry.id, true);
  expect(copy.id).not.toBe(note.id); expect(copy.content).toBe('original');
  expect(store.getSnippets().find(n => n.id === note.id)?.content).toBe('existing');
});
it('refuses malformed recovery metadata without rewriting stored data', () => {
  const raw = JSON.stringify([{ id: 'bad', content: 'keep', updatedAt: 1, trash: { id: 'x' } }]);
  localStorage.setItem('context-editor.snippets', raw);
  expect(() => store.createSnippet()).toThrow(); expect(localStorage.getItem('context-editor.snippets')).toBe(raw);
});
