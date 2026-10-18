import { expect, it } from 'vitest';
import { getFormattingEdit } from '../src/editor/formatting';

function apply(content: string, start: number, end: number, kind: 'bold' | 'italic' | 'code' | 'break') {
 const edit = getFormattingEdit(content, start, end, kind);
 const result = content.slice(0, edit.start) + edit.text + content.slice(edit.end);
 return { result, selected: result.slice(edit.selectionStart, edit.selectionEnd), edit };
}

it.each([['bold', '**hello**'], ['italic', '_hello_'], ['code', '`hello`']] as const)('formats selected text as %s and preserves the selection', (kind, expected) => {
 const formatted = apply('hello world', 0, 5, kind);
 expect(formatted.result).toBe(`${expected} world`); expect(formatted.selected).toBe('hello');
 const toggled = apply(formatted.result, formatted.edit.selectionStart, formatted.edit.selectionEnd, kind);
 expect(toggled.result).toBe('hello world'); expect(toggled.selected).toBe('hello');
});

it('removes formatting when the entire marked text is selected', () => {
 expect(apply('a **bold** note', 2, 10, 'bold').result).toBe('a bold note');
});
it('inserts and selects a placeholder at an empty cursor', () => {
 const formatted = apply('a ', 2, 2, 'bold');
 expect(formatted.result).toBe('a **text**'); expect(formatted.selected).toBe('text');
});
it('keeps surrounding whitespace outside emphasis', () => {
 const formatted = apply(' hello ', 0, 7, 'bold');
 expect(formatted.result).toBe(' **hello** '); expect(formatted.selected).toBe('hello');
});
it('uses a longer code delimiter when the selection contains backticks', () => {
 expect(apply('a `value`', 0, 9, 'code').result).toBe('`` a `value` ``');
});
it('inserts a hard line break after the selection without deleting its text', () => {
 const formatted = apply('hello world', 0, 5, 'break');
 expect(formatted.result).toBe('hello  \n world');
 expect(formatted.edit.selectionStart).toBe(8); expect(formatted.selected).toBe('');
});
