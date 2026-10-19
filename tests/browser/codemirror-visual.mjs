import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.POC_BASE_URL??'http://127.0.0.1:5174/ConTextEditor/';
for(const [name,engine] of Object.entries({chromium,webkit})) {
 const browser=await engine.launch({headless:true});
 try {
  const page=await browser.newPage();page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'poc.html');
  await page.locator('#fixture').selectOption('technical');
  await page.getByRole('button',{name:'Preview',exact:true}).click();
  await page.locator('#poc-rich .poc-diagram svg.flowchart').waitFor({timeout:15000});
  assert.equal((await page.locator('#poc-rich .poc-html-block').innerText()).trim(),'Raw HTML remains source.');
  assert.equal(await page.locator('#poc-rich .poc-html-block pre').count(),0);
  assert.match(await page.locator('#full-text-mirror').textContent(),/<div>Raw HTML remains source\.<\/div>/);
  await page.getByRole('button',{name:'Markdown',exact:true}).click();
  const fence='~~~mermaid\r\nflowchart LR\r\nA-->B\r\n~~~';
  const original='# Heading\r\n\r\nHello **world** and _friends_.\n\n'+fence+'\r\n';
  await page.locator('#import').setInputFiles({name:'visual.md',mimeType:'text/plain',buffer:Buffer.from(original)});
  await page.getByRole('button',{name:'Preview',exact:true}).click();
  await page.locator('#poc-rich .ProseMirror p').filter({hasText:'Hello'}).waitFor();
  await page.locator('#poc-rich .poc-diagram svg.flowchart').waitFor();
  const raw=()=>page.locator('#full-text-mirror').textContent();
  assert.equal(await raw(),original);
  async function select(snippet,from,to=from) {
   await page.locator('#poc-rich .ProseMirror').evaluate((el,{snippet,from,to})=>{
    const editor=el.editor;let at=-1;
    editor.state.doc.descendants((node,pos)=>{if(at>=0||!node.isText||!node.text.includes(snippet))return;at=pos+node.text.indexOf(snippet);});
    if(at<0)throw Error('missing '+snippet);
    editor.chain().focus().setTextSelection({from:at+from,to:at+to}).run();
   },{snippet,from,to});
  }
  await select('Hello',5);await page.keyboard.type('!');
  await page.waitForTimeout(600);
  const typed=await raw();
  if(!typed.includes('Hello!')) throw Error(JSON.stringify(typed)+' active='+await page.evaluate(()=>document.activeElement?.className));
  assert(!(await raw()).includes('\\!'));
  assert((await raw()).includes(fence));
  await select('Hello!',0,6);await page.getByRole('toolbar',{name:'Preview formatting'}).getByRole('button',{name:'Bold',exact:true}).click();
  assert((await raw()).includes('**Hello!**'));
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  assert(!(await raw()).includes('**Hello!**'));
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  const afterSecondUndo=await raw();
  if(!afterSecondUndo.includes('Hello **world**')||afterSecondUndo.includes('Hello!')) throw Error(JSON.stringify(afterSecondUndo));
  for(const [label,pattern] of [['Italic',/\*Hello\*|_Hello_/],['Inline code',/`Hello`/],['Strikethrough',/~~Hello~~/]]) {
   await select('Hello',0,5);await page.getByRole('button',{name:label,exact:true}).click();
   assert.match(await raw(),pattern,label);
   await page.getByRole('button',{name:'Undo',exact:true}).click();
   await page.waitForFunction(()=>!document.querySelector('#full-text-mirror').textContent.includes('++')&&!document.querySelector('#full-text-mirror').textContent.includes('~~Hello~~'));
  }
  await select('world',0,5);await page.keyboard.insertText('Earth');
  await page.waitForFunction(()=>document.querySelector('#full-text-mirror').textContent.includes('Earth'));
  await select('Earth',2);await page.keyboard.press('Backspace');
  await page.waitForFunction(()=>document.querySelector('#full-text-mirror').textContent.includes('Erth'));
  await select('Erth',4);await page.keyboard.press('Enter');await page.keyboard.type('Next');
  await page.waitForFunction(()=>document.querySelector('#full-text-mirror').textContent.includes('\n\nNext')||document.querySelector('#full-text-mirror').textContent.includes('Next'));
  assert(!(await raw()).includes('Erth  \nNext'));
  await select(' and ',1);
  await page.locator('#poc-rich .ProseMirror').evaluate(el=>{const data=new DataTransfer();data.setData('text/plain','**raw**');data.setData('text/html','<script>alert(1)</script>');el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}));});
  await page.waitForFunction(()=>document.querySelector('#full-text-mirror').textContent.includes('**raw**'));
  assert.equal(await page.locator('#poc-rich script').count(),0);
  assert((await raw()).includes(fence));
  const edited=await raw();await page.getByRole('button',{name:'Markdown',exact:true}).click();assert.equal(await raw(),edited);
  await page.getByRole('button',{name:'Preview',exact:true}).click();
  await page.locator('#poc-rich .ProseMirror').waitFor();
  assert.equal(await raw(),edited);
  for(const width of [320,390,903]) {await page.setViewportSize({width,height:853});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await page.setViewportSize({width:903,height:853});
  await page.screenshot({path:'/private/tmp/context-poc-visual.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log(name+': visual editing passed');
 }finally{await browser.close();}
}
