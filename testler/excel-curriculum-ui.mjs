// Read-only acceptance against main. Does not create study sessions or answers.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const site='http://127.0.0.1:1010';
const output=resolve('veri/content-labels/integration/excel-curriculum-20261023');
fs.mkdirSync(output,{recursive:true});
const profile=fs.mkdtempSync(join(tmpdir(),'ivme-excel-'));
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--disable-gpu','about:blank'],{stdio:'ignore',windowsHide:true});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const report={status:'RUNNING',site,checks:[],javascriptErrors:[],apiErrors:[]};
let socket;
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
  const wait=async expression=>{for(let n=0;n<400;n++){try{if(await evaluate(`!!(${expression})`))return;}catch(e){if(!/context|navigat/i.test(e.message))throw e;}await pause(100);}throw Error('Timeout '+expression+' '+await evaluate('document.body.innerText.slice(-1800)'));};
  const navigate=async path=>{await cdp('Page.navigate',{url:site+path});await wait('document.readyState==="complete"');};
  const api=async path=>{const result=await evaluate(`fetch(${JSON.stringify(path)}).then(async r=>({status:r.status,body:await r.json()}))`);assert.equal(result.status,200,path);return result.body;};
  const select=async(label,value)=>evaluate(`(()=>{const e=[...document.querySelectorAll('select')].find(s=>s.getAttribute('aria-label')===${JSON.stringify(label)}||s.labels?.[0]?.textContent.trim().startsWith(${JSON.stringify(label)}));if(!e)throw Error('Missing select '+${JSON.stringify(label)});Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const screenshot=async name=>{const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(join(output,name),Buffer.from(r.data,'base64'));};
  await cdp('Runtime.enable');await cdp('Network.enable');await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await navigate('/dersler-ve-konular?tab=dagilim&sinav=all&ders=all');
  await wait('document.querySelector(".curriculum-reference-summary") && document.querySelector(".ag-row")');
  const metadata=await api('/api/learning-resources/metadata');
  const categories=metadata.categories.filter(c=>c.selectable!==false);
  assert.equal(categories.length,530);assert.ok(categories.every(c=>c.curriculumSource==='EXCEL_FIRST_SHEET'));
  assert.equal(metadata.summary.curriculumReference.sourceRows,453);
  assert.ok((await evaluate('document.querySelector(".curriculum-reference-summary").innerText')).includes('453'));
  assert.equal(await evaluate('document.querySelector("select[aria-label=Ders]").options.length'),13);
  report.runKey=metadata.summary.runKey;report.checks.push('453 source rows, 12 subjects, 146 units; only the first worksheet is selectable');
  await screenshot('distribution-desktop.png');
  await evaluate('document.querySelector(".curriculum-years-toggle input").click()');
  await wait('document.querySelectorAll(".ag-header-cell").length > 12');
  await evaluate('document.querySelector(".curriculum-years-toggle input").click()');
  await select('Ders','fizik');await select('Sınav','TYT');
  await wait('document.querySelector(".curriculum-reference-summary").innerText.includes("18")');
  const physics=categories.filter(c=>c.subjectId==='fizik'&&c.exam==='TYT');
  await select('Ünite',physics[0].unitId);
  await wait(`document.querySelector(".curriculum-reference-summary").innerText.includes(${JSON.stringify(physics.filter(c=>c.unitId===physics[0].unitId).length+' satır')})`);
  await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="Notları aç").click()');
  await wait('document.querySelector(".curriculum-reference-detail")');
  assert.ok((await evaluate('document.querySelector(".curriculum-reference-detail").innerText')).includes('Excel satırı'));
  await evaluate('document.querySelector(".modal [aria-label=Kapat]").click()');
  await wait('!document.querySelector(".modal")');
  report.checks.push('Lesson/unit filtering, yearly columns and source notes work');
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await screenshot('distribution-mobile.png');
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth+2'));
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await navigate('/calisma/yeni?source=OGM_TYT&branchId=fizik');
  await wait('[...document.querySelectorAll("select")].some(s=>s.labels?.[0]?.textContent.trim().startsWith("Ünite")&&s.options.length>1)');
  const unit=await evaluate('[...document.querySelectorAll("select")].find(s=>s.labels?.[0]?.textContent.trim().startsWith("Ünite")).options[1].value');
  await select('Ünite',unit);
  await wait('new URLSearchParams(location.search).getAll("categoryId").length>0');
  const selected=await evaluate('new URLSearchParams(location.search).getAll("categoryId")');
  assert.ok(selected.every(id=>categories.find(c=>c.id===id)?.unitId===unit));
  report.checks.push('Practice unit selection submits the shared Excel topic IDs');
  const id=selected[0],category=categories.find(c=>c.id===id);
  const result=await api('/api/questions?bank=OGM&examType=TYT&categoryId='+encodeURIComponent(id)+'&size=5');
  assert.ok(result.totalElements>0);assert.ok(result.content.every(q=>q.resource.unit.includes(category.unit)));
  await navigate('/soru-bankasi?examType=TYT&branchId=fizik&categoryId='+encodeURIComponent(id));
  await wait('document.querySelector(".branch-topic-select") && document.querySelector(".ag-header-cell[col-id=unit]")');
  report.checks.push('Question bank uses the same picker and returns the same unit/topic classification');
  await navigate('/gecmis?tab=progress');
  await wait(`document.querySelector('select[aria-label="Ders seç"]') && document.querySelector('.ag-row')`);
  await select('Ders seç','fizik');
  await wait('document.querySelector(".ag-header-cell[col-id=unit]")');
  await select('İlerleme ünitesi',unit);
  await wait(`document.querySelector('.ag-row')?.innerText.includes(${JSON.stringify(category.unit)})`);
  await screenshot('progress-desktop.png');
  report.checks.push('Progress displays and filters the same published units and topics');
  const html=await(await fetch(site)).text();report.asset=html.match(/assets\/index-[^" ]+\.js/)?.[0];
  report.appVersion=(await(await fetch(site+'/app-version.txt')).text()).trim();
  assert.equal(report.javascriptErrors.length,0);assert.equal(report.apiErrors.length,0);
  report.status='PASS';
} catch(error) { report.status='FAIL';report.error=error.stack;process.exitCode=1; }
finally {
  fs.writeFileSync(join(output,'ui-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));socket?.close();chrome.kill();
}
