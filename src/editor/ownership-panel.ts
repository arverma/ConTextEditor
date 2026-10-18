import { commitCollection, deriveTitle, readCollection, setActiveSnippetId, type StoredSnippet } from './storage';
import { decodeMarkdown, INPUT_BYTE_LIMIT, makeBackup, mergeBackup, validateBackup, type Backup } from './ownership';
import type { NoteSession } from './note-session';

export function initOwnershipPanel(session: NoteSession, actions: {
  beforeOpen: () => void; imported: (id: string) => void; applySettings: (settings: Record<string, string>) => void;
}): void {
  const dialog = document.createElement('dialog'); dialog.className = 'command-dialog ownership-dialog';
  dialog.setAttribute('aria-labelledby', 'ownership-title');
  dialog.innerHTML = '<div class="command-header"><h2 id="ownership-title">Import & backup</h2><button type="button" aria-label="Close import and backup">×</button></div><p class="ownership-description">Your notes live in this browser. Keep an independent copy by downloading a backup, including Trash.</p><div class="ownership-options"><button id="import-notes-btn" type="button">Import Markdown<span>Add .md or .markdown files</span></button><button id="backup-btn" type="button">Download backup<span>All notes, Trash & preferences</span></button><button id="restore-backup-btn" type="button">Restore backup<span>Merge safely; keep existing notes</span></button></div><input class="markdown-files" type="file" accept=".md,.markdown" multiple hidden /><input class="backup-file" type="file" accept=".json,application/json" hidden /><section class="ownership-review" hidden><h3>Review files</h3><p class="review-summary"></p><ul class="review-files"></ul><label class="restore-settings" hidden><input type="checkbox" /> Also restore appearance preferences</label><button class="ownership-confirm" type="button">Import notes</button></section><p class="ownership-feedback" role="status"></p><p class="ownership-error" role="alert" hidden></p>';
  document.body.append(dialog);
  const review = dialog.querySelector<HTMLElement>('.ownership-review')!;
  const summary = dialog.querySelector<HTMLElement>('.review-summary')!;
  const list = dialog.querySelector<HTMLElement>('.review-files')!;
  const settingsLabel = dialog.querySelector<HTMLElement>('.restore-settings')!;
  const settings = settingsLabel.querySelector('input')!;
  const confirm = dialog.querySelector<HTMLButtonElement>('.ownership-confirm')!;
  const feedback = dialog.querySelector<HTMLElement>('.ownership-feedback')!;
  const error = dialog.querySelector<HTMLElement>('.ownership-error')!;
  const markdown = dialog.querySelector<HTMLInputElement>('.markdown-files')!;
  const backupFile = dialog.querySelector<HTMLInputElement>('.backup-file')!;
  let previousFocus: HTMLElement | null = null;
  let generation = 0;
  let pending: { token: string | null; notes: StoredSnippet[]; first?: string; backup?: Backup; mapping?: Map<string, string> } | null = null;
  function reset(): void { generation++; pending = null; review.hidden = true; confirm.disabled = true; error.hidden = true; feedback.textContent = ''; settings.checked = false; }
  function open(): void {
    if (dialog.open) return;
    previousFocus = document.activeElement as HTMLElement | null; actions.beforeOpen(); reset(); dialog.showModal();
  }
  function showError(failure: unknown): void { error.textContent = failure instanceof Error ? failure.message : 'The operation could not be completed. Your notes are unchanged.'; error.hidden = false; }
  function showReview(labels: string[], text: string, restore: boolean): void {
    list.replaceChildren(); for (const label of labels) { const li = document.createElement('li'); li.textContent = label; list.append(li); }
    summary.textContent = text; review.hidden = false; settingsLabel.hidden = !restore; confirm.textContent = restore ? 'Merge backup' : 'Import notes'; confirm.disabled = false; confirm.focus();
  }
  async function readFiles(input: HTMLInputElement, restoring: boolean): Promise<void> {
    const files = Array.from(input.files ?? []); input.value = ''; if (!files.length) return;
    reset(); const request = generation; feedback.textContent = 'Reading files…';
    try {
      if (files.reduce((total, file) => total + file.size, 0) > INPUT_BYTE_LIMIT) throw new Error('Choose files totaling no more than 5 MiB.');
      if (!session.flush()) throw new Error('Save your current draft before importing. Retry saving or download a backup.');
      const current = readCollection();
      if (restoring) {
        if (files.length !== 1) throw new Error('Choose one ConText JSON backup.');
        const bytes = new Uint8Array(await files[0].arrayBuffer());
        const backup = validateBackup(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
        if (request !== generation || !dialog.open) return;
        const merged = mergeBackup(current.notes, backup.notes);
        pending = { token: current.token, notes: merged.notes, backup, mapping: merged.mapping };
        const trash = backup.notes.filter(note => note.trash).length;
        showReview(backup.notes.map(note => `${deriveTitle(note.content)}${note.trash ? ' · Trash' : ''}${merged.mapping.get(note.id) !== note.id ? ' · new copy' : ''}`), `${merged.added} new · ${merged.skipped} identical skipped · ${merged.copied} conflicts kept as copies. Includes ${trash} Trash ${trash === 1 ? 'entry' : 'entries'}. Existing notes stay unchanged.`, true);
      } else {
        const sources = await Promise.all(files.map(async file => decodeMarkdown(file.name, new Uint8Array(await file.arrayBuffer()))));
        if (request !== generation || !dialog.open) return;
        const notes = sources.map(content => ({ id: crypto.randomUUID(), content, updatedAt: Date.now() }));
        pending = { token: current.token, notes: [...current.notes, ...notes], first: notes[0].id };
        showReview(files.map(file => file.name), `${files.length} ${files.length === 1 ? 'file' : 'files'} will be added as new notes. Existing notes stay unchanged.`, false);
      }
      feedback.textContent = '';
    } catch (failure) { if (request === generation && dialog.open) { feedback.textContent = ''; showError(failure); } }
  }
  markdown.addEventListener('change', () => { void readFiles(markdown, false); });
  backupFile.addEventListener('change', () => { void readFiles(backupFile, true); });
  document.getElementById('library-tools-btn')!.addEventListener('click', open);
  document.getElementById('import-notes-btn')!.addEventListener('click', () => { open(); markdown.click(); });
  document.getElementById('restore-backup-btn')!.addEventListener('click', () => { open(); backupFile.click(); });
  document.getElementById('backup-btn')!.addEventListener('click', () => {
    open(); reset();
    try {
      const saved = session.flush();
      const backup = makeBackup({ id: session.id, content: session.content, dirty: session.hasPendingChanges });
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = `context-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      try { link.click(); } finally { link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
      feedback.textContent = `Backup download requested: ${backup.notes.filter(note => !note.trash).length} notes and ${backup.notes.filter(note => note.trash).length} Trash entries.${saved ? '' : ' The backup includes your latest draft; local saving still needs attention.'} Check your browser downloads.`;
    } catch (failure) { showError(failure); }
  });
  confirm.addEventListener('click', () => {
    if (!pending || confirm.disabled) return;
    error.hidden = true;
    try {
      if (!session.flush()) throw new Error('Your draft could not be saved. Retry saving before continuing.');
      const operation = pending;
      const wasEmpty = readCollection().notes.every(note => Boolean(note.trash));
      commitCollection(operation.notes, operation.token);
      pending = null; review.hidden = true; confirm.disabled = true;
      const first = operation.first ?? (wasEmpty && operation.backup?.activeNoteId ? operation.mapping?.get(operation.backup.activeNoteId) : undefined);
      if (first) { setActiveSnippetId(first); actions.imported(first); }
      else session.reconcile();
      feedback.textContent = operation.backup ? 'Backup merged. Existing notes were preserved.' : 'Markdown imported.';
      document.getElementById(operation.backup ? 'restore-backup-btn' : 'import-notes-btn')!.focus();
      if (operation.backup && settings.checked) {
        try { actions.applySettings(operation.backup.settings); }
        catch { feedback.textContent += ' Notes are saved, but some appearance preferences could not be applied.'; }
      }
    } catch (failure) { showError(failure); }
  });
  dialog.querySelector('.command-header button')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    reset(); markdown.value = ''; backupFile.value = '';
    const target = previousFocus?.isConnected && !previousFocus.closest('[hidden]') && !previousFocus.closest('dialog:not([open])') ? previousFocus : document.getElementById('sidebar-toggle');
    target?.focus();
  });
}
