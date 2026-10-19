import { describe, expect, it } from 'vitest';
import { parseMarkdownDocument, serializeMarkdownDocument, type PreviewNode } from '../src/editor/markdown-document';

function texts(node: PreviewNode): PreviewNode[] {
  const found: PreviewNode[] = node.type === 'text' ? [node] : [];
  for (const child of node.content ?? []) found.push(...texts(child));
  return found;
}

describe('preview edits that used to be offset-mapped', () => {
  it('changes a list item without rewriting a following Mermaid fence', () => {
    const fence = '```mermaid\ngraph LR\nA-->B\n```';
    const doc = parseMarkdownDocument(`- First **step**\n- [ ] Follow up\n\n${fence}`);
    const found = texts(doc).map(node => node.text);
    const first = texts(doc).find(node => node.text?.includes('First'));
    if (!first) throw new Error('Missing list text: ' + found.join('|'));
    first.text = 'First now';
    const next = serializeMarkdownDocument(doc);
    expect(next).toContain('First now');
    expect(next).toContain('[ ] Follow up');
    expect(next).toContain(fence);
  });

  it('keeps an image and a block of HTML that the old visual mode refused', () => {
    const html = '<div>Raw HTML remains source.</div>';
    const doc = parseMarkdownDocument(`A ![picture](image.png)\n\n${html}`);
    const next = serializeMarkdownDocument(doc);
    expect(next).toContain('![picture](image.png)');
    expect(next).toContain(html);
  });
});
