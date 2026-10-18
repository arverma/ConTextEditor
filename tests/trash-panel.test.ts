import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createSnippet, deleteSnippet, getTrashEntries, restoreTrashEntry, permanentlyDeleteTrashEntry } from '../src/editor/storage';
import { initTrashPanel } from '../src/editor/trash-panel';
beforeEach(() => {
 localStorage.clear(); document.body.innerHTML = '<button id="trash-btn">Trash <span id="trash-count"></span></button>';
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
});
afterEach(() => vi.restoreAllMocks());
function setup() { return initTrashPanel({ beforeOpen: vi.fn(), restore: (entry, copy) => { restoreTrashEntry(entry.id, copy); return true; }, purge: id => { permanentlyDeleteTrashEntry(id); return true; }, error: () => 'Failed to save' }); }
it('searches only Trash and restores exact text while updating count and empty state', () => {
 const note = createSnippet('# Deleted\nneedle'); deleteSnippet(note.id); createSnippet('Active needle');
 const panel = setup(); document.getElementById('trash-btn')!.click();
 const search = document.querySelector<HTMLInputElement>('.trash-dialog input')!;
 search.value = 'needle'; search.dispatchEvent(new Event('input'));
 expect(document.querySelectorAll('.trash-row')).toHaveLength(1);
 document.querySelector<HTMLButtonElement>('[data-action="restore"]')!.click();
 expect(getTrashEntries()).toEqual([]); expect(document.getElementById('trash-count')!.textContent).toBe('0');
 expect(document.querySelector('.trash-status')!.textContent).toContain('restored'); panel.refresh();
});
it('requires confirmation and keeps the record when permanent deletion is cancelled', () => {
 deleteSnippet(createSnippet('Keep').id); setup(); document.getElementById('trash-btn')!.click();
 const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
 document.querySelector<HTMLButtonElement>('[data-action="purge"]')!.click(); expect(confirm).toHaveBeenCalled(); expect(getTrashEntries()).toHaveLength(1);
 confirm.mockReturnValue(true); document.querySelector<HTMLButtonElement>('[data-action="purge"]')!.click(); expect(getTrashEntries()).toHaveLength(0);
});
it('reports failed restores inside the modal while keeping recovery available', () => {
 deleteSnippet(createSnippet('Recover me').id);
 initTrashPanel({beforeOpen:vi.fn(),restore:()=>false,purge:()=>false,error:()=> 'Storage is full'});
 document.getElementById('trash-btn')!.click(); document.querySelector<HTMLButtonElement>('[data-action="restore"]')!.click();
 expect(document.querySelector('.trash-error')!.textContent).toBe('Storage is full'); expect(getTrashEntries()).toHaveLength(1);
});
