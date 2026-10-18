import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine, rectangularSelection, crosshairCursor } from '@codemirror/view';
import { EditorSelection, Transaction } from '@codemirror/state';
import { defaultKeymap, historyKeymap, indentWithTab, undo, redo, isolateHistory } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { createSourceState, rawSource, normalizedText, sourceOffset, sourceBlocks, moveSourceBlock, replaceSource } from './source-state';
import { getFormattingEdit, type FormattingKind } from '../formatting';
import { setPreviewContent } from '../markdown-preview';
import { exportTxt, exportPdf } from '../export';
import { visualEditor } from './visual-controller';
import { selectionToolbar } from './selection-toolbar';

const technical = '# Technical Markdown\n\nA paragraph with **bold**, _italic_, `inline code`, a [reference][doc] and trailing spaces.  \nNext line.\n\n- List item\n  - Nested item\n- Another item\n\n| Name | Value |\n| :--- | ---: |\n| Alpha | 42 |\n\n~~~mermaid\nflowchart LR\nA[Original source] --> B[Safe edits]\nB --> C[Preview]\n~~~\n\n[doc]: https://example.com "Reference title"\n\n<div>Raw HTML remains source.</div>\n';
const fixtures: Record<string,string> = { technical, mixed: technical.replaceAll('\n', '\r\n').replace('Safe edits]\r\n', 'Safe edits]\n'), large: '# Large fixture\n\n' + 'A long paragraph with **bold**, `code`, Unicode 日本語 😀 and preserved trailing spaces.  \nSecond line.\n\n'.repeat(500) + technical };
const preview = document.getElementById('markdown-preview')!;
const blocksEl = document.getElementById('blocks')!;
const status = document.getElementById('poc-status')!;
const fixture = document.getElementById('fixture') as HTMLSelectElement;
let baseline = fixtures.mixed;
let timer: ReturnType<typeof setTimeout>;
let drag: { index: number; source: string } | null = null;
let previewRevision = 0;
let visualMode = false;
let visualWriting = false;
let floatingTools: { schedule(): void } | undefined;
const view = new EditorView({ parent: document.getElementById('poc-editor')!, state: makeState(baseline) });
const visual = visualEditor(preview, () => view.state.field(rawSource), raw => {
  visualWriting = true;
  try { view.dispatch(replaceSource(view.state, raw)); } finally { visualWriting = false; }
}, message => { status.textContent = message; });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) button.addEventListener('click', async () => {
  visualMode = button.dataset.mode === 'visual';
  document.querySelector('.poc-page')!.classList.toggle('is-visual', visualMode);
  document.querySelectorAll('[data-mode]').forEach(el => el.setAttribute('aria-pressed', String((el as HTMLElement).dataset.mode === (visualMode ? 'visual' : 'source'))));
  clearTimeout(timer); toolbar.hidden = true; await renderPreview(); visual.enable(visualMode); floatingTools?.schedule();
});
preview.addEventListener('keydown', event => {
  if (!visualMode || !(event.ctrlKey || event.metaKey)) return;
  if (event.key.toLowerCase() === 'b' || event.key.toLowerCase() === 'i') { event.preventDefault(); visual.format(event.key.toLowerCase() === 'b' ? 'bold' : 'italic'); }
  if (event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo(view) : undo(view); }
});

function makeState(raw: string) {
  return createSourceState(raw, [lineNumbers(), drawSelection(), highlightActiveLine(), rectangularSelection(), crosshairCursor(), markdown(), EditorView.lineWrapping,
    EditorView.theme({ '&': {color:'var(--text)',backgroundColor:'var(--editor-bg)'}, '.cm-gutters':{backgroundColor:'var(--surface-2)',color:'var(--text-muted)',borderColor:'var(--border)'}, '.cm-activeLine':{backgroundColor:'color-mix(in srgb, var(--accent) 5%, transparent)'}, '.cm-cursor':{borderLeftColor:'var(--text)'}, '&.cm-focused .cm-selectionBackground, .cm-selectionBackground':{backgroundColor:'var(--poc-selection)'} }),
    keymap.of([{ key:'Mod-b', run: () => { format('bold'); return true; } },{ key:'Mod-i', run: () => { format('italic'); return true; } }, ...historyKeymap, ...defaultKeymap, indentWithTab]),
    EditorView.domEventHandlers({ paste(event) {
      const text = event.clipboardData?.getData('text/plain');
      if (text === undefined) return false;
      event.preventDefault();
      const raw = view.state.field(rawSource); const range = view.state.selection.main;
      const from = sourceOffset(raw, range.from); const to = sourceOffset(raw, range.to);
      commit(raw.slice(0, from) + text + raw.slice(to), from + text.length);
      return true;
    } }),
    EditorView.updateListener.of(update => { floatingTools?.schedule(); if (update.docChanged || update.transactions.some(tr=>tr.effects.length)) refresh(); }),
  ]);
}

