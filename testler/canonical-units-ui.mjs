// Read-only acceptance against the served app; no real study/review records are written.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const site=process.argv[2]||'http://127.0.0.1:5173';
const output=resolve('veri/content-labels/integration/units-20261017');mkdirSync(output,{recursive:true});
const profile=mkdtempSync(join(tmpdir(),'ivme-units-'));
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--disable-gpu','about:blank'],{stdio:'ignore',windowsHide:true});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let socket;
const report={status:'RUNNING',site,screens:[],javascriptErrors:[],api:[]};
try {
  let ws;
  for(let n=0;n<100&&!ws;n++) {
    try{const port=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);ws=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(p=>p.type==='page')?.webSocketDebuggerUrl;}catch{}
    if(!ws)await pause(100);
  }
  assert.ok(ws,'Headless Chrome started');socket=new WebSocket(ws);await new Promise(r=>socket.onopen=r);
  let seq=0;const pending=new Map();
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  socket.onmessage=({data})=>{const m=JSON.parse(data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}
    if(m.method==='Runtime.exceptionThrown')report.javascriptErrors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);};
  const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  const wait=async expression=>{for(let n=0;n<300;n++){try{if(await evaluate(`!!(${expression})`))return;}catch(e){if(!/context|navigat/i.test(e.message))throw e;}await pause(100);}throw Error('Timeout '+expression+' '+await evaluate('document.body.innerText.slice(-1500)'));};
  const api=async path=>{const result=await evaluate(`fetch(${JSON.stringify(path)}).then(async r=>({status:r.status,body:await r.json()}))`);assert.equal(result.status,200,path);report.api.push({path,status:result.status});return result.body;};
  const navigate=async path=>{await cdp('Page.navigate',{url:site+path});await wait('document.readyState==="complete"');};
  const select=async(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');await cdp('Network.setCacheDisabled',{cacheDisabled:true});
  await navigate('/giris');await wait("document.cookie.includes('XSRF-TOKEN')");
  assert.equal(await evaluate(`fetch('/api/auth/dev-login',{method:'POST',headers:{'X-XSRF-TOKEN':decodeURIComponent(document.cookie.split('; ').find(c=>c.startsWith('XSRF-TOKEN=')).split('=').slice(1).join('='))}}).then(r=>r.status)`),200);
  const metadata=await api('/api/learning-resources/metadata');
  const units=metadata.categories.filter(c=>c.selectable!==false);
  assert.equal(units.length,237);assert.ok(units.every(c=>c.canonicalUnit&&!c.subtopic));
  report.runKey=metadata.summary.runKey;report.units=237;
  const facets=await api('/api/questions/filters');
  assert.ok(facets.filter(f=>f.topic).every(f=>units.some(c=>c.exam===f.examType&&c.subject===f.subject&&c.topic===f.topic)));
  for(const branch of new Set(units.map(c=>c.subjectId))) {
    const result=await api('/api/learning-resources?kind=QUESTION&subject='+branch+'&labelStatus=ESTIMATED');
    assert.ok(result.content.every(i=>i.labels.assignments.length&&i.labels.grades.length),branch);
  }
  const estimated=await api('/api/learning-resources?kind=QUESTION&subject=biyoloji&grade=9&labelStatus=ESTIMATED');
  assert.ok(estimated.totalElements>0);assert.ok(estimated.content.every(i=>i.labels.grades.includes(9)));
  const broad=await api('/api/learning-resources?kind=PDF&labelStatus=UNRESOLVED');
  assert.ok(broad.totalElements>0);assert.ok(broad.content.every(i=>i.labels.assignments.length&&i.labels.grades.length));
  const inheritance=units.find(c=>c.subjectId==='biyoloji'&&c.exam==='TYT'&&c.topic==='Kalıtım');
  const byId=await api('/api/questions/availability?categoryId='+encodeURIComponent(inheritance.id));
  const byName=await api('/api/questions/availability?examType=TYT&subject=Biyoloji&topic='+encodeURIComponent('Kalıtım'));
  assert.equal(byId.total,byName.total);assert.ok(byId.total>0);report.inheritanceQuestions=byId.total;
  const pdf=await api('/api/learning-resources?kind=PDF&subject=biyoloji');
  assert.ok(pdf.content.length);assert.ok(pdf.content.every(i=>i.labels.assignments.every(a=>metadata.categories.some(c=>c.id===a.categoryId&&(c.canonicalUnit||c.id.startsWith('system.'))))));
  for(const width of [1440,390]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===390});
    await navigate('/gecmis?tab=progress');await wait("document.querySelector('[aria-label=\"Ders seç\"]')");
    const branches=[...new Set(units.map(c=>c.subjectId))];
    for(const branch of branches) {
      await select('[aria-label="Ders seç"]',branch);
      const count=units.filter(c=>c.subjectId===branch).length;
      await wait(`document.querySelector('[aria-rowcount]')?.getAttribute('aria-rowcount')===${JSON.stringify(String(count+1))}`);
      assert.equal(await evaluate("document.querySelectorAll('.ag-header-cell[col-id=topicLabel]').length"),1);
      report.screens.push({width,branch,units:count});
    }
    await select('[aria-label="Ders seç"]','biyoloji');
    await wait("document.querySelector('[aria-rowcount]')?.getAttribute('aria-rowcount')==='26'");
    const gradeFits=await evaluate(`(()=>{const cells=[...document.querySelectorAll('.ag-cell[col-id=gradeLabel]')];return cells.every(cell=>{const r=document.createRange();r.selectNodeContents(cell);const text=r.getBoundingClientRect(),box=cell.getBoundingClientRect();return text.top>=box.top-1&&text.bottom<=box.bottom+1;});})()`);
    assert.equal(gradeFits,true,'Estimated grade text must fit the row');
    assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth+2'),false);
    const shot=await cdp('Page.captureScreenshot',{format:'png'});writeFileSync(join(output,`progress-${width}.png`),Buffer.from(shot.data,'base64'));
    await navigate('/dersler-ve-konular?sinav=TYT&ders=biyoloji');
    await wait("document.querySelector('.curriculum-subject[aria-current=true]')?.innerText.includes('Biyoloji') && document.querySelector('.ag-row')");
    assert.equal(await evaluate("document.querySelector('[aria-rowcount]')?.getAttribute('aria-rowcount')"),'9');
    await navigate('/konular-ve-kaynaklar?kind=PDF&subject=biyoloji&labelStatus=ESTIMATED&grade=9');
    await wait("document.querySelector('.learning-resources .ag-row')");
    assert.equal(await evaluate("document.querySelector('select')!==null"),true);
    assert.ok(await evaluate("document.body.innerText.includes('Tahmini etiket')"));
  }
  assert.deepEqual(report.javascriptErrors,[]);
  report.status='PASS';writeFileSync(join(output,'live-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,units:report.units,branchScreens:report.screens.length,apiChecks:report.api.length,runKey:report.runKey}));
} catch(error) {
  report.status='FAIL';report.error=error.stack;writeFileSync(join(output,'live-report.json'),JSON.stringify(report,null,2)+'\n');throw error;
} finally {socket?.close();chrome.kill();}
