import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
const base=process.env.POC_BASE_URL??'http://127.0.0.1:5174/ConTextEditor/';
for(const [name,engine] of Object.entries({chromium,webkit})) {
 const browser=await engine.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:900,height:850}});page.setDefaultTimeout(9000);
  const fence='```mermaid\ngraph LR\nA-->B\n```';
  const initial='# Plan\r\n\r\nDraft text\r\n\r\n- First step\r\n- [ ] Follow up\r\n  - Nested check\r\n\r\n'+fence+'\n';
  await page.goto(base+'poc.html');
  await page.locator('#import').setInputFiles({name:'plan.md',mimeType:'text/markdown',buffer:Buffer.from(initial)});
  await page.waitForFunction(()=>document.querySelector('#poc-status').textContent.startsWith('Loaded'));
  await page.getByRole('button',{name:'Preview',exact:true}).click();
  const raw=()=>page.locator('#full-text-mirror').textContent();
  const toolbar=page.getByRole('toolbar',{name:'Preview formatting'});
  async function caret(snippet,offset=snippet.length) {
   await page.locator('#poc-rich .ProseMirror').evaluate((el,{snippet,offset})=>{
    const editor=el.editor;let at=-1;
    editor.state.doc.descendants((node,pos)=>{if(at>=0||!node.isText||!node.text.includes(snippet))return;at=pos+node.text.indexOf(snippet);});
    if(at<0)throw Error('missing '+snippet);
    editor.chain().focus().setTextSelection(at+offset).run();
   },{snippet,offset});
  }
  await caret('Draft text');await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement?.closest('.ProseMirror')?.getAttribute('role')),'textbox');
  await page.keyboard.type('More detail');
  await page.waitForFunction(()=>document.querySelector('#full-text-mirror').textContent.includes('More detail'));
  assert((await page.locator('#poc-rich .ProseMirror').innerText()).includes('More detail'));
  await caret('First step');await page.keyboard.type(' now');
  await page.waitForFunction(()=>document.querySelector('#full-text-mirror').textContent.includes('First step now'));
  await caret('First step now',0);
  for (let i=0;i<5;i++) await page.keyboard.press('Shift+ArrowRight');
  await toolbar.getByRole('button',{name:'Bold'}).click();
  assert((await raw()).includes('**First**'));
  await caret('Follow up');await page.keyboard.press('Enter');
  await page.keyboard.type('more');
  await page.waitForFunction(()=>document.querySelector('#full-text-mirror').textContent.includes('[ ] more')||document.querySelector('#full-text-mirror').textContent.includes('[ ] more\n'));
  assert((await raw()).includes('Nested check'));
  assert((await raw()).includes(fence));
  const edited=await raw();
  await page.getByRole('button',{name:'Markdown',exact:true}).click();assert.equal(await raw(),edited);
  await page.getByRole('button',{name:'Preview',exact:true}).click();
  assert((await page.locator('#poc-rich').innerText()).includes('More detail'));
  assert((await page.locator('#poc-rich').innerText()).includes('more'));
  console.log(name+': plan editing passed');
 }finally{await browser.close();}
}
