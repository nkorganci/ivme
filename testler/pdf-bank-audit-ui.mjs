// Read-only smoke check against the served main site and its PDF proof view.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const profile = fs.mkdtempSync(join(tmpdir(), 'ivme-pdf-audit-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore', windowsHide: true });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let ws;
  for (let i = 0; i < 150 && !ws; i++) {
    try {
      const port = Number(fs.readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
      ws = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(page => page.type === 'page')?.webSocketDebuggerUrl;
    } catch {}
    if (!ws) await pause(100);
  }
  assert.ok(ws, 'Chrome started');
  socket = new WebSocket(ws);
  await new Promise(resolve => socket.onopen = resolve);
  let seq = 0;
  const pending = new Map();
  const errors = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      message.error ? reject(Error(message.error.message)) : resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  };
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq; pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evalJs = async expression => {
    const response = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (response.exceptionDetails) throw Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  };
  const wait = async expression => {
    for (let i = 0; i < 200; i++) {
      try { if (await evalJs(`Boolean(${expression})`)) return; } catch {}
      await pause(100);
    }
    throw Error(`Timed out: ${expression}\n${await evalJs('document.body.innerText.slice(-1200)')}`);
  };
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Page.navigate', { url: 'http://127.0.0.1:1010/' });
  await wait('document.readyState === "complete"');
  const login = await evalJs(`(async () => {
    await fetch('/api/auth/me');
    const token = decodeURIComponent(document.cookie.split('; ').find(x => x.startsWith('XSRF-TOKEN='))?.split('=')[1] || '');
    return (await fetch('/api/auth/dev-login', {method:'POST',headers:{'X-XSRF-TOKEN':token}})).status;
  })()`);
  assert.equal(login, 200);
  await cdp('Page.navigate', { url: 'http://127.0.0.1:1010/dersler-ve-konular/pdf-envanteri' });
  await wait('document.body.innerText.includes("PDF envanteri") && document.querySelectorAll(".ag-row").length > 0');
  const initial = await evalJs('document.body.innerText');
  assert.match(initial, /2\.693 fiziksel PDF/);
  assert.match(initial, /2\.708 katalog kaydı/);
  assert.match(initial, /Kanıtlı banka sorusu var/);
  assert.match(initial, /İşlendi \(kapsam açık\)/);
  assert.match(initial, /İşlenmedi \/ doğrulanmadı/);
  assert.match(initial, /Arşivde/);
  await evalJs(`(() => { const bar = document.querySelector('.ag-body-horizontal-scroll-viewport');
    bar.scrollLeft = bar.scrollWidth; bar.dispatchEvent(new Event('scroll')); return true; })()`);
  await wait(`[...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Göster')`);
  await evalJs(`[...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Göster').click()`);
  await wait('document.body.innerText.includes("Soru çıkarma listesine al")');
  const proof = await evalJs('document.body.innerText');
  assert.match(proof, /hash kontrolü: doğrulandı/);
  assert.match(proof, /PDF sayfası/);
  assert.match(proof, /Arşiv incelemesine al/);
  const candidate = await evalJs(`fetch('/api/pdf-bank-audit/335/candidates').then(async response =>
    ({ status: response.status, body: await response.json() }))`);
  assert.equal(candidate.status, 200);
  assert.equal(candidate.body.questionCount, 60);
  const candidateImage = await evalJs(`fetch('/api/pdf-bank-audit/335/candidates/mn-test-04-01-60/image').then(response =>
    ({ status: response.status, contentType: response.headers.get('content-type') }))`);
  assert.equal(candidateImage.status, 200);
  assert.match(candidateImage.contentType, /image\/webp/);
  assert.deepEqual(errors, []);
  console.log('PDF audit UI: 2,693 physical files, 2,708 catalog rows, 60 candidates, proof and work controls OK');
} finally {
  socket?.close();
  chrome.kill();
  await pause(500);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}