function commit(raw: string, cursor?: number): void {
  const spec = replaceSource(view.state, raw);
  if (cursor !== undefined) spec.selection = EditorSelection.cursor(normalizedText(raw.slice(0, cursor)).length);
  view.dispatch(spec); view.focus();
}
function format(kind: FormattingKind): void {
  if (visualMode) { visual.format(kind); return; }
  const raw = view.state.field(rawSource); const selection = view.state.selection.main;
  const edit = getFormattingEdit(raw, sourceOffset(raw, selection.from), sourceOffset(raw, selection.to), kind);
  const next = raw.slice(0, edit.start) + edit.text + raw.slice(edit.end);
  const spec = replaceSource(view.state, next);
  spec.selection = EditorSelection.range(normalizedText(next.slice(0, edit.selectionStart)).length, normalizedText(next.slice(0, edit.selectionEnd)).length);
  spec.annotations = [isolateHistory.of('full'), Transaction.userEvent.of('input.format')];
  view.dispatch(spec); view.focus();
}
const toolbar = document.querySelector<HTMLElement>('.poc-edit-tools')!;
floatingTools = selectionToolbar(toolbar, () => {
  const toolbarFocused = toolbar.contains(document.activeElement);
  if (visualMode) {
    const range = visual.selectedRange();
    if (!range || (!preview.contains(document.activeElement) && !toolbarFocused)) return null;
    const rect = range.getBoundingClientRect();
    const selection = window.getSelection()!;
    const container = range.startContainer instanceof HTMLElement ? range.startContainer : range.startContainer.parentElement!;
    const editor = container.closest<HTMLElement>('[contenteditable="true"]');
    if (!editor) return null;
    return { rect, bounds: preview.getBoundingClientRect(), key: `visual:${selection.anchorOffset}:${selection.focusOffset}:${range.toString()}:${view.state.doc.length}`, editor };
  }
  const selected = view.state.selection.main;
  if (selected.empty || (!view.hasFocus && !toolbarFocused)) return null;
  const start = view.coordsAtPos(selected.from); const end = view.coordsAtPos(selected.to);
  if (!start || !end) return null;
  return { bounds: view.scrollDOM.getBoundingClientRect(), rect: { left: Math.min(start.left,end.left), right: Math.max(start.right,end.right), top: start.top, bottom: end.bottom }, key: `source:${selected.from}:${selected.to}:${view.state.doc.length}`, editor: view.contentDOM };
});
let formattedOnTouch = false;
function toolbarFormat(target: EventTarget | null): void {
  const kind = target instanceof Element ? target.closest<HTMLButtonElement>('[data-format]')?.dataset.format as FormattingKind | undefined : undefined;
  if (kind) format(kind);
}
toolbar.addEventListener('pointerdown', event => {
  if (!(event.target instanceof Element) || !event.target.closest('button')) return;
  event.preventDefault();
  // WebKit may suppress the click after preventing touch focus. Apply once here.
  formattedOnTouch = event.pointerType === 'touch' || event.pointerType === 'pen';
  if (formattedOnTouch) toolbarFormat(event.target);
});
toolbar.addEventListener('click', event => {
  if (formattedOnTouch && event.detail !== 0) return;
  toolbarFormat(event.target);
});
document.getElementById('undo')!.addEventListener('click',()=>undo(view));
document.getElementById('redo')!.addEventListener('click',()=>redo(view));

