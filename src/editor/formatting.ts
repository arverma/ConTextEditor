import type { editor as MonacoEditor } from 'monaco-editor';

export type FormattingKind = 'bold' | 'italic' | 'code' | 'break';

/** A single replacement plus the selection to restore after Monaco applies it. */
export function getFormattingEdit(content: string, start: number, end: number, kind: FormattingKind) {
  if (kind === 'break') {
    const text = `  ${content.includes('\r\n') ? '\r\n' : '\n'}`;
    return { start: end, end, text, selectionStart: end + text.length, selectionEnd: end + text.length };
  }
  let selected = content.slice(start, end);
  if (selected.trim()) {
    start += selected.length - selected.trimStart().length;
    end -= selected.length - selected.trimEnd().length;
    selected = content.slice(start, end);
  } else { start = end; selected = kind === 'code' ? 'code' : 'text'; }

  let marker = kind === 'bold' ? '**' : kind === 'italic' ? '_' : '`';
  if (kind === 'code') {
    const wrapped = selected.match(/^(`+)([\s\S]+?)\1$/);
    if (wrapped) {
      const text = wrapped[2].replace(/^ (.*) $/s, '$1');
      return { start, end, text, selectionStart: start, selectionEnd: start + text.length };
    }
    const before = content.slice(0, start).match(/(`+) ?$/);
    const after = content.slice(end).match(/^ ?(`+)/);
    if (before && after && before[1] === after[1]) {
      const editStart = start - before[0].length;
      return { start: editStart, end: end + after[0].length, text: selected, selectionStart: editStart, selectionEnd: editStart + selected.length };
    }
    marker = '`'.repeat(Math.max(0, ...[...selected.matchAll(/`+/g)].map(match => match[0].length)) + 1);
  } else {
    if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length > marker.length * 2) {
      const text = selected.slice(marker.length, -marker.length);
      return { start, end, text, selectionStart: start, selectionEnd: start + text.length };
    }
    if (content.slice(start - marker.length, start) === marker && content.slice(end, end + marker.length) === marker) {
      const editStart = start - marker.length;
      return { start: editStart, end: end + marker.length, text: selected, selectionStart: editStart, selectionEnd: editStart + selected.length };
    }
  }
  const padding = kind === 'code' && (/^`|`$/.test(selected) || /^ .* $/s.test(selected)) ? ' ' : '';
  const text = marker + padding + selected + padding + marker;
  const selectionStart = start + marker.length + padding.length;
  return { start, end, text, selectionStart, selectionEnd: selectionStart + selected.length };
}

export function formatSelection(editor: MonacoEditor.IStandaloneCodeEditor, kind: FormattingKind): void {
  const model = editor.getModel(); const selection = editor.getSelection();
  if (!model || !selection) return;
  const edit = getFormattingEdit(model.getValue(), model.getOffsetAt(selection.getStartPosition()), model.getOffsetAt(selection.getEndPosition()), kind);
  const from = model.getPositionAt(edit.start); const to = model.getPositionAt(edit.end);
  editor.pushUndoStop();
  editor.executeEdits('context-editor.format', [{ range: { startLineNumber: from.lineNumber, startColumn: from.column, endLineNumber: to.lineNumber, endColumn: to.column }, text: edit.text }]);
  const selectionStart = model.getPositionAt(edit.selectionStart); const selectionEnd = model.getPositionAt(edit.selectionEnd);
  editor.setSelection({ startLineNumber: selectionStart.lineNumber, startColumn: selectionStart.column, endLineNumber: selectionEnd.lineNumber, endColumn: selectionEnd.column });
  editor.pushUndoStop(); editor.focus();
}

export function initFormatting(editor: MonacoEditor.IStandaloneCodeEditor): void {
  const toolbar = document.getElementById('formatting-toolbar')!;
  // Retain the editor selection and mobile keyboard when a pointer uses the toolbar.
  toolbar.addEventListener('pointerdown', event => { if ((event.target as Element).closest('button')) event.preventDefault(); });
  toolbar.addEventListener('click', event => {
    const kind = (event.target as Element).closest<HTMLButtonElement>('button')?.dataset.format;
    if (kind === 'bold' || kind === 'italic' || kind === 'code' || kind === 'break') formatSelection(editor, kind);
  });
}
