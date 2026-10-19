import { Node, type JSONContent } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Markdown, MarkdownManager } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import DOMPurify from 'dompurify';
import { enhanceDiagrams } from '../diagram-viewer';
import { renderMermaidBlocks } from '../markdown-preview';
import { sourceBlocks } from './source-state';

export type PreviewNode = JSONContent;

const opaqueTypes = new Set(['Frontmatter', 'FencedCode', 'HTMLBlock', 'CommentBlock', 'ProcessingInstructionBlock']);

/** Extensions shared by the Preview editor and the Markdown serializer. */
export function previewExtensions() {
  return [
    StarterKit.configure({
      trailingNode: false,
      link: { openOnClick: false },
    }),
    Image.configure({ inline: true }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
    rawBlock,
    codeFence,
    diagram,
    Markdown.configure({ markedOptions: { gfm: true } }),
  ];
}

const rawBlock = Node.create({
  name: 'rawBlock',
  group: 'block',
  atom: true,
  selectable: false,
  addAttributes() {
    return {
      kind: { default: 'html' },
      raw: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'pre[data-raw-block]' }];
  },
  renderHTML({ node }) {
    return ['pre', { 'data-raw-block': node.attrs.kind, contenteditable: 'false', class: 'poc-raw-block' }, String(node.attrs.raw ?? '')];
  },
  addNodeView() {
    return ({ node }) => {
      const raw = String(node.attrs.raw ?? '');
      const kind = String(node.attrs.kind ?? 'html');
      if (kind === 'html') {
        const clean = DOMPurify.sanitize(raw, { USE_PROFILES: { html: true }, ADD_ATTR: ['class'] });
        if (clean.trim()) {
          const dom = document.createElement('div');
          dom.className = 'poc-html-block';
          dom.dataset.rawBlock = 'html';
          dom.contentEditable = 'false';
          dom.innerHTML = clean;
          return { dom, stopEvent: () => true, ignoreMutation: () => true };
        }
      }
      const pre = document.createElement('pre');
      pre.className = 'poc-raw-block';
      pre.dataset.rawBlock = kind;
      pre.contentEditable = 'false';
      pre.textContent = raw;
      return { dom: pre, stopEvent: () => true, ignoreMutation: () => true };
    };
  },
});

const codeFence = Node.create({
  name: 'codeFence',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      raw: { default: '' },
      language: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'pre[data-code-fence]' }];
  },
  renderHTML({ node }) {
    return ['pre', { 'data-code-fence': node.attrs.language, class: 'poc-fence' }, ['code', {}, 0]];
  },
  addNodeView() {
    return ({ node }) => {
      const pre = document.createElement('pre');
      pre.className = 'poc-fence';
      pre.dataset.codeFence = String(node.attrs.language ?? '');
      const code = document.createElement('code');
      pre.append(code);
      return { dom: pre, contentDOM: code };
    };
  },
});

const diagram = Node.create({
  name: 'diagram',
  group: 'block',
  atom: true,
  selectable: false,
  addAttributes() {
    return {
      raw: { default: '' },
      language: { default: 'mermaid' },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-diagram-host]' }];
  },
  renderHTML({ node }) {
    return ['div', { 'data-diagram-host': node.attrs.language, class: 'poc-diagram' }];
  },
  addNodeView() {
    return ({ node }) => {
      const host = document.createElement('div');
      host.className = 'poc-diagram';
      host.dataset.diagramHost = String(node.attrs.language ?? 'mermaid');
      mountDiagram(host, fenceParts(String(node.attrs.raw ?? '')).body);
      return { dom: host, ignoreMutation: () => true, stopEvent: () => true };
    };
  },
});

function mountDiagram(host: HTMLElement, source: string): void {
  const generation = String(Number(host.dataset.paint ?? '0') + 1);
  host.dataset.paint = generation;
  host.dataset.source = source;
  host.replaceChildren();
  const pre = document.createElement('pre');
  pre.className = 'mermaid';
  pre.textContent = source;
  host.append(pre);
  queueMicrotask(() => {
    if (!host.isConnected || host.dataset.paint !== generation || host.getBoundingClientRect().width < 2) return;
    void renderMermaidBlocks(host).then(() => {
      if (host.isConnected && host.dataset.paint === generation) enhanceDiagrams(host);
    });
  });
}

