import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { parseMarkdownDocument, previewExtensions, serializeMarkdownDocument, type PreviewNode } from '../src/editor/poc/markdown-document';

function firstText(doc: { content?: PreviewNode[] }): PreviewNode {
  const paragraph = doc.content?.find(node => node.type === 'paragraph');
  const text = paragraph?.content?.find(node => node.type === 'text');
  if (!text) throw new Error('No paragraph text');
  return text;
}

describe('preview markdown document', () => {
  it('keeps front matter, a Mermaid fence, and an HTML comment after a prose edit', () => {
    const front = '---\ntitle: notes\n---';
    const fence = '```mermaid\ngraph LR\nA-->B\n```';
    const comment = '<!-- keep me -->';
    const raw = `${front}\n\nHello **there**\n\n${fence}\n\n${comment}\n\nTail`;
    const doc = parseMarkdownDocument(raw);
    firstText(doc).text = firstText(doc).text.replace('Hello', 'HelloX');
    const next = serializeMarkdownDocument(doc);
    expect(next).toContain(front);
    expect(next).toContain(fence);
    expect(next).toContain(comment);
    expect(next).toContain('HelloX **there**');
    expect(next).toContain('Tail');
  });

  it('keeps a CRLF Mermaid fence byte-identical', () => {
    const fence = '~~~mermaid\r\nflowchart LR\r\nA-->B\r\n~~~';
    const doc = parseMarkdownDocument(`Hello\n\n${fence}\r\n\nAfter`);
    firstText(doc).text += '!';
    expect(serializeMarkdownDocument(doc)).toContain(fence);
  });

  it('normalizes alternate emphasis and keeps marks, links, images, and tables', () => {
    const raw = 'Say __bold__ *italic* ~~gone~~ [link](https://example.com) ![pic](image.png)\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n';
    const next = serializeMarkdownDocument(parseMarkdownDocument(raw));
    expect(next).toContain('**bold**');
    expect(next).toMatch(/\*italic\*|_italic_/);
    expect(next).toContain('~~gone~~');
    expect(next).toContain('[link](https://example.com)');
    expect(next).toContain('![pic](image.png)');
    expect(next).toMatch(/\| 1\s+\| 2\s+\|/);
  });

  it('keeps task lists and underline through a round trip', () => {
    const raw = '- [ ] Follow up\n  - [x] Nested\n\n++underlined++';
    const next = serializeMarkdownDocument(parseMarkdownDocument(raw));
    expect(next).toContain('[ ] Follow up');
    expect(next).toContain('[x] Nested');
    expect(next).toContain('++underlined++');
  });
  it('serializes an edited fence and leaves an unedited HTML block untouched', () => {
    const html = '<div>Raw HTML remains source.</div>';
    const fence = '```js\nconst a = 1;\n```';
    const doc = parseMarkdownDocument(`${fence}\n\n${html}`);
    const code = doc.content?.find(node => node.type === 'codeFence');
    if (!code?.content?.[0]) throw new Error('Missing fence');
    code.content[0].text = 'const a = 2;';
    const next = serializeMarkdownDocument(doc);
    expect(next).toContain('const a = 2;');
    expect(next).not.toContain('const a = 1;');
    expect(next).toContain(html);
  });

  it('renders a Mermaid fence as a diagram and HTML as markup', () => {
    const fence = '~~~mermaid\nflowchart LR\nA[Original source] --> B[Safe edits]\nB --> C[Preview]\n~~~';
    const html = '<div>Raw HTML remains source.</div>';
    const doc = parseMarkdownDocument(`${fence}\n\n${html}`);
    expect(doc.content?.some(node => node.type === 'diagram' && node.attrs?.raw === fence)).toBe(true);
    const root = document.createElement('div');
    document.body.append(root);
    const editor = new Editor({ element: root, extensions: previewExtensions(), content: doc });
    const block = root.querySelector('.poc-html-block');
    expect(block?.textContent).toBe('Raw HTML remains source.');
    expect(block?.querySelector('div')?.textContent).toBe('Raw HTML remains source.');
    const diagram = root.querySelector<HTMLElement>('[data-diagram-host]');
    expect(diagram?.querySelector('pre.mermaid')?.textContent).toContain('flowchart LR');
    expect(diagram?.querySelector('pre.mermaid')?.textContent).toContain('\n');
    editor.destroy();
    root.remove();
  });
});
