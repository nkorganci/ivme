// Canlı yerel uygulamada haftalık ekranın ve yeni API'nin salt okunur kabulü.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const base = process.argv[2] || 'http://127.0.0.1:1011';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const browser = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
assert.ok(browser, 'Chrome veya Edge gerekli');
const profile = mkdtempSync(join(tmpdir(), 'ivme-program-read-'));
const child = spawn(browser, ['--headless=new', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'],
{ stdio: 'ignore', windowsHide: true });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let target;
  for (let i = 0; i < 100 && !target; i++) {
    try {
      const port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
      target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page');
    } catch { await pause(100); }
  }
  assert.ok(target?.webSocketDebuggerUrl, 'Tarayıcı başlatılamadı');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => { socket.onopen = resolve; });
  let seq = 0;
  const pending = new Map();
  const errors = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
    if (message.method === 'Runtime.exceptionThrown')
      errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  };
  const cdp = (method, params = {}) => new Promise(resolve => {
    const id = ++seq;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.result.exceptionDetails) throw Error(result.result.exceptionDetails.text);
    return result.result.result.value;
  };
  const wait = async expression => {
    for (let i = 0; i < 200; i++) {
      try { if (await evaluate(`!!(${expression})`)) return; } catch { /* gezinme sürüyor */ }
      await pause(100);
    }
    throw Error(`Ekran yüklenmedi: ${expression}`);
  };
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Page.navigate', { url: `${base}/giris` });
  await wait("document.cookie.split('; ').some(c=>c.startsWith('XSRF-TOKEN=')) || document.cookie.split('; ').some(c=>c.startsWith('XSRF-TOKEN-DEV='))");
  const loginStatus = await evaluate(`fetch('/api/auth/dev-login', {method:'POST',headers:{'X-XSRF-TOKEN':decodeURIComponent(document.cookie.split('; ').find(c=>c.startsWith('XSRF-TOKEN')).split('=').slice(1).join('='))}}).then(r=>r.status)`);
  assert.equal(loginStatus, 200);
  await cdp('Page.navigate', { url: `${base}/ogrenci-takip` });
  await wait("document.body.innerText.includes('Çizelge hesabınızda saklanır')");
  await wait("!document.body.innerText.includes('Program veritabanından yükleniyor')");
  const state = await evaluate(`Promise.all([
    fetch('/api/student-program/weeks/2026-10-19').then(r=>r.status),
    fetch('/api/preferences/sidebar-rail').then(r=>r.status),
    fetch('/api/tyt-trials').then(r=>r.status),
    fetch('/api/ayt-trials').then(r=>r.status),
    fetch('/api/math-tutoring').then(r=>r.status),
    fetch('/api/curriculum/progress').then(r=>r.status),
    fetch('/api/study-sessions?page=0&size=1').then(r=>r.status),
    fetch('/api/exams?page=0&size=1').then(r=>r.status)
  ])`);
  assert.deepEqual(state, Array(8).fill(200));
  const routes = [
    '/', '/konular-ve-kaynaklar', '/akilli-ogretmen', '/oneriler',
    '/ogrenci-takip', '/ogrenci-takip/matematik-ozel-ders',
    '/ogrenci-takip/tyt-denemeleri', '/ogrenci-takip/ayt-denemeleri',
    '/calisma/yeni', '/gecmis', '/geri-bildirim', '/hesap',
  ];
  for (const route of routes) {
    await cdp('Page.navigate', { url: base + route });
    await wait(`location.pathname === ${JSON.stringify(route)} && !!document.querySelector('main#icerik h1, main#icerik h2')`);
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ screen: 'Haftalık Program', apiStatuses: state, sidebarRoutes: routes.length, runtimeErrors: errors }));
} finally {
  socket?.close();
  child.kill();
  await new Promise(resolve => {
    if (child.exitCode !== null) resolve();
    else { child.once('exit', resolve); setTimeout(resolve, 3000); }
  });
  if (dirname(resolve(profile)) === resolve(tmpdir()) && basename(profile).startsWith('ivme-program-read-')) {
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
    catch (error) { console.warn(`Geçici tarayıcı profili kaldı: ${error.code}`); }
  }
}