/** Redraw Preview diagrams after a theme change. */
export function repaintPreviewDiagrams(root: ParentNode): void {
  for (const host of root.querySelectorAll<HTMLElement>('[data-diagram-host]')) {
    mountDiagram(host, host.dataset.source ?? '');
  }
}

let manager: MarkdownManager | undefined;
function markdown(): MarkdownManager {
  manager ??= new MarkdownManager({ markedOptions: { gfm: true }, extensions: previewExtensions() });
  return manager;
}

function fenceParts(raw: string): { marker: string; language: string; body: string } {
  const text = raw.replace(/\r\n?/g, '\n');
  const matched = text.match(/^[ \t]*([`~]{3,})([^\n]*)\n([\s\S]*?)\n\1[ \t]*\n?$/);
  if (!matched) return { marker: '```', language: '', body: text };
  return { marker: matched[1], language: matched[2].trim(), body: matched[3] };
}

function nodeText(node: PreviewNode): string {
  return (node.content ?? []).map(child => child.text ?? nodeText(child)).join('');
}

function serializeFence(node: PreviewNode): string {
  const raw = String(node.attrs?.raw ?? '');
  const parts = fenceParts(raw);
  const language = String(node.attrs?.language ?? '');
  if (raw && nodeText(node) === parts.body && language === parts.language) return raw;
  const body = nodeText(node).replace(/\n$/, '');
  return `${parts.marker}${language}\n${body}\n${parts.marker}`;
}

function fenceLanguage(info: string): string {
  return info.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
}

function fenceNode(raw: string): PreviewNode {
  const parts = fenceParts(raw);
  if (fenceLanguage(parts.language) === 'mermaid') return { type: 'diagram', attrs: { raw, language: parts.language } };
  return {
    type: 'codeFence',
    attrs: { raw, language: parts.language },
    content: parts.body ? [{ type: 'text', text: parts.body }] : [],
  };
}

/** Parse Markdown, keeping protected slices out of the prose serializer. */
export function parseMarkdownDocument(raw: string): PreviewNode {
  const content: PreviewNode[] = [];
  let cursor = 0;
  for (const block of sourceBlocks(raw)) {
    if (!opaqueTypes.has(block.type)) continue;
    pushProse(content, raw.slice(cursor, block.from));
    if (block.type === 'FencedCode') content.push(fenceNode(block.text));
    else content.push({ type: 'rawBlock', attrs: { kind: block.type === 'Frontmatter' ? 'frontmatter' : 'html', raw: block.text } });
    cursor = block.to;
  }
  pushProse(content, raw.slice(cursor));
  if (!content.length) content.push({ type: 'paragraph' });
  return { type: 'doc', content };
}

function pushProse(content: PreviewNode[], raw: string): void {
  const text = raw.replace(/\r\n?/g, '\n').trim();
  if (!text) return;
  const parsed = markdown().parse(text);
  content.push(...(parsed.content ?? []));
}

/** Serialize Preview JSON. Untouched protected slices are copied verbatim. */
export function serializeMarkdownDocument(doc: PreviewNode): string {
  const parts: string[] = [];
  let prose: PreviewNode[] = [];
  const flush = () => {
    if (!prose.length) return;
    const text = markdown().serialize({ type: 'doc', content: prose }).replace(/\s+$/u, '');
    if (text) parts.push(text);
    prose = [];
  };
  for (const node of doc.content ?? []) {
    if (node.type === 'rawBlock' || node.type === 'diagram') {
      flush();
      parts.push(String(node.attrs?.raw ?? ''));
    } else if (node.type === 'codeFence') {
      flush();
      parts.push(serializeFence(node));
    } else prose.push(node);
  }
  flush();
  return parts.join('\n\n');
}
