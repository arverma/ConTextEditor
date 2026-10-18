import { sourceBlocks } from './source-state';
import { getFormattingEdit, type FormattingKind } from '../formatting';
import { visualBlocks, visualRange, literalText, paintVisualBlock, type VisualBlock } from './visual-editing';

export function visualEditor(root: HTMLElement, read:()=>string, write:(raw:string)=>void, notify:(message:string)=>void) {
  let enabled=false;
  let boundSource=read();
  let bindings=new Map<HTMLElement,VisualBlock>();
  let composing: {element:HTMLElement;block:VisualBlock;text:string}|null=null;
  function bind() {
    bindings=new Map();
    boundSource=read();
    root.querySelectorAll<HTMLElement>('[contenteditable]').forEach(el=>{el.removeAttribute('contenteditable');el.removeAttribute('role');el.removeAttribute('aria-label');});
    if(!enabled)return;
    const models=visualBlocks(read());
    const elements=Array.from(root.children).filter((el):el is HTMLElement=>el instanceof HTMLElement && /^(P|H[1-6])$/.test(el.tagName));
    const key=(text:string)=>text.replace(/\r?\n/g,'');
    for(const block of models.filter(block=>block.kind==='text')) {
      const text=key(block.runs.map(r=>r.text).join(''));
      const matches=elements.filter(el=>key(el.textContent??'')===text);
      if(matches.length!==1 || models.filter(b=>key(b.runs.map(r=>r.text).join(''))===text).length!==1)continue;
      const element=matches[0]; paintVisualBlock(element,block);
      element.contentEditable='true';element.spellcheck=true;element.setAttribute('role','textbox');element.setAttribute('aria-label','Edit rendered text');element.setAttribute('aria-multiline','true');bindings.set(element,block);
    }
    const items=Array.from(root.querySelectorAll('li'));
    for(const block of models.filter(block=>block.kind==='list')) {
      const item=items[block.listIndex!];
      if(!item)continue;
      const content=Array.from(item.childNodes).filter(node=>node.nodeType===Node.TEXT_NODE || node instanceof HTMLElement && !node.matches('input,ul,ol'));
      const visible=content.map(node=>node.textContent??'').join('').replace(/\s+/g,' ').trim();
      const expected=block.runs.map(run=>run.text).join('').replace(/\s+/g,' ').trim();
      if(visible!==expected)continue;
      const element=document.createElement('span');element.className='poc-list-editor';
      item.insertBefore(element,content[0]??item.querySelector(':scope > ul, :scope > ol'));
      content.forEach(node=>node.remove());paintVisualBlock(element,block);
      element.contentEditable='true';element.spellcheck=true;element.setAttribute('role','textbox');element.setAttribute('aria-label','Edit list item text');element.setAttribute('aria-multiline','true');bindings.set(element,block);
    }
  }
  function selection() {
    if(read()!==boundSource)return null;
    const sel=window.getSelection();if(!sel?.rangeCount)return null;
    const range=sel.getRangeAt(0);
    const element=Array.from(bindings.keys()).find(el=>el.contains(range.startContainer)&&el.contains(range.endContainer));
    if(!element)return null;
    const before=range.cloneRange();before.selectNodeContents(element);before.setEnd(range.startContainer,range.startOffset);
    const from=before.toString().length;
    return {element,block:bindings.get(element)!,from,to:from+range.toString().length};
  }
  function selectText(element: HTMLElement, from: number, to = from): void {
    element.focus();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    let offset = 0;
    let start: { node: Node; offset: number } | undefined;
    let end: { node: Node; offset: number } | undefined;
    while ((node = walker.nextNode())) {
      const length = node.textContent?.length ?? 0;
      if (!start && from <= offset + length) start = { node, offset: Math.max(0, from - offset) };
      if (to <= offset + length) { end = { node, offset: Math.max(0, to - offset) }; break; }
      offset += length;
    }
    if (!start || !end) return;
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    const selection = window.getSelection()!;
    selection.removeAllRanges(); selection.addRange(range);
  }
  function apply(element:HTMLElement,block:VisualBlock,from:number,to:number,text:string,rawCursor?:number, retainedSelection?:{from:number;to:number}, expectedVisual?:string) {
    const raw=read();const next=raw.slice(0,from)+text+raw.slice(to);
    const before=sourceBlocks(raw);const after=sourceBlocks(next);
    if(before.length!==after.length || before.some((b,i)=>b.type!==after[i]?.type)) { notify('This edit changes a Markdown block boundary. Use Source for structural changes.');paintVisualBlock(element,block);return; }
    const prospective=visualBlocks(next).find(candidate=>candidate.from===block.from);
    if(!prospective || expectedVisual!==undefined && prospective.runs.map(run=>run.text).join('')!==expectedVisual) {
      notify('This edit would change Markdown formatting. Use Source for this position.');paintVisualBlock(element,block);return;
    }
    write(next);boundSource=read();
    const updated=prospective;
    paintVisualBlock(element,updated);bindings.set(element,updated);
    // Other blocks have shifted raw offsets, but keep their DOM and focus stable.
    const models=visualBlocks(read());
    for(const [el,old] of bindings)if(el!==element){const match=models.find(b=>b.from===old.from+(old.from>block.from?text.length-(to-from):0));if(match)bindings.set(el,match);else bindings.delete(el);}
    if (retainedSelection) { selectText(element, retainedSelection.from, retainedSelection.to); return; }
    const target=rawCursor??from+text.length;let visible=0;
    for(const run of updated.runs){const index=run.offsets.indexOf(target);if(index>=0){selectText(element,visible+index);return;}visible+=run.text.length;}
    selectText(element,Math.min(visible,updated.runs.map(r=>r.text).join('').length));
  }
  function insert(text:string,backward=false,forward=false) {
    const selected=selection();if(!selected){notify('Select text inside one editable paragraph or heading.');return;}
    let {from,to}=selected;
    const visible=selected.block.runs.map(r=>r.text).join('');
    // Delete whole Unicode code points rather than half of a surrogate pair.
    if(from===to && backward)from-=Array.from(visible.slice(0,from)).at(-1)?.length??0;
    if(from===to && forward)to+=Array.from(visible.slice(to))[0]?.length??0;
    const mapped=visualRange(selected.block,from,to);
    if(!mapped){notify('Use Source to edit across formatting boundaries.');return;}
    try {
      const code=selected.block.runs.some(r=>r.tags.includes('code') && r.offsets.includes(mapped.from)&&r.offsets.includes(mapped.to));
      const raw=read();const ending=raw.match(/\r\n|\r|\n/)?.[0]??'\n';
      let indent='';
      if(selected.block.kind==='list') {
        const prefix=raw.slice(Math.max(raw.lastIndexOf('\n',selected.block.from-1),raw.lastIndexOf('\r',selected.block.from-1))+1,selected.block.from);
        indent=' '.repeat(prefix.match(/^[ \t]*(?:[-+*]|\d+[.)])[ \t]+/)?.[0].length??0);
      }
      const escaped=literalText(text,code).replace(/\r\n?|\n/g,`  ${ending}${indent}`);
      const expected=visible.slice(0,from)+text.replace(/\r\n?|\n/g,'\n')+visible.slice(to);
      apply(selected.element,selected.block,mapped.from,mapped.to,escaped,undefined,undefined,expected);
    }catch(error){notify((error as Error).message);}
  }
  root.addEventListener('beforeinput',event=>{
    if(!enabled || !(event.target instanceof HTMLElement) || !bindings.has(event.target))return;
    if(event.isComposing)return;
    const type=event.inputType;
    // Clipboard content is handled by paste; never accept its HTML.
    event.preventDefault();
    if(type==='insertText'||type==='insertReplacementText')insert(event.data??'');
    else if(type==='insertParagraph'||type==='insertLineBreak')insert('\n');
    else if(type==='deleteContentBackward')insert('',true);
    else if(type==='deleteContentForward')insert('',false,true);
    else notify('Use the formatting toolbar or Source for this operation.');
  });
  root.addEventListener('paste',event=>{if(!enabled||!selection())return;event.preventDefault();insert(event.clipboardData?.getData('text/plain')??'');});
  root.addEventListener('drop',event=>{if(enabled)event.preventDefault();});
  root.addEventListener('compositionstart',event=>{const element=event.target as HTMLElement;const block=bindings.get(element);if(block)composing={element,block,text:element.textContent??''};});
  root.addEventListener('compositionend',()=>{
    if(!composing)return;
    const {element,block,text}=composing;composing=null;
    const next=element.textContent??'';let from=0;while(from<text.length&&from<next.length&&text[from]===next[from])from++;
    let end=text.length;let nextEnd=next.length;while(end>from&&nextEnd>from&&text[end-1]===next[nextEnd-1]){end--;nextEnd--;}
    const mapped=visualRange(block,from,end);paintVisualBlock(element,block);
    if(mapped)apply(element,block,mapped.from,mapped.to,literalText(next.slice(from,nextEnd)));else notify('Composition crossed a formatting boundary. Use Source for this edit.');
  });
  return {
    bind,
    selectedRange(): Range | null {
      const selected = selection();
      return selected && selected.from !== selected.to ? window.getSelection()!.getRangeAt(0) : null;
    },
    enable(value:boolean){enabled=value;bind();},
    format(kind:FormattingKind){
      const selected=selection();if(!selected){notify('Select text in an editable paragraph or heading first.');return;}
      const mapped=visualRange(selected.block,selected.from,selected.to);
      if(!mapped){notify('Format text within one existing style at a time.');return;}
      if(kind==='break'){insert('\n');return;}
      const raw=read();const edit=getFormattingEdit(raw,mapped.from,mapped.to,kind);
      apply(selected.element,selected.block,edit.start,edit.end,edit.text,edit.selectionEnd,selected.from!==selected.to ? {from:selected.from,to:selected.to} : undefined);
    },
  };
}
