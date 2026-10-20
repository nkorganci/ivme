// Isolated answer/layout checks; --live only reads the served question and its tools.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const live = process.argv.includes('--live');
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = process.env.IVME_UI_DIST || join(root, 'frontend/dist');
const output = join(root, 'veri/content-labels/integration/question-workspace-20261017');
mkdirSync(output, { recursive: true });
const question = { id: 1, code: 'TYT-0001', bank: 'CIKMIS', examType: 'TYT', subject: 'Matematik',
  topic: 'Uzun konu adı ile soru çözüm ekranında tek satır başlık kontrolü', choiceCount: 5, helpfulness: {}, hasSolutionImage: true, hasApprovedHint: true };
let state, submissions, failNext = false;
const annotations = new Map();
const boards = new Map();
const reset = () => { state = { round: 1, attempts: [], canAnswer: true, roundComplete: false }; submissions = []; };
reset();
const server = live ? null : createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const json = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  if (url.pathname === '/api/auth/me') return json({ id: 1, username: 'student', role: 'USER', contactComplete: true });
  if (url.pathname === '/api/questions/code/TYT-0001') return json(question);
  if (url.pathname === '/api/questions/1/neighbor') return json(null);
  if (url.pathname === '/api/questions/1/hint') return json({ text: 'Uzun soruda verilen bilgileri sırayla değerlendir. '.repeat(20) });
  if (url.pathname === '/api/questions/1/practice') {
    if (req.method === 'POST') {
      let body = ''; for await (const chunk of req) body += chunk;
      const event = JSON.parse(body); submissions.push(event);
      if (failNext) { failNext = false; return json({ hata: 'Geçici bağlantı hatası' }, 503); }
      const correct = event.answer === 'B';
      const finished = correct || event.eventType !== 'ANSWER';
      state = { ...state, attempts: [...state.attempts, { eventType: event.eventType, selectedAnswer: event.answer, correct }],
        canAnswer: !finished, canReveal: !finished, remainingAttempts: 1, roundComplete: finished,
        correctAnswer: finished && event.eventType !== 'SKIP' ? 'B' : null };
    }
    return json(state);
  }
  if (url.pathname === '/api/study-sessions/77') return json({ id: 77, status: 'IN_PROGRESS',
    serverNow: new Date().toISOString(), deadlineAt: new Date(Date.now() + 300000).toISOString(), questions: [{ questionId: 1, code: 'TYT-0001', bank: 'CIKMIS' }] });
  if (url.pathname === '/api/exams/77') return json({ id: 77, title: 'Tek satırda uzun deneme başlığı ve sınav çözüm çalışma alanı',
    remainingSeconds: 600, questions: Array.from({ length: 120 }, (_, i) => ({ questionId: i + 1, position: i + 1, code: `TYT-${i + 1}`, subject: 'Matematik', choiceCount: 5 })) });
  if (url.pathname.startsWith('/api/page-annotations/')) {
    const old = annotations.get(url.pathname) || { version: 0, strokes: [] };
    if (req.method === 'PUT') {
      let body = ''; for await (const chunk of req) body += chunk;
      const update = JSON.parse(body);
      if (update.version !== old.version) return json({ hata: 'Sürüm çakışması' }, 409);
      const next = { version: old.version + 1, strokes: update.strokes, graph: update.graph };
      annotations.set(url.pathname, next);
      return json(next);
    }
    return json(old);
  }
  if (/\/board$/.test(url.pathname)) {
    const old = boards.get(url.pathname) || { version: 0, strokes: [] };
    if (req.method === 'PUT') {
      let body = ''; for await (const chunk of req) body += chunk;
      const update = JSON.parse(body);
      if (update.version !== old.version) return json({ hata: 'Sürüm çakışması' }, 409);
      const next = { version: old.version + 1, strokes: update.strokes };
      boards.set(url.pathname, next);
      return json(next);
    }
    return json(old);
  }
  if (url.pathname === '/api/learning-resources/item') return json({ displayTitle: 'TYT | Matematik | Sayılar | Çok uzun alt konu adı ve kaynak bilgisi tek satırda gösterilir', labels: { assignments: [] } });
  if (/\/(image|solution-image)$/.test(url.pathname)) {
    res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1600"><rect width="800" height="1600" fill="white"/><text x="30" y="80" font-size="30">Uzun soru görseli</text><text x="30" y="1550" font-size="30">Son satır</text></svg>');
  }
  if (url.pathname.startsWith('/api/')) return json(null);
  const file = resolve(dist, '.' + decodeURIComponent(url.pathname));
  const target = file.startsWith(dist + sep) && extname(file) ? file : join(dist, 'index.html');
  try { const content = readFileSync(target); res.writeHead(200, { 'Content-Type': { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html' }[extname(target)] || 'text/plain' }); res.end(content); }
  catch { res.writeHead(404); res.end(); }
});
if (server) await new Promise(done => server.listen(0, '127.0.0.1', done));
const site = live ? 'http://127.0.0.1:9090' : `http://127.0.0.1:${server.address().port}`;
const profile = mkdtempSync(join(tmpdir(), 'question-workspace-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore', windowsHide: true });
const pause = ms => new Promise(done => setTimeout(done, ms));
let socket;
const checks = [];
try {
  let ws;
  for (let i = 0; i < 100 && !ws; i++) {
    try { const port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
      ws = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(page => page.type === 'page')?.webSocketDebuggerUrl;
    } catch { await pause(100); }
  }
  assert.ok(ws, 'Chrome started');
  socket = new WebSocket(ws); await new Promise(done => socket.onopen = done);
  let sequence = 0; const pending = new Map();
  socket.onmessage = ({ data }) => { const message = JSON.parse(data); if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } };
  const cdp = (method, params = {}) => new Promise(done => { const id = ++sequence; pending.set(id, done); socket.send(JSON.stringify({ id, method, params })); });
  const ev = async expression => {
    const response = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.error || response.result.exceptionDetails) throw Error(JSON.stringify(response));
    return response.result.result.value;
  };
  const wait = async expression => { for (let i = 0; i < 150; i++) { if (await ev(`Boolean(${expression})`)) return; await pause(100); }
    throw Error(`Timeout: ${expression}; ${await ev('document.body.innerText')}`); };
  const open = async path => { await cdp('Page.navigate', { url: site + path });
    await wait('document.querySelector(".board-canvas") && document.querySelector(".image-btn img")?.naturalWidth > 0'); await pause(200); };
  const click = async text => ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)})?.click()`);
  const measure = async label => {
    await pause(100);
    const data = await ev(`(() => {
      const rect=s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}:null};
      return {viewport:[innerWidth,innerHeight],page:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
        tools:rect('.qside,.exam-tool-card'),main:rect('.qmain,.exam-main'),board:rect('.board-canvas'),bar:rect('.qbar'),
        row:[...document.querySelectorAll('.qbar > button,.qbar .choice')].map(e=>e.getBoundingClientRect().y),
        strip:rect('.qstrip'),title:document.querySelector('.resource-context-compact p')?.getBoundingClientRect().height,
        headerOverflow:[...document.querySelectorAll('.qstrip > *, .resource-context-compact > *')].filter(e=>e.getClientRects().length && e.getBoundingClientRect().right>document.querySelector('.qstrip').getBoundingClientRect().right+1).map(e=>e.tagName+'.'+e.className),
        frame:{width:getComputedStyle(document.querySelector('.image-btn img')).borderTopWidth,color:getComputedStyle(document.querySelector('.image-btn img')).borderTopColor,expected:getComputedStyle(document.querySelector('.board-canvas')).borderTopColor},
        image:rect('.image-btn img'),dock:rect('.qdock'),checkButton:document.body.innerText.includes('Cevabı Kontrol Et')};
    })()`);
    checks.push({ label, ...data });
    assert.ok(data.page[0] <= data.viewport[0] && data.page[1] <= data.viewport[1] + 1, `${label}: page overflow ${JSON.stringify(data)}`);
    assert.ok(data.tools.bottom <= data.viewport[1] && data.board.height > 20 && data.dock.bottom <= data.viewport[1], `${label}: all controls visible ${JSON.stringify(data)}`);
    assert.ok(Math.max(...data.row) - Math.min(...data.row) <= 5, `${label}: previous/choices/next single row`);
    assert.equal(data.checkButton, false);
    assert.equal(data.frame.width, '2px', `${label}: image frame is slightly thicker`);
    assert.equal(data.frame.color, data.frame.expected, `${label}: image frame uses the existing frame color`);
    assert.deepEqual(data.headerOverflow, [], `${label}: header stays inside question column`);
    assert.ok(data.image.height > 20 && data.image.bottom <= data.dock.y, `${label}: question fits above answers ${JSON.stringify(data)}`);
    if (data.viewport[0] >= 700) assert.ok(Math.abs(data.tools.y - data.main.y) < 2, `${label}: tools reach top`);
    if (data.title) assert.ok(data.title < 25, `${label}: title single line`);
  };
  await cdp('Page.enable'); await cdp('Runtime.enable');
  for (const [width, height] of [[1440,900],[1280,720],[1024,768],[900,650],[768,600],[390,844],[320,568]]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await open('/soru/TYT-0001'); await measure(`question-${width}x${height}`);
    if (!live) {
      await open('/soru/TYT-0001?sessionId=77'); await measure(`practice-${width}x${height}`);
      await open('/sinav/77'); await measure(`exam-${width}x${height}`);
    }
  }
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await open('/soru/TYT-0001');
  if (!live) {
    await wait('document.querySelector(".page-ink-status")?.textContent === "Kaydedildi"');
    const target = await ev(`(() => { const r=document.querySelector('.image-card').getBoundingClientRect(); return {x:r.x+Math.min(80,r.width/3),y:r.y+Math.min(80,r.height/3)}; })()`);
    await click('Yaz');
    assert.equal(await ev(`document.elementFromPoint(${target.x},${target.y})?.classList.contains('page-ink-canvas')`), true, 'writing covers question image');
    await ev(`document.querySelector('.page-ink-color.color-red').click()`);
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: target.x, y: target.y, button: 'left', clickCount: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: target.x + 25, y: target.y + 15, button: 'left' });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: target.x + 25, y: target.y + 15, button: 'left', clickCount: 1 });
    await wait('document.querySelector(".page-ink-status")?.textContent === "Kaydedildi"');
    assert.equal(annotations.get('/api/page-annotations/QUESTION/1/1')?.strokes[0]?.color, 'RED', 'stroke color persisted');
    await click('Geri al');
    await wait('document.querySelector(".page-ink-status")?.textContent === "Kaydedildi"');
    assert.deepEqual(annotations.get('/api/page-annotations/QUESTION/1/1')?.strokes, [], 'undo persisted');
    await click('Tıkla');
    assert.equal(await ev(`document.querySelector('.page-ink-canvas').classList.contains('writing')`), false, 'click mode restores controls');
    assert.equal(await ev(`document.querySelectorAll('.page-ink-erase option').length`), 4, 'erase dropdown has placeholder and three actions');
    await ev(`(() => { const s=document.querySelector('.page-ink-erase'); s.value='erase'; s.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    assert.equal(await ev(`document.querySelector('.page-ink-erase').value`), 'erase', 'eraser stays selected');
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: target.x + 20, y: target.y, button: 'left', clickCount: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: target.x + 20, y: target.y, button: 'left', clickCount: 1 });
    await wait('document.querySelector(".page-ink-status")?.textContent === "Kaydedildi"');
    assert.equal(annotations.get('/api/page-annotations/QUESTION/1/1')?.strokes.at(-1)?.color, 'ERASE', 'eraser operation persisted');
    await ev(`(() => { const s=document.querySelector('.page-ink-erase'); s.value='area'; s.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    assert.equal(await ev(`document.querySelector('.page-ink-erase').value`), 'area', 'area eraser stays selected');
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: target.x - 10, y: target.y - 10, button: 'left', clickCount: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: target.x + 60, y: target.y + 50, button: 'left' });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: target.x + 60, y: target.y + 50, button: 'left', clickCount: 1 });
    await wait('document.querySelector(".page-ink-status")?.textContent === "Kaydedildi"');
    assert.equal(annotations.get('/api/page-annotations/QUESTION/1/1')?.strokes.at(-1)?.color, 'AREA_ERASE', 'selection operation persisted');
    assert.equal(await ev(`(() => { const c=document.querySelector('.page-ink-canvas'); const r=c.getBoundingClientRect(); const x=Math.round((${target.x}+20-r.x)*c.width/r.width), y=Math.round((${target.y}-r.y)*c.height/r.height); return c.getContext('2d').getImageData(x,y,1,1).data[3]; })()`), 0, 'selection clears ink inside rectangle');
    await click('Tıkla');
    await click('Şekiller'); await click('Dikdörtgen');
    const boardTarget = await ev(`(() => { const r=document.querySelector('.board-canvas').getBoundingClientRect(); return {x:r.x+40,y:r.y+40}; })()`);
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: boardTarget.x, y: boardTarget.y, button: 'left', clickCount: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: boardTarget.x + 60, y: boardTarget.y + 45, button: 'left' });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: boardTarget.x + 60, y: boardTarget.y + 45, button: 'left', clickCount: 1 });
    await wait('document.querySelector(".board-status")?.textContent === "Kaydedildi"');
    assert.equal(boards.get('/api/questions/1/board')?.strokes[0]?.length, 5, 'shape saved on question board');
    await click('Grafik');
    assert.equal(await ev(`document.querySelector('.board-canvas').classList.contains('board-graph')`), true, 'graph paper fills board');
    assert.equal(await ev(`Boolean(document.querySelector('.graph-fields'))`), false, 'graph coordinate inputs absent');
    const boardHeight = await ev(`document.querySelector('.board-canvas').getBoundingClientRect().height`);
    await click('Hesap makinesi');
    assert.equal(await ev(`(() => { const p=document.querySelector('.calculator-inline').getBoundingClientRect(), s=document.querySelector('.qside').getBoundingClientRect(); return p.width > s.width*.8 && p.height >= ${boardHeight} && p.left >= s.left && p.right <= s.right; })()`), true, 'calculator fills the fixed side workspace');
    await ev(`(() => { const input=document.querySelector('#ink-calculation'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,'sin(30)+sqrt(9)'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await ev(`document.querySelector('.calculator-equals').click()`);
    await wait('document.querySelector(".calculator-result")?.textContent.includes("3.5")');
    await click('Karalama');
    assert.equal(await ev(`document.querySelector('.board-canvas').classList.contains('board-graph')`), false, 'scratchpad restores plain paper');
    assert.equal(boards.get('/api/questions/1/board')?.strokes.length, 1, 'drawing survives tab changes');
    checks.push({ label: 'full-page-ink', color: 'RED', save: 'passed', undo: 'passed', clickMode: 'passed',
      shape: 'passed', eraser: 'passed', selectionErase: 'passed', calculator: 'passed', graph: 'passed' });
    for (const [width, height] of [[390,844],[320,568]]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      reset(); await open('/soru/TYT-0001'); await wait('document.querySelector(".choice:not(:disabled)")');
      await click('İpucu iste'); await wait('document.querySelector(".hint-card p")'); await measure(`hint-${width}`);
      await ev(`document.querySelector('.choice').click()`); await wait('document.body.innerText.includes("Yanlış")'); await measure(`wrong-${width}`);
      await click('Cevabı göster'); await wait('document.querySelector(".choice.correct")'); await measure(`revealed-${width}`);
      await click('Küçült'); await measure(`collapsed-tools-${width}`);
    }
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
    reset(); await open('/soru/TYT-0001');
    await wait('document.querySelector(".choice:not(:disabled)")');
    await ev(`document.querySelector('.choice').click();document.querySelector('.choice').click()`);
    await wait('document.body.innerText.includes("Yanlış")');
    assert.equal(submissions.length, 1, 'double click sends one answer');
    assert.equal(submissions[0].answer, 'A');
    assert.ok(!await ev('Boolean(document.querySelector(".choice.correct"))'), 'wrong answer does not reveal correct answer');
    await measure('wrong-answer');
    await click('Tekrar dene'); await ev(`document.querySelectorAll('.choice')[1].click()`);
    await wait('document.querySelector(".choice.correct")'); await measure('correct-answer');
    await click('Çözümü göster'); await wait('document.querySelector(".modal")');
    await measure('solution-modal');
    await ev(`document.querySelector('.modal-head button').click()`);
    await click('Yeniden çalış');
    failNext = true;
    await ev(`document.querySelectorAll('.choice')[1].click()`);
    await wait('document.body.innerText.includes("Geçici bağlantı hatası")');
    await ev(`document.querySelectorAll('.choice')[1].click()`);
    await wait('document.querySelector(".choice.correct")');
    assert.equal(submissions.at(-1).clientEventId, submissions.at(-2).clientEventId, 'network retry reuses event id');
    checks.push({ label: 'automatic-answer', submissions: submissions.length, duplicateClick: 'passed', networkRetry: 'passed' });
    reset(); await open('/soru/TYT-0001'); await wait('document.querySelector(".choice:not(:disabled)")');
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'b', code: 'KeyB' });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'b', code: 'KeyB' });
    await wait('document.querySelector(".choice.correct")'); assert.equal(submissions[0].answer, 'B');
    checks.push({ label: 'keyboard-answer', result: 'passed' });
  }
  const screenshot = await cdp('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(output, live ? 'live.png' : 'isolated.png'), Buffer.from(screenshot.result.data, 'base64'));
  writeFileSync(join(output, live ? 'live-report.json' : 'ui-report.json'), JSON.stringify({ site, checks }, null, 2));
  console.log(JSON.stringify({ live, passed: checks.length, output }));
} finally { socket?.close(); chrome.kill(); server?.close(); }
