import { type Snippet, createSnippet, getActiveSnippet, getSnippets, updateSnippetContent,
  deleteSnippet, restoreTrashEntry, permanentlyDeleteTrashEntry, type TrashEntry, setActiveSnippetId } from "./storage";

export type DeletedNote = TrashEntry;
export type SaveStatus = "saved" | "saving" | "error";

export const STARTER_NOTE_CONTENT = `# Welcome to ConText Editor

Try the **Bold**, *italic*, ~~strikethrough~~, and \`inline code\` formatting tools.

- Select text in Rich mode to format it.
- Switch to Markdown mode to edit the source directly.

> Your notes stay local on this device.

[Learn more about Markdown](https://www.markdownguide.org/basic-syntax/)`;

/** Owns note transitions so UI loads never masquerade as user edits. */
export class NoteSession {
  id: string | null = null;
  content = "";
  status: SaveStatus = "saved";
  message = "";
  private dirty = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(private changed: () => void) {}

  private attempt(action: () => void): boolean {
    try { action(); return true; }
    catch (error) {
      this.status = "error";
      this.message = error instanceof Error ? error.message : "Could not save notes.";
      this.changed();
      return false;
    }
  }
  private load(note: Snippet | null): void {
    this.id = note?.id ?? null;
    this.content = note?.content ?? "";
    this.dirty = false;
    this.status = "saved";
    this.message = "";
    setActiveSnippetId(this.id);
    this.changed();
  }
  start(): void { this.attempt(() => this.load(getActiveSnippet() ?? createSnippet(STARTER_NOTE_CONTENT))); }
  edit(content: string): void {
    this.content = content;
    this.dirty = true;
    this.status = "saving";
    clearTimeout(this.timer);
    this.changed();
    if (!this.id) this.flush();
    else this.timer = setTimeout(() => this.flush(), 600);
  }
  flush(): boolean {
    clearTimeout(this.timer);
    if (!this.dirty) {
      if (this.status !== "error") return true;
      return this.attempt(() => { getSnippets(); this.status = "saved"; this.message = ""; this.changed(); });
    }
    return this.attempt(() => {
      const existing = getSnippets().find(note => note.id === this.id);
      if (!existing) this.id = createSnippet(this.content).id;
      else if (existing.content !== this.content) updateSnippetContent(existing.id, this.content);
      this.dirty = false;
      this.status = "saved";
      this.message = "";
      this.changed();
    });
  }
  select(id: string): boolean {
    if (!this.flush()) return false;
    return this.attempt(() => {
      const note = getSnippets().find(note => note.id === id);
      if (note) this.load(note);
    });
  }
  create(): boolean {
    if (!this.flush()) return false;
    return this.attempt(() => this.load(createSnippet(STARTER_NOTE_CONTENT)));
  }
  remove(id: string): DeletedNote | null {
    if (!this.flush()) return null;
    let deleted: DeletedNote | null = null;
    this.attempt(() => {
      const note = getSnippets().find(note => note.id === id);
      if (!note) return;
      const wasActive = this.id === id;
      deleted = deleteSnippet(id, wasActive);
      if (wasActive) this.load(getSnippets()[0] ?? null);
      else { setActiveSnippetId(this.id); this.changed(); }
    });
    return deleted;
  }
  restore(deleted: DeletedNote, asCopy = false): boolean {
    if (!this.flush()) return false;
    return this.attempt(() => {
      const restored = restoreTrashEntry(deleted.id, asCopy);
      if (deleted.wasActive) this.load(restored);
      else this.changed();
    });
  }
  purge(id: string): boolean {
    if (!this.flush()) return false;
    return this.attempt(() => { permanentlyDeleteTrashEntry(id); this.changed(); });
  }
  reconcile(): void {
    this.attempt(() => {
      if (!this.id || getSnippets().some(note => note.id === this.id)) { this.changed(); return; }
      if (this.dirty) { this.flush(); return; }
      this.load(getSnippets()[0] ?? null);
    });
  }
  get hasPendingChanges(): boolean { return this.dirty; }
  dispose(): void { clearTimeout(this.timer); }
}
