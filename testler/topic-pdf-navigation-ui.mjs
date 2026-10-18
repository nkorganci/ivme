// Isolated browser check for topic PDF filters. Run after frontend `npm run build`.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../frontend/dist', import.meta.url));
const rows = [
  { id: 1, title: 'Paragraf', exam: 'TYT', subject: 'turkce', kind: 'topic_summary',
    grade: 9, pageCount: 12, status: 'available' },
  { id: 2, title: 'Fonksiyonlar', exam: 'AYT', subject: 'matematik', kind: 'presentation',
    grade: 11, pageCount: 18, status: 'available' },
  { id: 3, title: 'Üslü Sayılar', exam: 'TYT-AYT', subject: 'matematik', kind: 'topic_summary',
    grade: 9, pageCount: 5, status: 'available' },
];
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const json = (value) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(value));
  };
  if (url.pathname === '/api/auth/me') return json({ id: 1, username: 'student',
    role: 'USER', contactComplete: true });
  if (url.pathname === '/api/topic-pdfs/filters') return json({
    exams: ['AYT', 'TYT', 'TYT-AYT'], subjects: ['matematik', 'turkce'],
    kinds: ['presentation', 'topic_summary'], grades: [9, 11],
    facets: rows.map(({ exam, subject, grade, kind }) => ({ exam, subject, grade, kind, count: 1 })),
  });
  if (url.pathname === '/api/topic-pdfs') {
    const { searchParams: params } = url;
    const exam = params.get('exam');
    const found = rows.filter((item) => (!exam || item.exam === exam
      || (item.exam === 'TYT-AYT' && ['TYT', 'AYT'].includes(exam)))
      && ['subject', 'grade', 'kind'].every((key) => !params.get(key) || String(item[key]) === params.get(key))
      && item.title.toLocaleLowerCase('tr').includes((params.get('q') || '').toLocaleLowerCase('tr')));
    return json({ content: found, page: 0, size: 40,
      totalElements: found.length, totalPages: found.length ? 1 : 0 });
  }
  if (/^\/api\/topic-pdfs\/\d+$/.test(url.pathname)) {
    return json(rows.find((item) => item.id === Number(url.pathname.split('/').at(-1))));
  }
  if (url.pathname.startsWith('/api/')) return json([]);
  const safe = url.pathname.startsWith('/assets/') ? url.pathname.slice(1) : 'index.html';
  const file = resolve(dist, safe);
  if (!file.startsWith(dist + sep) && file !== resolve(dist, 'index.html')) {
    res.writeHead(404); return res.end();
  }
  try {
    const body = readFileSync(file);
    res.writeHead(200, { 'Content-Type': extname(file) === '.js' ? 'text/javascript'
      : extname(file) === '.css' ? 'text/css' : 'text/html' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const site = `http://127.0.0.1:${server.address().port}`;
const profile = mkdtempSync(join(tmpdir(), 'topic-pdf-navigation-'));
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
  const response = await cdp('Runtime.evaluate', { expression, returnByValue: true });
  if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.text);
  return response.result.result.value;
};
const waitFor = async (expression) => {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error(`UI bekleneni göstermedi: ${expression}; içerik=${String(await evaluate('document.body.innerText')).slice(0, 500)}`);
};
try {
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  for (const width of [1280, 390]) {
    await cdp('Emulation.setDeviceMetricsOverride', {
      width, height: 900, deviceScaleFactor: 1, mobile: width === 390,
    });
    await cdp('Page.navigate', { url: site + '/konu-anlatimlari' });
    await waitFor('document.querySelectorAll(".ag-row").length === 3');
    const headers = await evaluate('[...document.querySelectorAll(".ag-header-cell-text")].map(x => x.innerText)');
    if (headers.join('|') !== 'Konu / PDF başlığı|Ders|Sınav|Sınıf|Kaynak türü|Sayfa|PDF') {
      throw new Error(`Başlıklar yanlış: ${headers}`);
    }
    if (width === 1280 && !await evaluate('document.querySelector(".topic-pdf-grid").scrollWidth <= document.querySelector(".topic-pdf-grid").clientWidth + 1')) {
      const widths = await evaluate('({table: document.querySelector(".topic-pdf-grid").scrollWidth, visible: document.querySelector(".topic-pdf-grid").clientWidth})');
      throw new Error(`Masaüstü tablosu yatay kaydırma gerektiriyor: ${JSON.stringify(widths)}`);
    }
    await evaluate('[...document.querySelectorAll("button.topic-pdf-choice")].find(x => x.innerText === "AYT")?.click()');
    await waitFor('document.querySelectorAll(".ag-row").length === 2');
    await evaluate('[...document.querySelectorAll("button.topic-pdf-choice")].find(x => x.innerText === "TYT")?.click()');
    await waitFor('document.querySelectorAll(".ag-row").length === 2');
    await evaluate('[...document.querySelectorAll("button.topic-pdf-choice")].find(x => x.innerText === "9")?.click()');
    await waitFor('document.querySelector(".topic-pdf-results-title")?.innerText.includes("9. sınıf")');
    await evaluate('[...document.querySelectorAll("button.topic-pdf-subject")].find(x => x.innerText.includes("Matematik"))?.click()');
    await waitFor('document.querySelectorAll(".ag-row").length === 1 && document.querySelector(".ag-row")?.innerText.includes("Üslü Sayılar")');
    await evaluate('document.querySelector(".ag-row a")?.click()');
    await waitFor('location.pathname === "/konu-anlatimlari/3"');
    await evaluate('document.querySelector(".page-head a")?.click()');
    await waitFor('location.pathname === "/konu-anlatimlari" && location.search.includes("subject=matematik")');
    if (width === 390 && !await evaluate('document.querySelector(".topic-pdf-grid").scrollWidth > document.querySelector(".topic-pdf-grid").clientWidth && document.documentElement.scrollWidth <= innerWidth + 1')) {
      throw new Error('Mobil tabloda yatay kaydırma veya sayfa genişliği yanlış.');
    }
    await evaluate('document.querySelector(".topic-pdf-clear")?.click()');
    await waitFor('document.querySelectorAll(".ag-row").length === 3 && !location.search');
    await evaluate('document.querySelector("#topic-pdf-search")?.focus()');
    await cdp('Input.insertText', { text: 'Fonksiyonlar' });
    await evaluate('document.querySelector(".topic-pdf-search button")?.click()');
    await waitFor('document.querySelectorAll(".ag-row").length === 1 && document.querySelector(".ag-row")?.innerText.includes("Fonksiyonlar")');
    console.log(`OK ${width}px konu PDF filtresi ve tablo`);
  }
} finally {
  socket.close();
  chrome.kill();
  server.close();
  if (resolve(profile).startsWith(resolve(tmpdir()) + sep)) {
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
    catch { /* Chrome may still hold its profile briefly on Windows. */ }
  }
}
