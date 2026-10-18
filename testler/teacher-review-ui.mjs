// Browser acceptance against the isolated ivme_test server on 8082. Never writes to the normal app.
// Start the packaged backend with --spring.datasource.url=jdbc:postgresql://localhost:5432/ivme_test
// and fixture OPERATOR username `operator`, password `Sifre1234` (RoleBoundaryTest prepares these).
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const liveRead = process.argv.includes('--live-read');
const site = liveRead ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:8082';
const profile = mkdtempSync(join(tmpdir(), 'teacher-review-ui-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank',
], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let socket;
try {
  let ws;
  for (let i=0;i<80 && !ws;i++) {
    try { const port = Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);
      ws = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(p=>p.type==='page')?.webSocketDebuggerUrl;
    } catch {} await sleep(100);
  }
  if (!ws) throw new Error('Chrome did not start');
  socket = new WebSocket(ws); await new Promise(r=>socket.onopen=r);
  let sequence=0; const pending=new Map(), errors=[];
  socket.onmessage=({data})=>{ const m=JSON.parse(data); if (pending.has(m.id)) { pending.get(m.id)(m);pending.delete(m.id); }
    if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const cdp=(method,params={})=>new Promise(resolve=>{const id=++sequence;pending.set(id,resolve);socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.error && /context|navigat/i.test(r.error.message)) return undefined;
    if(r.error) throw new Error(r.error.message);
    if(r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
    return r.result.result.value;};
  const waitFor=async expression=>{for(let i=0;i<120;i++){if(await evaluate(`!!(${expression})`))return;await sleep(100);}throw new Error(`UI timeout: ${expression}; ${await evaluate('document.body.innerText.slice(-1800)')}`);};
  const click=async text=>evaluate(`[...document.querySelectorAll('button')].find(b=>b.innerText.trim()===${JSON.stringify(text)})?.click()`);
  const select=async (selector,value)=>evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw Error('Select not found');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const press=async label=>evaluate(`document.querySelector('button[aria-label='+CSS.escape(${JSON.stringify(label)})+']')?.click()`);
  const aligned=async()=>evaluate(`(()=>{const editor=document.querySelector('.teacher-inline-detail');const detail=editor.closest('.ag-row');const key=detail.getAttribute('row-id').replace('detail:','row:');const parent=[...document.querySelectorAll('.ag-row')].find(r=>r.getAttribute('row-id')===key);return !!parent && Math.abs(detail.getBoundingClientRect().top-parent.getBoundingClientRect().bottom)<4;})()`);
  await cdp('Page.enable');await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await cdp('Page.navigate',{url:site+'/giris'});
  await waitFor("document.cookie.includes('XSRF-TOKEN')");
  const login=await evaluate(`fetch(${JSON.stringify(liveRead ? '/api/auth/dev-teacher-review-login' : '/api/auth/login')},{method:'POST',headers:{'Content-Type':'application/json','X-XSRF-TOKEN':decodeURIComponent(document.cookie.split('; ').find(c=>c.startsWith('XSRF-TOKEN=')).split('=')[1])},body:JSON.stringify(${JSON.stringify(liveRead ? {} : {login:'operator',password:'Sifre1234'})})}).then(async r=>({status:r.status,body:await r.json()}))`);
  assert.equal(login.status,200,'Use isolated RoleBoundaryTest fixtures');assert.equal(login.body.username,liveRead ? 'ivmeoperator' : 'operator');assert.equal(login.body.role,'OPERATOR');
  await cdp('Page.navigate',{url:site+'/ogretmen-dogrulamasi/fizik'});
  await waitFor("document.querySelector('.review-expand:not(:disabled)') && document.querySelector('#review-subnav a')");
  assert.equal(await evaluate("document.querySelectorAll('#review-subnav a').length"),15);
  if (liveRead) {
    assert.equal(await evaluate("[...document.querySelectorAll('.tabs button')].find(b=>b.classList.contains('active'))?.innerText"), 'PDF kaynakları');
    await evaluate("document.querySelector('.review-expand').click()");
    await waitFor("document.querySelectorAll('.review-selected-category').length>0");
    assert.equal(await evaluate("document.querySelector('button[aria-label=\"Karar: Uygun\"]').getAttribute('aria-pressed')"), 'false');
    const pdfShot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(join(tmpdir(), 'teacher-review-pdf-labels-1440.png'), Buffer.from(pdfShot.result.data, 'base64'));
    await click('Kapat ↑');
  }
  await click('Konu ve alt konular');
  await waitFor("document.querySelector('.review-expand:not(:disabled)') && document.querySelector('.review-row-title strong')?.innerText==='Fizik bilimine giriş'");
  if (liveRead) {
    await evaluate("document.querySelector('.review-expand').click()");
    await waitFor("document.querySelectorAll('.review-panels > .review-panel').length===3");
    assert.equal(await evaluate("document.querySelector('.review-source-line strong')?.innerText"),'Fizik bilimine giriş');
    await waitFor("document.querySelector('.teacher-inline-detail').closest('.ag-row').getBoundingClientRect().height>200");
    await click('⚡ Otomatik seç');
    await waitFor("document.querySelector('.review-selected-category')");
    const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    writeFileSync(join(tmpdir(),'teacher-review-inline-1440.png'),Buffer.from(shot.result.data,'base64'));
    assert.ok(await aligned(),'Editor immediately follows its source row');
    assert.ok(await evaluate("document.querySelector('.teacher-inline-detail').getBoundingClientRect().height<610"),'Compact desktop panel');
    await click('Sorular');
    await waitFor("document.querySelector('.review-expand:not(:disabled)')");
    await evaluate("document.querySelector('.review-expand').click()");
    await waitFor("document.querySelector('.review-question-preview img')?.naturalWidth>0");
    assert.ok(await aligned(),'Question preview is in the correct row');
    const questionShot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    writeFileSync(join(tmpdir(),'teacher-review-inline-question-1440.png'),Buffer.from(questionShot.result.data,'base64'));
    assert.deepEqual(errors,[]);
    console.log('PASS: live Vite, 14 branches, arrow expansion directly below source, three compact panels; no review saved.');
    process.exitCode=0;
  } else {
  await evaluate("document.querySelector('.review-expand').click()");
  await waitFor("document.querySelector('.review-auto')");
  assert.equal(await evaluate("document.querySelectorAll('.review-selected-category').length"),0);
  await click('⚡ Otomatik seç');
  await waitFor("document.querySelectorAll('.review-selected-category').length===1");
  assert.equal(await evaluate("document.querySelector('button[aria-label=\"Karar: Uygun\"]').getAttribute('aria-pressed')"),'false','Auto-selection does not approve content');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.review-category.selected')).backgroundColor"),'rgb(209, 250, 229)');
  await evaluate("document.querySelector('.review-select-group').click()");
  await waitFor("document.querySelectorAll('.review-selected-category').length===3");
  await click('Grubu temizle');
  await waitFor("document.querySelectorAll('.review-selected-category').length===0");
  await click('⚡ Otomatik seç');
  await waitFor("document.querySelectorAll('.review-selected-category').length===1");
  await select('select[aria-label="Etiketin branşı"]','matematik');
  await waitFor("document.querySelectorAll('.review-category').length > 0");
  await evaluate("document.querySelector('.review-category').click()");
  await waitFor("document.querySelectorAll('.review-selected-category').length===2");
  await press('Zorluk: Zor');
  await press('Karar: Uygun');
  await click('Kaydet');
  await waitFor("document.querySelector('.teacher-savebar')?.innerText.includes('✓ Kaydedildi')");
  assert.equal(await evaluate("document.querySelectorAll('.review-selected-category').length"),2);
  const exported=await evaluate("fetch('/api/operator/content-review/export').then(r=>r.json())");
  assert.ok(exported.reviews.some(r=>r.decision.assignments.length===2 && r.decision.difficulty==='ZOR' && r.currentStatus==='APPROVE'));
  assert.ok(exported.reviews[0].decision.categorySnapshot.length>0);
  await cdp('Page.reload');
  await waitFor("document.querySelector('.review-expand:not(:disabled)')");
  await evaluate("document.querySelector('.review-expand').click()");
  await waitFor("document.querySelectorAll('.review-selected-category').length===2");
  assert.equal(await evaluate("document.querySelector('button[aria-label=\"Zorluk: Zor\"]').getAttribute('aria-pressed')"),'true');
  assert.ok(await aligned());
  await evaluate("document.querySelector('.ag-header-cell[col-id=\"title\"] .ag-header-cell-label').click()");
  await sleep(300);assert.ok(await aligned(),'Sorting keeps source and editor together');
  const nextTitle=await evaluate(`(()=>{const parent=document.querySelector('.review-expand.open').closest('.ag-row');const next=Number(parent.getAttribute('row-index'))+2;return [...document.querySelectorAll('.ag-row')].find(r=>Number(r.getAttribute('row-index'))===next && r.querySelector('.review-row-title strong'))?.querySelector('.review-row-title strong').innerText;})()`);
  assert.ok(nextTitle);
  await evaluate("document.querySelector('.review-verification textarea').focus()");
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,modifiers:2});
  await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,modifiers:2});
  await waitFor(`document.querySelector('.review-source-line strong')?.innerText === ${JSON.stringify(nextTitle)}`);
  await sleep(150);assert.ok(await aligned(),'Save-and-next stays in the next row');
  await evaluate("document.querySelector('#review-subnav a[href$=\"/turkce\"]').click()");
  await waitFor("document.querySelector('h1')?.innerText.startsWith('Türkçe') && document.querySelector('.review-expand')");
  await click('Ders notları');
  await waitFor("document.querySelector('.review-expand')");
  await evaluate("document.querySelector('.review-expand').click()");
  await waitFor("document.querySelector('.review-source-details summary')?.innerText === 'Anlatımı ve örnekleri göster'");
  // Draft survives switching away and back without a server save.
  await press('Zorluk: Kolay');
  await waitFor("document.querySelector('.teacher-savebar')?.innerText.includes('Kaydedilmemiş seçimler')");
  await click('Geç →');
  await waitFor("document.querySelector('.review-source-line strong')?.innerText !== 'Sözcükte Anlam'");
  await evaluate("document.querySelector('.review-expand').click()");
  await waitFor("document.querySelector('button[aria-label=\"Zorluk: Kolay\"]')?.getAttribute('aria-pressed')==='true'");
  for(const width of [1440,390]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===390});
    await sleep(300);
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),`No page overflow at ${width}px`);
    const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    writeFileSync(join(tmpdir(),`teacher-review-${width}.png`),Buffer.from(shot.result.data,'base64'));
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: inline arrow expansion, green automatic labels, no automatic approval, multiple topics, save/reload/next/export, sorting, drafts, desktop/mobile.');
  }
} finally {socket?.close();chrome.kill();}
