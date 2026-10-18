import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
const base=process.env.POC_BASE_URL??'http://127.0.0.1:5174/ConTextEditor/';
for(const [name,engine] of Object.entries({chromium,webkit})) {
 const browser=await engine.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:900,height:850}});page.setDefaultTimeout(9000);
  const initial='# Plan\r\n\r\nDraft text\r\n\r\n- First step\r\n- [ ] Follow up\r\n  - Nested check\r\n';
  await page.goto(base+'poc.html');
  await page.locator('#import').setInputFiles({name:'plan.md',mimeType:'text/markdown',buffer:Buffer.from(initial)});
  await page.waitForFunction(()=>document.querySelector('#poc-status').textContent.startsWith('Loaded'));
  await page.getByRole('button',{name:'Visual',exact:true}).click();
  const raw=()=>page.locator('#full-text-mirror').textContent();
  const toolbar=page.getByRole('toolbar',{name:'Selection formatting'});
  assert.equal(await toolbar.getByRole('button',{name:'Line break'}).count(),0);
  async function placeCaretAtEnd(locator) {await locator.evaluate(element=>{element.focus();const range=document.createRange();range.selectNodeContents(element);range.collapse(false);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);});}
  const paragraph=page.locator('#markdown-preview > p[contenteditable]').first();await paragraph.waitFor();
  await placeCaretAtEnd(paragraph);await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('contenteditable')),'true');
  await page.keyboard.type('More detail');
  assert.equal(await paragraph.innerText(),'Draft text\nMore detail');
  assert((await raw()).includes('Draft text  \r\nMore detail'));
  const item=page.locator('#markdown-preview li').filter({hasText:'First step'}).first();
  await placeCaretAtEnd(item.locator(':scope > [contenteditable]'));await page.keyboard.type(' now');
  assert((await raw()).includes('- First step now'),JSON.stringify({raw:await raw(),status:await page.locator('#poc-status').textContent()}));
  await item.locator(':scope > [contenteditable]').evaluate(element=>{const node=element.firstChild;const range=document.createRange();range.setStart(node,0);range.setEnd(node,5);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);document.dispatchEvent(new Event('selectionchange'));});
  await toolbar.getByRole('button',{name:'Bold'}).click();
  assert((await raw()).includes('- **First** step now'));
  const task=page.locator('#markdown-preview li').filter({hasText:'Follow up'}).first();
  await placeCaretAtEnd(task.locator(':scope > [contenteditable]'));await page.keyboard.press('Enter');
  assert((await raw()).includes('- [ ] Follow up  \r\n  \r\n'),JSON.stringify({raw:await raw(),status:await page.locator('#poc-status').textContent()}));
  await page.keyboard.type('m');
  assert((await raw()).includes('- [ ] Follow up  \r\n  m'),JSON.stringify({raw:await raw(),status:await page.locator('#poc-status').textContent()}));
  await page.keyboard.type('ore');
  assert((await raw()).includes('- [ ] Follow up  \r\n  more'),JSON.stringify({raw:await raw(),status:await page.locator('#poc-status').textContent()}));
  assert((await task.innerText()).includes('Follow up\nmore'));
  assert((await raw()).includes('  - Nested check\r\n'));
  const edited=await raw();
  await page.getByRole('button',{name:'Source',exact:true}).click();assert.equal(await raw(),edited);
  await page.getByRole('button',{name:'Visual',exact:true}).click();
  assert((await page.locator('#markdown-preview').innerText()).includes('More detail'));
  assert((await page.locator('#markdown-preview').innerText()).includes('more'));
  console.log(name+': plan editing passed');
 }finally{await browser.close();}
}
