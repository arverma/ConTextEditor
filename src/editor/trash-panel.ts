import { deriveTitle, getSnippets, getTrashEntries, type TrashEntry } from './storage';

export function initTrashPanel(actions: {
  beforeOpen: () => void;
  restore: (entry: TrashEntry, asCopy: boolean) => boolean;
  purge: (id: string) => boolean;
  error: () => string;
}): { refresh: () => void } {
  const trigger = document.getElementById('trash-btn')!;
  const count = document.getElementById('trash-count')!;
  const dialog = document.createElement('dialog');
  dialog.className = 'command-dialog trash-dialog';
  dialog.setAttribute('aria-labelledby', 'trash-title');
  dialog.innerHTML = '<div class="command-header"><h2 id="trash-title">Trash</h2><button type="button" aria-label="Close Trash">×</button></div><p class="trash-description">Deleted notes stay here until you permanently delete them. Stored in this browser; clearing site data also clears Trash.</p><input type="search" aria-label="Search Trash" placeholder="Search deleted notes…" /><p class="trash-status" role="status"></p><p class="trash-error" role="alert" hidden></p><ul class="trash-list" aria-label="Deleted notes"></ul>';
  document.body.append(dialog);
  const search = dialog.querySelector('input')!;
  const list = dialog.querySelector('ul')!;
  const status = dialog.querySelector<HTMLElement>('.trash-status')!;
  const error = dialog.querySelector<HTMLElement>('.trash-error')!;
  let previousFocus: HTMLElement | null = null;
  function refresh(): void {
    const entries = getTrashEntries();
    count.textContent = String(entries.length);
    trigger.setAttribute('aria-label', `Trash, ${entries.length} deleted ${entries.length === 1 ? 'note' : 'notes'}`);
    if (!dialog.open) return;
    const focused = document.activeElement as HTMLElement | null;
    const focusId = focused?.closest<HTMLElement>('.trash-row')?.dataset.id;
    const focusAction = focused?.dataset.action;
    const activeIds = new Set(getSnippets().map(note => note.id));
    const query = search.value.trim().toLocaleLowerCase();
    const matching = entries.filter(entry => entry.note.content.toLocaleLowerCase().includes(query));
    list.replaceChildren();
    for (const entry of matching) {
      const row = document.createElement('li'); row.className = 'trash-row'; row.dataset.id = entry.id;
      const details = document.createElement('div'); details.className = 'trash-details';
      const title = document.createElement('strong'); title.textContent = deriveTitle(entry.note.content);
      const excerpt = document.createElement('p'); excerpt.textContent = entry.note.content.slice(0, 160) || 'Empty note';
      const time = document.createElement('time'); time.dateTime = new Date(entry.deletedAt).toISOString();
      time.textContent = `Deleted ${new Date(entry.deletedAt).toLocaleString()}`;
      details.append(title, excerpt, time);
      const controls = document.createElement('div'); controls.className = 'trash-actions';
      const restore = document.createElement('button'); restore.type = 'button'; restore.dataset.action = 'restore';
      const asCopy = activeIds.has(entry.note.id); restore.textContent = asCopy ? 'Restore as copy' : 'Restore';
      const purge = document.createElement('button'); purge.type = 'button'; purge.dataset.action = 'purge'; purge.textContent = 'Delete forever';
      purge.setAttribute('aria-label', `Delete ${deriveTitle(entry.note.content)} forever`);
      function run(action: () => boolean, success: string): void {
        error.hidden = true;
        try {
          if (!action()) throw new Error(actions.error());
          refresh(); status.textContent = success;
        } catch (failure) {
          error.textContent = failure instanceof Error ? failure.message : 'Could not update Trash. Try again.';
          error.hidden = false;
        }
      }
      restore.addEventListener('click', () => run(() => actions.restore(entry, asCopy), 'Note restored.'));
      purge.addEventListener('click', () => {
        if (window.confirm(`Permanently delete “${deriveTitle(entry.note.content)}”? This cannot be undone.`)) {
          run(() => actions.purge(entry.id), 'Note permanently deleted.');
        }
      });
      controls.append(restore, purge); row.append(details, controls); list.append(row);
    }
    if (!matching.length) {
      const empty = document.createElement('li'); empty.className = 'trash-empty';
      empty.textContent = entries.length ? 'No deleted notes match your search.' : 'Trash is empty.'; list.append(empty);
    }
    if (focusId) {
      const row = Array.from(list.children).find(row => (row as HTMLElement).dataset.id === focusId);
      (row?.querySelector<HTMLButtonElement>(`button[data-action="${focusAction === 'purge' ? 'purge' : 'restore'}"]`) ?? search).focus();
    }
  }
  trigger.addEventListener('click', () => {
    if (dialog.open) return;
    previousFocus = document.activeElement as HTMLElement | null;
    actions.beforeOpen(); search.value = ''; status.textContent = ''; error.hidden = true;
    dialog.showModal();
    try { refresh(); } catch { error.textContent = 'Trash could not be read. Saved data has not been changed.'; error.hidden = false; }
    search.focus();
  });
  search.addEventListener('input', () => { status.textContent = ''; try { refresh(); } catch { error.textContent = 'Trash could not be read. Your saved data is unchanged.'; error.hidden = false; } });
  dialog.querySelector('button')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    const target = previousFocus?.isConnected && !previousFocus.closest('[hidden]') && !previousFocus.closest('dialog:not([open])') ? previousFocus : document.getElementById('sidebar-toggle');
    target?.focus();
  });
  return { refresh };
}
