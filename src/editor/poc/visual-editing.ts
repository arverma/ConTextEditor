import { parser, GFM } from '@lezer/markdown';
import type { SyntaxNode } from '@lezer/common';
import { normalizedText, sourceOffset, sourceBlocks } from './source-state';

export interface VisualRun { text: string; offsets: number[]; tags: string[] }
export interface VisualBlock { from: number; to: number; type: string; runs: VisualRun[]; kind: 'text' | 'list'; listIndex?: number }
const inlineParser = parser.configure(GFM);

/** Map visible characters to raw source, without serializing a rendered document. */
export function visualBlocks(raw: string): VisualBlock[] {
  const blocks: VisualBlock[] = [];
  let listIndex = 0;
  for (const block of sourceBlocks(raw)) {
    const text = normalizedText(block.text);
    const root = inlineParser.parse(text).topNode.firstChild;
    const offset = (n: number) => block.from + sourceOffset(block.text, n);
    if (!root) continue;
    function mapNode(target: SyntaxNode, kind: 'text' | 'list', index?: number) {
      const runs: VisualRun[] = [];
      let supported = true;
      function plain(from: number, to: number, tags: string[]) {
        if (kind === 'list' && runs.at(-1)?.text.endsWith('\n')) {
          while (from < to && (text[from] === ' ' || text[from] === '\t')) from++;
        }
        if (to <= from) return;
        runs.push({ text: text.slice(from, to), offsets: Array.from({ length: to-from+1 }, (_, i) => offset(from+i)), tags });
      }
      function visit(node: SyntaxNode, tags: string[]) {
        if (['EmphasisMark','CodeMark','HeaderMark','TaskMarker','LinkMark','LinkLabel','URL','LinkTitle'].includes(node.name)) return;
        if (node.name === 'Escape') { plain(node.from+1,node.to,tags); return; }
        if (node.name === 'Entity') {
          const decoder = document.createElement('textarea'); decoder.innerHTML = text.slice(node.from,node.to);
          const value = decoder.value;
          // Entities are atomic: intermediate surrogate boundaries cannot be edited.
          runs.push({text:value,offsets:[offset(node.from),...Array(Math.max(0,value.length-1)).fill(-1),offset(node.to)],tags}); return;
        }
        if (node.name === 'HardBreak') { runs.push({text:'\n',offsets:[offset(node.from),offset(node.to)],tags}); return; }
        const tag = ({StrongEmphasis:'strong',Emphasis:'em',InlineCode:'code',Link:'span'} as Record<string,string>)[node.name];
        if (node !== target && !tag) { supported=false; return; }
        const nested = tag ? [...tags,tag] : tags;
        let cursor = node.from;
        for (let child=node.firstChild;child;child=child.nextSibling) {
          if ((node.name.startsWith('ATXHeading') && child.name === 'HeaderMark') || (node.name === 'Task' && child.name === 'TaskMarker')) {
            cursor = child.to;
            while (text[cursor] === ' ' || text[cursor] === '\t') cursor++;
            continue;
          }
          plain(cursor,child.from,nested); visit(child,nested); cursor=child.to;
        }
        plain(cursor,node.to,nested);
      }
      visit(target,[]);
      // A terminal hard break is outside the parser's block range. Keep its
      // blank rendered line editable so typing after Enter reaches the source.
      const last = runs.at(-1);
      const after = raw.slice(offset(target.to));
      const blankLine = after.match(/^(\r\n|\r|\n)([ \t]*)(?=\r\n|\r|\n|$)/);
      if (last && / {2,}$/.test(last.text) && blankLine) {
        const spaces = last.text.match(/ +$/)![0].length;
        const start = last.offsets[last.text.length-spaces];
        last.text = last.text.slice(0,-spaces);
        last.offsets = last.offsets.slice(0,-spaces);
        if (!last.text) runs.pop();
        runs.push({text:'\n',offsets:[start,offset(target.to)+blankLine[0].length],tags:[]});
      }
      // Padded/multiline code spans need Markdown's whitespace normalization.
      if (runs.some(r=>r.tags.includes('code') && (/\n/.test(r.text) || /^ | $/.test(r.text)))) supported=false;
      if (supported && runs.length) blocks.push({type:target.name,from:offset(target.from),to:offset(target.to),runs,kind,listIndex:index});
    }
    if (root.name === 'Paragraph' || /^ATXHeading[1-6]$/.test(root.name)) mapNode(root,'text');
    if (root.name === 'BulletList' || root.name === 'OrderedList') {
      function walk(node: SyntaxNode) {
        if (node.name === 'ListItem') {
          const index = listIndex++;
          for (let child=node.firstChild;child;child=child.nextSibling) {
            if (child.name === 'Paragraph' || child.name === 'Task') { mapNode(child,'list',index); break; }
          }
        }
        for (let child=node.firstChild;child;child=child.nextSibling) walk(child);
      }
      walk(root);
    }
  }
  return blocks;
}

export function visualRange(block: VisualBlock, from: number, to: number): {from:number;to:number} | null {
  let pos=0;
  for(const run of block.runs) {
    const end=pos+run.text.length;
    if(from>=pos && to<=end && run.offsets[from-pos]>=0 && run.offsets[to-pos]>=0) return {from:run.offsets[from-pos],to:run.offsets[to-pos]};
    pos=end;
  }
  return null;
}

/** User text is literal; Markdown punctuation must not silently become structure. */
export function literalText(text: string, code = false): string {
  if(code) { if(/[\r\n`]/.test(text)) throw Error('Edit code delimiters in Source.'); return text; }
  return text.replace(/\\/g,'\\\\').replace(/([`*_{}\[\]<>!#|~&.()+\-=])/g,'\\$1');
}

export function paintVisualBlock(element: HTMLElement, block: VisualBlock): void {
  element.replaceChildren();
  for(const run of block.runs) {
    let parent=element;
    for(const tag of run.tags) { const child=document.createElement(tag); parent.append(child); parent=child; }
    parent.append(document.createTextNode(run.text));
  }
}
