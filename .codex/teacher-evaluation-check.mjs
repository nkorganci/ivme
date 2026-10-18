// Isolated browser verification; no real student data is modified. Run after npm run build.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const dist = resolve('frontend/dist');
let rows = [{ id: 1, date: '2000-10-12', start: '09:00:00', end: '10:00:00', topic: 'Eski konu', homework: 'Test 1', status: 'COMPLETED', note: 'Eski not', files: [] }];
let saves = 0;
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const json = (data) => { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
  if (path === '/api/auth/me') return json({ id: 1, username: 'student', role: 'USER', contactComplete: true });
  if (path === '/api/math-tutoring' && req.method === 'GET') return json(rows);
  if (path.startsWith('/api/math-tutoring') && ['POST', 'PATCH'].includes(req.method)) {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const input = JSON.parse(body);
      const id = req.method === 'POST' ? rows.length + 1 : Number(path.split('/').at(-1));
      const row = { ...input, id, files: [] };
      rows = req.method === 'POST' ? [...rows, row] : rows.map((old) => old.id === id ? row : old);
      saves++; json(row);
    }); return;
  }
  if (path.startsWith('/api/')) return json([]);
  const file = resolve(dist, path.startsWith('/assets/') ? path.slice(1) : 'index.html');
  try { const body = readFileSync(file); res.writeHead(200, { 'Content-Type': extname(file) === '.js' ? 'text/javascript' : extname(file) === '.css' ? 'text/css' : 'text/html' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const site = `http://127.0.0.1:${server.address().port}`;
const profile = mkdtempSync(join(tmpdir(), 'math-learning-ui-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--disable-gpu', 'about:blank',
], { stdio: 'ignore' });
let ws;
for (let attempt = 0; attempt < 80 && !ws; attempt++) {
  try {
    const port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
    ws = (await (await fetch(`http://127.0.0.1:${port}/json`)).json())
      .find((page) => page.type === 'page')?.webSocketDebuggerUrl;
  } catch { await new Promise((done) => setTimeout(done, 100)); }
}
if (!ws) throw new Error('Chrome CDP başlatılamadı.');
const socket = new WebSocket(ws);
await new Promise((done) => { socket.onopen = done; });
let sequence = 0;
const pending = new Map();
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
};
const cdp = (method, params = {}) => new Promise((done) => {
  const id = ++sequence;
  pending.set(id, done);
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const response = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.exception?.description || response.result.exceptionDetails.text);
  return response.result.result.value;
};
const waitFor = async (expression) => {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error(`UI bekleneni göstermedi: ${expression}; içerik=${String(await evaluate('document.body.innerText')).slice(0, 500)}`);
};
const route = '/ogrenci-takip/matematik-ozel-ders';
const value = 'Öğrenci konuyu kavradı.\n' + 'İşlem adımlarını açıklayabiliyor; dikkat hataları için ek çalışma ve tekrar önerildi. '.repeat(12);
async function showEvaluation() {
  await waitFor('!!document.querySelector(".math-grid .ag-body-horizontal-scroll-viewport")');
  await evaluate('(() => { const x = document.querySelector(".math-grid .ag-body-horizontal-scroll-viewport"); x.scrollLeft = x.scrollWidth; })()');
  await waitFor(`!!document.querySelector('textarea[aria-label="Ders 1 öğretmen değerlendirmesi"]')`);
}
try {
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: site + route }); await showEvaluation();
  const header = await evaluate('(() => { const x = document.querySelector(".math-evaluation-header .ag-header-cell-text"); return {text:x.textContent, height:x.getBoundingClientRect().height, whiteSpace:getComputedStyle(x).whiteSpace}; })()');
  assert.equal(header.text, 'Öğretmen\nDeğerlendirmesi');
  assert.equal(header.whiteSpace, 'pre-line');
  assert.ok(header.height > 30 && header.height < 60, JSON.stringify(header));
  await evaluate(`(() => { const x = document.querySelector('textarea[aria-label="Ders 1 öğretmen değerlendirmesi"]'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(x, ${JSON.stringify(value)}); x.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  await waitFor(`document.querySelector('textarea[aria-label="Ders 1 öğretmen değerlendirmesi"]')?.value === ${JSON.stringify(value)}`);
  await waitFor('document.querySelector("textarea[aria-label$=değerlendirmesi]").getBoundingClientRect().height > 150');
  await waitFor(`[...document.querySelectorAll('.math-grid button')].some(x=>x.textContent === 'Kaydet')`);
  await evaluate(`[...document.querySelectorAll('.math-grid button')].find(x=>x.textContent === 'Kaydet').click()`);
  await waitFor('document.querySelector("[role=status]")?.textContent.includes("Ders kaydedildi")');
  assert.equal(rows[0].learning.teacherEvaluation, value);
  for (const width of [1440, 390]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
    await cdp('Page.navigate', { url: site + route }); await showEvaluation();
    await waitFor(`document.querySelector('textarea[aria-label="Ders 1 öğretmen değerlendirmesi"]')?.value === ${JSON.stringify(value)}`);
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'));
    console.log(`OK ${width}px: final column, two-line heading, long multiline evaluation saved and restored`);
  }
} finally {
  socket.close(); chrome.kill(); server.close();
  await new Promise(done => setTimeout(done, 700));
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
