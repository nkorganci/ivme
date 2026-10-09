// Isolated browser check for the reviewed PDF -> practice/exam builder flow.
// Run after `npm run build` in frontend. No live API or database is contacted.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../frontend/dist', import.meta.url));
const fixture = {
  id: 1099, title: 'NOKTALAMA İŞARETLERİ', exam: 'TYT', subject: 'turkce',
  kind: 'topic_summary', pageCount: 1, status: 'available', verifiedTopic: 'Noktalama İşaretleri',
};
const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const json = (value, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(value));
  };
  if (pathname === '/api/auth/me') return json({ id: 1, username: 'test', role: 'USER', contactComplete: true, passwordChangeRequired: false });
  if (pathname === '/api/account/contact') return json({ email: 'test@example.com', phone: '+905551112233' });
  if (pathname === '/api/study-sessions/active') { res.writeHead(204); return res.end(); }
  if (pathname === '/api/questions/filters') return json([]);
  if (pathname === '/api/questions/availability') {
    const query = new URL(req.url, 'http://localhost').searchParams;
    return query.get('topicPdfId') === '1099'
      ? json({ total: 3, solved: 1, remaining: 2, everWrong: 1 })
      : json({ total: 0, solved: 0, remaining: 0, everWrong: 0 });
  }
  if (pathname === '/api/topic-pdfs/1099') return json(fixture);
  if (pathname === '/api/topic-pdfs/1099/file') {
    res.writeHead(200, { 'Content-Type': 'application/pdf' });
    return res.end('%PDF-1.4\n%%EOF');
  }
  const safe = pathname.startsWith('/assets/') ? pathname.slice(1) : 'index.html';
  const file = resolve(dist, safe);
  if (!file.startsWith(dist)) { res.writeHead(404); return res.end(); }
  try {
    const body = readFileSync(file);
    res.writeHead(200, { 'Content-Type': extname(file) === '.js' ? 'text/javascript'
      : extname(file) === '.css' ? 'text/css' : 'text/html' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const site = `http://127.0.0.1:${server.address().port}`;
const profile = mkdtempSync(join(tmpdir(), 'topic-pdf-ui-'));
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
  for (let i = 0; i < 80; i++) {
    if (await evaluate(expression)) return;
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error(`UI bekleneni göstermedi: ${expression}; sayfa=${await evaluate('location.href')}; içerik=${String(await evaluate('document.body.innerText')).slice(0, 400)}`);
};
try {
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  for (const width of [1280, 390]) {
    await cdp('Emulation.setDeviceMetricsOverride', {
      width, height: 900, deviceScaleFactor: 1, mobile: width === 390,
    });
    for (const [page, expected] of [
      ['/konu-anlatimlari/1099', 'Bu konudan soru çöz'],
      ['/pratik/yeni?topicPdfId=1099', 'Konu PDF\'sinden doğrulanmış sorular'],
      ['/sinav/yeni?topicPdfId=1099', 'Konu PDF\'sinden doğrulanmış sorular'],
      ['/hesap', 'Verilerimi indir'],
    ]) {
      await cdp('Page.navigate', { url: site + page });
      await waitFor(`document.body.innerText.includes(${JSON.stringify(expected)})`);
      if (page.includes('yeni')) {
        await waitFor('document.body.innerText.includes("3")');
        await waitFor('document.body.innerText.includes("Henüz doğrulanmış zorluk etiketi yok")');
        if (await evaluate('!![...document.querySelectorAll("label")].find(x => x.innerText === "Kaynak")')) {
          throw new Error(`${width}px ${page}: kapsam filtresi görünür kaldı`);
        }
      }
      if (page === '/hesap') await waitFor('document.body.innerText.includes("Hesabımı sil")');
      if (await evaluate('document.documentElement.scrollWidth > innerWidth + 1')) {
        throw new Error(`${width}px ${page}: yatay taşma`);
      }
      console.log(`OK ${width}px ${page}`);
    }
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
