// Local diagnostics: signs in through the local student auto-login and prints API responses as JSON.
// Usage: node testler/api-probe.mjs "/api/questions/filters?bank=CIKMIS" ["/api/..."]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const site = 'http://127.0.0.1:1010';
const profile = fs.mkdtempSync(join(tmpdir(), 'ivme-probe-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore', windowsHide: true });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let ws;
  for (let n = 0; n < 150 && !ws; n++) {
    try { const port = Number(fs.readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
      ws = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(p => p.type === 'page')?.webSocketDebuggerUrl; } catch {}
    if (!ws) await pause(100);
  }
  socket = new WebSocket(ws); await new Promise(resolve => socket.onopen = resolve);
  let sequence = 0; const pending = new Map();
  socket.onmessage = ({ data }) => { const m = JSON.parse(data); if (pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
  const cdp = (method, params = {}) => new Promise(resolve => { const id = ++sequence; pending.set(id, resolve); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => (await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;
  await cdp('Page.navigate', { url: site + '/' });
  for (let n = 0; n < 300 && !(await evaluate(`!!document.querySelector('.sidenav')`)); n++) await pause(100);
  for (const path of process.argv.slice(2))
    console.log(path, await evaluate(`fetch(${JSON.stringify(path)}).then(async r=>r.status+' '+await r.text())`));
} finally { socket?.close(); chrome.kill(); }
