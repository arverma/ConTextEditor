import { readCollection, type StoredSnippet } from './storage';
export const INPUT_BYTE_LIMIT = 5 * 1024 * 1024;
export const preferenceValues: Record<string, readonly string[]> = {
  'context-editor.theme': ['system', 'light', 'dark'],
  'context-editor.fullWidth': ['true', 'false'],
  'context-editor.sidebarOpen': ['true', 'false'],
  'context-editor.viewMode': ['edit', 'preview'],
};
export interface Backup {
  format: 'context-editor-backup'; version: 1; exportedAt: number;
  notes: StoredSnippet[]; activeNoteId: string | null; settings: Record<string, string>;
}
const validTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 8640000000000000;
const validId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 256;
export function decodeMarkdown(name: string, bytes: Uint8Array): string {
  if (!/\.(md|markdown)$/i.test(name)) throw new Error(`${name}: choose a Markdown (.md or .markdown) file.`);
  if (bytes.byteLength > INPUT_BYTE_LIMIT) throw new Error('Choose files totaling no more than 5 MiB.');
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error(`${name}: this file is not valid UTF-8. Save it as UTF-8 and try again.`); }
}
export function validateBackup(source: string): Backup {
  if (new TextEncoder().encode(source).byteLength > INPUT_BYTE_LIMIT) throw new Error('Choose a backup no larger than 5 MiB.');
  const raw = JSON.parse(source);
  if (!raw || raw.format !== 'context-editor-backup' || raw.version !== 1 || !validTime(raw.exportedAt) || !Array.isArray(raw.notes) ||
      !(raw.activeNoteId === null || validId(raw.activeNoteId)) || !raw.settings || typeof raw.settings !== 'object' || Array.isArray(raw.settings)) {
    throw new Error('This is not a supported ConText backup (version 1).');
  }
  const ids = new Set<string>(); const trashIds = new Set<string>();
  const notes: StoredSnippet[] = raw.notes.map((note: StoredSnippet) => {
    if (!note || !validId(note.id) || ids.has(note.id) || typeof note.content !== 'string' || !validTime(note.updatedAt)) throw new Error('Backup contains an invalid or duplicate note.');
    ids.add(note.id);
    if (note.trash !== undefined) {
      if (!note.trash || !validId(note.trash.id) || trashIds.has(note.trash.id) || !validTime(note.trash.deletedAt) || typeof note.trash.wasActive !== 'boolean') throw new Error('Backup contains an invalid Trash entry.');
      trashIds.add(note.trash.id);
    }
    return { id: note.id, content: note.content, updatedAt: note.updatedAt, ...(note.trash ? { trash: { id: note.trash.id, deletedAt: note.trash.deletedAt, wasActive: note.trash.wasActive } } : {}) };
  });
  const settings: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw.settings)) {
    if (!Object.hasOwn(preferenceValues, key) || typeof value !== 'string' || !preferenceValues[key].includes(value)) throw new Error('Backup contains an unsupported preference.');
    settings[key] = value;
  }
  if (raw.activeNoteId !== null && !notes.some(note => note.id === raw.activeNoteId && !note.trash)) throw new Error('Backup active note reference is invalid.');
  return { format: raw.format, version: 1, exportedAt: raw.exportedAt, notes, activeNoteId: raw.activeNoteId, settings };
}
export function makeBackup(draft?: { id: string | null; content: string; dirty: boolean }): Backup {
  let notes = readCollection().notes;
  let activeNoteId = localStorage.getItem('context-editor.activeSnippetId');
  if (draft?.dirty) {
    const existing = notes.find(note => note.id === draft.id && !note.trash);
    const current = { id: existing?.id ?? crypto.randomUUID(), content: draft.content, updatedAt: Date.now() };
    notes = existing ? notes.map(note => note === existing ? current : note) : [...notes, current];
    activeNoteId = current.id;
  }
  if (!notes.some(note => note.id === activeNoteId && !note.trash)) activeNoteId = null;
  const settings: Record<string, string> = {};
  for (const [key, values] of Object.entries(preferenceValues)) {
    const defaults: Record<string, string> = { 'context-editor.theme': 'system', 'context-editor.fullWidth': 'false', 'context-editor.sidebarOpen': 'true', 'context-editor.viewMode': 'edit' };
    const value = localStorage.getItem(key) ?? defaults[key]; if (values.includes(value)) settings[key] = value;
  }
  return { format: 'context-editor-backup', version: 1, exportedAt: Date.now(), notes, activeNoteId, settings };
}
export function mergeBackup(current: StoredSnippet[], incoming: StoredSnippet[]): {
  notes: StoredSnippet[]; added: number; skipped: number; copied: number; mapping: Map<string, string>;
} {
  const notes = [...current]; const occupied = new Set(current.map(note => note.id));
  const trashIds = new Set(current.flatMap(note => note.trash ? [note.trash.id] : []));
  const mapping = new Map<string, string>(); let added = 0, skipped = 0, copied = 0;
  for (const candidate of incoming) {
    const existing = current.find(note => note.id === candidate.id);
    const same = existing && existing.content === candidate.content && Boolean(existing.trash) === Boolean(candidate.trash) &&
      (!existing.trash || (existing.trash.id === candidate.trash?.id && existing.trash.deletedAt === candidate.trash.deletedAt && existing.trash.wasActive === candidate.trash.wasActive));
    if (same) { skipped++; mapping.set(candidate.id, existing.id); continue; }
    const collision = occupied.has(candidate.id); const id = collision ? crypto.randomUUID() : candidate.id;
    const trash = candidate.trash ? { ...candidate.trash, id: trashIds.has(candidate.trash.id) ? crypto.randomUUID() : candidate.trash.id } : undefined;
    const next = { ...candidate, id, ...(trash ? { trash } : {}) };
    notes.push(next); occupied.add(id); if (trash) trashIds.add(trash.id);
    mapping.set(candidate.id, id); if (collision) copied++; else added++;
  }
  return { notes, added, skipped, copied, mapping };
}
