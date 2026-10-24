// Read-only acceptance against main. Does not create study sessions or answers.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const site='http://127.0.0.1:1010';
const output=resolve('veri/content-labels/integration/curriculum-compact-20261023');
fs.mkdirSync(output,{recursive:true});
const profile=fs.mkdtempSync(join(tmpdir(),'ivme-excel-'));
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--disable-gpu','about:blank'],{stdio:'ignore',windowsHide:true});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const report={status:'RUNNING',site,checks:[],javascriptErrors:[],apiErrors:[]};
let socket, diagnose;
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
  diagnose=async()=>{await screenshot('failure.png');report.diagnostic=await evaluate(`({url:location.href,headers:Array.from(document.querySelectorAll('.ag-header-cell')).map(e=>[e.getAttribute('col-id'),e.getAttribute('aria-sort')]),rows:Array.from(document.querySelectorAll('.ag-row[row-index]')).sort((a,b)=>Number(a.getAttribute('row-index'))-Number(b.getAttribute('row-index'))).map(e=>[e.getAttribute('row-index'),e.querySelector('[col-id="rowNumber"]')?.innerText,e.querySelector('[col-id="recent"]')?.innerText]).slice(0,25)})`);};
  await cdp('Runtime.enable');await cdp('Network.enable');await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1680,height:1100,deviceScaleFactor:1,mobile:false});
  await navigate('/dersler-ve-konular?tab=dagilim&sinav=all&ders=all');
  await wait(`document.querySelector('select[aria-label="Ders seç"]') && document.querySelector('.ag-row')`);
  const metadata=await api('/api/learning-resources/metadata');
  const categories=metadata.categories.filter(c=>c.selectable!==false);
  assert.equal(categories.length,530);assert.ok(categories.every(c=>c.curriculumSource==='EXCEL_FIRST_SHEET'));
  assert.equal(metadata.summary.curriculumReference.sourceRows,453);
  assert.equal(await evaluate(`document.querySelector('select[aria-label="Ders seç"]').options.length`),15);
  assert.equal(new Set(categories.map(c=>c.subjectId)).size,14);
  assert.ok(categories.every(c=>!/[+/]/.test(c.subject)));
  for(const subjectId of ['matematik','geometri','turkce','edebiyat']) assert.ok(categories.some(c=>c.subjectId===subjectId));
  const removedControls=await evaluate(`Array.from(document.querySelectorAll('.curriculum-reference-filters, .curriculum-reference-summary, .curriculum-source-pill, .app-data-grid-search, .ag-floating-filter, .ag-paging-panel, [col-id="notes"]')).filter(e=>e.getBoundingClientRect().height>0 && getComputedStyle(e).visibility!=='hidden').map(e=>e.className)`);
  assert.deepEqual(removedControls,[],'Removed controls must not be visible');
  await wait(`Array.from(document.querySelectorAll('.ag-header-cell-text')).every(e=>e.scrollWidth<=e.clientWidth+1 && e.scrollHeight<=e.clientHeight+1)`);
  report.runKey=metadata.summary.runKey;report.checks.push('Header lesson dropdown has all 14 shared lessons with exclusive Math/Geometry and Turkish/Literature subjects; removed controls, white filter boxes and explanation column are absent');
  await screenshot('distribution-initial.png');
  assert.equal(await evaluate(`document.querySelector('.ag-row .ag-cell[col-id="rowNumber"]').innerText`),'1');
  for(const [id,label] of [['matematik','Matematik'],['geometri','Geometri'],['turkce','Türkçe'],['edebiyat','Edebiyat']]) {
    await select('Ders seç',id);
    await wait(`new URLSearchParams(location.search).get('ders') === ${JSON.stringify(id)} && Array.from(document.querySelectorAll('.ag-row[row-index] .ag-cell[col-id="subject"]')).every(e=>e.innerText===${JSON.stringify(label)})`);
  }
  report.checks.push('Each split lesson filters to its own source rows; no topic is duplicated between Math/Geometry or Turkish/Literature');
  report.subjectFilterCounts={};
  for(const [label,exam] of [['Matematik','TYT'],['Geometri','TYT'],['Türkçe','TYT'],['Edebiyat','AYT']]) {
    const result=await api('/api/questions?bank=OGM&examType='+exam+'&subject='+encodeURIComponent(label)+'&size=5');
    assert.ok(result.totalElements>0,label+' question filter');
    assert.ok(result.content.every(q=>q.resource.subject.split(' · ').includes(label)),label+' current question classification');
    report.subjectFilterCounts[label]=result.totalElements;
  }
  assert.notEqual(report.subjectFilterCounts.Matematik,report.subjectFilterCounts.Geometri);
  report.checks.push('Question bank subject filters keep all four split lessons separate and use their published topic classifications');
  await select('Ders seç','fizik');
  await wait(`new URLSearchParams(location.search).get('ders') === 'fizik' && document.querySelector('.ag-row .ag-cell[col-id="subject"]')?.innerText === 'Fizik'`);
  assert.equal(await evaluate(`document.querySelector('.ag-header-cell[col-id="total"], .ag-header-cell[col-id="tyt"], .ag-header-cell[col-id="ayt"]')`),null);
  const rowMetrics=await evaluate(`Array.from(document.querySelectorAll('.ag-row[row-index]')).map(row=>({height:row.getBoundingClientRect().height,cells:Array.from(row.querySelectorAll('.ag-cell[col-id="unit"], .ag-cell[col-id="topic"]')).map(cell=>{const value=cell.querySelector('.ag-cell-value')||cell, style=getComputedStyle(value);return {fontSize:parseFloat(style.fontSize),lineHeight:parseFloat(style.lineHeight),height:value.getBoundingClientRect().height,clientHeight:value.clientHeight,scrollHeight:value.scrollHeight,clientWidth:value.clientWidth,scrollWidth:value.scrollWidth};})}))`);
  assert.ok(rowMetrics.length>1);
  assert.ok(rowMetrics.every(row=>row.cells.every(cell=>cell.lineHeight/cell.fontSize<=1.2 && cell.scrollHeight<=cell.clientHeight+1 && cell.scrollWidth<=cell.clientWidth+1)),'Single line spacing and unclipped wrapped text');
  assert.ok(rowMetrics.some(row=>row.height<=34),'Short rows are compact');
  assert.ok(rowMetrics.some(row=>row.cells.some(cell=>cell.height>cell.lineHeight*1.5)),'Long unit/topic values wrap');
  assert.ok(new Set(rowMetrics.map(row=>row.height)).size>1,'Row heights follow their content');
  report.rowLayout={minimum:Math.min(...rowMetrics.map(row=>row.height)),maximum:Math.max(...rowMetrics.map(row=>row.height)),lineHeightRatio:rowMetrics[0].cells[0].lineHeight/rowMetrics[0].cells[0].fontSize};
  report.checks.push('TYT/AYT flag columns are absent; short rows shrink, long unit/topic values wrap with single line spacing and grow without clipping');
  for(const field of ['unit','topic','gradeLabel','tytTotal','aytTotal','recent']) {
    await evaluate(`document.querySelector('.ag-header-cell[col-id="${field}"] .ag-header-cell-label').click()`);
    await wait(`document.querySelector('.ag-header-cell[col-id="${field}"]').getAttribute('aria-sort') === 'ascending'`);
    await evaluate(`document.querySelector('.ag-header-cell[col-id="${field}"] .ag-header-cell-label').click()`);
    await wait(`document.querySelector('.ag-header-cell[col-id="${field}"]').getAttribute('aria-sort') === 'descending'`);
  }
  await wait(`(()=>{const totals=Array.from(document.querySelectorAll('.ag-row[row-index]')).sort((a,b)=>Number(a.getAttribute('row-index'))-Number(b.getAttribute('row-index'))).map(r=>r.querySelector('.ag-cell[col-id="recent"]')?.innerText).filter(value=>value && value!=='—').map(value=>Number(value.replaceAll('.','')));return totals.length>1 && totals.every((value,index)=>index===0 || totals[index-1]>=value);})()`);
  assert.equal(await evaluate(`document.querySelector('.ag-row[row-index="0"] .ag-cell[col-id="rowNumber"]').innerText`),'1');
  await screenshot('distribution-desktop.png');
  const viewport=await evaluate(`(()=>{const e=document.querySelector('.ag-grid-viewport');return {height:e.clientHeight,content:e.scrollHeight};})()`);
  assert.ok(viewport.height>0 && viewport.content>viewport.height);
  await evaluate(`(()=>{const e=document.querySelector('.ag-grid-viewport');e.scrollTop=e.scrollHeight;})()`);
  await wait(`Number(document.querySelector('.ag-row .ag-cell[col-id="rowNumber"]').innerText)>1`);
  report.checks.push('Row numbers refresh after sorting; unit, topic, grade and count columns sort in both directions; long topic lists scroll inside the grid');
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await screenshot('distribution-mobile.png');
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth+2'));
  await cdp('Emulation.setDeviceMetricsOverride',{width:1680,height:1100,deviceScaleFactor:1,mobile:false});
  await navigate('/dersler-ve-konular?tab=konular&sinav=AYT&ders=fizik');
  await wait(`document.querySelector('select[aria-label="Sınav seç"]')?.value === 'AYT' && document.querySelector('.ag-row .ag-cell[col-id="subject"]')?.innerText === 'Fizik'`);
  await select('Sınav seç','TYT');
  await wait(`document.querySelector('select[aria-label="Sınav seç"]')?.value === 'TYT' && document.querySelector('.ag-row .ag-cell[col-id="exam"]')?.innerText === 'TYT'`);
  await wait(`!Array.from(document.querySelectorAll('[role="status"]')).some(e=>e.innerText.includes('Soru bankası sayıları yükleniyor'))`);
  assert.equal(await evaluate(`document.querySelector('.ag-row[row-index="0"] .ag-cell[col-id="rowNumber"]').innerText`),'1');
  await screenshot('tracking-desktop.png');
  report.checks.push('Topic tracking keeps shared lesson/exam selection in the grid header and resets row numbers after selection');
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
} catch(error) { report.status='FAIL';report.error=error.stack;await diagnose?.().catch(()=>{});process.exitCode=1; }
finally {
  fs.writeFileSync(join(output,'ui-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));socket?.close();chrome.kill();
}
