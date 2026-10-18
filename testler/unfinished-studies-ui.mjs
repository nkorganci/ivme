// Isolated fixtures exercise navigation and states; --live reads the served app only.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const live = process.argv.includes('--live');
const output = fileURLToPath(new URL('../veri/content-labels/integration/unfinished-actions-20261017/', import.meta.url));
const dist = resolve(fileURLToPath(new URL('../frontend/dist/', import.meta.url)));
mkdirSync(output, { recursive: true });
const fixtures = Array.from({ length: 9 }, (_, i) => ({
  id: i < 7 ? i + 1 : i - 6, kind: i < 7 ? 'PRACTICE' : 'EXAM',
  title: i < 7 ? `TYT · Türkçe · Konu ${i + 1} pratiği` : `AYT denemesi ${i - 6}`,
  startedAt: '2026-10-17T17:46:00Z', questionCount: i < 7 ? 10 : 80, solvedCount: i,
  resumeQuestionCode: i < 6 ? `Soru ${i + 1}` : null, resumeQuestionBank: i < 7 ? 'OGM' : null,
}));
let state = 'normal';
const cancelled = new Set();
const cancelRequests = [];
let cancelFails = false;
const server = live ? null : createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const json = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  if (url.pathname === '/api/auth/me') return json({ id: 1, username: 'student', role: 'USER', contactComplete: true });
  if (url.pathname === '/api/study-sessions/unfinished') return json(state === 'error' ? { hata: 'Liste yüklenemedi.' } : state === 'empty' ? [] : fixtures.filter(item => !cancelled.has(`${item.kind}-${item.id}`)), state === 'error' ? 500 : 200);
  const cancellation = url.pathname.match(/^\/api\/(study-sessions|exams)\/(\d+)\/cancel$/);
  if (cancellation && req.method === 'POST') {
    cancelRequests.push(url.pathname);
    if (cancelFails) return json({ hata: 'İptal işlemi başarısız.' }, 503);
    cancelled.add(`${cancellation[1] === 'exams' ? 'EXAM' : 'PRACTICE'}-${cancellation[2]}`);
    return setTimeout(() => { res.writeHead(204); res.end(); }, 150);
  }
  if (url.pathname === '/api/study-sessions/unfinished-summary') return json({ count: 7, latestSessionId: 7 });
  if (url.pathname === '/api/learning-resources/metadata') return json({ categories: [] });
  if (url.pathname === '/api/questions/availability') return json({ total: 0, solved: 0, remaining: 0 });
  if (url.pathname === '/api/exams/1') return json({ id: 1, title: 'AYT denemesi 1', status: 'IN_PROGRESS', questionCount: 3, remainingSeconds: null,
    questions: [1, 2, 3].map((questionId, index) => ({ questionId, position: index + 1, code: `RESUME-${questionId}`, subject: 'Türkçe', choiceCount: 5, selectedAnswer: index === 1 ? null : 'A' })) });
  if (url.pathname.startsWith('/api/')) return json(null);
  const path = resolve(dist, '.' + decodeURIComponent(url.pathname));
  const file = path.startsWith(dist + sep) && extname(path) ? path : join(dist, 'index.html');
  try { const body = readFileSync(file); res.writeHead(200, { 'Content-Type': { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html' }[extname(file)] || 'text/plain' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
});
if (server) await new Promise(done => server.listen(0, '127.0.0.1', done));
const site = live ? 'http://127.0.0.1:5173' : `http://127.0.0.1:${server.address().port}`;
const profile = mkdtempSync(join(tmpdir(), 'unfinished-studies-ui-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore', windowsHide: true });
const pause = ms => new Promise(done => setTimeout(done, ms));
let socket;
const checks = [];
try {
  let ws;
  for (let i = 0; i < 100 && !ws; i++) {
    try { const port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); ws = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(p => p.type === 'page')?.webSocketDebuggerUrl; }
    catch { await pause(100); }
  }
  assert.ok(ws);
  socket = new WebSocket(ws); await new Promise(done => socket.onopen = done);
  let sequence = 0; const pending = new Map(); const exceptions = [];
  socket.onmessage = ({ data }) => { const msg = JSON.parse(data); if (msg.method === 'Runtime.exceptionThrown') exceptions.push(msg.params); if (pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } };
  const cdp = (method, params = {}) => new Promise(done => { const id = ++sequence; pending.set(id, done); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.error && /context|navigat/i.test(result.error.message)) return undefined;
    assert.ok(!result.error, JSON.stringify(result));
    assert.ok(!result.result?.exceptionDetails, JSON.stringify(result)); return result.result.result.value;
  };
  const waitFor = async expression => { for (let i = 0; i < 200; i++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(75); } throw Error(`Timed out: ${expression}; ${JSON.stringify({ exceptions, page: await evaluate('({url:location.href,text:document.body.innerText})') })}`); };
  const navigate = async path => { await cdp('Page.navigate', { url: site + path }); await waitFor('document.querySelector("main")'); };
  await cdp('Page.enable'); await cdp('Runtime.enable');
  if (live) {
    await navigate('/calisma/yarim-kalan');
    assert.equal(await evaluate(`fetch('/api/auth/dev-login',{method:'POST',headers:{'X-XSRF-TOKEN':decodeURIComponent(document.cookie.split('; ').find(x=>x.startsWith('XSRF-TOKEN='))?.split('=')[1]||'')}}).then(r=>r.ok)`), true);
  }
  for (const width of [1280, 390]) {
    cancelled.clear();
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width === 390 });
    await navigate('/calisma/yarim-kalan');
    await waitFor('document.querySelector(".ag-root") || document.body.innerText.includes("Yarım kalan çalışman yok.")');
    const data = live ? await evaluate(`fetch('/api/study-sessions/unfinished').then(r=>{if(!r.ok)throw Error(r.status);return r.json()})`) : fixtures;
    if (data.length) {
      await waitFor(`document.querySelectorAll('.ag-row[row-id]').length===${Math.min(data.length, 10)}`);
      const rows = await evaluate(`[...document.querySelectorAll('.ag-row[row-id]')].map(row=>({key:row.getAttribute('row-id'),title:row.querySelector('[col-id=title]')?.textContent,total:row.querySelector('[col-id=questionCount]')?.textContent,solved:row.querySelector('[col-id=solvedCount]')?.textContent}))`);
      for (const row of rows) {
        const item = data.find(item => `${item.kind}-${item.id}` === row.key);
        assert.ok(item); assert.equal(row.title, item.title);
        // Numeric columns can be virtualised while horizontally scrolled on narrow screens.
        if (row.total !== undefined) assert.equal(row.total, item.questionCount.toLocaleString('tr-TR'));
        if (row.solved !== undefined) assert.equal(row.solved, item.solvedCount.toLocaleString('tr-TR'));
      }
      const links = await evaluate(`[...document.querySelectorAll('.unfinished-study-actions a')].map(a=>({href:a.getAttribute('href'),label:a.getAttribute('aria-label'),left:a.getBoundingClientRect().left,right:a.getBoundingClientRect().right}))`);
      assert.equal(links.length, Math.min(data.length, 10));
      data.slice(0, 10).forEach((item, index) => {
        const expected = item.kind === 'EXAM' ? `/sinav/${item.id}` : item.resumeQuestionCode
          ? `/soru/${encodeURIComponent(item.resumeQuestionCode)}?sessionId=${item.id}&bank=${item.resumeQuestionBank}` : `/pratik/${item.id}`;
        assert.equal(links[index].href, expected); assert.ok(links[index].label.includes(item.title));
        assert.ok(links[index].left >= 0 && links[index].right <= width + 1, JSON.stringify(links[index]));
      });
      if (!live) {
        await evaluate(`{const input=document.querySelector('input[aria-label="Tabloda ara"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'AYT');input.dispatchEvent(new Event('input',{bubbles:true}));}`);
        await waitFor('document.querySelectorAll(".ag-row[row-id]").length===2');
        await evaluate(`document.querySelector('.unfinished-study-actions a').click()`);
        await waitFor('location.pathname==="/sinav/1"');
        await waitFor('document.querySelector(".qstrip")?.textContent.includes("Soru 2 / 3")');
        await navigate('/calisma/yarim-kalan'); await waitFor('document.querySelectorAll(".unfinished-study-actions a").length===9');
      }
      checks.push({ width, rows: data.length, counts: 'PASS', resumeLinks: 'PASS', pinnedButtonsVisible: 'PASS' });
      const layout = await evaluate(`(() => {
        const cells=[...document.querySelectorAll('.ag-cell')];
        const headers=[...document.querySelectorAll('.ag-header-cell-label')];
        const title=document.querySelector('.ag-cell[col-id="title"]');
        const canvas=document.createElement('canvas'), ctx=canvas.getContext('2d');
        ctx.font=getComputedStyle(title).font;
        const longest=Math.max(...${JSON.stringify(data.map(item => item.title))}.map(text=>ctx.measureText(text).width));
        return {centeredCells:cells.every(cell=>{const s=getComputedStyle(cell);return s.alignItems==='center'&&s.justifyContent==='center'&&s.textAlign==='center'}),
          centeredHeaders:headers.every(header=>getComputedStyle(header).justifyContent==='center'),
          titleWidth:title.getBoundingClientRect().width,longest,
          cancelVisible:[...document.querySelectorAll('.unfinished-study-actions button')].every(button=>{const box=button.getBoundingClientRect();return box.left>=0&&box.right<=innerWidth+1})};
      })()`);
      assert.ok(layout.centeredCells && layout.centeredHeaders && layout.cancelVisible, JSON.stringify(layout));
      assert.ok(layout.titleWidth <= layout.longest + 85, JSON.stringify(layout));
      checks.push({ width, centeredHeadersAndCells: 'PASS', contentSizedTitle: 'PASS', cancellationButtonsVisible: 'PASS', ...layout });
    }
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth + 1'), false);
    await cdp('Page.reload'); await waitFor('document.querySelector(".ag-root") || document.body.innerText.includes("Yarım kalan çalışman yok.")');
    const shot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    writeFileSync(join(output, `${live ? 'live' : 'isolated'}-${width}.png`), Buffer.from(shot.result.data, 'base64'));
    if (!live) {
      await evaluate(`document.querySelector('.unfinished-study-actions button').click()`);
      await waitFor('document.querySelector("[role=dialog]")');
      await evaluate(`[...document.querySelectorAll('[role=dialog] button')].find(button=>button.textContent==='Vazgeç').click()`);
      await waitFor('!document.querySelector("[role=dialog]")');
      assert.equal(cancelRequests.filter(path => path.includes('/study-sessions/')).length, 0);
      cancelFails = true;
      await evaluate(`document.querySelector('.unfinished-study-actions button').click()`);
      await waitFor('document.querySelector("[role=dialog]")');
      await evaluate(`[...document.querySelectorAll('[role=dialog] button')].find(button=>button.textContent==='Çalışmayı iptal et').click()`);
      await waitFor('document.querySelector("[role=dialog] [role=alert]")');
      assert.equal(cancelled.size, 0);
      cancelFails = false;
      await evaluate(`[...document.querySelectorAll('[role=dialog] button')].find(button=>button.textContent==='Çalışmayı iptal et').click()`);
      await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
      assert.equal(await evaluate('!!document.querySelector("[role=dialog]")'), true);
      await waitFor('!document.querySelector("[role=dialog]") && document.querySelectorAll(".unfinished-study-actions button").length===8');
      assert.ok(cancelled.has('PRACTICE-1'));
      await evaluate(`document.querySelector('.ag-row[row-id="EXAM-1"] button').click()`);
      await waitFor('document.querySelector("[role=dialog]")');
      await evaluate(`[...document.querySelectorAll('[role=dialog] button')].find(button=>button.textContent==='Çalışmayı iptal et').click()`);
      await waitFor('!document.querySelector("[role=dialog]") && document.querySelectorAll(".unfinished-study-actions button").length===7');
      assert.ok(cancelled.has('EXAM-1'));
      checks.push({ width, cancelDismissal: 'PASS', cancelErrorAndRetry: 'PASS', practiceAndExamCancellation: 'PASS' });
      cancelRequests.length = 0;
    }
  }
  if (!live) {
    state = 'empty'; await navigate('/calisma/yarim-kalan'); await waitFor('document.body.innerText.includes("Yarım kalan çalışman yok.")');
    state = 'error'; await navigate('/calisma/yarim-kalan'); await waitFor('document.body.innerText.includes("Liste yüklenemedi.")');
    assert.equal(await evaluate('!!document.querySelector("button")'), true);
    state = 'normal';
    checks.push({ emptyState: 'PASS', errorState: 'PASS', searchAndExamNavigation: 'PASS' });
  }
  await navigate('/calisma/yeni');
  await waitFor('document.querySelector(".practice-reminder a") || document.querySelector(".study-choices")');
  await evaluate(`document.querySelector('a[href="/calisma/yarim-kalan"]').click()`);
  await waitFor('document.querySelector("h1")?.textContent === "Yarım kalan çalışmalar"');
  checks.push({ listEntryNavigation: 'PASS' });
  writeFileSync(join(output, live ? 'live-report.json' : 'ui-report.json'), JSON.stringify({ status: 'PASS', site, checks }, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'PASS', live, checks }));
} finally {
  socket?.close(); chrome.kill(); server?.close();
  await pause(500); try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
