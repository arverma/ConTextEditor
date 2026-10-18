import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.POC_BASE_URL??'http://127.0.0.1:5174/ConTextEditor/';
for(const [name,engine] of Object.entries({chromium,webkit})) {
 const browser=await engine.launch({headless:true});
 try {
  const page=await browser.newPage();page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'poc.html');
  const original='# Heading\r\n\r\nHello **world** and _friends_.\n\n~~~mermaid\r\nflowchart LR\r\nA-->B\r\n~~~\r\n';
  await page.locator('#import').setInputFiles({name:'visual.md',mimeType:'text/plain',buffer:Buffer.from(original)});
  await page.getByRole('button',{name:'Visual',exact:true}).click();
  const paragraph=page.locator('#markdown-preview > p[contenteditable]');await paragraph.waitFor();
  const raw=()=>page.locator('#full-text-mirror').textContent();
  assert.equal(await raw(),original);
  async function select(text,from,to=from) {
   await paragraph.evaluate((el,{text,from,to})=>{
    const start=el.textContent.indexOf(text);if(start<0)throw Error('Text not found: '+text);
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node;let offset=0;let anchor=null;let focus=null;
    while((node=walker.nextNode())) {const end=offset+node.length;if(!anchor&&start+from<=end)anchor=[node,start+from-offset];if(start+to<=end){focus=[node,start+to-offset];break;}offset=end;}
    el.focus();const r=document.createRange();r.setStart(...anchor);r.setEnd(...focus);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(r);
   },{text,from,to});
  }
  await select('Hello ',5);await page.keyboard.type('!');
  assert.equal(await raw(),original.replace('Hello ','Hello\\! '));
  await select('Hello! ',0,5);await page.getByRole('button',{name:'Bold',exact:true}).click();
  assert((await raw()).includes('**Hello**\\! **world**'));
  await page.getByRole('button',{name:'Undo',exact:true}).click();await page.waitForTimeout(250);
  assert.equal(await raw(),original.replace('Hello ','Hello\\! '));
  await page.getByRole('button',{name:'Undo',exact:true}).click();await page.waitForTimeout(250);assert.equal(await raw(),original);
  for(const [label,syntax] of [['Italic','_Hello_'],['Inline code','`Hello`']]) {
   await select('Hello ',0,5);await page.getByRole('button',{name:label,exact:true}).click();
   assert.equal(await raw(),original.replace('Hello',syntax));
   await page.getByRole('button',{name:'Undo',exact:true}).click();await page.waitForTimeout(250);assert.equal(await raw(),original);
  }
  await select('Hello world',3,9);await page.keyboard.insertText('unsafe');assert.equal(await raw(),original);
  await select('world',0,5);await page.keyboard.insertText('Earth');
  assert.equal(await raw(),original.replace('world','Earth'));
  await select('Earth',2);await page.keyboard.press('Backspace');
  assert.equal(await raw(),original.replace('world','Erth'));
  await select('Hello ',5);await page.keyboard.press('Enter');
  assert((await raw()).includes('Hello  \r\n **Erth**'));
  // Plain clipboard input is escaped rather than interpreted as HTML or Markdown.
  await select(' and ',1);await paragraph.evaluate(el=>{const data=new DataTransfer();data.setData('text/plain','<script>**raw**');el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}));});
  assert((await raw()).includes('\\<script\\>\\*\\*raw\\*\\*'));
  assert.equal(await page.locator('#markdown-preview script').count(),0);
  const edited=await raw();await page.getByRole('button',{name:'Source',exact:true}).click();assert.equal(await raw(),edited);
  await page.getByRole('button',{name:'Visual',exact:true}).click();await paragraph.waitFor();assert.equal(await raw(),edited);
  for(const width of [320,390,903]) {await page.setViewportSize({width,height:853});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await page.setViewportSize({width:903,height:853});
  await page.screenshot({path:'/private/tmp/context-poc-visual.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log(name+': visual editing passed');
 }finally{await browser.close();}
}
