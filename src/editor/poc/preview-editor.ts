import { Editor, type Editor as TiptapEditor } from '@tiptap/core';
import { history } from '@tiptap/pm/history';
import { TextSelection } from '@tiptap/pm/state';
import { parseMarkdownDocument, previewExtensions, repaintPreviewDiagrams, serializeMarkdownDocument } from './markdown-document';

export type PreviewCommand = 'bold' | 'italic' | 'underline' | 'strike' | 'link' | 'bullet' | 'ordered' | 'quote' | 'code' | 'codeBlock';

/** Rich Preview. Writes Markdown back only after an edit, one history step per burst. */
export function previewEditor(root: HTMLElement, read: () => string, write: (raw: string) => void) {
  let loadedRaw = read();
  let baseline = '';
  let enabled = false;
  let loading = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const editor = new Editor({
    element: root,
    autofocus: false,
    extensions: previewExtensions(),
    content: parseMarkdownDocument(loadedRaw),
    editorProps: {
      attributes: { 'aria-label': 'Markdown preview', class: 'markdown-preview poc-rich-editor', role: 'textbox', 'aria-multiline': 'true' },
      handlePaste(_view, event) {
        event.preventDefault();
        const text = event.clipboardData?.getData('text/plain') ?? '';
        if (text) editor.commands.insertContent(text, { contentType: 'markdown' });
        return true;
      },
      handleDrop(_view, event) {
        event.preventDefault();
        return true;
      },
    },
  });
  baseline = JSON.stringify(editor.getJSON());

  function snapshot(): string {
    const json = editor.getJSON();
    return JSON.stringify(json) === baseline ? loadedRaw : serializeMarkdownDocument(json);
  }
  function flush(): void {
    clearTimeout(timer);
    if (!enabled) return;
    const next = snapshot();
    if (next === read()) return;
    write(next);
  }
  function load(raw: string): void {
    loading = true;
    clearTimeout(timer);
    loadedRaw = raw;
    const doc = parseMarkdownDocument(raw);
    editor.chain().command(({ tr, commands }) => {
      commands.setContent(doc, { emitUpdate: false });
      tr.setMeta('addToHistory', false);
      return true;
    }).run();
    const plugins = editor.state.plugins.filter(plugin => !String((plugin as { key?: string }).key).includes('history'));
    editor.view.updateState(editor.state.reconfigure({ plugins: [...plugins, history()] }));
    baseline = JSON.stringify(editor.getJSON());
    loading = false;
  }
  editor.on('update', ({ transaction }) => {
    if (!enabled || loading || !transaction.docChanged) return;
    clearTimeout(timer);
    timer = setTimeout(flush, 200);
  });

  function run(command: PreviewCommand, href = ''): void {
    const chain = editor.chain().focus();
    if (command === 'bold') chain.toggleBold().run();
    else if (command === 'italic') chain.toggleItalic().run();
    else if (command === 'underline') chain.toggleUnderline().run();
    else if (command === 'strike') chain.toggleStrike().run();
    else if (command === 'bullet') chain.toggleBulletList().run();
    else if (command === 'ordered') chain.toggleOrderedList().run();
    else if (command === 'quote') chain.toggleBlockquote().run();
    else if (command === 'code') chain.toggleCode().run();
    else if (command === 'codeBlock') chain.toggleCodeBlock().run();
    else if (href.trim()) chain.extendMarkRange('link').setLink({ href: href.trim() }).run();
    else chain.unsetLink().run();
    flush();
  }

  return {
    get editor(): TiptapEditor { return editor; },
    flush,
    load,
    enable(value: boolean) {
      if (!value) { flush(); enabled = false; return; }
      enabled = false;
      load(read());
      enabled = true;
      requestAnimationFrame(() => repaintPreviewDiagrams(editor.view.dom));
    },
    undo() { editor.chain().focus().undo().run(); flush(); },
    redo() { editor.chain().focus().redo().run(); flush(); },
    command: run,
    active(name: string) { return editor.isActive(name); },
    linkHref() { return String(editor.getAttributes('link').href ?? ''); },
    repaint() { repaintPreviewDiagrams(editor.view.dom); },
    selectionRect(): { left: number; right: number; top: number; bottom: number } | null {
      const selection = editor.state.selection;
      if (!(selection instanceof TextSelection) || selection.empty) return null;
      const { from, to } = selection;
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(Math.max(from, to - 1));
      return {
        left: Math.min(start.left, end.left),
        right: Math.max(start.right, end.right),
        top: Math.min(start.top, end.top),
        bottom: Math.max(start.bottom, end.bottom),
      };
    },
  };
}
