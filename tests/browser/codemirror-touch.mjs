import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const base=process.env.POC_BASE_URL||'http://127.0.0.1:5174/ConTextEditor/';
const output=process.env.POC_ARTIFACTS||'/private/tmp/context-poc-browser';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(`${base}poc.html`);await page.locator('.cm-content').waitFor();
 const parts=['first','- list\r\n  - nested','~~~mermaid\r\nflowchart LR\r\nA-->B\r\n~~~'];const raw=parts.join('\r\n\r\n');
 await page.locator('#import').setInputFiles({name:'touch.md',mimeType:'text/markdown',buffer:Buffer.from(raw)});
 await page.waitForFunction(()=>document.querySelector('#poc-status').textContent.startsWith('Loaded'));
 const cdp=await context.newCDPSession(page);
 async function drag(cancel=false) {
  const first=page.getByRole('button',{name:'Drag block 1',exact:true});const third=page.getByRole('button',{name:'Drag block 3',exact:true});
  await third.scrollIntoViewIfNeeded();const a=await first.boundingBox(),b=await third.boundingBox();assert.ok(a&&b);
  const start={x:a.x+a.width/2,y:a.y+a.height/2};const end={x:b.x+b.width/2,y:b.y+b.height/2};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
  for(let step=1;step<=10;step++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*step/10,y:start.y+(end.y-start.y)*step/10,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
 }
 await drag(true);assert.equal(await page.locator('#full-text-mirror').textContent(),raw);
 await drag();assert.equal(await page.locator('#full-text-mirror').textContent(),[parts[1],parts[2],parts[0]].join('\r\n\r\n'));
 await page.getByRole('button',{name:'Undo',exact:true}).tap();assert.equal(await page.locator('#full-text-mirror').textContent(),raw);
 await page.getByRole('button',{name:'Move block 1 down',exact:true}).tap();assert.equal(await page.locator('#full-text-mirror').textContent(),[parts[1],parts[0],parts[2]].join('\r\n\r\n'));
 for(const size of [{width:320,height:740},{width:390,height:844},{width:844,height:390}]) {await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.screenshot({path:`${output}/chromium-touch-landscape.png`,fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: emulated touch drag, cancellation, undo, tap reorder, and phone/landscape widths. Physical phone IME and clipboard remain manual.');
} finally {await browser.close();}