async function renderPreview(): Promise<void> {
  const revision = ++previewRevision;
  try { await setPreviewContent(preview, view.state.field(rawSource)); if (revision === previewRevision) visual.bind(); }
  catch { if (revision === previewRevision) status.textContent = 'Preview could not render. Raw source is intact.'; }
}
function refresh(): void {
  const raw = view.state.field(rawSource);
  document.getElementById('full-text-mirror')!.textContent = raw;
  const crlf = (raw.match(/\r\n/g) ?? []).length; const lf = (raw.match(/(?<!\r)\n/g) ?? []).length; const cr = (raw.match(/\r(?!\n)/g) ?? []).length;
  document.getElementById('fidelity')!.textContent = `${raw === baseline ? 'Exact match to loaded source' : 'Edited source'} · ${raw.length.toLocaleString()} UTF-16 units · CRLF ${crlf} / LF ${lf} / CR ${cr}`;
  blocksEl.replaceChildren();
  sourceBlocks(raw).forEach((block,index,blocks) => {
    const item = document.createElement('li'); item.dataset.index=String(index);
    const handle = document.createElement('button'); handle.type='button'; handle.className='block-handle'; handle.draggable=true; handle.textContent='⠿'; handle.setAttribute('aria-label',`Drag block ${index+1}`);
    const label = document.createElement('span'); label.textContent=`${block.type} · ${block.text.split(/\r\n|\r|\n/)[0].slice(0,65)}`;
    item.append(handle,label);
    for (const [delta,text] of [[-1,'↑'],[1,'↓']] as const) {
      const button = document.createElement('button'); button.type='button'; button.textContent=text; button.disabled=index+delta<0 || index+delta>=blocks.length;
      button.setAttribute('aria-label',`Move block ${index+1} ${delta<0?'up':'down'}`);
      button.addEventListener('click',()=>move(index,index+delta,raw)); item.append(button);
    }
    blocksEl.append(item);
  });
  clearTimeout(timer); if (!visualWriting) timer=setTimeout(()=>void renderPreview(),150);
}
function move(from:number,to:number,expected:string): void {
  if (view.state.field(rawSource)!==expected) { status.textContent='Source changed during drag. Start the move again.'; return; }
  try { commit(moveSourceBlock(expected,from,to)); status.textContent=`Moved block ${from+1} to position ${to+1}. Undo restores the original source.`; }
  catch { status.textContent='This move would change Markdown block boundaries or displace frontmatter. Source is unchanged.'; }
}
function targetIndex(event:DragEvent | PointerEvent): number | null {
  const item=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('#blocks li');
  return item?.dataset.index===undefined ? null : Number(item.dataset.index);
}
function clearDrop(): void { blocksEl.querySelectorAll('[data-drop]').forEach(item=>item.removeAttribute('data-drop')); }
blocksEl.addEventListener('dragstart',event=>{
  const handle=(event.target as Element).closest('.block-handle'); if(!handle || !event.dataTransfer) return;
  const index=Number(handle.closest<HTMLElement>('li')!.dataset.index); drag={index,source:view.state.field(rawSource)};
  event.dataTransfer.setData('text/plain',String(index)); event.dataTransfer.effectAllowed='move';
});
blocksEl.addEventListener('dragover',event=>{if(!drag)return;event.preventDefault();clearDrop();const index=targetIndex(event);if(index!==null)blocksEl.children[index]?.setAttribute('data-drop','true');});
blocksEl.addEventListener('drop',event=>{if(!drag)return;event.preventDefault();const index=targetIndex(event);if(index!==null)move(drag.index,index,drag.source);drag=null;clearDrop();});
blocksEl.addEventListener('dragend',()=>{drag=null;clearDrop();});
let touch: {pointer:number;index:number;source:string;x:number;y:number;moved:boolean;target:number|null} | null=null;
blocksEl.addEventListener('pointerdown',event=>{
  const handle=(event.target as Element).closest<HTMLElement>('.block-handle');if(event.pointerType==='mouse'||!handle)return;
  handle.setPointerCapture(event.pointerId);touch={pointer:event.pointerId,index:Number(handle.closest<HTMLElement>('li')!.dataset.index),source:view.state.field(rawSource),x:event.clientX,y:event.clientY,moved:false,target:null};
});
blocksEl.addEventListener('pointermove',event=>{if(!touch||touch.pointer!==event.pointerId)return;touch.moved ||= Math.hypot(event.clientX-touch.x,event.clientY-touch.y)>8;touch.target=targetIndex(event);clearDrop();if(touch.moved&&touch.target!==null)blocksEl.children[touch.target]?.setAttribute('data-drop','true');});
blocksEl.addEventListener('pointerup',()=>{if(touch?.moved&&touch.target!==null)move(touch.index,touch.target,touch.source);touch=null;clearDrop();});
blocksEl.addEventListener('pointercancel',()=>{touch=null;clearDrop();});

function load(raw:string): void { baseline=raw;view.setState(makeState(raw));status.textContent='Loaded disposable source. Existing notes are untouched.';refresh(); }
document.getElementById('reset')!.addEventListener('click',()=>load(fixtures[fixture.value]));
fixture.addEventListener('change',()=>load(fixtures[fixture.value]));
(document.getElementById('import') as HTMLInputElement).addEventListener('change',async event=>{
  const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;
  status.textContent='Opening local file…';
  try { if(file.size>5*1024*1024)throw Error('Use a UTF-8 file under 5 MiB.');load(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await file.arrayBuffer())); }
  catch {status.textContent='Could not open file. Use valid UTF-8 Markdown under 5 MiB. Current source is intact.';}finally{input.value='';}
});
document.getElementById('raw-export')!.addEventListener('click',()=>exportTxt(view.state.field(rawSource),'codemirror-poc'));
document.getElementById('pdf-export')!.addEventListener('click',async()=>{clearTimeout(timer);await renderPreview();exportPdf('CodeMirror evaluation');});
document.getElementById('poc-theme')!.addEventListener('click',event=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';(event.currentTarget as HTMLElement).setAttribute('aria-pressed',String(dark));void renderPreview();});
refresh();
