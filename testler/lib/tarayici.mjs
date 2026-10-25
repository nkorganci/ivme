// Ortak headless Chrome + DevTools (CDP) yardımcısı. UI betikleri aynı kurulum kodunu
// tekrar yazmak yerine bunu kullanır. Yalnız yerel 1010 uygulaması için tasarlandı.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const BASE = process.env.IVME_URL || 'http://127.0.0.1:1010';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Rol adları: student (varsayılan), admin, teacher, parent, operator. */
const LOGIN_PATHS = {
  student: '/api/auth/dev-switch/USER', admin: '/api/auth/dev-switch/ADMIN',
  teacher: '/api/auth/dev-switch/TEACHER', parent: '/api/auth/dev-switch/PARENT',
  operator: '/api/auth/dev-teacher-review-login',
};

export async function tarayiciAc({ mobile = false } = {}) {
  // Her çalıştırma kendi profilini kullanır; kullanıcının açık Chrome'u etkilenmez.
  const profile = fs.mkdtempSync(join(tmpdir(), 'ivme-cdp-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore', windowsHide: true });
  let ws;
  for (let i = 0; i < 150 && !ws; i++) {
    try {
      const port = Number(fs.readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
      ws = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(page => page.type === 'page')?.webSocketDebuggerUrl;
    } catch {}
    if (!ws) await pause(100);
  }
  if (!ws) { chrome.kill(); throw Error('Chrome başlatılamadı'); }
  const socket = new WebSocket(ws);
  await new Promise(resolve => socket.onopen = resolve);
  let seq = 0;
  const pending = new Map();
  const errors = [];
  const failedRequests = [];
  const requests = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      message.error ? reject(Error(message.error.message)) : resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown')
      errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error')
      errors.push(message.params.args.map(arg => arg.value ?? arg.description ?? '').join(' '));
    if (message.method === 'Network.requestWillBeSent') requests.set(message.params.requestId, message.params.request.url);
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 400)
      failedRequests.push({ status: message.params.response.status, url: message.params.response.url });
    if (message.method === 'Network.loadingFailed' && !message.params.canceled)
      failedRequests.push({ status: 0, url: requests.get(message.params.requestId), error: message.params.errorText });
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
  const wait = async (expression, timeoutMs = 20000) => {
    for (let elapsed = 0; elapsed < timeoutMs; elapsed += 100) {
      try { if (await evalJs(`Boolean(${expression})`)) return; } catch {}
      await pause(100);
    }
    throw Error(`Zaman aşımı: ${expression}`);
  };
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Network.enable');
  await cdp('Emulation.setDeviceMetricsOverride', mobile
    ? { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }
    : { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

  const goto = async path => {
    await cdp('Page.navigate', { url: new URL(path, BASE).href });
    await wait('document.readyState === "complete"');
  };
  const login = async (role = 'student') => {
    const path = LOGIN_PATHS[role];
    if (!path) throw Error(`Bilinmeyen rol: ${role}`);
    if (!(await evalJs('location.origin')).startsWith('http')) await goto('/');
    const status = await evalJs(`(async () => {
      await fetch('/api/auth/me');
      const token = decodeURIComponent(document.cookie.split('; ').find(x => x.startsWith('XSRF-TOKEN='))?.split('=')[1] || '');
      return (await fetch(${JSON.stringify(path)}, {method: 'POST', headers: {'X-XSRF-TOKEN': token}})).status;
    })()`);
    if (status !== 200) throw Error(`Giriş başarısız (${role}): HTTP ${status}`);
  };
  /** AG Grid satırları sanal çizilir; dikey kaydırarak her çizilen hücrede kırpılmayı ölçer. */
  const clippedGridCells = () => evalJs(`(async () => {
    const out = [];
    for (const [index, grid] of [...document.querySelectorAll('.ag-root-wrapper')].entries()) {
      const viewport = grid.querySelector('.ag-body-vertical-scroll-viewport, .ag-body-viewport');
      const seen = new Set(); let clipped = 0; const samples = [];
      const scan = () => grid.querySelectorAll('.ag-cell, .ag-header-cell-text').forEach(cell => {
        const key = (cell.closest('.ag-row')?.getAttribute('row-index') ?? 'h') + ':' + (cell.getAttribute('col-id') ?? cell.textContent);
        if (seen.has(key)) return; seen.add(key);
        const target = cell.querySelector('.ag-cell-value, .ag-cell-wrapper') || cell;
        if (target.scrollWidth > target.clientWidth + 1 || target.scrollHeight > target.clientHeight + 1) {
          clipped++; if (samples.length < 5) samples.push(key + ' ' + cell.textContent.trim().slice(0, 60));
        }
      });
      scan();
      if (viewport) for (let top = 0; top < viewport.scrollHeight; top += viewport.clientHeight || 400) {
        viewport.scrollTop = top; viewport.dispatchEvent(new Event('scroll'));
        await new Promise(r => setTimeout(r, 60)); scan();
        if (seen.size > 20000) break;
      }
      if (viewport) { viewport.scrollTop = 0; viewport.dispatchEvent(new Event('scroll')); }
      out.push({ grid: index, cellsChecked: seen.size, clipped, samples });
    }
    return out;
  })()`);
  const screenshot = async file => {
    const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    return file;
  };
  const close = () => {
    try { socket.close(); } catch {}
    chrome.kill();
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  };
  return { cdp, evalJs, wait, goto, login, clippedGridCells, screenshot, close, errors, failedRequests };
}
