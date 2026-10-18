// Isolated session creation; --live checks the served app without creating sessions or answers.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUESTION_SOURCES, QUESTION_HISTORY_SOURCES, questionSourceScope } from '../frontend/src/questionSources.js';

const live = process.argv.includes('--live');
const branchesOnly = process.argv.includes('--branches');
const reminderOnly = process.argv.includes('--reminder');
const historyOnly = process.argv.includes('--history');
const measurePlans = process.argv.includes('--measure-plans');
const output = process.argv.find(arg => arg.startsWith('--output='))?.slice(9)
  || process.env.IVME_UI_OUTPUT_DIR || fileURLToPath(new URL('../veri/content-labels/integration/practice-sources-20261017/', import.meta.url));
const dist = resolve(process.env.IVME_UI_DIST || fileURLToPath(new URL('../frontend/dist/', import.meta.url)));
mkdirSync(output, { recursive: true });
const totals = { CIKMIS_AYT: 180, CIKMIS_TYT: 220, OGM_AYT: 260, OGM_TYT: 340 };
const categories = Array.from({ length: 100 }, (_, index) => ({ id: `category-${index}`, exam: index % 2 ? 'TYT' : 'AYT',
  subject: index < 80 ? 'Fizik' : 'Kimya', subjectId: index < 80 ? 'fizik' : 'kimya',
  topic: index < 80 ? `Hareket ${index}` : `Atom ${index}`, origin: 'SOURCE' }));
