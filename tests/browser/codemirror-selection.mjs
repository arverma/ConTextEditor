import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
const base=process.env.POC_BASE_URL??'http://127.0.0.1:5174/ConTextEditor/';
for(const [name,engine] of Object.entries({chromium,webkit})) {
 const browser=await engine.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1100,height:900}});page.setDefaultTimeout(6000);
  await page.goto(base+'poc.html');
  const original='Select these words and keep typing.\r\n\r\nAnother paragraph.\n';
  await page.locator('#import').setInputFiles({name:'selection.md',mimeType:'text/plain',buffer:Buffer.from(original)});
  await page.waitForFunction(()=>document.querySelector('#poc-status').textContent.startsWith('Loaded'));
  const raw=()=>page.locator('#full-text-mirror').textContent();
  async function dragText(selector,from,to) {
   await page.locator(selector).first().scrollIntoViewIfNeeded();
   const points=await page.locator(selector).first().evaluate((el,{from,to})=>{
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;let offset=0;let start;let end;
    while((n=walker.nextNode())){const length=n.textContent.length;
     for(const [target,set] of [[from,r=>start=r],[to,r=>end=r]])if(target>=offset&&target<=offset+length){const r=document.createRange();r.setStart(n,target-offset);r.collapse(true);const b=r.getBoundingClientRect();set({x:b.x,y:b.y+b.height/2});}
     offset+=length;
    }
    return {start,end};
   },{from,to});
   await page.mouse.move(points.start.x,points.start.y);await page.mouse.down();await page.mouse.move(points.end.x,points.end.y,{steps:12});await page.mouse.up();
  }
  await dragText('.cm-line',0,6);
  await page.waitForFunction(()=>getSelection().toString()==='Select');
  console.log(name,'source mouse selection:',await page.evaluate(()=>getSelection().toString()));
  assert.equal(await page.evaluate(()=>getSelection().toString()),'Select');
  const lineBackground=await page.locator('.cm-activeLine').evaluate(el=>getComputedStyle(el).backgroundColor);
  assert(lineBackground==='transparent'||lineBackground.startsWith('rgba(')||lineBackground.includes(' / '),'The active line must not paint opaquely over the selection: '+lineBackground);
  const bar=page.getByRole('toolbar',{name:'Selection formatting'});
  await bar.waitFor({state:'visible'});
  const position=await bar.boundingBox();assert(position.y>0&&position.y<900);
  await page.screenshot({path:`/private/tmp/context-${name}-source-selection.png`});
  await page.keyboard.press('Alt+F10');
  assert.equal(await bar.getByRole('button',{name:'Bold',exact:true}).evaluate(el=>document.activeElement===el),true);
  await page.keyboard.press('Escape');await bar.waitFor({state:'hidden'});
  await page.keyboard.press('Shift+ArrowRight');await bar.waitFor({state:'visible'});
  // Restore the exact word after checking keyboard access and dismissal.
  await dragText('.cm-line',0,6);
  await bar.getByRole('button',{name:'Bold',exact:true}).click();
  assert.equal(await raw(),original.replace('Select','**Select**'));
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await page.getByRole('button',{name:'Visual',exact:true}).click();
  await page.locator('#markdown-preview > p[contenteditable]').first().waitFor();
  await dragText('#markdown-preview > p[contenteditable]',0,6);
  assert.equal(await page.evaluate(()=>getSelection().toString()),'Select');
  await bar.waitFor({state:'visible'});
  await bar.getByRole('button',{name:'Italic',exact:true}).click();
  assert.equal(await raw(),original.replace('Select','_Select_'));
  assert.equal(await page.evaluate(()=>getSelection().toString()),'Select','Visual formatting should retain the selected text');
  // Clicking the caret collapses the toolbar; keyboard selection reopens it.
  await page.keyboard.press('ArrowRight');await bar.waitFor({state:'hidden'});
  await page.keyboard.press('Shift+ArrowLeft');await bar.waitFor({state:'visible'});
  await page.keyboard.press('Escape');await bar.waitFor({state:'hidden'});
  assert.equal(await raw(),original.replace('Select','_Select_'));
  await page.setViewportSize({width:390,height:844});
  await page.keyboard.press('Shift+ArrowLeft');await bar.waitFor({state:'visible'});
  const mobile=await bar.boundingBox();assert(mobile.x>=0&&mobile.x+mobile.width<=390);
  await page.screenshot({path:`/private/tmp/context-${name}-selection.png`,fullPage:true});
  const phone=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await phone.goto(base+'poc.html');
  await phone.locator('#import').setInputFiles({name:'phone.md',mimeType:'text/plain',buffer:Buffer.from(original)});
  await phone.waitForFunction(()=>document.querySelector('#poc-status').textContent.startsWith('Loaded'));
  await phone.locator('.cm-content').focus();await phone.keyboard.press('Meta+ArrowUp');await phone.keyboard.press('Home');
  for(let i=0;i<6;i++)await phone.keyboard.press('Shift+ArrowRight');
  const phoneToolbar=phone.getByRole('toolbar',{name:'Selection formatting'});await phoneToolbar.waitFor({state:'visible'});
  assert.equal(await phone.evaluate(()=>getSelection().toString()),'Select');
  await phoneToolbar.getByRole('button',{name:'Bold',exact:true}).tap();
  await phone.waitForFunction(()=>document.querySelector('#full-text-mirror').textContent.startsWith('**Select**'));
  await phone.screenshot({path:`/private/tmp/context-${name}-phone-tap.png`});
  assert.equal(await phone.locator('#full-text-mirror').textContent(),original.replace('Select','**Select**'));
  await phone.close();
  console.log(name+': pointer selection, keyboard access, mobile tap and contextual formatting passed');
 }finally{await browser.close();}
}
