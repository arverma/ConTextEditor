import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createSnippet, deleteSnippet, getSnippets, getTrashEntries, readCollection, commitCollection } from '../src/editor/storage';
import { decodeMarkdown, validateBackup, mergeBackup, makeBackup, INPUT_BYTE_LIMIT } from '../src/editor/ownership';
beforeEach(() => localStorage.clear()); afterEach(() => vi.restoreAllMocks());
const bytes = (text: string) => new TextEncoder().encode(text);
it('imports UTF-8 exactly, removing only the BOM and preserving CRLF and fences', () => {
 expect(decodeMarkdown('x.md', bytes('\ufeff# 日本語\r\n```html\r\n<script>x</script>\r\n```'))).toBe('# 日本語\r\n```html\r\n<script>x</script>\r\n```');
 expect(() => decodeMarkdown('x.md', new Uint8Array([0xff]))).toThrow(/UTF-8/);
 expect(() => decodeMarkdown('x.txt', bytes('valid'))).toThrow(/Markdown/);
 expect(() => decodeMarkdown('x.md', new Uint8Array(INPUT_BYTE_LIMIT + 1))).toThrow(/5 MiB/);
});
it('round trips active and trashed records with original metadata and settings', () => {
 createSnippet('active'); deleteSnippet(createSnippet('deleted').id);
 localStorage.setItem('context-editor.fullWidth', 'true');
 const snapshot = makeBackup(); expect(validateBackup(JSON.stringify(snapshot))).toEqual(snapshot);
 expect(snapshot.notes).toHaveLength(2); expect(snapshot.settings['context-editor.fullWidth']).toBe('true');
});
it('backs up the latest unsaved draft even when local writes fail', () => {
 const note = createSnippet('old');
 vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('quota'); });
 const backup = makeBackup({ id: note.id, content: 'latest\n\n```raw```', dirty: true });
 expect(backup.notes[0].content).toBe('latest\n\n```raw```'); expect(getSnippets()[0].content).toBe('old');
});
it('keeps a draft whose ID has disappeared without reviving its Trash record', () => {
 const note = createSnippet('old'); deleteSnippet(note.id);
 const backup = makeBackup({ id: note.id, content: 'new draft', dirty: true });
 expect(backup.notes).toHaveLength(2); expect(backup.notes.filter(note => !note.trash)[0].content).toBe('new draft');
});
it('merges without overwriting, deduplicates exact records, and preserves Trash boundaries', () => {
 const existing = createSnippet('existing'); const backup = makeBackup();
 const same = mergeBackup(readCollection().notes, backup.notes); expect(same.skipped).toBe(1);
 const conflict = mergeBackup(readCollection().notes, [{ ...existing, content: 'different' }]);
 expect(conflict.copied).toBe(1); expect(conflict.notes).toHaveLength(2); expect(conflict.notes[0]).toEqual(existing);
 expect(conflict.notes[1].id).not.toBe(existing.id);
 deleteSnippet(existing.id); const trashed = readCollection().notes;
 const boundary = mergeBackup(trashed, backup.notes); expect(boundary.copied).toBe(1); expect(boundary.notes.filter(note => note.trash)).toHaveLength(1);
});
it('rejects malformed versions, duplicate IDs, settings and invalid timestamps before mutation', () => {
 createSnippet('keep'); const original = readCollection(); const backup = makeBackup();
 for (const value of [{ ...backup, version: 2 }, { ...backup, notes: [backup.notes[0], backup.notes[0]] }, { ...backup, settings: { hacked: true } }, { ...backup, notes: [{ ...backup.notes[0], updatedAt: 1e20 }] }]) {
  expect(() => validateBackup(JSON.stringify(value))).toThrow();
 }
 expect(readCollection()).toEqual(original);
});
it('commits batches atomically and refuses stale reviews', () => {
 createSnippet('existing'); const reviewed = readCollection(); const imported = { id: 'imported', content: 'new', updatedAt: 1 };
 const fail = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('quota'); });
 expect(() => commitCollection([...reviewed.notes, imported], reviewed.token)).toThrow(); fail.mockRestore();
 expect(readCollection()).toEqual(reviewed);
 createSnippet('intervening'); expect(() => commitCollection([...reviewed.notes, imported], reviewed.token)).toThrow(/changed/);
 expect(getSnippets()).toHaveLength(2); expect(getTrashEntries()).toHaveLength(0);
});
it('rejects oversized backups, invalid Trash, duplicate recovery IDs and active Trash references', () => {
 const backup = makeBackup();
 expect(() => validateBackup(' '.repeat(INPUT_BYTE_LIMIT + 1))).toThrow(/5 MiB/);
 const trash = { id:'a',content:'x',updatedAt:1,trash:{id:'op',deletedAt:1,wasActive:false} };
 for (const patch of [
  {notes:[{...trash,trash:{...trash.trash,deletedAt:null}}]},
  {notes:[trash,{...trash,id:'b'}]},
  {notes:[trash],activeNoteId:'a'},
 ]) expect(() => validateBackup(JSON.stringify({...backup,...patch}))).toThrow();
});
