import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeRows } from '../frontend/src/studentSchedule.js';

const base = process.argv[2] || 'http://127.0.0.1:1010';
const browser = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
assert.ok(browser);
const profile = mkdtempSync(join(tmpdir(), 'ivme-time-ui-'));
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
  assert.ok(target?.webSocketDebuggerUrl);
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => { socket.onopen = resolve; });
  let seq = 0;
  const pending = new Map();
  let stored = { rows: makeRows(), revision: 1 };
  let saveCount = 0;
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
    if (message.method === 'Fetch.requestPaused') {
      const request = message.params.request;
      if (request.method === 'PUT') {
        const body = JSON.parse(request.postData);
        assert.equal(body.revision, stored.revision);
        stored = { rows: body.rows, revision: stored.revision + 1 };
        saveCount++;
      }
      void cdp('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: 200,
        responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
        body: Buffer.from(JSON.stringify(stored)).toString('base64') });
    }
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
      try { if (await evaluate(`!!(${expression})`)) return; } catch { /* navigation */ }
      await pause(100);
    }
    throw Error(`Timed out: ${expression}`);
  };
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Page.navigate', { url: `${base}/giris` });
  await wait("document.cookie.includes('XSRF-TOKEN=')");
  assert.equal(await evaluate(`fetch('/api/auth/dev-login', {method:'POST',headers:{'X-XSRF-TOKEN':decodeURIComponent(document.cookie.split('; ').find(c=>c.startsWith('XSRF-TOKEN=')).split('=')[1])}}).then(r=>r.status)`), 200);
  await cdp('Fetch.enable', { patterns: [{ urlPattern: `${base}/api/student-program/weeks/*` }] });
  await cdp('Page.navigate', { url: `${base}/ogrenci-takip` });
  await wait("!!document.querySelector('input[aria-label=\"1. saat aralığı\"]')");
  const initial = await evaluate(`(() => { const input = document.querySelector('input[aria-label="1. saat aralığı"]');
    input.focus(); input.select(); return { value: input.value, readOnly: input.readOnly, focused: document.activeElement === input }; })()`);
  assert.equal(initial.readOnly, false);
  assert.equal(initial.focused, true);
  await cdp('Input.insertText', { text: '08:30-09:45' });
  await pause(200);
  const typed = await evaluate(`(() => { const input = document.querySelector('input[aria-label="1. saat aralığı"]');
    return { value: input.value, focused: document.activeElement === input }; })()`);
  assert.equal(typed.value, '08:30-09:45');
  assert.equal(typed.focused, true);
  await evaluate(`document.querySelector('input[aria-label="1. saat aralığı"]').blur()`);
  await wait(`document.querySelector('input[aria-label="1. saat aralığı"]')?.value === '08:30-09:45'`);
  await wait(`document.querySelector('input[aria-label="2. saat aralığı"]')?.value === '09:45-10:45'`);
  for (let i = 0; i < 100 && saveCount === 0; i++) await pause(100);
  assert.ok(saveCount > 0);
  assert.equal(stored?.rows?.[0]?.start, 510);
  assert.equal(stored.rows[0].minutes, 75);
  await cdp('Page.reload', { ignoreCache: true });
  await wait(`document.querySelector('input[aria-label="1. saat aralığı"]')?.value === '08:30-09:45'`);
  assert.equal(await evaluate(`document.querySelector('input[aria-label="2. saat aralığı"]').value`), '09:45-10:45');
  const originalCount = stored.rows.length;
  await evaluate(`document.querySelector('.tracking-bottom-actions button:last-child').click()`);
  for (let i = 0; i < 100 && stored.rows.length !== originalCount - 1; i++) await pause(100);
  assert.equal(stored.rows.length, originalCount - 1);
  await evaluate(`document.querySelector('.tracking-bottom-actions button:last-child').click()`);
  for (let i = 0; i < 100 && stored.rows.length !== originalCount - 2; i++) await pause(100);
  assert.equal(stored.rows.length, originalCount - 2);
  await evaluate(`document.querySelector('button[aria-label="1. satırdan sonra ekle"]').click()`);
  await wait(`document.querySelector('input[aria-label="3. saat aralığı"]')?.value === '10:45-11:45'`);
  for (let i = 0; i < 100 && stored.rows.length !== originalCount - 1; i++) await pause(100);
  assert.equal(stored.rows.length, originalCount - 1);
  await evaluate(`document.querySelector('button[aria-label="2. satırı sil"]').click()`);
  await wait(`document.querySelector('input[aria-label="3. saat aralığı"]')?.value === '10:45-11:45'`);
  for (let i = 0; i < 100 && stored.rows.length !== originalCount - 2; i++) await pause(100);
  assert.equal(stored.rows.length, originalCount - 2);
  stored.rows.at(-1).cells[0] = 'Eski not';
  await cdp('Page.reload', { ignoreCache: true });
  await wait(`document.querySelector('input[aria-label="1. saat aralığı"]')?.value === '08:30-09:45'`);
  await evaluate(`(() => { const input = document.querySelector('input[aria-label="1. saat aralığı"]'); input.focus(); input.select(); })()`);
  await cdp('Input.insertText', { text: '12:00-13:00' });
  await evaluate(`document.querySelector('input[aria-label="1. saat aralığı"]').blur()`);
  await wait(`document.querySelector('input[aria-label="2. saat aralığı"]')?.value === '13:00-14:00'`);
  assert.equal(await evaluate(`document.body.innerText.includes('Bu değişiklik gün sonundaki not')`), false);
  for (let i = 0; i < 100 && stored.rows.at(-1)?.cells[0] === 'Eski not'; i++) await pause(100);
  assert.ok(stored.rows.every(row => row.cells[0] !== 'Eski not'));
  console.log(JSON.stringify({ initial, typed, stored: { start: stored.rows[0].start, minutes: stored.rows[0].minutes },
    next: await evaluate(`document.querySelector('input[aria-label="2. saat aralığı"]').value`), rowActions: true }));
} finally {
  socket?.close();
  child.kill();
  await pause(300);
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch { /* Chrome cleanup */ }
}
