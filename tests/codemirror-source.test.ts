import { expect, it } from 'vitest';
import { undo, redo } from '@codemirror/commands';
import { createSourceState, rawSource, replaceSource, normalizedText, sourceBlocks } from '../src/editor/source-state';

const fixtures = [
 '# Title\r\n\r\n  *odd*  \r\n\tcode\r\n',
 '# Mixed\r\n\n- one\r- two\n\n~~~mermaid\r\nflowchart TD\nA-->B\r\n~~~',
 '\uFEFF# BOM\n\n[ref]: https://example.com "title"\n\n[link][ref]  \n\n<div>raw &amp; HTML</div>\n',
 '日本語 😀 e\u0301\n\n| A | B |\n|---|:---:|\n| 1 | 2 |\n',
 '', '\r\n', 'last line without newline',
];
it.each(fixtures)('preserves imported source exactly: %j', raw => {
 const state=createSourceState(raw);
 expect(state.field(rawSource)).toBe(raw); expect(state.doc.toString()).toBe(normalizedText(raw));
});
it('restores exact raw bytes through undo and redo', () => {
 function roundTrip(start: string, apply: (state: ReturnType<typeof createSourceState>) => ReturnType<typeof createSourceState>, expected: string) {
  let state=createSourceState(start); const before=state.field(rawSource);
  state=apply(state); const edited=state.field(rawSource); expect(edited).toBe(expected);
  const target={get state(){return state;},dispatch(tr:{state:typeof state}){state=tr.state;}};
  expect(undo(target)).toBe(true); expect(state.field(rawSource)).toBe(before);
  expect(redo(target)).toBe(true); expect(state.field(rawSource)).toBe(edited);
 }
 roundTrip('one\r\ntwo\nthree\rfour', state=>state.update({changes:{from:4,to:7,insert:'TWO\nnew'}}).state, 'one\r\nTWO\r\nnew\nthree\rfour');
 roundTrip('a\nb', state=>state.update(replaceSource(state,'a\r\nb\rc')).state, 'a\r\nb\rc');
});
it('pins front matter ahead of the following blocks', () => {
 const raw='---\r\ntitle: Keep exactly\r\n---\r\n\r\n# Heading\n\nparagraph';
 expect(sourceBlocks(raw).map(block=>block.type)).toEqual(['Frontmatter','ATXHeading1','Paragraph']);
 expect(sourceBlocks(raw)[0].text.startsWith('---')).toBe(true);
});
it('preserves all untouched ranges when multiple cursors edit a mixed-ending document', () => {
 const state=createSourceState('first\r\nsecond\nthird\rfourth');
 const next=state.update({changes:[{from:0,to:5,insert:'FIRST'},{from:13,to:18,insert:'THIRD'}]}).state;
 expect(next.field(rawSource)).toBe('FIRST\r\nsecond\nTHIRD\rfourth');
});
it('keeps original source on selection-only and no-op transactions', () => {
 const raw='*odd*\r\n  \r\nlast'; const state=createSourceState(raw);
 expect(state.update({selection:{anchor:2}}).state.field(rawSource)).toBe(raw);
 expect(state.update({}).state.field(rawSource)).toBe(raw);
});
it('reads lists, tables, and fences as whole source blocks', () => {
 const raw='# A\r\n \r\nParagraph **odd**  \r\nnext\n\n- list\n  - nested\n\n| A | B |\n|---|---|\n|1|2|\n\n~~~mermaid\r\nA-->B\r\n~~~\n';
 const before=sourceBlocks(raw);
 expect(before.map(block=>block.type)).toEqual(['ATXHeading1','Paragraph','BulletList','Table','FencedCode']);
 expect(before.find(block=>block.type==='BulletList')!.text).toContain('nested');
});
it('restores exact source through a long sequence of edits and complete undo/redo', () => {
 let state=createSourceState('one\r\ntwo\nthree\rfour'); const original=state.field(rawSource);
 const target={get state(){return state;},dispatch(tr:{state:typeof state}){state=tr.state;}};
 const expected=[original];
 for(let i=0;i<30;i++) {state=state.update(replaceSource(state,`# ${i}\r\n`+state.field(rawSource))).state;expected.push(state.field(rawSource));}
 for(let i=29;i>=0;i--){expect(undo(target)).toBe(true);expect(state.field(rawSource)).toBe(expected[i]);}
 for(let i=1;i<expected.length;i++){expect(redo(target)).toBe(true);expect(state.field(rawSource)).toBe(expected[i]);}
});
it('maintains the source invariant through 120 reproducible random edits', () => {
 let state=createSourceState('日本語 😀\r\n  spaces  \n~~~js\rconst x = 1;\r\n~~~');let seed=9181;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed;};
 for(let i=0;i<120;i++) {
  const from=random()%(state.doc.length+1);const to=Math.min(state.doc.length,from+random()%4);
  state=state.update({changes:{from,to,insert:['x','😀','\n','  ','日本語',''][random()%6]}}).state;
  expect(normalizedText(state.field(rawSource))).toBe(state.doc.toString());
 }
});
