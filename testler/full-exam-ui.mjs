// Isolated creation checks, or read-only verification of the actual served app (--live).
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const live = process.argv.includes('--live');
const output = process.env.IVME_UI_OUTPUT_DIR || fileURLToPath(new URL('../veri/content-labels/integration/full-exam-20261016/',import.meta.url));
mkdirSync(output,{recursive:true});
const dist = fileURLToPath(new URL('../frontend/dist',import.meta.url));
const quotas = {
  TYT: {'Türkçe':40,'Tarih':5,'Coğrafya':5,'Felsefe':5,'Din Kültürü':5,'Matematik':40,'Fizik':7,'Kimya':7,'Biyoloji':6},
  SAYISAL: {'Matematik':40,'Fizik':14,'Kimya':13,'Biyoloji':13},
  ESIT_AGIRLIK: {'Matematik':40,'Türk Dili ve Edebiyatı':24,'Tarih-1':10,'Coğrafya-1':6},
  SOZEL: {'Türk Dili ve Edebiyatı':24,'Tarih-1':10,'Coğrafya-1':6,'Tarih-2':11,'Coğrafya-2':11,'Felsefe Grubu':12,'Din Kültürü':6},
};
let lastStart = null, shortage = false, summaryProgress = 0;
const server = live ? null : createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const json=value=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
  if(url.pathname==='/api/auth/me')return json({id:1,username:'student',role:'USER',contactComplete:true});
  if(url.pathname==='/api/questions/availability'){
    const counts={CIKMIS_AYT:180,CIKMIS_TYT:220,OGM_AYT:260,OGM_TYT:340};
    const total=counts[`${url.searchParams.get('bank')}_${url.searchParams.get('examType')}`]||1000;
    return json({total,solved:100+summaryProgress,correct:80+summaryProgress,remaining:total-100-summaryProgress,everWrong:20});
  }
  if(url.pathname==='/api/questions/fixture/practice' && req.method==='POST'){summaryProgress++;return json({});}
  if(url.pathname==='/api/exams/plan'){
    const examType=url.searchParams.get('examType'),track=url.searchParams.get('track');
    const plan={examType,track,bank:url.searchParams.get('bank'),selectionMode:url.searchParams.get('includeSolved')==='false'?'NEW':'MIXED',questionCount:examType==='TYT'?120:80,
      timeLimitMinutes:examType==='TYT'?165:180,ready:!shortage,
      subjects:Object.entries(quotas[examType==='TYT'?'TYT':track]).map(([subject,target])=>({subject,target,available:shortage?0:200}))};
    // A delayed old result must not enable submission for a different track/source.
    return setTimeout(()=>json(plan),url.searchParams.get('bank')==='CIKMIS'?180:20);
  }
  if(url.pathname==='/api/exams/archive'){
    const examType=url.searchParams.get('examType'),track=url.searchParams.get('track');
    return setTimeout(()=>json([2025,2024].map(year=>({year,examType,track,questionCount:examType==='TYT'?120:80,
      timeLimitMinutes:examType==='TYT'?165:180,ready:year===2025,
      subjects:Object.entries(quotas[examType==='TYT'?'TYT':track]).map(([subject,target])=>({subject,target,available:year===2025?target:0}))}))),100);
  }
  if(url.pathname==='/api/exams/full'&&req.method==='POST'){
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{lastStart=JSON.parse(body);json({id:77});});return;
  }
  if(url.pathname==='/api/exams/77')return json({id:77,title:'Deneme',questions:[],questionCount:80,remainingSeconds:null});
  if(url.pathname.startsWith('/api/'))return json(null);
  const file=resolve(dist,'.'+decodeURIComponent(url.pathname));
  const target=file.startsWith(dist+sep)&&extname(file)?file:join(dist,'index.html');
  try{const content=readFileSync(target);res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'application/javascript','.css':'text/css'}[extname(target)]||'application/octet-stream'});res.end(content);}
  catch{res.writeHead(404);res.end();}
});
if(server)await new Promise(done=>server.listen(0,'127.0.0.1',done));
const site=live?(process.env.IVME_UI_BASE_URL||'http://127.0.0.1:5173'):`http://127.0.0.1:${server.address().port}`;
const profile=mkdtempSync(join(tmpdir(),'full-exam-ui-'));
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--disable-gpu','about:blank'],{stdio:'ignore'});
let socket;
const pause=ms=>new Promise(done=>setTimeout(done,ms));
const checks=[];
try{
  let ws;
  for(let i=0;i<100&&!ws;i++){
    try{const port=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);
      ws=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(page=>page.type==='page')?.webSocketDebuggerUrl;
    }catch{await pause(100);}
  }
  assert.ok(ws,'Chrome did not start');socket=new WebSocket(ws);await new Promise(done=>socket.onopen=done);
  let sequence=0;const pending=new Map();
  socket.onmessage=({data})=>{const message=JSON.parse(data);if(pending.has(message.id)){pending.get(message.id)(message);pending.delete(message.id);}};
  const cdp=(method,params={})=>new Promise(done=>{const id=++sequence;pending.set(id,done);socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const response=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(response.error){if(/Cannot find context|Execution context was destroyed/.test(response.error.message))return undefined;throw Error(response.error.message);}
    if(response.result.exceptionDetails)throw Error(JSON.stringify(response.result.exceptionDetails));return response.result.result.value;};
  const waitFor=async expression=>{for(let i=0;i<180;i++){if(await evaluate(`Boolean(${expression})`))return;await pause(100);}
    throw Error(`UI timeout: ${expression}; ${await evaluate('document.body.innerText')}`);};
  const click=async text=>evaluate(`[...document.querySelectorAll('button')].find(item=>item.innerText.trim()===${JSON.stringify(text)})?.click()`);
  const assertSources=async examType=>{
    await waitFor(`document.querySelector('#full-exam-title').parentElement.innerText.includes(${JSON.stringify(`Sorular yalnızca ${examType} havuzundan`)})`);
    assert.deepEqual(await evaluate('[...document.querySelectorAll(".full-exam-sources label")].map(label=>label.innerText.trim())'),
      [`${examType} Çıkmış Sorular`,`${examType} Soru Bankası`]);
    assert.ok(await evaluate(`document.querySelector('#full-exam-title').parentElement.innerText.includes(${JSON.stringify(`Sorular yalnızca ${examType} havuzundan`)})`));
  };
  await cdp('Page.enable');await cdp('Runtime.enable');
  if(live){await cdp('Page.navigate',{url:site+'/calisma/yeni'});await waitFor('document.querySelector("main")');
    await evaluate('fetch("/api/auth/dev-login",{method:"POST",headers:{"X-XSRF-TOKEN":decodeURIComponent(document.cookie.split("; ").find(x=>x.startsWith("XSRF-TOKEN="))?.split("=")[1]||"")}}).then(r=>r.ok)');}
  for(const width of [1280,390]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===390});
    await cdp('Page.navigate',{url:site+'/calisma/yeni?mode=sinav&examType=AYT&bank=OGM&scope=topic&subject=Fizik&topic=Eski&categoryId=old&teacherDifficulty=ZOR&topicPdfId=999&track=ESIT_AGIRLIK'});
    await waitFor('document.querySelector("#full-exam-title") && !document.querySelector(".spinner")');
    const controls=await evaluate(`({selects:document.querySelectorAll('main form select').length,numbers:document.querySelectorAll('main form input[type=number]').length,
      sources:document.querySelectorAll('.full-exam-sources input[type=checkbox]').length,track:document.querySelector('[aria-label="Puan türü"] input:checked')?.nextElementSibling.innerText,
      overflow:document.documentElement.scrollWidth>innerWidth,text:document.querySelector('#full-exam-title').parentElement.innerText})`);
    assert.equal(controls.selects,0);assert.equal(controls.numbers,0);assert.equal(controls.sources,2);assert.equal(controls.track,'Eşit ağırlık');assert.equal(controls.overflow,false);
    assert.ok(controls.text.includes('80 soru'));assert.ok(!controls.text.includes('Soru geçmişi'));assert.ok(!controls.text.includes('Konu adı ara'));
    await assertSources('AYT');
    await waitFor('document.querySelector(".study-pool-summary .ag-row")');
    assert.equal(await evaluate('document.querySelectorAll(".study-pool-summary .ag-row").length'),1);
    if(!live)assert.equal(await evaluate('document.querySelector(".study-pool-summary .ag-row [col-id=total]").innerText'),'1.000');
    await evaluate('document.querySelector(".full-exam-history input").click()');
    await waitFor('new URLSearchParams(location.search).get("includeSolved")==="false" && !document.querySelector(".spinner")');
    assert.equal(await evaluate('document.querySelector(".full-exam-history input").checked'),false);
    if(!live && width===1280){
      await evaluate('fetch("/api/questions/fixture/practice",{method:"POST"}).then(()=>window.dispatchEvent(new Event("focus")))');
      await waitFor(`document.querySelector('.study-pool-summary .ag-row [col-id="solved"]')?.innerText===${JSON.stringify(String(100+summaryProgress))}`);
    }
    await evaluate('document.querySelector(".study-pool-summary [col-id=ayt] button").click()');
    await waitFor('new URLSearchParams(location.search).get("bank")==="CIKMIS" && !document.querySelector(".spinner")');
    assert.equal(await evaluate('new URLSearchParams(location.search).get("examType")'),'AYT');
    await click('TYT\n120 soru · 165 dakika');
    await waitFor('!document.querySelector(".spinner") && document.querySelector("#full-exam-title").parentElement.innerText.includes("120 soru · 165 dakika.")');
    assert.equal(await evaluate(`document.querySelectorAll('[aria-label="Puan türü"]').length`),0);
    await assertSources('TYT');
    await click('AYT\nAlanına göre 80 soru · 180 dakika');
    await waitFor(`document.querySelector('[aria-label="Puan türü"]') && !document.querySelector('.spinner')`);
    await assertSources('AYT');
    assert.equal(await evaluate('document.querySelector(".full-exam-history input").checked'),false);
    await evaluate('document.querySelector(".full-exam-sources input:checked").click()');
    await waitFor('document.body.innerText.includes("En az bir soru kaynağı seç")');
    assert.equal(await evaluate('document.querySelector("form button[type=submit]").disabled'),true);
    for(let index=0;index<2;index++){
      await evaluate(`{const input=document.querySelectorAll('.full-exam-sources input')[${index}];if(!input.checked)input.click();}`);
      await waitFor(`document.querySelectorAll('.full-exam-sources input')[${index}]?.checked`);
    }
    await waitFor('!document.querySelector(".spinner") && [...document.querySelectorAll(".full-exam-sources input")].every(x=>x.checked)');
    await cdp('Page.reload');await waitFor('document.querySelector("#full-exam-title") && !document.querySelector(".spinner")');
    assert.equal(await evaluate('[...document.querySelectorAll(".full-exam-sources input")].filter(x=>x.checked).length'),2);
    await assertSources('AYT');
    const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    writeFileSync(join(output,`${live?'live':'isolated'}-${width}.png`),Buffer.from(shot.result.data,'base64'));
    checks.push({width,controls,status:'PASS'});
    await evaluate(`document.querySelectorAll('[aria-label="Deneme seçimi"] input')[1].click()`);
    await waitFor('/^\\d{4}$/.test(document.querySelector("form select")?.value || "") && !document.querySelector(".spinner")');
    assert.equal(await evaluate('document.querySelectorAll("form .state-error").length'),0);
    assert.equal(await evaluate('new URLSearchParams(location.search).get("examSource")'),'year');
    assert.equal(await evaluate('document.querySelectorAll(".full-exam-history input,.full-exam-sources input").length'),0);
    assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
    if(!live){
      assert.equal(await evaluate('document.querySelector("form select").value'),'2025');
      assert.equal(await evaluate('document.querySelector("form button[type=submit]").disabled'),false);
      await evaluate(`{const select=document.querySelector('form select');
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'2024');
        select.dispatchEvent(new Event('change',{bubbles:true}));}`);
      await waitFor('document.body.innerText.includes("Bu yılın tam sınavı henüz hazır değil")');
      assert.equal(await evaluate('document.querySelector("form button[type=submit]").disabled'),true);
      await cdp('Page.reload');await waitFor('document.querySelector("form select")?.value==="2024" && !document.querySelector(".spinner")');
      assert.equal(await evaluate('document.querySelector("form button[type=submit]").disabled'),true);
      await evaluate(`{const select=document.querySelector('form select');
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'2025');
        select.dispatchEvent(new Event('change',{bubbles:true}));}`);
      await waitFor('document.querySelector("form button[type=submit]")?.disabled===false');
    } else {
      assert.ok(await evaluate('document.querySelector("form select").options.length>=1'));
    }
    const archiveShot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    writeFileSync(join(output,`${live?'live':'isolated'}-archive-${width}.png`),Buffer.from(archiveShot.result.data,'base64'));
    if(!live){
      await evaluate('document.querySelector("form button[type=submit]").click()');
      await waitFor('location.pathname==="/sinav/77"');
      assert.deepEqual(lastStart,{bank:'CIKMIS',examType:'AYT',track:'ESIT_AGIRLIK',includeSolved:true,year:2025});
    }
    checks.push({width,archiveSelection:'PASS',yearPersistence:live?'read-only':'PASS',missingArchive:live?'read-only':'PASS'});
  }
  if(!live){
    for(const bank of ['OGM','CIKMIS',''])for(const examType of ['TYT','AYT'])for(const track of ['SAYISAL','ESIT_AGIRLIK','SOZEL'])for(const includeSolved of [true,false]){
      if(examType==='TYT'&&track!=='SAYISAL')continue;
      await cdp('Page.navigate',{url:site+'/calisma/yeni?'+new URLSearchParams({mode:'sinav',bank,examType,track,includeSolved,topicPdfId:999,teacherDifficulty:'ZOR'})});
      await waitFor('document.querySelector("form button[type=submit]")?.disabled===false');
      await evaluate('document.querySelector("form button[type=submit]").click()');
      await waitFor('location.pathname==="/sinav/77"');
      assert.deepEqual(lastStart,{...(bank?{bank}:{}),examType,track:examType==='TYT'?'SAYISAL':track,includeSolved});
    }
    shortage=true;
    await cdp('Page.navigate',{url:site+'/calisma/yeni?mode=sinav&examType=AYT&bank=OGM'});
    await waitFor('document.body.innerText.includes("yeterli soru yok")');
    assert.equal(await evaluate('document.querySelector("form button[type=submit]").disabled'),true);
    checks.push({creationCombinations:24,shortage:'PASS',oldTopicFilters:'IGNORED'});
  }
  const report={status:'PASS',checkedAtUtc:new Date().toISOString(),site,live,checks,mutations:live?'Development login only; no exams or answers created':'Isolated mock API'};
  writeFileSync(join(output,live?'ui-report.json':'isolated-ui-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}finally{
  if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({id:1000000,method:'Browser.close'}));
  await pause(500);socket?.close();chrome.kill();server?.close();
  assert.ok(resolve(profile).startsWith(resolve(tmpdir())+sep+'full-exam-ui-'));
  try{rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:250});}
  catch(error){console.warn(`Temporary browser profile cleanup: ${error.message}`);}
}
