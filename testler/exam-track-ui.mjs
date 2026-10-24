// Local acceptance against main: exam track (YKS/KPSS) switcher, DB persistence and KPSS-only content.
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
  const wait=async expression=>{for(let n=0;n<400;n++){try{if(await evaluate(`!!(${expression})`))return;}catch(e){if(!/context|navigat/i.test(e.message))throw e;}await pause(100);}throw Error('Timeout '+expression+' '+await evaluate('document.body.innerText.slice(0,1500)'));};
  const navigate=async path=>{await cdp('Page.navigate',{url:site+path});await wait('document.readyState==="complete"');};
  const api=path=>evaluate(`fetch(${JSON.stringify(path)}).then(r=>r.json())`);
  const tracks=()=>api('/api/exam-tracks');
  const click=async selectorExpression=>evaluate(`(()=>{const e=${selectorExpression};if(!e)throw Error('Missing element');e.click();})()`);
  const option=name=>`[...document.querySelectorAll('.track-option')].find(e=>e.querySelector('strong')?.textContent===${JSON.stringify(name)})`;
  const texts=selector=>evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].map(e=>e.textContent.trim())`);
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
    notes:[...document.querySelectorAll('.track-group-note')].map(e=>e.textContent)})`);
  assert.deepEqual(modal.groups,['YKS','KPSS']);
  assert.deepEqual(modal.disabled,['KPSS Ön Lisans','KPSS Lisans','KPSS A Grubu','KPSS Öğretmenlik / ÖABT','KPSS DHBT']);
  assert.ok(modal.notes.some(n=>n.includes('hazır değil')),'Planned KPSS note visible');
  await screenshot('switcher-modal.png');
  report.checks.push('Modal lists YKS and 6 KPSS tracks; KPSS Ortaöğretim is selectable, 5 planned KPSS tracks are disabled with the "hazır değil" note');

  // A stale YKS filter in the address must not survive the switch.
  await navigate('/dersler-ve-konular?sinav=AYT');
  await wait(`document.querySelector('.ag-row')`);
  await click(`document.querySelector('.track-switch')`);
  await click(option('KPSS Ortaöğretim'));
  await wait(`!document.querySelector('.modal') && document.querySelector('.ag-row') && document.querySelector('[aria-label="Sınav seç"]')?.value==='KPSS_OO_GY'`);
  assert.equal((await tracks()).currentId,'KPSS_ORTAOGRETIM');
  assert.equal(await evaluate('location.search'),'');
  const lessons=await evaluate(`({exams:[...document.querySelector('[aria-label="Sınav seç"]').options].map(o=>o.textContent),
    subjects:[...document.querySelector('[aria-label="Ders seç"]').options].map(o=>o.textContent),
    headers:[...document.querySelectorAll('.ag-header-cell-text')].map(e=>e.textContent),
    text:document.querySelector('.curriculum-reference-grid').innerText, source:document.querySelector('.curriculum-sources').textContent})`);
  assert.deepEqual(lessons.exams,['Genel Yetenek','Genel Kültür']);
  assert.deepEqual(lessons.subjects,['Matematik','Türkçe']);
  assert.ok(!lessons.headers.includes('Sınıf') && !lessons.headers.includes('Soru bankası'),'KPSS topic table has no grade or question bank column');
  await screenshot('kpss-lessons.png');
  // Grid rows follow the reference order (first unit of KPSS Matematik) and show test names, not IDs.
  assert.ok(lessons.text.includes('Temel Kavramlar ve Sayılar') && lessons.text.includes('Genel Yetenek') && !lessons.text.includes('KPSS_OO'),'Reference order and test names');
  const kpssMeta=await api('/api/learning-resources/metadata');
  assert.equal(kpssMeta.categories.length,85);
  assert.ok(kpssMeta.categories.every(c=>['KPSS_OO_GY','KPSS_OO_GK'].includes(c.exam)),'Only KPSS Ortaöğretim topics');
  assert.deepEqual(kpssMeta.branches.map(b=>b.name).sort((a,b)=>a.localeCompare(b,'tr')),['Coğrafya','Güncel Bilgiler','Matematik','Tarih','Türkçe','Vatandaşlık']);
  assert.ok(lessons.source.includes('kpss-ortaogretim-konular.json'),'KPSS reference source shown');
  await evaluate(`(()=>{const s=document.querySelector('[aria-label="Sınav seç"]');s.value='KPSS_OO_GK';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await wait(`[...(document.querySelector('[aria-label="Ders seç"]')?.options||[])].map(o=>o.textContent).join()==='Coğrafya,Güncel Bilgiler,Tarih,Vatandaşlık'`);
  report.checks.push('Selecting KPSS Ortaöğretim (saved in PostgreSQL) resets YKS filters; Dersler lists only KPSS tests, subjects and topics with their reference source');

  // Wide viewport: AG Grid renders only visible columns.
  await cdp('Emulation.setDeviceMetricsOverride',{width:3000,height:900,deviceScaleFactor:1,mobile:false});
  await navigate('/dersler-ve-konular?tab=dagilim');
  await wait(`document.querySelector('.ag-row') && [...document.querySelectorAll('.ag-header-cell-text')].some(e=>e.textContent.startsWith('Son 3 sınav'))`);
  const distribution=await evaluate(`({headers:[...document.querySelectorAll('.ag-header-cell-text')].map(e=>e.textContent)})`);
  for(const header of ['Test','2006','2016','2024','Toplam 2006–2024','Son 10 yıl 2016–2024','Son 3 sınav 2020–2024'])
    assert.ok(distribution.headers.includes(header),`Distribution column ${header}`);
  await screenshot('kpss-distribution.png');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  report.checks.push('Konu ve soru dağılımı shows every KPSS exam year (2006–2024), the last 10 years and the last 3 exams');

  const kpssQuestions=await api('/api/questions?bank=CIKMIS&size=200');
  assert.equal(kpssQuestions.totalElements,1223);
  assert.ok(kpssQuestions.content.every(q=>q.code.startsWith('KPSS-OO-')),'Only KPSS questions');
  await navigate('/cikmis-sorular');
  await wait(`document.querySelector('.qcard') && document.querySelector('.question-collection-choice small')?.textContent!=='0'`);
  const past=await evaluate(`({exams:[...document.querySelectorAll('.question-collection-choice span')].map(e=>e.textContent),
    counts:[...document.querySelectorAll('.question-collection-choice small')].map(e=>e.textContent), title:document.querySelector('.page-head h2')?.textContent,
    codes:[...document.querySelectorAll('.qcard-code')].map(e=>e.textContent), lead:document.querySelector('.page-head p')?.textContent})`);
  assert.deepEqual(past.exams,['Tümü','Genel Yetenek','Genel Kültür']);
  assert.deepEqual(past.counts,['1.223','616','607']);
  assert.equal(past.title,'KPSS Ortaöğretim Çıkmış Sorular');
  assert.ok(past.codes.length && past.codes.every(c=>c.startsWith('KPSS-OO-')),'Past question list is KPSS only');
  assert.ok(past.lead.includes('KPSS Ortaöğretim'));
  await screenshot('kpss-past-questions.png');
  await navigate('/soru/KPSS-OO-2024-GY-01');
  await wait(`document.querySelector('.image-card img')?.complete && document.querySelector('.image-card img').naturalWidth>0`);
  assert.ok((await evaluate('document.body.innerText')).includes('Genel Yetenek'),'Question shows the test name');
  await screenshot('kpss-question.png');
  report.checks.push('Çıkmış Sorular lists 1223 active KPSS Ortaöğretim questions with GY/GK choices; the cropped ÖSYM question image loads');

  await navigate('/calisma/yeni');
  await wait(`document.querySelector('.question-source-options')`);
  const practice=await evaluate(`({sources:[...document.querySelectorAll('.question-source-options > label')].map(e=>e.textContent.trim()),
    text:document.body.innerText})`);
  assert.deepEqual(practice.sources,['Genel Yetenek Çıkmış Sorular','Genel Kültür Çıkmış Sorular']);
  await wait(`document.body.innerText.includes('1.223 uygun soru')`);
  await navigate('/calisma/yeni?mode=sinav');
  await wait(`document.querySelector('.study-choices[aria-label="Sınav türü"]') && document.body.innerText.includes('65 dakika.')`);
  const exam=await evaluate(`({choices:[...document.querySelectorAll('.study-choices[aria-label="Sınav türü"] strong')].map(e=>e.textContent),
    banks:[...document.querySelectorAll('.full-exam-sources label')].map(e=>e.textContent.trim()),text:document.body.innerText})`);
  assert.deepEqual(exam.choices,['Genel Yetenek','Genel Kültür']);
  assert.deepEqual(exam.banks,['Genel Yetenek Çıkmış Sorular']);
  assert.ok(exam.text.includes('60 soru · 65 dakika.'));
  const archive=await api('/api/exams/archive?examType=KPSS_OO_GY');
  assert.deepEqual(archive.map(p=>p.year),[2024,2022,2020,2018,2016,2014,2012,2010]);
  assert.ok(archive.every(p=>p.ready && p.questionCount===60),'Every GY archive year can start');
  const gk=await api('/api/exams/archive?examType=KPSS_OO_GK');
  assert.deepEqual(gk.map(p=>p.year),[2024,2022,2020,2018,2016,2014]);
  await screenshot('kpss-exam.png');
  report.checks.push('Pratik and deneme offer only GY/GK past-question sources; a 60-question 65-minute KPSS deneme and year archives (GY 2010–2024, GK 2014–2024) are ready');

  for(const [path,title] of [['/soru-bankasi','Soru Bankası'],['/konular-ve-kaynaklar','Konular ve kaynaklar']]) {
    await navigate(path);await wait(`document.querySelector('.track-preparing')`);
    assert.equal(await evaluate(`document.querySelector('h1')?.textContent`),title);
    assert.ok((await evaluate('document.body.innerText')).includes('henüz hazır değil'));
  }
  await navigate('/gecmis');
  await wait(`document.querySelector('.study-statistics') && !document.querySelector('.track-preparing')`);
  await navigate('/ogrenci-takip');
  await wait(`document.querySelector('#tracking-subnav') && document.querySelector('.track-switch:not(:disabled)')`);
  const tracking=await evaluate(`({links:[...document.querySelectorAll('#tracking-subnav a')].map(e=>e.textContent),gated:!!document.querySelector('.track-preparing')})`);
  assert.deepEqual(tracking.links,['Haftalık Program','Matematik Özel Ders']);assert.equal(tracking.gated,false);
  report.checks.push('Soru bankası and kaynak pages say "henüz hazır değil" in place; statistics open; YKS-only TYT/AYT trial links are hidden');

  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await navigate('/dersler-ve-konular');
  await wait(`document.querySelector('.ag-row')`);
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
  await wait(`document.querySelector('.ag-row')`);
  await click(`document.querySelector('.track-switch')`);await click(option('YKS (TYT · AYT)'));
  await wait(`!document.querySelector('.modal') && [...(document.querySelector('[aria-label="Sınav seç"]')?.options||[])].map(o=>o.textContent).join()==='TYT,AYT'`);
  assert.equal((await tracks()).currentId,'YKS');
  const yks=await api('/api/questions?bank=CIKMIS&size=200');
  assert.ok(yks.content.length && yks.content.every(q=>!q.code.startsWith('KPSS-')),'YKS shows no KPSS question');
  const yksMeta=await api('/api/learning-resources/metadata');
  assert.ok(yksMeta.categories.every(c=>!String(c.exam).startsWith('KPSS_')),'YKS lessons contain no KPSS topic');
  await screenshot('yks-lessons.png');
  report.checks.push('Switching back to YKS restores TYT/AYT lessons and past questions without any KPSS record');
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
