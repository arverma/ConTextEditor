import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium, firefox, webkit } from 'playwright';

const base = process.env.POC_BASE_URL || 'http://127.0.0.1:5174/ConTextEditor/';
const output = process.env.POC_ARTIFACTS || '/private/tmp/context-poc-browser';
await mkdir(output,{recursive:true});
const engines=(process.env.POC_BROWSERS||'chromium,firefox,webkit').split(',');
const results=[];
for(const name of engines) {
 console.log(`${name}: launching`);
 const browser=await ({chromium,firefox,webkit}[name]).launch({headless:true,timeout:20000});
 const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
 const page=await context.newPage();page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(20000);console.log(`${name}: page ready`);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('context-editor.snippets','protected sentinel');localStorage.setItem('context-editor.activeSnippetId','protected-id');});
 try {
  await page.goto(`${base}poc.html`);await page.locator('.cm-content').waitFor();
  async function load(raw) {await page.locator('#import').setInputFiles({name:'fixture.md',mimeType:'text/markdown',buffer:Buffer.from(raw)});await page.waitForFunction(()=>document.querySelector('#poc-status').textContent.startsWith('Loaded'));}
  async function download(label) {const [file]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:label,exact:true}).last().click()]);assert.equal(await file.failure(),null);return readFile(await file.path());}
  async function raw() {return page.locator('#full-text-mirror').textContent();}
  async function selectHello() {await page.locator('.cm-content').focus();await page.keyboard.press('Meta+ArrowUp');await page.keyboard.press('Home');for(let i=0;i<5;i++)await page.keyboard.press('Shift+ArrowRight');}
  const fixture='hello world\r\n\r\n# Heading\n\n~~~mermaid\r\nflowchart LR\nA-->B\r\n~~~\n\n| A | B |\n|---|---|\n|1|2|\n';
  for(const value of [fixture,'\uFEFF# BOM\r\n\n  text  \rfinal','', '日本語 😀 e\u0301\r\n\r\nlast']) {await load(value);assert.equal(await raw(),value);assert.equal((await download('Download raw text')).toString('utf8'),value);}
  await load(fixture);
  await page.locator('#import').setInputFiles({name:'invalid.md',mimeType:'text/markdown',buffer:Buffer.from([255,254,253])});
  await page.waitForFunction(()=>document.querySelector('#poc-status').textContent.startsWith('Could not open'));assert.equal(await raw(),fixture);
  await page.locator('#import').setInputFiles({name:'oversized.md',mimeType:'text/markdown',buffer:Buffer.alloc(5*1024*1024+1,65)});
  await page.waitForFunction(()=>document.querySelector('#poc-status').textContent.startsWith('Could not open'));assert.equal(await raw(),fixture);
  for(const [button,formatted] of [['Bold','**hello**'],['Italic','_hello_'],['Inline code','`hello`']]) {
   await selectHello();await page.getByRole('button',{name:button,exact:true}).click();assert.equal(await raw(),fixture.replace('hello',formatted));
   await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await raw(),fixture);
   await page.getByRole('button',{name:'Redo',exact:true}).click();assert.equal(await raw(),fixture.replace('hello',formatted));
   await page.getByRole('button',{name:'Undo',exact:true}).click();
  }
  await selectHello();await page.keyboard.press('Meta+b');assert.equal(await raw(),fixture.replace('hello','**hello**'));
  await page.locator('.cm-content').focus();await page.keyboard.press('Meta+z');assert.equal(await raw(),fixture);
  await selectHello();await page.locator('.cm-content').evaluate(el=>{const clipboardData=new DataTransfer();clipboardData.setData('text/plain','paste\r\nnext\rlast');el.dispatchEvent(new ClipboardEvent('paste',{clipboardData,bubbles:true,cancelable:true}));});
  assert.equal(await raw(),fixture.replace('hello','paste\r\nnext\rlast'));
  await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await raw(),fixture);
  const parts=['first','- one\r\n  - nested','~~~mermaid\r\nflowchart LR\r\nA-->B\r\n~~~','| A | B |\r\n|---|---|\r\n|1|2|'];const source=parts.join('\r\n\r\n');
  await load(source);
  await page.getByRole('button',{name:'Move block 1 down',exact:true}).click();assert.equal(await raw(),[parts[1],parts[0],parts[2],parts[3]].join('\r\n\r\n'));
  await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await raw(),source);
  await page.locator('.poc-outline').evaluate(el=>el.scrollIntoView({block:'center'}));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.getByRole('button',{name:'Drag block 1',exact:true}).dragTo(page.getByRole('button',{name:'Drag block 3',exact:true}));
  assert.equal(await raw(),[parts[1],parts[2],parts[0],parts[3]].join('\r\n\r\n'));
  await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await raw(),source);
  await load('---\nhello\n\nworld');await page.getByRole('button',{name:'Move block 1 down',exact:true}).click();assert.equal(await raw(),'---\nhello\n\nworld');
  assert.match(await page.locator('#poc-status').textContent(),/boundaries/);
  await load(source);await page.locator('.diagram-frame').waitFor();
  await page.getByRole('button',{name:'Drag block 1',exact:true}).evaluate(el=>el.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:new DataTransfer()})));
  await page.locator('.cm-content').focus();await page.keyboard.press('Meta+ArrowUp');await page.keyboard.press('Home');await page.keyboard.insertText('changed ');
  const editedDuringDrag=await raw();const target=page.locator('#blocks li').nth(1);await target.scrollIntoViewIfNeeded();
  await target.evaluate(el=>{const r=el.getBoundingClientRect();el.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2,dataTransfer:new DataTransfer()}));});
  assert.equal(await raw(),editedDuringDrag);assert.match(await page.locator('#poc-status').textContent(),/changed during drag/);
  await load(source);await page.locator('.diagram-frame').waitFor();
  for(const label of ['Download diagram 1 as PNG','Download table 1 as PNG']) {const png=await download(label);assert.equal(png.subarray(1,4).toString(),'PNG');assert.ok(png.readUInt32BE(16)>0);assert.ok(png.readUInt32BE(20)>0);}
  await page.getByRole('button',{name:'Expand diagram 1',exact:true}).click();await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.getByRole('button',{name:'Close diagram',exact:true}).click();assert.equal(await raw(),source);
  const title=await page.title();await page.evaluate(()=>{window.print=()=>{document.documentElement.dataset.printRequested='true';};});
  await page.getByRole('button',{name:'Print / PDF',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.printRequested==='true');
  await page.emulateMedia({media:'print'});assert.equal(await page.locator('.poc-source').isVisible(),false);assert.equal(await page.locator('#markdown-preview').isVisible(),true);
  if(name==='chromium')await page.pdf({path:`${output}/chromium-preview.pdf`,format:'A4'});
  await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));assert.equal(await page.title(),title);
  let dialogs=0;page.on('dialog',async dialog=>{dialogs++;await dialog.dismiss();});
  await load('<img src="x" onerror="alert(1)"><script>alert(2)</script>\n\n```mermaid\ninvalid source\n```');
  await page.locator('.mermaid-error').waitFor();assert.equal(await page.locator('#markdown-preview script, #markdown-preview [onerror]').count(),0);assert.equal(dialogs,0);
  await load(source);
  for(const width of [320,390,700,903,1440]) {await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow at ${width}`);}
  const settleTheme=()=>page.waitForFunction(()=>getComputedStyle(document.querySelector('#markdown-preview')).backgroundColor===getComputedStyle(document.querySelector('.poc-source')).backgroundColor);
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Dark theme',exact:true}).click();await settleTheme();await page.screenshot({path:`${output}/${name}-mobile-dark.png`,fullPage:true});
  await page.getByRole('button',{name:'Dark theme',exact:true}).click();await page.setViewportSize({width:1280,height:900});await settleTheme();await page.screenshot({path:`${output}/${name}-desktop.png`,fullPage:true});
  await page.locator('#fixture').selectOption('large');await page.waitForFunction(()=>document.querySelector('#fidelity').textContent.includes('Exact match'));assert.ok((await raw()).length>40_000);
  assert.equal(await page.evaluate(()=>localStorage.getItem('context-editor.snippets')),'protected sentinel');assert.equal(await page.evaluate(()=>localStorage.getItem('context-editor.activeSnippetId')),'protected-id');
  assert.deepEqual(errors,[]);
  console.log(`${name}: browser checks passed`);
  results.push({browser:name,result:'passed',checks:'source import/export, formatting, history, paste, block moves, PNG, safety, theme, widths, large fixture, storage isolation'});
 } catch(error) {await page.screenshot({path:`${output}/${name}-failure.png`,fullPage:true});throw error;} finally {await browser.close();}
}
console.log(JSON.stringify(results,null,2));
