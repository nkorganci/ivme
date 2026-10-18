// Isolated browser verification; no real student data is modified. Run after npm run build.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const dist = fileURLToPath(new URL('../frontend/dist', import.meta.url));
let rows = [{ id: 1, date: '2000-10-12', start: '09:00:00', end: '10:00:00', topic: 'Eski konu', homework: 'Test 1', status: 'COMPLETED', note: 'Eski not', files: [] }];
let saves = 0;
let failLessonId = null;
let saveDelay = 0;
let omitEvaluation = false;
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const json = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
  if (path === '/api/auth/me') return json({ id: 1, username: 'student', role: 'USER', contactComplete: true });
  if (path === '/api/math-tutoring' && req.method === 'GET') return json(rows);
  if (path === '/api/math-tutoring/bulk' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const changes = JSON.parse(body);
      if (changes.some((change) => change.id != null && change.id === failLessonId))
        return json({ hata: 'Kayıt isteği başarısız. Hiçbir ders kaydedilmedi.' }, 500);
      let nextId = Math.max(0, ...rows.map((row) => row.id)) + 1;
      const saved = changes.map(({ id, lesson }) => {
        const row = { ...lesson, id: id ?? nextId++, files: [] };
        if (omitEvaluation && row.learning) delete row.learning.teacherEvaluation;
        return row;
      });
      rows = [...rows.filter((row) => !saved.some((item) => item.id === row.id)), ...saved];
      saves += changes.length;
      setTimeout(() => json(saved), saveDelay);
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
const route = '/ogrenci-takip/matematik-ozel-ders';
const field = (label) => `[...document.querySelectorAll('.math-learning-field')].find(x => x.querySelector('span')?.textContent === ${JSON.stringify(label)})?.querySelector('input,select')`;
async function setField(label, value) {
  await evaluate(`(() => { const input = ${field(label)}; if (!input) throw new Error('Alan yok: ' + ${JSON.stringify(label)}); const proto = input.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await waitFor(`${field(label)}?.value === ${JSON.stringify(value)}`);
  await waitFor('document.querySelector(".math-save-bar button")?.disabled === false');
}
async function openDetail(id) {
  await evaluate(`(() => { const viewport = document.querySelector('.math-grid .ag-body-horizontal-scroll-viewport'); if (viewport) viewport.scrollLeft = viewport.scrollWidth; })()`);
  await waitFor(`!!document.querySelector('button[aria-label="${id === 'new' ? 'Yeni ders' : `Ders ${id}`} öğrenme takibi"]')`);
  await evaluate(`document.querySelector('button[aria-label="${id === 'new' ? 'Yeni ders' : `Ders ${id}`} öğrenme takibi"]').click()`);
  await waitFor(`document.querySelector('.math-learning-panel')?.getAttribute('aria-label') === '${id === 'new' ? 'Yeni ders' : `Ders ${id}`} öğrenme takibi'`);
}
async function setInline(label, value) {
  const selector = `[aria-label="${label}"]`;
  await waitFor(`!!document.querySelector(${JSON.stringify(selector)})`);
  await evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); const proto = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : input.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await waitFor(`document.querySelector(${JSON.stringify(selector)})?.value === ${JSON.stringify(value)}`);
  await waitFor('document.querySelector(".math-save-bar button")?.disabled === false');
}
async function clickSaveAll() {
  await evaluate('document.querySelector(".math-save-bar button").click()');
}
try {
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: site + route });
  await waitFor('!!document.querySelector(".math-grid .ag-row, .math-lesson-card")');
  const widths = await evaluate('[...document.querySelectorAll(".math-grid .ag-header-cell")].map(x => ({id:x.getAttribute("col-id"), width: x.getBoundingClientRect().width}))');
  assert.ok(widths.find(x => x.id === 'topic').width <= 150, JSON.stringify(widths));
  await openDetail(1);
  await setField('Sınav türü', 'AYT');
  assert.ok(await evaluate('[...document.querySelectorAll("datalist option")].some(x=>x.value === "Fonksiyonlar")'));
  await setField('Konu', 'Fonksiyonlar');
  await evaluate(`${field('Alt konu')}.focus()`);
  await cdp('Input.insertText', { text: 'Bi' });
  await waitFor(`${field('Alt konu')}?.value === 'Bi'`);
  await cdp('Input.insertText', { text: 'leşke' });
  await waitFor(`${field('Alt konu')}?.value === 'Bileşke'`);
  for (const [label, value] of [['Ders hedefi','Bileşke çözümü'], ['Konu seviyesi','PRACTICING'],
    ['Ön test · Doğru','3'],['Ön test · Yanlış','5'],['Ön test · Boş','2'],
    ['Son test · Doğru','8'],['Son test · Yanlış','1'],['Son test · Boş','1'],
    ['Verilen soru','20'],['Ödev · Doğru','10'],['Ödev · Yanlış','5'],['Ödev · Boş','5'],
    ['Ödev verilme tarihi','2000-10-12'],['Ödev teslim tarihi','2000-10-14'],['Kaynak / test / soru numaraları','Kitap / Test 1'],
    ['Tekrar tarihi','2000-10-14'], ['Sonraki adım','Ters fonksiyon']]) await setField(label, value);
  await evaluate('[...document.querySelectorAll(".math-error-types label")].find(x => x.textContent === "İşlem hatası").click()');
  await evaluate('document.querySelector(".math-learning-footer button").click()');
  await waitFor('document.querySelector("[role=status]")?.textContent.includes("Tüm değişiklikler kaydedildi")');
  assert.equal(rows.find((row) => row.id === 1).learning.subtopic, 'Bileşke');
  assert.equal(rows.find((row) => row.id === 1).learning.afterTest.correct, 8);
  assert.deepEqual(rows.find((row) => row.id === 1).learning.errorTypes, ['CALCULATION']);
  await cdp('Page.navigate', { url: site + route });
  await waitFor('document.querySelector(".math-progress")?.textContent.includes("%75")');
  assert.ok(await evaluate('document.querySelector(".math-progress").textContent.includes("%80")'));
  assert.ok(await evaluate('document.querySelector(".math-learning-alerts").textContent.includes("Ödev gecikmiş")'));
  await openDetail(1);
  await waitFor(`${field('Alt konu')}?.value === 'Bileşke'`);
  const count = saves;
  await setField('Son test · Yanlış','');
  await evaluate('document.querySelector(".math-learning-footer button").click()');
  await waitFor('document.querySelector("[role=alert]")?.textContent.includes("birlikte girin")');
  assert.equal(saves, count);
  await setField('Son test · Yanlış','1');
  await evaluate('document.querySelector(".math-review-done input").click()');
  await evaluate('document.querySelector(".math-learning-footer button").click()');
  await waitFor('document.querySelector("[role=status]")?.textContent.includes("Tüm değişiklikler kaydedildi")');
  assert.equal(rows.find((row) => row.id === 1).learning.reviewDone, true);
  assert.ok(!await evaluate('document.querySelector(".math-learning-alerts").textContent.includes("Tekrar zamanı")'));
  await evaluate('document.querySelector(".math-learning-panel .page-head button").click()');
  await openDetail('new');
  await setField('Konu','Üçgenler'); await setField('Branş','GEOMETRY');
  await evaluate('document.querySelector(".math-learning-footer button").click()');
  await waitFor('document.querySelector("[role=status]")?.textContent.includes("Tüm değişiklikler kaydedildi")');
  assert.equal(rows.length, 2); assert.equal(rows.find((row) => row.id === 2).learning.branch, 'GEOMETRY');
  console.log('OK desktop: compact columns, curriculum, focus while typing, legacy edit, persistence, validation, summaries, review completion, new lesson');
  await cdp('Page.navigate', { url: site + route });
  await waitFor(`!!document.querySelector('textarea[aria-label="Ders 2 notu"]')`);
  for (const [label, value] of [['Ders 1 notu', 'Birinci ders güncellendi'], ['Ders 2 ödevi', 'Test 4'],
    ['Ders 2 saat aralığı', '11:00-12:30'], ['Ders 2 öğretmen değerlendirmesi', 'Öğrenci ilerledi.\nYeni konuya hazır.']]) await setInline(label, value);
  await waitFor('document.querySelector(".math-save-bar").textContent.includes("2 derste")');
  const beforeBulk = saves;
  await evaluate(`[...document.querySelectorAll('.math-grid button')].find(x=>x.textContent === 'Kaydet').click()`);
  await waitFor('document.querySelector(".alert-success")?.textContent.includes("2 ders güncellendi")');
  assert.equal(saves - beforeBulk, 2);
  assert.equal(rows.length, 2);
  assert.equal(rows.find((row) => row.id === 1).note, 'Birinci ders güncellendi');
  assert.equal(rows.find((row) => row.id === 2).homework, 'Test 4');
  assert.equal(rows.find((row) => row.id === 2).start, '11:00');
  assert.equal(rows.find((row) => row.id === 2).learning.teacherEvaluation, 'Öğrenci ilerledi.\nYeni konuya hazır.');
  assert.equal(rows.find((row) => row.id === 1).learning.beforeTest.correct, 3);
  await setInline('Ders 1 notu', 'Kısmi kayıt 1');
  await setInline('Ders 2 notu', 'Kısmi kayıt 2');
  failLessonId = 2;
  const beforeFailure = saves;
  await clickSaveAll();
  await waitFor('document.querySelector("[role=alert]")?.textContent.includes("Hiçbir ders kaydedilmedi")');
  assert.equal(saves - beforeFailure, 0);
  assert.equal(rows.find((row) => row.id === 1).note, 'Birinci ders güncellendi');
  assert.notEqual(rows.find((row) => row.id === 2).note, 'Kısmi kayıt 2');
  await waitFor('document.querySelector(".math-save-bar").textContent.includes("2 derste")');
  failLessonId = null;
  await clickSaveAll();
  await waitFor('document.querySelector(".alert-success")?.textContent.includes("2 ders güncellendi")');
  assert.equal(saves - beforeFailure, 2);
  assert.equal(rows.find((row) => row.id === 2).note, 'Kısmi kayıt 2');
  await setInline('Ders 1 notu', 'Son değişiklik');
  await setInline('Ders 2 saat aralığı', 'hatalı');
  const beforeValidation = saves;
  await clickSaveAll();
  await waitFor('document.querySelector("[role=alert]")?.textContent.includes("2. ders: Saat aralığını")');
  assert.equal(saves, beforeValidation);
  await setInline('Ders 2 saat aralığı', '11:00-12:30');
  await setInline('Yeni ders konusu', 'Limit');
  await setInline('Yeni ders öğretmen değerlendirmesi', 'Başlangıç değerlendirmesi');
  await clickSaveAll();
  await waitFor('document.querySelector(".alert-success")?.textContent.includes("3 ders güncellendi")');
  assert.equal(rows.length, 3);
  assert.equal(rows.find((row) => row.id === 3).topic, 'Limit');
  assert.equal(rows.find((row) => row.id === 3).learning.teacherEvaluation, 'Başlangıç değerlendirmesi');
  await setInline('Ders 1 notu', 'Çift tıklama');
  saveDelay = 200;
  const beforeDouble = saves;
  await evaluate('document.querySelector(".math-save-bar button").click(); document.querySelector(".math-save-bar button").click()');
  await waitFor('document.querySelector(".alert-success")?.textContent.includes("1 ders güncellendi")');
  assert.equal(saves - beforeDouble, 1);
  saveDelay = 0;
  for (const [label, value, key] of [['Ders 2 tarihi', '2026-10-17', 'date'], ['Ders 2 durumu', 'COMPLETED', 'status']]) {
    assert.equal(await evaluate('document.querySelector(".math-save-bar button").disabled'), true);
    await setInline(label, value);
    assert.equal(await evaluate('document.querySelector(".math-save-bar button").disabled'), false);
    await clickSaveAll();
    await waitFor('document.querySelector(".alert-success")?.textContent.includes("1 ders güncellendi")');
    await waitFor('document.querySelector(".math-save-bar button").disabled === true');
    assert.equal(rows.find((row) => row.id === 2)[key], value);
  }
  await setInline('Yeni ders konusu', 'Türev');
  await setInline('Yeni ders öğretmen değerlendirmesi', 'Korunacak değerlendirme');
  omitEvaluation = true;
  await clickSaveAll();
  await waitFor('document.querySelector("[role=alert]")?.textContent.includes("Öğretmen değerlendirmesi")');
  assert.equal(rows.length, 4);
  await waitFor('document.querySelector(".math-save-bar").textContent.includes("1 derste")');
  omitEvaluation = false;
  await clickSaveAll();
  await waitFor('document.querySelector(".alert-success")?.textContent.includes("1 ders güncellendi")');
  assert.equal(rows.length, 4);
  assert.equal(rows.find((row) => row.id === 4).learning.teacherEvaluation, 'Korunacak değerlendirme');
  await setInline('Ders 1 notu', 'Yenilemeden sonra korunacak not');
  await cdp('Page.navigate', { url: site + route });
  await waitFor(`document.querySelector('textarea[aria-label="Ders 1 notu"]')?.value === 'Yenilemeden sonra korunacak not'`);
  await waitFor('document.querySelector(".math-save-bar button").disabled === false');
  await clickSaveAll();
  await waitFor('document.querySelector(".alert-success")?.textContent.includes("1 ders güncellendi")');
  assert.equal(rows.find((row) => row.id === 1).note, 'Yenilemeden sonra korunacak not');
  assert.equal(await evaluate('sessionStorage.getItem("math-tutoring-drafts:1")'), null);
  console.log('OK unsaved edits survive reload and are removed from draft storage after database confirmation');
  console.log('OK bulk save: all edited rows and new lesson, evaluation, validation before requests, atomic failure recovery, no duplicate save');
  for (const width of [1920, 1440, 1280]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await cdp('Page.navigate', { url: site + route });
    await waitFor('!!document.querySelector(".math-grid .ag-header-cell[col-id=teacherEvaluation]")');
    await waitFor(`(() => { const x = document.querySelector('.math-grid .ag-body-horizontal-scroll-viewport'); return x.scrollWidth <= x.clientWidth + 1; })()`);
    const layout = await evaluate(`(() => { const x = document.querySelector('.math-grid .ag-body-horizontal-scroll-viewport'); const headers = [...document.querySelectorAll('.math-grid .ag-header-cell')]; return { width:x.clientWidth, content:x.scrollWidth, last:headers.at(-1)?.getAttribute('col-id'), evaluation:document.querySelector('.math-evaluation-header').getBoundingClientRect().width, page:document.documentElement.scrollWidth, viewport:innerWidth }; })()`);
    assert.ok(layout.content <= layout.width + 1, JSON.stringify(layout));
    assert.equal(layout.last, 'id');
    assert.ok(layout.evaluation <= 142, JSON.stringify(layout));
    assert.ok(layout.page <= layout.viewport + 1, JSON.stringify(layout));
    if (width === 1280) {
      const artifacts = resolve('.codex/math-learning'); mkdirSync(artifacts, { recursive: true });
      const shot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      writeFileSync(join(artifacts, 'layout-1280.png'), Buffer.from(shot.result.data, 'base64'));
    }
    console.log(`OK ${width}px: every column fits without horizontal scrolling; save column last`);
  }
  for (const width of [1024, 390]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
    await cdp('Page.navigate', { url: site + route });
    await waitFor('!!document.querySelector(".math-grid .ag-row, .math-lesson-card")');
    await openDetail(1);
    await waitFor(`${field('Alt konu')}?.value === 'Bileşke'`);
    const size = await evaluate('({page:document.documentElement.scrollWidth, viewport:innerWidth, panel:document.querySelector(".math-learning-panel").getBoundingClientRect().width, content:document.querySelector(".math-learning-panel").scrollWidth})');
    assert.ok(size.page <= size.viewport + 1, JSON.stringify(size));
    assert.ok(size.content <= size.panel + 1, JSON.stringify(size));
    await setField('Sonraki adım', `Tekrar ${width}`);
    await evaluate('document.querySelector(".math-learning-panel .page-head button").click()');
    await openDetail(1);
    await waitFor(`${field('Sonraki adım')}?.value === 'Tekrar ${width}'`);
    const artifacts = resolve('.codex/math-learning'); mkdirSync(artifacts, { recursive: true });
    await evaluate('document.querySelector(".math-learning-panel").scrollIntoView({block:"start"})');
    const shot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(join(artifacts, `detail-${width}.png`), Buffer.from(shot.result.data, 'base64'));
    console.log(`OK ${width}px: responsive panel, persisted data, drafts retained when closing`);
  }
  await setInline('Yeni ders konusu', 'Taslak konu');
  await setInline('Yeni ders öğretmen değerlendirmesi', 'Yenilemeden sonra korunacak değerlendirme');
  await cdp('Page.navigate', { url: site + route });
  await waitFor(`document.querySelector('textarea[aria-label="Yeni ders konusu"]')?.value === 'Taslak konu'`);
  await waitFor(`document.querySelector('textarea[aria-label="Yeni ders öğretmen değerlendirmesi"]')?.value === 'Yenilemeden sonra korunacak değerlendirme'`);
  await clickSaveAll();
  await waitFor('document.querySelector(".alert-success")?.textContent.includes("2 ders güncellendi")');
  assert.equal(rows.length, 5);
  assert.equal(rows.find((row) => row.id === 5).learning.teacherEvaluation, 'Yenilemeden sonra korunacak değerlendirme');
  console.log('OK new lesson and teacher evaluation survive reload and save together with other pending edits');
} catch (error) {
  console.error(await evaluate('({panel:document.querySelector(".math-learning-panel")?.outerHTML.slice(0,1800),fields:[...document.querySelectorAll(".math-learning-field")].map(x=>[x.textContent,x.querySelector("input,select")?.value])})'));
  throw error;
} finally {
  socket.close(); chrome.kill(); server.close();
  await new Promise(done => setTimeout(done, 700));
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
