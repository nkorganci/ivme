// Local acceptance against main: exam track (YKS/KPSS) switcher, DB persistence and gated pages.
// Uses the local student auto-login; the account's original exam track is restored at the end.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const site='http://127.0.0.1:1010';
const output=resolve(process.argv[2]||'veri/content-labels/integration/exam-tracks-20261024');
fs.mkdirSync(output,{recursive:true});
const profile=fs.mkdtempSync(join(tmpdir(),'ivme-track-'));
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--disable-gpu','about:blank'],{stdio:'ignore',windowsHide:true});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const report={status:'RUNNING',site,checks:[],javascriptErrors:[],apiErrors:[]};
let socket, restore;
try {
  let ws;
  for(let n=0;n<150&&!ws;n++) {
    try { const port=Number(fs.readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);
      ws=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(p=>p.type==='page')?.webSocketDebuggerUrl; } catch {}
    if(!ws)await pause(100);
  }
  assert.ok(ws,'Chrome started');socket=new WebSocket(ws);await new Promise(resolve=>socket.onopen=resolve);
  let sequence=0;const pending=new Map();
  socket.onmessage=({data})=>{const m=JSON.parse(data);
    if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}
    if(m.method==='Runtime.exceptionThrown')report.javascriptErrors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
    if(m.method==='Network.responseReceived'&&m.params.response.status>=500&&m.params.response.url.includes('/api/'))report.apiErrors.push(m.params.response.url);
  };
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  const wait=async expression=>{for(let n=0;n<300;n++){try{if(await evaluate(`!!(${expression})`))return;}catch(e){if(!/context|navigat/i.test(e.message))throw e;}await pause(100);}throw Error('Timeout '+expression+' '+await evaluate('document.body.innerText.slice(0,1500)'));};
  const navigate=async path=>{await cdp('Page.navigate',{url:site+path});await wait('document.readyState==="complete"');};
  const tracks=()=>evaluate(`fetch('/api/exam-tracks').then(r=>r.json())`);
  const click=async selectorExpression=>evaluate(`(()=>{const e=${selectorExpression};if(!e)throw Error('Missing element');e.click();})()`);
  const option=name=>`[...document.querySelectorAll('.track-option')].find(e=>e.querySelector('strong')?.textContent===${JSON.stringify(name)})`;
  const screenshot=async name=>{const r=await cdp('Page.captureScreenshot',{format:'png'});fs.writeFileSync(join(output,name),Buffer.from(r.data,'base64'));};
  await cdp('Runtime.enable');await cdp('Network.enable');await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});

  await navigate('/');
  await wait(`document.querySelector('.track-switch:not(:disabled)')`);
  const initial=await tracks();
  restore=initial.currentId;
  assert.deepEqual(initial.tracks.map(t=>t.id),['YKS','KPSS_ORTAOGRETIM','KPSS_ONLISANS','KPSS_LISANS','KPSS_A_GRUBU','KPSS_OABT','KPSS_DHBT']);
  if(initial.currentId!=='YKS'){await click(`document.querySelector('.track-switch')`);await click(option('YKS (TYT · AYT)'));await wait(`!document.querySelector('.modal')`);}
  await wait(`document.querySelector('.track-switch strong')?.textContent==='YKS (TYT · AYT)'`);
  report.checks.push('Student sidebar shows the Sınavım switcher with the account track from /api/exam-tracks');

  await click(`document.querySelector('.track-switch')`);
  await wait(`document.querySelectorAll('.track-option').length===7`);
  const modal=await evaluate(`({disabled:[...document.querySelectorAll('.track-option:disabled strong')].map(e=>e.textContent),
    groups:[...document.querySelectorAll('.track-group h3')].map(e=>e.textContent),
    notes:[...document.querySelectorAll('.track-group-note')].map(e=>e.textContent),
    selected:document.querySelector('.track-option[aria-checked="true"] strong')?.textContent})`);
  assert.deepEqual(modal.groups,['YKS','KPSS']);
  assert.deepEqual(modal.disabled,['KPSS Ön Lisans','KPSS Lisans','KPSS A Grubu','KPSS Öğretmenlik / ÖABT','KPSS DHBT']);
  assert.ok(modal.notes.some(n=>n.includes('hazır değil')),'Planned KPSS note visible');
  assert.equal(modal.selected,'YKS (TYT · AYT)');
  await screenshot('switcher-modal.png');
  report.checks.push('Modal lists YKS and 6 KPSS tracks; 5 planned KPSS tracks are disabled with the "henüz hazır değil" note');

  await click(option('KPSS Ortaöğretim'));
  await wait(`!document.querySelector('.modal') && document.querySelector('.track-preparing')`);
  assert.equal((await tracks()).currentId,'KPSS_ORTAOGRETIM');
  await navigate('/dersler-ve-konular');
  await wait(`document.querySelector('.track-preparing')`);
  const lessons=await evaluate(`({h1:document.querySelector('h1')?.textContent,switcher:document.querySelector('.track-switch strong')?.textContent,
    chips:[...document.querySelectorAll('.track-section .chip')].map(e=>e.textContent),grid:!!document.querySelector('.ag-root')})`);
  assert.equal(lessons.h1,'Dersler');assert.equal(lessons.switcher,'KPSS Ortaöğretim');assert.equal(lessons.grid,false);
  assert.deepEqual(lessons.chips,['Türkçe · 30 soru','Matematik · 30 soru','Tarih · 27 soru','Coğrafya · 18 soru','Vatandaşlık · 9 soru','Güncel Bilgiler · 6 soru']);
  await screenshot('kpss-lessons.png');
  report.checks.push('After a reload the selection is read back from PostgreSQL; Dersler shows the KPSS Ortaöğretim preparing panel instead of YKS tables');

  for(const [path,title] of [['/calisma/yeni','Soru Çöz & Pratik'],['/gecmis','Çalışma İstatistiklerim'],['/soru-bankasi','Soru Bankası']]) {
    await navigate(path);await wait(`document.querySelector('.track-preparing')`);
    assert.equal(await evaluate(`document.querySelector('h1')?.textContent`),title);
  }
  await navigate('/ogrenci-takip');
  await wait(`document.querySelector('#tracking-subnav') && document.querySelector('.track-switch:not(:disabled)')`);
  const tracking=await evaluate(`({links:[...document.querySelectorAll('#tracking-subnav a')].map(e=>e.textContent),gated:!!document.querySelector('.track-preparing')})`);
  assert.deepEqual(tracking.links,['Haftalık Program','Matematik Özel Ders']);assert.equal(tracking.gated,false);
  report.checks.push('Study, statistics and question bank pages follow the selected exam; weekly program stays open and YKS-only TYT/AYT trial links are hidden');

  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await navigate('/dersler-ve-konular');
  await wait(`document.querySelector('.track-preparing')`);
  await click(`document.querySelector('.mobilebar .icon-btn')`);
  await wait(`document.querySelector('.sidebar.open .track-switch')`);
  await screenshot('mobile-drawer.png');
  await click(`document.querySelector('.sidebar.open .track-switch')`);
  await wait(`document.querySelectorAll('.track-option').length===7`);
  const fits=await evaluate(`(()=>{const r=document.querySelector('.modal').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})()`);
  assert.ok(fits,'Modal fits the mobile viewport');
  await screenshot('mobile-modal.png');
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`);
  await wait(`!document.querySelector('.modal')`);
  report.checks.push('Mobile drawer shows the switcher and the modal fits a 390 px viewport');

  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await navigate('/dersler-ve-konular');
  await wait(`document.querySelector('.track-actions .btn-primary')`);
  await click(`document.querySelector('.track-actions .btn-primary')`);
  await wait(`document.querySelector('.ag-row') && !document.querySelector('.track-preparing')`);
  assert.equal((await tracks()).currentId,'YKS');
  await screenshot('yks-lessons.png');
  report.checks.push('"YKS içeriğine dön" restores the YKS lesson tables in place');
  if(restore!=='YKS') {
    const name=initial.tracks.find(t=>t.id===restore).name;
    await click(`document.querySelector('.track-switch')`);await click(option(name));await wait(`!document.querySelector('.modal')`);
  }
  assert.equal((await tracks()).currentId,restore);report.restoredTo=restore;

  assert.deepEqual(report.javascriptErrors,[]);assert.deepEqual(report.apiErrors,[]);
  report.status='PASS';
} catch(error) {
  report.status='FAIL';report.error=error.stack||String(error);process.exitCode=1;
} finally {
  report.finishedAt=new Date().toISOString();
  fs.writeFileSync(join(output,'ui-report.json'),JSON.stringify(report,null,2));
  socket?.close();chrome.kill();
  console.log(report.status, join(output,'ui-report.json'));
  if(report.error)console.log(report.error);
}
