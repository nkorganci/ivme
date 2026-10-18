import assert from 'node:assert/strict';
import { EXAM_BRANCHES, groupExamBranches } from '../frontend/src/studyStatistics.js';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const live = process.argv.includes('--live');
const output = fileURLToPath(new URL('../veri/content-labels/integration/exam-history-summary-20261017/', import.meta.url));
const dist = resolve(fileURLToPath(new URL('../frontend/dist/', import.meta.url)));
mkdirSync(output, { recursive: true });
const fixtures = [
  { id: 1, title: 'TYT eski deneme', examType: 'TYT', submittedAt: '2026-10-15T12:00:00Z', questionCount: 3, correctCount: 1, wrongCount: 1, blankCount: 1, net: 0.75, percent: 33.33, durationSeconds: 120,
    bySubject: [{ subject: 'Matematik', total: 1, correct: 1, wrong: 0, blank: 0 }, { subject: 'Türkçe', total: 2, correct: 0, wrong: 1, blank: 1 }] },
  { id: 2, title: 'AYT denemesi', examType: 'AYT', submittedAt: '2026-10-16T12:00:00Z', questionCount: 14, correctCount: 2, wrongCount: 10, blankCount: 2, net: -0.5, percent: 14.29, durationSeconds: 180,
    bySubject: [{ subject: 'Fizik', total: 14, correct: 2, wrong: 10, blank: 2 }] },
  { id: 3, title: 'TYT yeni deneme', examType: 'TYT', submittedAt: '2026-10-17T12:00:00Z', questionCount: 3, correctCount: 0, wrongCount: 0, blankCount: 3, net: 0, percent: 0, durationSeconds: 30,
    bySubject: [{ subject: 'Matematik', total: 3, correct: 0, wrong: 0, blank: 3 }] },
];
let noTyt = false;
const server = live ? null : createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const json = data => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  if (url.pathname === '/api/auth/me') return json({ id: 1, role: 'USER', contactComplete: true });
  if (url.pathname === '/api/exams') { const content = noTyt ? fixtures.filter(row => row.examType === 'AYT') : fixtures; return json({ content, totalElements: content.length, totalPages: 1 }); }
  if (url.pathname.startsWith('/api/')) return json(null);
  const path = resolve(dist, '.' + decodeURIComponent(url.pathname));
  const file = path.startsWith(dist + sep) && extname(path) ? path : join(dist, 'index.html');
  try { const body = readFileSync(file); res.writeHead(200, { 'Content-Type': { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html' }[extname(file)] || 'text/plain' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
});
if (server) await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = live ? 'http://127.0.0.1:9090' : `http://127.0.0.1:${server.address().port}`;
const profile = mkdtempSync(join(tmpdir(), 'exam-history-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore', windowsHide: true });
const pause = ms => new Promise(done => setTimeout(done, ms));
let socket;
try {
  let ws;
  for (let i = 0; i < 100 && !ws; i++) {
    try { const port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); ws = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(page => page.type === 'page')?.webSocketDebuggerUrl; }
    catch { await pause(100); }
  }
  assert.ok(ws);
  socket = new WebSocket(ws); await new Promise(done => socket.onopen = done);
  let sequence = 0; const pending = new Map(), errors = [];
  socket.onmessage = ({ data }) => { const msg = JSON.parse(data); if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params); if (pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } };
  const cdp = (method, params = {}) => new Promise(done => { const id = ++sequence; pending.set(id, done); socket.send(JSON.stringify({ id, method, params })); });
  const ev = async expression => { const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); assert.ok(!result.error && !result.result?.exceptionDetails, JSON.stringify(result)); return result.result.result.value; };
  const wait = async expression => { for (let i = 0; i < 150; i++) { if (await ev(`Boolean(${expression})`)) return; await pause(100); } throw Error(`Timeout ${expression}: ${await ev('document.body.innerText')}`); };
  const navigate = async () => {
    await cdp('Page.navigate', { url: base + '/gecmis' });
    await wait('document.querySelector(".study-statistics .app-data-grid-standard .ag-cell[col-id=number]")');
    await ev('window.grid=document.querySelector(".study-statistics .app-data-grid-standard"); true');
  };
  const open = async column => {
    await ev(`grid.querySelector('.ag-body-horizontal-scroll-viewport').scrollLeft=0`);
    await pause(80);
    await ev(`grid.querySelector('.ag-header-cell[col-id="${column}"] .ag-header-cell-filter-button').click()`);
    await wait('document.querySelector(".grid-selection-filter")');
  };
  const clickButton = async label => ev(`[...document.querySelectorAll('.grid-selection-filter button')].find(button=>button.textContent===${JSON.stringify(label)}).click()`);
  const close = async () => {
    const point = await ev('(()=>{const r=document.querySelector(".study-statistics h1").getBoundingClientRect();return {x:r.left+10,y:r.top+10}})()');
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
    await wait('!document.querySelector(".grid-selection-filter")');
  };
  const cellValues = async column => {
    await pause(350);
    return ev(`[...grid.querySelectorAll('.ag-cell[col-id="${column}"]')].sort((a,b)=>Number(a.closest('.ag-row').getAttribute('row-index'))-Number(b.closest('.ag-row').getAttribute('row-index'))).map(cell=>cell.textContent)`);
  };
  await cdp('Page.enable'); await cdp('Runtime.enable');
  const checks = [];
  for (const width of [1468, 1280, 390]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width === 390 });
    await navigate();
    const rows = live ? await ev('fetch("/api/exams?size=100").then(r=>r.json()).then(r=>r.content)') : fixtures;
    assert.ok(rows.length > 0);
    await wait(`[...document.querySelectorAll('.statistics-summary .ag-cell[col-id=sessions]')].reduce((n,cell)=>n+Number(cell.textContent),0)===${rows.length}`);
    await pause(350);
    const summary = await ev(`[...document.querySelectorAll('.statistics-summary .ag-row')].map(row=>Object.fromEntries([...row.querySelectorAll('.ag-cell')].map(cell=>[cell.getAttribute('col-id'),cell.textContent])))`);
    assert.deepEqual(summary.map(row=>row.examType), ['TYT', 'AYT']);
    for (const row of summary) {
      const source = rows.filter(item=>item.examType===row.examType);
      assert.equal(Number(row.sessions), source.length);
      assert.equal(Number(row.questions), source.reduce((sum,item)=>sum+item.questionCount,0));
      assert.equal(Number(row.correct), source.reduce((sum,item)=>sum+item.correctCount,0));
    }
    assert.equal(await ev('document.querySelector(".study-statistics .table-card:not(.statistics-summary) h3").textContent'), 'Deneme sonuçları detaylı');

    assert.equal(await ev('document.querySelectorAll(".app-data-grid-search").length'), 0);
    assert.equal(await ev('grid.querySelectorAll(".ag-floating-filter").length'), 0);
    assert.equal(await ev('document.body.innerText.includes("Seçili kayıtların özeti") || document.body.innerText.includes("Başarı = doğru") || document.body.innerText.includes("Başlıklardan sırala") || document.body.innerText.includes("Net = doğru")'), false);
    assert.equal(await ev('document.documentElement.scrollWidth<=innerWidth+1'), true);
    assert.equal(await ev('grid.querySelector(".ag-header-cell[col-id=number] .ag-header-cell-text").textContent'), 'N');
    const sizes = await ev('(()=>{const w=key=>grid.querySelector(`.ag-header-cell[col-id="${key}"]`)?.getBoundingClientRect().width;return {title:w("title"),religion:w("branch-religion"),filters:[...grid.querySelectorAll(".ag-header-cell-filter-button")].map(button=>button.closest(".ag-header-cell").getAttribute("col-id")),removed:grid.querySelectorAll("[col-id=blank],[col-id=latestTytNet]").length}})()');
    assert.equal(sizes.title, 64); if (width > 1000) assert.equal(sizes.religion, 40);
    assert.equal(sizes.removed, 0);
    assert.deepEqual(sizes.filters.sort(), ['date', 'title']);
    const dates = await cellValues('date');
    if (width > 1000) assert.ok(dates.every(date=>/^\d{2}[./]\d{2}$/.test(date)), JSON.stringify(dates));
    const horizontal = await ev('(()=>{const el=grid.querySelector(".ag-body-horizontal-scroll-viewport");return {width:el.clientWidth,content:el.scrollWidth}})()');
    if (width > 1000) assert.ok(horizontal.content <= horizontal.width+1, JSON.stringify(horizontal));
    await open('title');
    assert.equal(await ev('document.querySelectorAll(".grid-selection-values input[type=checkbox]").length'), new Set(rows.map(row => row.title)).size);
    await ev('document.querySelector(".grid-selection-values input[type=checkbox]").click()');
    await wait(`[...document.querySelectorAll('.statistics-summary .ag-cell[col-id=sessions]')].reduce((n,cell)=>n+Number(cell.textContent),0)===${rows.length - 1}`);
    await clickButton('Bu filtreyi temizle'); await close();
    await wait(`[...document.querySelectorAll('.statistics-summary .ag-cell[col-id=sessions]')].reduce((n,cell)=>n+Number(cell.textContent),0)===${rows.length}`);
    await ev("grid.querySelector('.ag-header-cell[col-id=number] .ag-header-cell-label').click()");
    assert.deepEqual(await cellValues('number'), rows.map((_,i)=>String(i+1)));
    // Scroll the date header into view on narrow screens, then exercise date sorting.
    await ev('grid.querySelector(".ag-body-horizontal-scroll-viewport").scrollLeft=0');
    await open('date'); await clickButton('Yeniden eskiye'); await close();
    await pause(350);
    const ordered = [...rows].sort((a,b)=>Date.parse(b.submittedAt)-Date.parse(a.submittedAt));
    const seen = new Map();
    const extent = await ev('grid.querySelector(".ag-body-horizontal-scroll-viewport").scrollWidth');
    for (let left = 0; left < extent + width; left += Math.min(500, width - 40)) {
      await ev(`grid.querySelector('.ag-body-horizontal-scroll-viewport').scrollLeft=${left}`); await pause(50);
      const cells = await ev(`[...grid.querySelectorAll('.ag-cell[col-id^="branch-"]')].map(cell=>({column:cell.getAttribute('col-id'),index:Number(cell.closest('.ag-row').getAttribute('row-index')),text:cell.textContent,align:getComputedStyle(cell).textAlign,justify:getComputedStyle(cell).justifyContent}))`);
      for (const cell of cells) {
        const key = cell.column.slice(7);
        const value = groupExamBranches(ordered[cell.index].bySubject)[key];
        assert.equal(cell.text, value ? `${value.correct}/${value.wrong}` : '—', JSON.stringify(cell));
        assert.equal(cell.align, 'center'); assert.equal(cell.justify, 'center');
        seen.set(`${cell.index}:${cell.column}`, true);
      }
      const headers = await ev(`[...grid.querySelectorAll('.ag-header-cell-label')].map(el=>getComputedStyle(el).justifyContent)`);
      assert.ok(headers.every(value=>value==='center'));
    }
    assert.equal(seen.size, rows.length * EXAM_BRANCHES.length);
    await ev(`grid.querySelector('.ag-body-horizontal-scroll-viewport').scrollLeft=100000`);
    await ev('grid.querySelector(".ag-body-horizontal-scroll-viewport").scrollLeft=0');
    await pause(100);
    await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }).then(result => writeFileSync(join(output, `${live?'live':'fixture'}-${width}.png`), Buffer.from(result.result.data, 'base64')));
    checks.push({ width, rows: rows.length, removedCopyAndSearch: 'PASS', narrowedColumnsAndOnlyTitleDateFilters: 'PASS', separateTytAytSummary: 'PASS', fixedBranches: EXAM_BRANCHES.length, branchCellsVerified: seen.size, centeredHeadersAndCells: 'PASS', checklistAndSummary: 'PASS', sort: 'PASS', fitsDesktop: width > 1000 ? 'PASS' : 'table scrolls within page' });
  }
  assert.equal(errors.length, 0, JSON.stringify(errors));
  const report = { status: 'PASS', mode: live ? 'live' : 'fixture', checks, runtimeErrors: 0 };
  writeFileSync(join(output, live ? 'live-report.json' : 'ui-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { socket?.close(); chrome.kill(); server?.close(); }


