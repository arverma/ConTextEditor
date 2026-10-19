import { EditorState, StateEffect, StateField, type Extension, type TransactionSpec } from '@codemirror/state';
import { history, invertedEffects, isolateHistory } from '@codemirror/commands';
import { parser, GFM } from '@lezer/markdown';

export const normalizedText = (raw: string): string => raw.replace(/\r\n?|\n/g, '\n');

/** CodeMirror offsets count every newline once; source offsets retain its spelling. */
export function sourceOffset(raw: string, offset: number): number {
  let index = 0;
  for (let count = 0; count < offset && index < raw.length; count++, index++) {
    if (raw[index] === '\r' && raw[index + 1] === '\n') index++;
  }
  return index;
}

const restoreSource = StateEffect.define<string>();
export const rawSource = StateField.define<string>({
  create: () => '',
  update(raw, transaction) {
    const restored = transaction.effects.find(effect => effect.is(restoreSource));
    if (restored) {
      if (normalizedText(restored.value) !== transaction.newDoc.toString()) throw new Error('Source and editor disagree');
      return restored.value;
    }
    if (!transaction.docChanged) return raw;
    const ending = raw.match(/\r\n|\r|\n/)?.[0] ?? '\n';
    let result = ''; let consumed = 0;
    transaction.changes.iterChanges((from, to, _fromNew, _toNew, inserted) => {
      const start = sourceOffset(raw, from); const end = sourceOffset(raw, to);
      result += raw.slice(consumed, start) + inserted.toString().replace(/\n/g, ending);
      consumed = end;
    });
    return result + raw.slice(consumed);
  },
});

export function createSourceState(raw: string, extensions: Extension[] = []): EditorState {
  return EditorState.create({ doc: normalizedText(raw), extensions: [
    rawSource.init(() => raw), history(),
    // Undo restores the original line-ending spelling, not only the normalized document.
    invertedEffects.of(transaction => transaction.docChanged || transaction.effects.some(effect => effect.is(restoreSource))
      ? [restoreSource.of(transaction.startState.field(rawSource))] : []),
    ...extensions,
  ] });
}

export function replaceSource(state: EditorState, raw: string): TransactionSpec {
  return { changes: { from: 0, to: state.doc.length, insert: normalizedText(raw) }, effects: restoreSource.of(raw), annotations: isolateHistory.of('full') };
}

const blockParser = parser.configure(GFM);
export function sourceBlocks(raw: string): Array<{ type: string; from: number; to: number; text: string }> {
  const normalized = normalizedText(raw);
  const bom = normalized.startsWith('\uFEFF') ? 1 : 0;
  const metadata = normalized.slice(bom).match(/^---[ \t]*\n[\s\S]*?\n(?:---|\.\.\.)[ \t]*(?=\n|$)/)?.[0];
  const blocks: Array<{ type: string; from: number; to: number; text: string }> = [];
  let prefix = bom;
  if (metadata) {
    prefix += metadata.length;
    const from = sourceOffset(raw, bom); const to = sourceOffset(raw, prefix);
    blocks.push({ type: 'Frontmatter', from, to, text: raw.slice(from, to) });
  }
  const content = normalized.slice(prefix);
  for (let node = blockParser.parse(content).topNode.firstChild; node; node = node.nextSibling) {
    const lineStart = content.lastIndexOf('\n', node.from - 1) + 1;
    const from = sourceOffset(raw, prefix + lineStart); const to = sourceOffset(raw, prefix + node.to);
    blocks.push({ type: node.name, from, to, text: raw.slice(from, to) });
  }
  return blocks;
}
