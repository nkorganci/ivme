// Read-only browser acceptance on a separate loopback student session.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const site=globalThis.process.argv[2] || globalThis.process.env.IVME_UI_BASE_URL || 'http://127.0.0.1:9090';
const browser=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
assert.ok(browser,'Chrome or Edge is required');
const profile=mkdtempSync(join(tmpdir(),'learning-library-'));
const process=spawn(browser,['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--disable-gpu','about:blank'],{stdio:'ignore',windowsHide:true});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let socket;
try {
  let target;
  for(let n=0;n<100&&!target;n++) {
    try {
      const port=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);
      target=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t=>t.type==='page');
    } catch {}
    if(!target) await pause(100);
  }
  assert.ok(target?.webSocketDebuggerUrl);
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.onopen=r);
  let sequence=0;const pending=new Map(),errors=[],consoleErrors=[],responses=new Map();
  socket.onmessage=async({data})=>{const m=JSON.parse(data);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
    if(m.method==='Runtime.consoleAPICalled' && m.params.type==='error')consoleErrors.push(m.params.args.map(a=>a.value || a.description || '').join(' '));
    if(m.method==='Fetch.requestPaused') {
      const response=responses.get(new URL(m.params.request.url).pathname);
      if(response)await cdp('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:response.status,
        responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(response.body)).toString('base64')});
      else await cdp('Fetch.continueRequest',{requestId:m.params.requestId});
    }
  };
  const cdp=(method,params={})=>new Promise(r=>{const id=++sequence;pending.set(id,r);socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.error)throw Error(r.error.message);if(r.result.exceptionDetails)throw Error(r.result.exceptionDetails.text);return r.result.result.value;};
  const wait=async expression=>{for(let n=0;n<300;n++){
    try{if(await evaluate(`!!(${expression})`))return;}catch(error){if(!/navigated or closed|Execution context was destroyed|Cannot find context/.test(error.message))throw error;}
    await pause(100);
  }throw Error(`Timeout: ${expression}; ${await evaluate('location.href+"\\n"+document.body.innerText.slice(-1200)')}`);};
  const select=async(label,value)=>{
    await evaluate(`(()=>{const l=[...document.querySelectorAll('.learning-filters label')].find(l=>l.firstChild.textContent.trim()===${JSON.stringify(label)});const e=l?.querySelector('select');if(!e)throw Error('Missing select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await pause(150); // Allow the controlled React select to commit before the next synthetic event.
  };
  const search=async value=>evaluate(`(()=>{const e=document.querySelector('input[placeholder="Konu, alt konu veya soru kodu"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const checkbox=async label=>evaluate(`[...document.querySelectorAll('.learning-filters label')].find(l=>l.textContent.includes(${JSON.stringify(label)})).querySelector('input').click()`);
  await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');await cdp('Network.setCacheDisabled',{cacheDisabled:true});
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await cdp('Page.navigate',{url:site+'/giris'});
  await wait("document.cookie.includes('XSRF-TOKEN')");
  assert.equal(await evaluate(`fetch('/api/auth/dev-login',{method:'POST',headers:{'X-XSRF-TOKEN':decodeURIComponent(document.cookie.split('; ').find(c=>c.startsWith('XSRF-TOKEN=')).split('=')[1])}}).then(r=>r.status)`),200);
  const catalogRun=await evaluate("fetch('/api/learning-resources/metadata').then(r=>r.json()).then(v=>v.summary.runKey)");
  await cdp('Page.navigate',{url:site+'/kaynak-kutuphanesi?exam=TYT&subject=matematik&kind=QUESTION'});
  await wait("document.querySelector('.learning-resources [role=status]')?.textContent.includes('kaynak') && document.querySelector('.ag-row a')");
  assert.equal(await evaluate('location.pathname'),'/konular-ve-kaynaklar');
  assert.equal(await evaluate("document.querySelectorAll('.sidenav > a.active').length"),1);
  assert.ok(await evaluate("document.querySelector('.ag-row a').getAttribute('href').startsWith('/soru/')"));
  await select('Sınav','AYT');
  await wait("new URL(location.href).searchParams.get('exam')==='AYT'");
  await search('esitagirlik');
  await select('Kaynak türü','PDF');
  await wait("new URL(location.href).searchParams.get('kind')==='PDF'");
  await wait("new URL(location.href).searchParams.get('q')==='esitagirlik' && document.querySelector('.learning-resources [role=status]')?.textContent==='1 kaynak'");
  assert.ok(await evaluate("document.querySelector('.ag-row a').getAttribute('href').startsWith('/api/learning-resources/pdf/')"));
  assert.ok(await evaluate("document.querySelector('.ag-row').innerText.includes('Karma konular')"));
  // Restoring a URL search must restore the input instead of immediately overwriting browser Back.
  await search('ayt esitagirlik');
  await wait("new URL(location.href).searchParams.get('q')==='ayt esitagirlik'");
  await evaluate('history.back()');
  await wait("new URL(location.href).searchParams.get('q')==='esitagirlik' && document.querySelector('input[placeholder=\"Konu, alt konu veya soru kodu\"]').value==='esitagirlik'");
  await checkbox('Yalnız öğretmenin doğruladıkları');
  await wait("document.querySelector('.learning-resources [role=status]')?.textContent==='0 kaynak'");
  await checkbox('Yalnız öğretmenin doğruladıkları');
  await wait("document.querySelector('.learning-resources [role=status]')?.textContent==='1 kaynak'");
  const out=new URL('../veri/content-labels/ui/',import.meta.url);mkdirSync(out,{recursive:true});
  for(const width of [1440,390]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
    await pause(250);
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),`Page overflow at ${width}`);
    const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    writeFileSync(new URL(`library-${width}.png`,out),Buffer.from(shot.result.data,'base64'));
  }
  await evaluate("(()=>{const button=document.querySelector('button[aria-label=\"Menüyü aç\"]');button.focus();button.click();})()");
  await wait("document.querySelector('.sidebar.open')?.contains(document.activeElement)");
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
  await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
  await wait("!document.querySelector('.sidebar.open') && document.activeElement.getAttribute('aria-label')==='Menüyü aç'");
  // A failed dictionary request must remain visible even when the list succeeds.
  await cdp('Fetch.enable',{patterns:[{urlPattern:site+'/api/learning-resources*'}]});
  responses.set('/api/learning-resources/metadata',{status:503,body:{hata:'Konu sözlüğü geçici olarak kullanılamıyor.'}});
  await cdp('Page.navigate',{url:site+'/konular-ve-kaynaklar?kind=PDF&q=esitagirlik'});
  await wait("document.querySelector('[role=alert]')?.textContent.includes('Konu sözlüğü geçici')");
  assert.ok(await evaluate("document.querySelector('[role=alert] button')?.textContent.includes('Tekrar dene')"));
  responses.delete('/api/learning-resources/metadata');
  await evaluate("document.querySelector('[role=alert] button').click()");
  await wait("document.querySelector('.learning-resources [role=status]')?.textContent==='1 kaynak'");
  for(const status of [503,403]) {
    const message=status===403?'Bu kaynağa erişim izniniz yok.':'Kaynak listesi geçici olarak kullanılamıyor.';
    responses.set('/api/learning-resources',{status,body:{hata:message}});
    await cdp('Page.navigate',{url:site+'/konular-ve-kaynaklar?kind=PDF&q=esitagirlik'});
    await wait(`document.querySelector('[role=alert]')?.textContent.includes(${JSON.stringify(message)})`);
    assert.equal(await evaluate("document.querySelectorAll('.ag-row a').length"),0);
    responses.delete('/api/learning-resources');
    await evaluate("document.querySelector('[role=alert] button').click()");
    await wait("document.querySelector('.learning-resources [role=status]')?.textContent==='1 kaynak'");
  }
  await search('ivme-kaynak-bulunamadi-acceptance-20261016');
  await wait("document.querySelector('.state-title')?.textContent==='Bu filtrelerle kaynak bulunamadı'");
  await cdp('Fetch.disable');
  await cdp('Page.navigate',{url:site+'/konular-ve-kaynaklar?kind=PDF&manualReviewType=EMPTY_OR_UNREADABLE'});
  await wait("document.querySelector('.learning-resources [role=status]')?.textContent.includes('kaynak') && document.querySelector('.ag-row')?.textContent.includes('Boş/okunamayan')");
  assert.ok(await evaluate("[...document.querySelectorAll('.ag-row a')].some(a=>/#page=\\d+/.test(a.getAttribute('href')))"));
  await cdp('Page.navigate',{url:site+'/konu-anlatimlari?exam=TYT&subject=fizik&grade=9&kind=video_notes'});
  await wait("location.pathname==='/konular-ve-kaynaklar' && document.querySelector('.learning-resources [role=status]')?.textContent.includes('kaynak')");
  assert.equal(await evaluate("new URL(location.href).searchParams.get('pdfKind')"),'video_notes');
  assert.equal(await evaluate("new URL(location.href).searchParams.get('grade')"),'9');
  const category='tyt.fizik.hareket-ve-kuvvet';
  const query='categoryId='+encodeURIComponent(category);
  const counts=await evaluate(`Promise.all([fetch('/api/learning-resources?kind=QUESTION&bankOnly=true&${query}').then(r=>r.json()),fetch('/api/questions/availability?${query}').then(r=>r.json())]).then(([a,b])=>[a.totalElements,b.total])`);
  assert.equal(counts[0],counts[1]);assert.ok(counts[0]>0);
  await cdp('Page.navigate',{url:site+'/calisma/yeni?'+query});
  await wait("document.querySelector('.shared-category-select button')?.textContent.includes('Hareket') && [...document.querySelectorAll('p')].some(p=>p.textContent.includes('uygun soru var'))");
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Common selector overflow on mobile');
  assert.ok(await evaluate(`[...document.querySelectorAll('p')].some(p=>p.textContent.includes(${JSON.stringify(counts[0].toLocaleString('tr-TR'))}) && p.textContent.includes('uygun soru var'))`));
  assert.ok(await evaluate("[...document.querySelectorAll('label')].some(l=>l.textContent.startsWith('Öğretmen zorluk etiketi'))"));
  await cdp('Page.navigate',{url:site+'/soru-bankasi?'+query});
  await wait("document.querySelector('.qcard, .qtable-view .ag-row')");
  const firstQuestion=await evaluate("fetch('/api/questions?bank=OGM&size=1&"+query+"').then(r=>r.json()).then(v=>v.content[0])");
  assert.ok(await evaluate(`document.body.innerText.includes(${JSON.stringify(firstQuestion.resource.displayTitle)})`));
  assert.ok(!Object.hasOwn(firstQuestion,'correctAnswer'));
  await cdp('Page.navigate',{url:site+'/konular-ve-kaynaklar?kind=VIDEO&'+query});
  await wait("document.querySelector('.learning-resources [role=status]')?.textContent.includes('kaynak')");
  assert.ok(await evaluate("[...document.querySelectorAll('nav[aria-label=\"Konular ve kaynaklar\"] a')].every(a=>new URL(a.href).searchParams.has('categoryId'))"));
  await cdp('Page.navigate',{url:site+'/konular-ve-kaynaklar?kind=QUESTION&bankOnly=true&categoryMatch=ALL&'+query});
  await wait("document.querySelector('.learning-resources [role=status]')?.textContent.includes('kaynak')");
  assert.equal(await evaluate("[...document.querySelectorAll('.learning-filters label')].find(l=>l.firstChild.textContent==='Etiket eşleşmesi').querySelector('select').value"),'ALL');
  assert.ok(await evaluate("[...document.querySelectorAll('nav[aria-label=\"Konular ve kaynaklar\"] a')].every(a=>new URL(a.href).searchParams.get('match')==='ALL')"));
  await cdp('Page.navigate',{url:site+'/dersler-ve-konular?sinav=TYT&ders=fizik'});
  await wait("document.body.innerText.includes('fiziksel kaynak')");
  assert.ok(await evaluate("document.body.innerText.includes('Sayfa okuma/izleme ilerlemesi kaydı yoktur')"));
  assert.ok(await evaluate("[...document.querySelectorAll('.ag-row [col-id=sharedResources] a')].every(a=>new URL(a.href).searchParams.getAll('categoryId').length>0)"));
  const historic=await evaluate("fetch('/api/learning-resources/progress?classification=HISTORICAL').then(r=>r.json())");
  await evaluate("(()=>{const select=[...document.querySelectorAll('label')].find(l=>l.firstChild.textContent.includes('İlerleme sınıflaması')).querySelector('select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'HISTORICAL');select.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await wait(`document.body.innerText.includes(${JSON.stringify(historic.unclassified+' sınıflaması bilinmeyen kayıt')})`);
  await cdp('Page.navigate',{url:site+'/kaynakli-ders-notlari?exam=AYT&subject=fizik#bolum'});
  await wait("location.pathname==='/konular-ve-kaynaklar' && new URL(location.href).searchParams.get('kind')==='NOTE'");
  assert.equal(await evaluate("new URL(location.href).searchParams.get('subject')"),'fizik');
  assert.equal(await evaluate('location.hash'),'#bolum');
  // A mini example must open its own lesson and pattern, including a non-first tab.
  const noteData=await evaluate("fetch('/kaynakli-notlar.json').then(r=>r.json())");
  const group=noteData.groups.find(g=>g.lessons.some(l=>l.patterns.length>1));
  const lesson=group.lessons.find(l=>l.patterns.length>1),pattern=lesson.patterns[1];
  await cdp('Page.navigate',{url:`${site}/kaynakli-ders-notlari/${group.id}?konu=${lesson.id}&kalip=${pattern.id}#soru-kaliplari`});
  await wait("document.querySelector('.source-pattern-panel h4')");
  assert.equal(await evaluate("document.querySelector('.source-pattern-panel h4').textContent"),pattern.title);
  assert.equal(await evaluate("document.querySelector('.source-notes-lesson').id"),lesson.id);
  await wait("document.querySelector('#soru-kaliplari').getBoundingClientRect().top>=(document.querySelector('.topbar')?.getBoundingClientRect().bottom || 0) && document.querySelector('#soru-kaliplari').getBoundingClientRect().top<innerHeight");
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Note example overflow on mobile');
  await wait("[...document.querySelectorAll('nav[aria-label=\"Konular ve kaynaklar\"] a')].every(a=>new URL(a.href).searchParams.getAll('categoryId').length>0)");
  // The schedule is browser-local: seed only this disposable profile and use
  // synthetic auth projections to check account partitioning without DB writes.
  const profileUser=await evaluate("fetch('/api/auth/me').then(r=>r.json())");
  const storageKey=await evaluate(`(()=>{const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));return 'student-tracking:'+${profileUser.id}+':'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})()`);
  const schedule=Array.from({length:16},()=>({minutes:60,cells:Array(7).fill('')}));
  schedule[0].cells[0]='Kaynak bağı kalıcılık kontrolü';
  schedule[0].bindings=[{categoryId:[category],resourceKeys:['question:'+firstQuestion.code],state:'Tamamlandı',reviewDate:'2026-11-01'},...Array(6).fill(null)];
  await evaluate(`localStorage.setItem(${JSON.stringify(storageKey)},${JSON.stringify(JSON.stringify(schedule))})`);
  await cdp('Page.navigate',{url:site+'/ogrenci-takip'});
  await wait("document.querySelector('.tracking-grid textarea')?.value==='Kaynak bağı kalıcılık kontrolü'");
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Weekly page overflow on mobile');
  await evaluate("document.querySelector('.tracking-grid .ag-row [col-id=day0] button').click()");
  await wait("document.querySelector('[role=dialog]')?.innerText.includes('Tamamlandı') && document.querySelector('.shared-resource-select')");
  for(const width of [1440,390]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});await pause(150);
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),`Weekly binding dialog overflow at ${width}`);
    assert.ok(await evaluate("document.querySelector('.modal-body').scrollWidth<=document.querySelector('.modal-body').clientWidth+1"),`Weekly binding fields clipped at ${width}`);
    const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    writeFileSync(new URL(`weekly-binding-${width}.png`,out),Buffer.from(shot.result.data,'base64'));
  }
  assert.ok(await evaluate(`document.querySelector('[role=dialog]').innerText.includes(${JSON.stringify(firstQuestion.resource.displayTitle)}) || document.querySelector('[role=dialog]').innerText.includes(${JSON.stringify('question:'+firstQuestion.code)})`));
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
  await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
  await wait("!document.querySelector('[role=dialog]')");
  await cdp('Page.reload');
  await wait("document.querySelector('.tracking-grid textarea')?.value==='Kaynak bağı kalıcılık kontrolü'");
  await cdp('Fetch.enable',{patterns:[{urlPattern:site+'/api/auth/me'}]});
  responses.set('/api/auth/me',{status:200,body:{...profileUser,id:2000000001,username:'isolated-schedule-user'}});
  assert.equal(await evaluate("fetch('/api/auth/me').then(r=>r.json()).then(u=>u.id)"),2000000001);
  await cdp('Page.navigate',{url:'about:blank'});
  await cdp('Page.navigate',{url:site+'/ogrenci-takip'});
  await wait("document.querySelector('.tracking-grid textarea')?.value===''");
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)}))[0].bindings[0].state`),'Tamamlandı');
  responses.delete('/api/auth/me');await cdp('Fetch.disable');
  await cdp('Page.reload');
  await wait("document.querySelector('.tracking-grid textarea')?.value==='Kaynak bağı kalıcılık kontrolü'");
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Sonraki hafta').click()");
  await wait("document.querySelector('[role=dialog]')?.innerText.includes('Aynısını kopyala')");
  await evaluate("[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent==='Aynısını kopyala').click()");
  await wait("!document.querySelector('[role=dialog]') && document.querySelector('.tracking-grid .ag-row [col-id=day0] button')?.textContent.includes('Planlandı')");
  assert.equal(await evaluate("document.querySelector('.tracking-grid textarea').value"),'Kaynak bağı kalıcılık kontrolü');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)}))[0].bindings[0].state`),'Tamamlandı');
  assert.equal(await evaluate("fetch('/api/learning-resources/metadata').then(r=>r.json()).then(v=>v.summary.runKey)"),catalogRun);
  assert.deepEqual(errors,[]);
  assert.deepEqual(consoleErrors,[]);
  const sourceHashes=Object.fromEntries(['frontend/src/App.jsx','frontend/src/pages/LearningResources.jsx','frontend/src/components/ResourcesNavigation.jsx',
    'frontend/src/components/Layout.jsx','frontend/src/components/SharedCategorySelect.jsx','frontend/src/pages/StudyNew.jsx',
    'frontend/src/pages/SourceNotes.jsx','frontend/src/pages/Curriculum.jsx','frontend/src/pages/QuestionCollection.jsx',
    'frontend/src/components/ResourceContext.jsx','frontend/src/components/LessonVideos.jsx','frontend/src/components/SharedResourceSelect.jsx',
    'frontend/src/pages/StudentTracking.jsx','frontend/src/components/MathLearningPanel.jsx','frontend/src/styles.css','testler/learning-resources-ui.mjs']
    .map(path=>[path,createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex')]));
  writeFileSync(new URL('acceptance.json',out),JSON.stringify({status:'PASS',checkedAt:new Date().toISOString(),baseUrl:site,catalogRun,sourceHashes,
    viewports:[1440,390],checks:['legacy-redirects','search-back','metadata-failure-retry','list-failure-retry','access-denied','empty-list',
      'manual-page-links','bank-practice-counts','shared-category-context','match-alias','unique-coverage','drawer-focus-escape','note-pattern-anchor',
      'collection-public-presentation','historical-progress','scoped-curriculum-links','legacy-note-index','note-navigation-context','catalog-version-stable',
      'weekly-bindings-reload','weekly-account-isolation','weekly-copy-resets-completion','weekly-mobile-desktop-dialog'],
    syntheticResponses:[503,403],mutations:'dev-login and disposable browser-profile localStorage fixture only; no answers, content reviews or study events submitted',runtimeErrors:errors,consoleErrors},null,2)+'\n');
  console.log('PASS: current frontend, redirects, errors/retry/access/empty states, shared counts, category context, mobile focus and stable note links.');
} finally {
  socket?.close();process.kill();
}
