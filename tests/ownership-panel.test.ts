import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { initOwnershipPanel } from '../src/editor/ownership-panel';
import { NoteSession } from '../src/editor/note-session';
import { createSnippet, getSnippets, readCollection } from '../src/editor/storage';
import { makeBackup } from '../src/editor/ownership';
let session: NoteSession;
beforeEach(() => {
 localStorage.clear(); document.body.innerHTML = '<button id="library-tools-btn">Tools</button><button id="sidebar-toggle">History</button>';
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
 session = new NoteSession(vi.fn()); session.start();
 initOwnershipPanel(session, { beforeOpen: vi.fn(), imported: id => { session.select(id); }, applySettings: vi.fn() });
 document.getElementById('library-tools-btn')!.click();
});
afterEach(() => { session.dispose(); vi.restoreAllMocks(); });
async function choose(selector: string, files: {name: string; source: string}[]) {
 const input = document.querySelector<HTMLInputElement>(selector)!;
 Object.defineProperty(input, 'files', { configurable: true, value: files.map(file => ({ name: file.name, size: new TextEncoder().encode(file.source).length, arrayBuffer: async () => new TextEncoder().encode(file.source).buffer })) });
 input.dispatchEvent(new Event('change')); await vi.waitFor(() => expect(document.querySelector('.ownership-feedback')!.textContent).not.toBe('Reading files…'));
}
it('reviews a whole Markdown batch, then adds it atomically and selects the first note', async () => {
 await choose('.markdown-files', [{name:'one.md',source:'# One\r\nraw'}, {name:'two.markdown',source:'Two'}]);
 expect(getSnippets()).toHaveLength(1); expect(document.querySelectorAll('.review-files li')).toHaveLength(2);
 document.querySelector<HTMLButtonElement>('.ownership-confirm')!.click();
 expect(getSnippets()).toHaveLength(3); expect(session.content).toBe('# One\r\nraw');
});
it('keeps notes and review intact after quota failure, permitting a safe retry', async () => {
 await choose('.markdown-files', [{name:'one.md',source:'new'}]); const original = readCollection();
 const fail = vi.spyOn(Storage.prototype,'setItem').mockImplementation(() => { throw Error('quota'); });
 document.querySelector<HTMLButtonElement>('.ownership-confirm')!.click();
 expect(readCollection()).toEqual(original); expect(document.querySelector<HTMLElement>('.ownership-error')!.hidden).toBe(false);
 fail.mockRestore(); document.querySelector<HTMLButtonElement>('.ownership-confirm')!.click(); expect(getSnippets()).toHaveLength(2);
});
it('rejects the entire invalid batch and a stale backup review', async () => {
 await choose('.markdown-files', [{name:'one.md',source:'new'}, {name:'wrong.txt',source:'bad'}]);
 expect(getSnippets()).toHaveLength(1); expect(document.querySelector<HTMLElement>('.ownership-review')!.hidden).toBe(true);
 const backup = makeBackup(); backup.notes.push({id:'free',content:'incoming',updatedAt:1});
 await choose('.backup-file', [{name:'backup.json',source:JSON.stringify(backup)}]); createSnippet('other tab');
 document.querySelector<HTMLButtonElement>('.ownership-confirm')!.click();
 expect(getSnippets()).toHaveLength(2); expect(document.querySelector('.ownership-error')!.textContent).toContain('changed');
});
it('does not commit an asynchronous file selection after the dialog closes', async () => {
 const input = document.querySelector<HTMLInputElement>('.markdown-files')!; let resolve!: (value: ArrayBuffer) => void;
 Object.defineProperty(input, 'files', { configurable:true, value:[{name:'slow.md',size:4,arrayBuffer:() => new Promise<ArrayBuffer>(done => { resolve=done; })}] });
 input.dispatchEvent(new Event('change')); document.querySelector<HTMLButtonElement>('[aria-label="Close import and backup"]')!.click();
 resolve(new TextEncoder().encode('slow').buffer); await Promise.resolve(); await Promise.resolve();
 expect(getSnippets()).toHaveLength(1); expect(document.querySelector<HTMLElement>('.ownership-review')!.hidden).toBe(true);
});
it('backs up the live draft when local saving fails and reports the remaining save error', async () => {
 session.edit('latest pending draft');
 let captured: Blob | undefined;
 vi.stubGlobal('URL', { createObjectURL: (blob: Blob) => { captured = blob; return 'blob:test'; }, revokeObjectURL: vi.fn() });
 vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
 const fail = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('quota'); });
 document.getElementById('backup-btn')!.click(); fail.mockRestore();
 const text = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsText(captured!); });
 expect(JSON.parse(text).notes.find((note: { id: string }) => note.id === session.id).content).toBe('latest pending draft');
 expect(document.querySelector('.ownership-feedback')!.textContent).toContain('local saving still needs attention');
 expect(session.hasPendingChanges).toBe(true); vi.unstubAllGlobals();
});
it('restores appearance only when the user opts in, while keeping the active note', async () => {
 const apply = vi.fn(); document.querySelector('.ownership-dialog')!.remove();
 initOwnershipPanel(session, {beforeOpen:vi.fn(), imported:id => { session.select(id); }, applySettings:apply});
 document.getElementById('restore-backup-btn')!.click();
 const backup = makeBackup(); backup.notes.push({id:'new-id',content:'new',updatedAt:1}); const id = session.id;
 await choose('.backup-file', [{name:'backup.json',source:JSON.stringify(backup)}]);
 const confirm = document.querySelector<HTMLButtonElement>('.ownership-confirm')!; confirm.click();
 expect(apply).not.toHaveBeenCalled(); expect(session.id).toBe(id);
 await choose('.backup-file', [{name:'backup.json',source:JSON.stringify(backup)}]);
 document.querySelector<HTMLInputElement>('.restore-settings input')!.checked = true; confirm.click();
 expect(apply).toHaveBeenCalledWith(backup.settings); expect(session.id).toBe(id);
});
