import { describe, it, expect } from 'vitest';
import { visualBlocks, visualRange, literalText, paintVisualBlock } from '../src/editor/poc/visual-editing';

describe('source mapped visual editing',()=>{
  it('maps emphasis, code and link labels without including their delimiters',()=>{
    const raw='Hello **bold** _italic_ `code` [label](https://example.com)';
    const block=visualBlocks(raw)[0];
    expect(block.runs.map(r=>r.text).join('')).toBe('Hello bold italic code label');
    const label=block.runs.find(r=>r.text==='label')!;
    expect(raw.slice(label.offsets[0],label.offsets.at(-1))).toBe('label');
    expect(visualRange(block,7,10)).toEqual({from:9,to:12});
    expect(visualRange(block,3,10)).toBeNull();
  });
  it('preserves CRLF, mixed endings, BOM and heading prefix offsets',()=>{
    const raw='\uFEFF# Title\r\n\r\nA **word**\nline\r\n';
    const blocks=visualBlocks(raw);
    expect(blocks[0].runs.map(r=>r.text).join('')).toBe('Title');
    for(const block of blocks)for(const run of block.runs)for(let i=0;i<run.text.length;i++) {
      if(run.text[i]!=='\n')expect(raw[run.offsets[i]]).toBe(run.text[i]);
    }
  });
  it('maps escapes and entities atomically',()=>{
    const raw='An &amp; and \\*literal\\* &#x1f600;';
    const block=visualBlocks(raw)[0];
    expect(block.runs.map(r=>r.text).join('')).toBe('An & and *literal* 😀');
    const entity=block.runs.find(r=>r.text==='😀')!;
    expect(entity.offsets[1]).toBe(-1);
  });
  it('protects unsupported blocks and ambiguous inline syntax',()=>{
    expect(visualBlocks('```mermaid\ngraph LR\nA-->B\n```')).toEqual([]);
    expect(visualBlocks('A <b>HTML</b> paragraph')).toEqual([]);
    expect(visualBlocks('A ![picture](image.png)')).toEqual([]);
    expect(visualBlocks('A ` padded ` span')).toEqual([]);
  });
  it('renders safe elements with literal text',()=>{
    const el=document.createElement('p');const block=visualBlocks('Safe **bold** &lt;script&gt;')[0];
    paintVisualBlock(el,block);
    expect(el.textContent).toBe('Safe bold <script>');expect(el.querySelector('script')).toBeNull();expect(el.querySelector('strong')?.textContent).toBe('bold');
  });
  it('escapes typed Markdown punctuation and guards code delimiters',()=>{
    expect(literalText('**x** [x] & <b>')).toBe('\\*\\*x\\*\\* \\[x\\] \\& \\<b\\>');
    expect(literalText('1. item')).toBe('1\\. item');
    expect(()=>literalText('`',true)).toThrow();expect(literalText('abc',true)).toBe('abc');
  });
});

describe('plan-style rendered lines',()=>{
  it('maps ordinary, task, and nested list text to exact source offsets',()=>{
    const raw='- First **step**\r\n- [ ] Follow up\n  - Nested check\n- [x] Done';
    const items=visualBlocks(raw).filter(b=>b.kind==='list');
    expect(items.map(b=>b.runs.map(r=>r.text).join(''))).toEqual(['First step','Follow up','Nested check','Done']);
    expect(items.map(b=>b.listIndex)).toEqual([0,1,2,3]);
    for(const item of items) {
      const first=item.runs.find(r=>r.text.trim())!;
      expect(raw.slice(first.offsets[0],first.offsets.at(-1))).toBe(first.text);
    }
  });
  it('represents a trailing hard break as a visible newline and maps the next typed character',()=>{
    const raw='Draft text  \r\n\r\n- [ ] Follow up  \r\n  \r\n  - Nested';
    const [paragraph,task]=visualBlocks(raw);
    expect(paragraph.runs.map(r=>r.text).join('')).toBe('Draft text\n');
    expect(task.runs.map(r=>r.text).join('')).toBe('Follow up\n');
    expect(visualRange(paragraph,11,11)?.from).toBe(raw.indexOf('\r\n\r\n')+2);
    expect(visualRange(task,10,10)?.from).toBe(raw.indexOf('  \r\n  \r\n')+6);
  });
  it('does not expose Markdown continuation indentation as list text',()=>{
    const raw='- [ ] Follow up  \r\n  more\r\n  - Nested';
    expect(visualBlocks(raw).find(block=>block.kind==='list')?.runs.map(run=>run.text).join('')).toBe('Follow up\nmore');
  });
});