let lastStart;
let unfinishedCount = 3;
const server = live ? null : createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const json = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  if (url.pathname === '/api/auth/me') return json({ id: 1, username: 'student', role: 'USER', contactComplete: true });
  if (url.pathname === '/api/study-sessions/active') { res.writeHead(204); return res.end(); }
  if (url.pathname === '/api/study-sessions/unfinished-summary') return json({ count: unfinishedCount, latestSessionId: unfinishedCount ? 76 : null });
  if (url.pathname === '/api/learning-resources/metadata') return json({ categories });
  if (url.pathname === '/api/questions/filters') return json([]);
  if (url.pathname === '/api/questions/category-counts') return json(url.searchParams.get('teacherDifficulty') === 'ZOR' ? {} : Object.fromEntries(categories.map(category => [category.id, 20])));
  if (url.pathname === '/api/questions/availability') {
    const ids = url.searchParams.getAll('source');
    const sources = QUESTION_SOURCES.filter(source => ids.length ? ids.includes(source.id)
      : (!url.searchParams.get('bank') || url.searchParams.get('bank') === source.bank)
        && (!url.searchParams.get('examType') || url.searchParams.get('examType') === source.examType));
    const total = url.searchParams.get('teacherDifficulty') === 'ZOR' ? 0 : sources.reduce((sum, source) => sum + totals[source.id], 0);
    const history = url.searchParams.getAll('history');
    const selected = history.length ? total * (history.length === 2 ? .6 : .4) : total;
    const solved = history.length ? selected : historyOnly ? total * .6 : 0;
    return setTimeout(() => json({ total: selected, solved, remaining: selected - solved, correct: solved / 2, everWrong: solved / 2 }), ids.length === 1 && ids[0] === 'CIKMIS_AYT' ? 300 : 20);
  }
  if (url.pathname === '/api/study-sessions' && req.method === 'POST') {
    let body = ''; req.on('data', chunk => body += chunk); req.on('end', () => { lastStart = JSON.parse(body); json({ id: 77, questions: [] }, 201); }); return;
  }
  if (url.pathname === '/api/study-sessions/77') return json({ id: 77, status: 'OPEN', questions: [], questionCount: 10 });
  if (url.pathname.startsWith('/api/')) return json(null);
  const file = resolve(dist, '.' + decodeURIComponent(url.pathname));
  const target = file.startsWith(dist + sep) && extname(file) ? file : join(dist, 'index.html');
  try {
    const body = readFileSync(target);
    res.writeHead(200, { 'Content-Type': { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html' }[extname(target)] || 'text/plain' }); res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
if (server) await new Promise(done => server.listen(0, '127.0.0.1', done));
const site = live ? process.env.IVME_UI_BASE_URL || 'http://127.0.0.1:5173' : `http://127.0.0.1:${server.address().port}`;
const profile = mkdtempSync(join(tmpdir(), 'practice-sources-ui-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore', windowsHide: true });
const pause = ms => new Promise(done => setTimeout(done, ms));
let socket;
const checks = [];
try {
  let ws;
  for (let attempt = 0; attempt < 100 && !ws; attempt++) {
    try {
      const port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
      ws = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(page => page.type === 'page')?.webSocketDebuggerUrl;
    } catch { await pause(100); }
  }
  assert.ok(ws, 'Chrome did not start');
  socket = new WebSocket(ws); await new Promise(done => socket.onopen = done);
  let sequence = 0; const pending = new Map();
  socket.onmessage = ({ data }) => { const message = JSON.parse(data); if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } };
  const cdp = (method, params = {}) => new Promise(done => { const id = ++sequence; pending.set(id, done); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const response = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.error) { if (/Cannot find context|Execution context was destroyed/.test(response.error.message)) return undefined; throw Error(response.error.message); }
    if (response.result.exceptionDetails) throw Error(JSON.stringify(response.result.exceptionDetails));
    return response.result.result.value;
  };
  const waitFor = async expression => {
    for (let attempt = 0; attempt < 200; attempt++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(100); }
    throw Error(`UI timeout: ${expression}; ${await evaluate('document.body.innerText')}`);
  };
  const navigate = async query => {
    await cdp('Page.navigate', { url: site + '/calisma/yeni' + (query ? '?' + query : '') });
    await waitFor('document.querySelector(".question-source-select") && !document.querySelector(".spinner") && document.querySelector(".branch-picker select")?.matches(":enabled")');
  };
  const sourcesQuery = ids => { const query = new URLSearchParams(); ids.forEach(id => query.append('source', id)); return query.toString(); };
  const toggle = async index => {
    const checked = await evaluate(`document.querySelectorAll('.question-source-options input')[${index}].checked`);
    await evaluate(`document.querySelectorAll('.question-source-options input')[${index}].click()`);
    await waitFor(`document.querySelectorAll('.question-source-options input')[${index}].checked===${!checked}`);
  };
  const openSources = async () => evaluate(`{const dropdown=document.querySelector('.question-source-select');if(!dropdown.open)dropdown.querySelector('summary').click();}`);
  const selected = () => evaluate(`[...document.querySelectorAll('.question-source-options input')].map((input,index)=>input.checked?${JSON.stringify(QUESTION_SOURCES.map(source => source.id))}[index]:null).filter(Boolean)`);
  const openTopics = async () => evaluate(`{const dropdown=document.querySelector('.branch-topic-select');if(!dropdown.open)dropdown.querySelector('summary').click();}`);
  const search = async () => {
    await openTopics();
    await evaluate(`{const input=document.querySelector('.branch-topics input[type=search]');input.scrollIntoView({block:'center'});input.focus();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'a');input.dispatchEvent(new Event('input',{bubbles:true}));}`);
    await waitFor('document.querySelector(".branch-topic-list")?.scrollHeight > document.querySelector(".branch-topic-list")?.clientHeight');
  };
  const branch = async id => {
    await waitFor(`document.querySelector('.branch-picker select')?.matches(':enabled')`);
    await evaluate(`{const select=document.querySelector('.branch-picker select');select.value=${JSON.stringify(id)};select.dispatchEvent(new Event('change',{bubbles:true}));}`);
    await waitFor(`document.querySelector('.branch-picker select').value===${JSON.stringify(id)}`);
    if (id) {
      await waitFor(`!document.querySelector('.spinner') && document.querySelector('.branch-topic-select summary').getAttribute('aria-disabled')==='false'`);
      await openTopics();
    }
  };
  await cdp('Page.enable'); await cdp('Runtime.enable');
  if (live) {
    await cdp('Page.navigate', { url: site + '/calisma/yeni' }); await waitFor('document.querySelector("main")');
    assert.equal(await evaluate(`fetch('/api/auth/dev-login',{method:'POST',headers:{'X-XSRF-TOKEN':decodeURIComponent(document.cookie.split('; ').find(x=>x.startsWith('XSRF-TOKEN='))?.split('=')[1]||'')}}).then(r=>r.ok)`), true);
  }
  for (const width of [1280, 390]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width === 390 });
    if (historyOnly) {
      const countMatches = async () => {
        await waitFor('!document.querySelector(".spinner")');
        const result = await evaluate(`(async()=>{const params=new URLSearchParams(location.search);if(params.get('source')==='')params.delete('source');const data=await fetch('/api/questions/availability?'+params).then(r=>r.json());const expected=params.has('history')||params.get('includeSolved')!=='false'?data.total:data.remaining;return {expected,text:document.querySelector('form').innerText};})()`);
        assert.ok(result.text.includes(`Bu seçimde ${result.expected.toLocaleString('tr-TR')} uygun soru var.`), JSON.stringify(result));
        return result.expected;
      };
      await navigate('source=OGM_TYT&includeSolved=false');
      assert.equal(await evaluate('document.querySelector(".practice-include-solved input").checked'), false);
      await countMatches();
      await evaluate('document.querySelector(".practice-include-solved input").click()');
      await waitFor('!new URLSearchParams(location.search).has("includeSolved")');
      await countMatches();
      await evaluate('document.querySelector(".practice-include-solved input").click()');
      await openSources(); await toggle(4);
      await waitFor('!document.querySelector(".practice-include-solved") && !document.querySelector(".spinner")');
      assert.deepEqual(await evaluate('new URLSearchParams(location.search).getAll("history")'), ['CORRECT']);
      await countMatches();
      await cdp('Page.reload');
      await waitFor('document.querySelector(".question-history-sources input:checked") && !document.querySelector(".spinner")');
      assert.equal(await evaluate('document.querySelector(".practice-include-solved")'), null);
      if (!live) {
        lastStart = null;
        await evaluate('document.querySelector("form button[type=submit]").click()');
        for (let attempt = 0; attempt < 100 && !lastStart; attempt++) await pause(30);
        assert.deepEqual(lastStart?.history, ['CORRECT']);
        assert.deepEqual(lastStart?.source, ['OGM_TYT']);
        assert.equal(lastStart?.selectionMode, 'REPEAT');
      }
      await navigate('source=OGM_TYT&includeSolved=false&history=CORRECT');
      await openSources(); await toggle(5);
      await waitFor('new URLSearchParams(location.search).getAll("history").length===2 && !document.querySelector(".spinner")');
      await countMatches();
      await openSources();
      const screenshot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      writeFileSync(join(output, `${live ? 'live' : 'isolated'}-history-${width}.png`), Buffer.from(screenshot.result.data, 'base64'));
      await toggle(4); await countMatches();
      assert.equal(await evaluate('document.querySelector(".practice-include-solved")'), null);
      await toggle(5);
      await waitFor('document.querySelector(".practice-include-solved input")');
      assert.equal(await evaluate('document.querySelector(".practice-include-solved input").checked'), false);
      await countMatches();
      if (!live) {
        lastStart = null;
        await evaluate('document.querySelector("form button[type=submit]").click()');
        for (let attempt = 0; attempt < 100 && !lastStart; attempt++) await pause(30);
        assert.equal(lastStart?.selectionMode, 'NEW');
        assert.deepEqual(lastStart?.history, []);
      }
      await navigate('source=&history=WRONG&includeSolved=false');
      assert.equal(await evaluate('document.querySelector(".branch-picker select").disabled'), false);
      assert.equal(await evaluate('document.querySelector(".practice-include-solved")'), null);
      await countMatches();
      if (!live) {
        lastStart = null;
        await evaluate('document.querySelector("form button[type=submit]").click()');
        for (let attempt = 0; attempt < 100 && !lastStart; attempt++) await pause(30);
        assert.deepEqual(lastStart?.source, []);
        assert.deepEqual(lastStart?.history, ['WRONG']);
        assert.equal(lastStart?.selectionMode, 'REPEAT');
      }
      await navigate('source=CIKMIS_AYT&history=CORRECT');
      await openSources(); await toggle(4); await toggle(5);
      await waitFor('!document.querySelector(".spinner") && new URLSearchParams(location.search).get("history")==="WRONG"');
      await countMatches();
      assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth + 1'), false);
      checks.push({ width, historyCategories: 2, reload: 'PASS', includeSolvedRestored: 'PASS', historyOnlySource: 'PASS', staleResponse: 'PASS', creations: live ? 0 : 3 });
      continue;
    }
    if (reminderOnly) {
      for (const count of live ? [null] : [0, 1, 3]) {
        if (!live) unfinishedCount = count;
        await navigate('');
        const summary = live ? await evaluate(`fetch('/api/study-sessions/unfinished-summary').then(r=>{if(!r.ok)throw Error(r.status);return r.json();})`)
          : { count, latestSessionId: count ? 76 : null };
        if (summary.count > 0) {
          await waitFor(`document.querySelector('.practice-reminder')?.textContent.includes(${JSON.stringify(`${summary.count.toLocaleString('tr-TR')} pratik`)})`);
          assert.equal(await evaluate(`document.querySelector('.practice-reminder p').textContent`), `Başladığın ama henüz bitirmediğin ${summary.count.toLocaleString('tr-TR')} pratik var.`);
          assert.equal(await evaluate(`document.querySelector('.practice-reminder a').getAttribute('href')`), '/calisma/yarim-kalan');
          assert.equal(await evaluate(`document.querySelector('.practice-reminder').getAttribute('role')`), 'status');
        } else assert.equal(await evaluate(`document.querySelector('.practice-reminder')`), null);
        assert.equal(await evaluate(`document.body.innerText.includes('Devam eden pratiğin var')`), false);
        const styles = await evaluate(`[...document.querySelectorAll('.study-pool-summary .ag-cell,.study-pool-link')].map(cell=>{const css=getComputedStyle(cell);return {weight:css.fontWeight,style:css.fontStyle,decoration:css.textDecorationLine};})`);
        assert.ok(styles.length > 0 && styles.every(style=>style.weight==='400' && style.style==='normal' && style.decoration==='none'), JSON.stringify(styles));
        assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth + 1'), false);
        const screenshot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
        writeFileSync(join(output, `${live ? 'live' : 'isolated'}-reminder-${summary.count}-${width}.png`), Buffer.from(screenshot.result.data, 'base64'));
        checks.push({ width, summary, warning: summary.count ? 'PASS' : 'HIDDEN', numericStyles: styles, overflow: false });
      }
      continue;
    }
    await navigate(sourcesQuery(['CIKMIS_AYT', 'OGM_TYT']));
    await openSources();
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('.question-source-options label')].map(label=>label.innerText.trim())`), [...QUESTION_SOURCES, ...QUESTION_HISTORY_SOURCES].map(source => source.label));
    assert.deepEqual(await selected(), ['CIKMIS_AYT', 'OGM_TYT']);
    const sourceScreenshot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    writeFileSync(join(output, `${live ? 'live' : 'isolated'}-sources-${width}.png`), Buffer.from(sourceScreenshot.result.data, 'base64'));
    assert.equal(await evaluate(`[...document.querySelectorAll('form label')].some(label=>label.innerText==='Sınav türü')`), false);
    await toggle(1); await toggle(0);
    assert.deepEqual(await selected(), ['CIKMIS_TYT', 'OGM_TYT']);
    await cdp('Page.reload'); await waitFor('document.querySelector(".question-source-select") && !document.querySelector(".spinner")');
    assert.deepEqual(await selected(), ['CIKMIS_TYT', 'OGM_TYT']);
    await openSources(); await toggle(1); await toggle(3);
    await waitFor(`document.body.innerText.includes('Devam etmek için en az bir kaynak seç.')`);
    assert.equal(await evaluate('document.querySelector("form button[type=submit]").disabled'), true);
    await cdp('Page.reload'); await waitFor('document.querySelector(".question-source-select")');
    assert.deepEqual(await selected(), []);
    await waitFor('document.querySelector(".study-pool-summary [col-id=ayt] button")');
    await evaluate(`document.querySelector('.study-pool-summary [col-id="ayt"] button').click()`);
    await waitFor(`document.querySelector('.question-source-select summary').innerText.includes('AYT Çıkmış Sorular') && !document.querySelector('.spinner')`);
    assert.deepEqual(await selected(), ['CIKMIS_AYT']);
    await navigate('');
    assert.equal(await evaluate('document.querySelector(".branch-picker select").value'), '');
    assert.equal(await evaluate('document.querySelector(".branch-picker select option").textContent'), 'Bütün dersler');
    assert.equal(await evaluate('document.querySelector(".study-scopes")'), null);
    assert.equal(await evaluate(`[...document.querySelectorAll('form label')].some(label=>label.textContent==='Branş seç')`), false);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('.practice-source-difficulty .field > label,.practice-source-difficulty .field > .field-label')].map(label=>label.textContent)`), ['Kaynak', 'Öğretmen zorluk etiketi']);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('.practice-lesson-topic .field > label,.practice-lesson-topic .field > .field-label')].map(label=>label.textContent)`), ['Ders', 'Konu']);
    assert.equal(await evaluate(`document.body.innerText.includes('Konu ve alt konu seç') || document.body.innerText.includes('Seçili derste konu ara')`), false);
    const summaryStyles = await evaluate(`[...document.querySelectorAll('.study-pool-summary .ag-cell,.study-pool-link')].map(cell=>({weight:getComputedStyle(cell).fontWeight,style:getComputedStyle(cell).fontStyle}))`);
    assert.ok(summaryStyles.length > 0 && summaryStyles.every(style=>style.weight==='400' && style.style==='normal'), JSON.stringify(summaryStyles));
    assert.equal(await evaluate('document.querySelectorAll(".branch-picker input[type=checkbox]").length'), 0);
    const alignment = await evaluate(`(()=>{const summary=document.querySelector('.study-pool-summary').getBoundingClientRect();const form=document.querySelector('[aria-labelledby="study-mode-title"]').getBoundingClientRect();return {left:Math.abs(summary.left-form.left),right:Math.abs(summary.right-form.right)};})()`);
    assert.ok(alignment.left < 1 && alignment.right < 1, JSON.stringify(alignment));
    const gridGeometry = await evaluate(`(()=>{const grid=document.querySelector('.study-pool-summary');const row=grid.querySelector('.ag-row').getBoundingClientRect();const viewport=grid.querySelector('.ag-grid-viewport').getBoundingClientRect();const horizontal=grid.querySelector('.ag-body-horizontal-scroll')?.getBoundingClientRect();return {rowHeight:row.height,viewportHeight:viewport.height,rowBottom:row.bottom,viewportBottom:viewport.bottom,horizontalHeight:horizontal?.height};})()`);
    assert.ok(gridGeometry.rowBottom <= gridGeometry.viewportBottom - (gridGeometry.horizontalHeight || 0) + 1, JSON.stringify(gridGeometry));
    assert.equal(await evaluate('document.querySelector(".branch-topics input[type=search]").matches(":disabled")'), true);
    await branch('fizik');
    await waitFor('document.querySelector(".branch-topic-option input")');
    assert.equal(await evaluate(`[...document.querySelectorAll('.branch-topic-group h3')].every(heading=>heading.innerText.includes('Fizik'))`), true);
    await waitFor('document.querySelector("form button[type=submit]").disabled===false');
    if (live) {
      const lessonCount = await evaluate(`fetch('/api/questions/availability?'+new URLSearchParams({subject:'fizik'})).then(r=>r.json()).then(r=>r.total)`);
      assert.ok(lessonCount > 0);
      assert.equal(await evaluate(`document.querySelector('form').innerText.includes(${JSON.stringify(`Bu seçimde ${lessonCount.toLocaleString('tr-TR')} uygun soru var.`)})`), true);
    }
    if (!live) {
      lastStart = null;
      await evaluate('document.querySelector("form button[type=submit]").click()');
      for (let attempt = 0; attempt < 100 && !lastStart; attempt++) await pause(30);
      assert.equal(lastStart?.subject, 'fizik');
      assert.deepEqual(lastStart?.categoryId, []);
      await navigate('branchId=fizik');
      const difficulty = value => evaluate(`{const select=document.querySelector('.practice-source-difficulty select');select.value=${JSON.stringify(value)};select.dispatchEvent(new Event('change',{bubbles:true}));}`);
      await difficulty('ZOR');
      await waitFor('!document.querySelector(".spinner") && document.querySelectorAll(".branch-topic-option input").length===0');
      assert.equal(await evaluate('document.querySelector(".branch-picker select").value'), 'fizik');
      assert.equal(await evaluate('document.querySelector("form button[type=submit]").disabled'), true);
      await difficulty('');
      await waitFor('document.querySelector(".branch-topic-option input")');
    }
    const topicLayout = await evaluate(`(()=>{const source=document.querySelector('.question-source-select summary').getBoundingClientRect();const difficulty=document.querySelector('.practice-source-difficulty select').getBoundingClientRect();const lesson=document.querySelector('.branch-picker select').getBoundingClientRect();const topic=document.querySelector('.branch-topic-select summary').getBoundingClientRect();return {sourceAndDifficulty:source.right<=difficulty.left && Math.abs(source.top-difficulty.top)<1,lessonAndTopic:lesson.right<=topic.left && Math.abs(lesson.top-topic.top)<1,secondRow:lesson.top>=source.bottom};})()`);
    assert.ok(topicLayout.sourceAndDifficulty && topicLayout.lessonAndTopic && topicLayout.secondRow, JSON.stringify(topicLayout));
    const physicsCategory = await evaluate(`(()=>{const input=document.querySelector('.branch-topic-option input');input.click();return input.value;})()`);
    await waitFor(`new URLSearchParams(location.search).getAll('categoryId').includes(${JSON.stringify(physicsCategory)})`);
    const secondPhysicsCategory = await evaluate(`(()=>{const input=[...document.querySelectorAll('.branch-topic-option input')].find(input=>!input.checked);input.click();return input.value;})()`);
    await waitFor('new URLSearchParams(location.search).getAll("categoryId").length===2');
    const chosen = [physicsCategory, secondPhysicsCategory];
    await openTopics();
    await evaluate(`document.querySelector('.branch-topic-select summary').scrollIntoView({block:'center'})`);
    const leave = await evaluate(`(()=>{const rect=document.querySelector('.branch-topic-dropdown').getBoundingClientRect();return {x:rect.left+20,y:Math.max(1,rect.top+20)};})()`);
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...leave });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
    await waitFor('!document.querySelector(".branch-topic-select").open');
    assert.equal(await evaluate('document.querySelectorAll(".selected-categories button").length'), 2);
    assert.equal(await evaluate(`(()=>{const chosen=document.querySelector('.selected-categories').getBoundingClientRect();const topic=document.querySelector('.branch-topic-select').getBoundingClientRect();return chosen.top>=topic.bottom;})()`), true);
    const selectedScreenshot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    writeFileSync(join(output, `${live ? 'live' : 'isolated'}-selected-${width}.png`), Buffer.from(selectedScreenshot.result.data, 'base64'));
    await openTopics();
    assert.equal(await evaluate(`[...document.querySelectorAll('.branch-topic-group h3')].every(heading=>heading.innerText.includes('Fizik'))`), true);
    if (live) {
      const counts = await evaluate(`Promise.all(['/api/questions/availability?','/api/questions?size=1&'].map(path=>fetch(path+location.search.slice(1)).then(r=>r.json()))).then(([count,list])=>({total:count.total,list:list.totalElements}))`);
      assert.equal(counts.total, counts.list);
      assert.ok(counts.total > 0);
    }
    await cdp('Page.reload');
    await waitFor('document.querySelectorAll(".branch-topic-option input:checked").length===2');
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('.branch-topic-option input:checked')].map(input=>input.value).sort()`), chosen.sort());
    assert.equal(await evaluate(`document.querySelector('.branch-picker select').value`), 'fizik');
    await branch('kimya');
    await waitFor(`new URLSearchParams(location.search).getAll('categoryId').length===0`);
    assert.equal(await evaluate(`[...document.querySelectorAll('.branch-topic-group h3')].every(heading=>heading.innerText.includes('Kimya'))`), true);
    const chemistryCategory = await evaluate(`(()=>{const input=document.querySelector('.branch-topic-option input');input.click();return input.value;})()`);
    await waitFor(`new URLSearchParams(location.search).get('categoryId')===${JSON.stringify(chemistryCategory)}`);
    if (!live) {
      await waitFor('document.querySelector("form button[type=submit]").disabled===false');
      lastStart = null;
      await evaluate('document.querySelector("form button[type=submit]").click()');
      for (let attempt = 0; attempt < 100 && !lastStart; attempt++) await pause(30);
      assert.deepEqual(lastStart?.categoryId, [chemistryCategory]);
      assert.equal(lastStart.subject, 'kimya');
    }
    const oldLink = new URLSearchParams();
    oldLink.append('branchId', 'fizik'); oldLink.append('branchId', 'kimya');
    oldLink.append('categoryId', physicsCategory); oldLink.append('categoryId', chemistryCategory);
    await navigate(oldLink.toString());
    await waitFor('new URLSearchParams(location.search).getAll("branchId").length===1 && new URLSearchParams(location.search).getAll("categoryId").length===1');
    assert.equal(await evaluate('new URLSearchParams(location.search).get("categoryId")'), physicsCategory);
    await branch('');
    await waitFor('!new URLSearchParams(location.search).has("categoryId") && !new URLSearchParams(location.search).has("branchId")');
    assert.equal(await evaluate('document.querySelector(".branch-topics input[type=search]").matches(":disabled")'), true);
    await navigate('scope=subject&subject=Fizik');
    assert.equal(await evaluate('document.querySelector(".branch-picker select").value'), 'fizik');
    await waitFor('document.querySelector("form button[type=submit]").disabled===false');
    await navigate(''); await branch('fizik'); await search();
    await evaluate(`document.querySelector('.branch-topic-list').scrollIntoView({block:'center'})`);
    const rect = await evaluate(`(()=>{const r=document.querySelector('.branch-topic-list').getBoundingClientRect();return {x:r.right-7,y:r.top+12,bottom:r.bottom-15};})()`);
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x, y: rect.y });
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
    for (let step = 1; step <= 8; step++) await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x, y: rect.y + (rect.bottom - rect.y) * step / 8, button: 'left', buttons: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.bottom, button: 'left', clickCount: 1 });
    await waitFor('document.querySelector(".branch-topic-list")?.scrollTop > 0');
    const scrollTop = await evaluate('document.querySelector(".branch-topic-list").scrollTop');
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth + 1'), false);
    const screenshot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    writeFileSync(join(output, `${live ? 'live' : 'isolated'}-${width}.png`), Buffer.from(screenshot.result.data, 'base64'));
    await evaluate('document.querySelector(".branch-topic-option input").click()');
    await waitFor('new URLSearchParams(location.search).has("categoryId")');
    await openSources(); await toggle(1);
    await waitFor('!new URLSearchParams(location.search).has("categoryId") && !new URLSearchParams(location.search).has("branchId")');
    assert.equal(await evaluate('document.querySelector(".branch-topics input[type=search]").matches(":disabled")'), true);
    checks.push({ width, sources: 'PASS', reloadAndEmptySelection: 'PASS', summaryLink: 'PASS',
      alignment, gridGeometry, topicLayout, summaryStyles, lessons: { sourceAndDifficulty: 'PASS', lessonAndTopic: 'PASS', wholeLesson: 'PASS', multipleTopics: 'PASS', onlySelectedSubject: 'PASS', categoryIds: chosen, restore: 'PASS', lessonChange: 'PASS', sourceReset: 'PASS' },
      scrollbarDrag: { status: 'PASS', scrollTop }, overflow: false });
  }
  if (!live && !branchesOnly && !reminderOnly && !historyOnly) {
    for (let mask = 1; mask < 16; mask++) {
      const ids = QUESTION_SOURCES.filter((_, index) => mask & (1 << index)).map(source => source.id);
      await navigate(sourcesQuery(ids));
      await waitFor('document.querySelector("form button[type=submit]")?.disabled===false');
      lastStart = null;
      await evaluate('document.querySelector("form button[type=submit]").click()');
      for (let attempt = 0; attempt < 100 && !lastStart; attempt++) await pause(30);
      assert.deepEqual(lastStart?.source, ids);
      const scope = questionSourceScope(ids);
      assert.equal(lastStart.bank || '', scope.bank);
      assert.equal(lastStart.examType || '', scope.examType);
      assert.equal(lastStart.questionCount, 10);
    }
    checks.push({ creationCombinations: 15, status: 'PASS' });
  } else if (live && !branchesOnly && !reminderOnly && !historyOnly) {
    const apiMatrix = await evaluate(`(async()=>{
      const result=[];for(let mask=1;mask<16;mask++){
        const ids=${JSON.stringify(QUESTION_SOURCES.map(source => source.id))}.filter((_,index)=>mask&(1<<index));
        const query=new URLSearchParams();ids.forEach(id=>query.append('source',id));
        const [count,list,rows]=await Promise.all(['/api/questions/availability?','/api/questions?size=1&','/api/questions/filters?'].map(path=>fetch(path+query).then(r=>{if(!r.ok)throw Error(r.status);return r.json();})));
        result.push({sources:ids,total:count.total,list:list.totalElements,filters:rows[0]?.totalCount});
      }return result;
    })()`);
    for (const row of apiMatrix) { assert.equal(row.total, row.list); assert.equal(row.total, row.filters); }
    const legacyCounts = await evaluate(`Promise.all(${JSON.stringify(QUESTION_SOURCES)}.map(source=>fetch('/api/questions/availability?'+new URLSearchParams({bank:source.bank,examType:source.examType})).then(r=>r.json()).then(count=>({id:source.id,total:count.total}))))`);
    for (const legacy of legacyCounts) assert.equal(apiMatrix.find(row => row.sources.length === 1 && row.sources[0] === legacy.id).total, legacy.total);
    const diagonal = apiMatrix.find(row => row.sources.join(',') === 'CIKMIS_AYT,OGM_TYT');
    assert.equal(diagonal.total, legacyCounts.filter(row => diagonal.sources.includes(row.id)).reduce((sum, row) => sum + row.total, 0));
    checks.push({ apiCombinations: apiMatrix, status: 'PASS' });
  }
  if (live && measurePlans) {
    await waitFor('!document.querySelector(".spinner")');
    const performance = await evaluate(`(async()=>{
      const queries=['examType=TYT&includeSolved=true','examType=TYT&includeSolved=false',
        'examType=AYT&track=SAYISAL&includeSolved=true','examType=AYT&track=SOZEL&includeSolved=false'];
      const measure=async query=>{const start=performance.now();const response=await fetch('/api/exams/plan?'+query);
        if(!response.ok)throw Error(response.status);const plan=await response.json();return {query,milliseconds:performance.now()-start,plan};};
      const sequential=[];for(const query of queries)sequential.push(await measure(query));
      const start=performance.now();const concurrent=await Promise.all(queries.map(measure));
      return {sequential,concurrent,concurrentWorkers:4,concurrentMilliseconds:performance.now()-start,examOrAnswerWrites:0};
    })()`);
    writeFileSync(join(output, 'performance-browser.json'), JSON.stringify(performance, null, 2) + '\n');
    checks.push({ examPlanPerformance: 'performance-browser.json', status: 'PASS' });
  }
  const html = await (await fetch(site + '/calisma/yeni')).text();
  const asset = html.match(/\/assets\/index-[^" ]+\.js/)[0];
  const servedHash = createHash('sha256').update(Buffer.from(await (await fetch(site + asset)).arrayBuffer())).digest('hex');
  const diskHash = createHash('sha256').update(readFileSync(join(dist, asset.slice(1)))).digest('hex');
  assert.equal(servedHash, diskHash);
  const report = { status: 'PASS', checkedAtUtc: new Date().toISOString(), site, mode: live ? 'live-read-only' : 'isolated-creation',
    asset, servedHash, checks, mutations: live ? 'Local development login only; no sessions, answers or content changes.' : 'Fixture sessions in an isolated HTTP server.' };
  writeFileSync(join(output, live ? 'live-report.json' : 'ui-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'PASS', mode: report.mode, checks: checks.length, asset }));
} finally {
  socket?.close(); chrome.kill(); if (server) await new Promise(done => server.close(done));
  await pause(300); try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still release its private temporary profile. */ }
}
