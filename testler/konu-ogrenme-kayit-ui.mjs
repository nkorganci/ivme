// TAS-01 browser acceptance against an isolated fake API; never writes to ivme.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
const dist = resolve('frontend/dist');
const output = resolve('veri/ui-denetim/kayit-guvenilirligi');
mkdirSync(output, { recursive: true });
let userId = 7, mode = 'ok', seq = 0;
const rows = new Map(), requests = [], held = [];
const events = () => rows.get(userId) ?? [];
const account = () => ({ id: userId, username: `student${userId}`, role: 'USER', contactComplete: true, approved: true });
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const body = await new Promise((done) => { let raw = ''; req.on('data', (c) => raw += c); req.on('end', () => done(raw ? JSON.parse(raw) : {})); });
  const json = (value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
  const p = url.pathname;
  if (p === '/api/auth/me') return json(account());
  if (p === '/api/auth/dev-accounts') return json([{ username: 'student7', role: 'USER' }, { username: 'student8', role: 'TEACHER' }]);
  if (p.startsWith('/api/auth/dev-switch/')) { userId = p.endsWith('TEACHER') ? 8 : 7; return json(account()); }
  if (p === '/api/exam-tracks') return json({ currentId: 'yks', tracks: [{ id: 'yks', name: 'YKS', family: 'YKS', status: 'ACTIVE', sections: [], readyFeatures: [] }] });
  if (p.startsWith('/api/preferences/')) return json({ value: false });
  if (p === '/api/konu-ogrenme' && req.method === 'GET') return json({ profile: null, events: events() });
  if (p === '/api/konu-ogrenme/events' || p === '/api/konu-ogrenme/bank-answer') {
    requests.push({ owner: userId, ...body });
    if (body.expectedUserId !== userId) return json({ hata: 'Hesap değişti' }, 409);
    if (mode === 'offline') return json({ hata: 'Test kesintisi' }, 503);
    const bank = p.endsWith('bank-answer');
    const input = bank ? [body.event] : body.events;
    const commit = () => {
      const list = events();
      const saved = input.map((event) => {
        let stored = list.find((e) => e.id === event.id);
        if (!stored) { stored = { ...event, seq: ++seq, ...(bank ? { correct: event.chosen === 'A', correctAnswer: 'A', hasSolution: false } : {}) }; list.push(stored); }
        return stored;
      });
      rows.set(userId, list);
      return bank ? { event: saved[0], correct: saved[0].correct, correctAnswer: 'A', hasSolution: false } : { events: saved };
    };
    if (mode === 'hold') { held.push(() => json(commit())); return; }
    const value = commit();
    if (mode === 'lost' && bank) return json({ hata: 'Commit sonrası yanıt kayboldu' }, 503);
    return json(value);
  }
  if (/^\/api\/questions\/\d+\/image$/.test(p)) {
    res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="200"><text x="20" y="80">Test sorusu</text></svg>');
  }
  if (p.startsWith('/api/')) return json(null);
  const path = resolve(dist, `.${decodeURIComponent(p)}`);
  const file = path.startsWith(dist + sep) && extname(path) && existsSync(path) ? path : resolve(dist, 'index.html');
  res.writeHead(200, { 'Content-Type': ({ '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml' })[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
process.env.IVME_URL = `http://127.0.0.1:${server.address().port}`;
const { tarayiciAc, pause } = await import('./lib/tarayici.mjs');
const report = [];
const practice = '/konuyu-ogrenelim/calis?tur=practice&konu=temel-kavramlar';
try {
for (const mobile of [false, true]) {
  userId = 7; mode = 'ok'; rows.clear(); requests.length = 0;
  const historical = { id: 'existing-db', at: '2025-01-01T12:00:00Z', kind: 'lesson', action: 'open', conceptId: 'uslu-ifadeler', seq: ++seq };
  rows.set(7, [historical]);
  const b = await tarayiciAc({ mobile });
  const { goto, wait, evalJs } = b;
  const click = async (selector, text = '') => {
    await wait(`[...document.querySelectorAll(${JSON.stringify(selector)})].some(e => !e.matches(':disabled') && e.textContent.includes(${JSON.stringify(text)}))`);
    return evalJs(`[...document.querySelectorAll(${JSON.stringify(selector)})].find(e => !e.matches(':disabled') && e.textContent.includes(${JSON.stringify(text)})).click()`);
  };
  const pending = () => evalJs(`Object.keys(localStorage).filter(k => k.startsWith('ivme:konu-ogrenme:giden:7:v3:'))`);
  try {
    await goto('/konuyu-ogrenelim');
    await wait(`document.querySelector('.lr-shell')`);
    await evalJs(`localStorage.setItem('ivme:konu-ogrenme:giden:7:v1', JSON.stringify([{id:'old-unsaved'}])); localStorage.setItem('ivme:konu-ogrenme:giden:7:v2:obsolete', '{obsolete'); sessionStorage.setItem('ivme:konu-ogrenme:set:practice:old', '{}'); localStorage.setItem('unrelated', 'keep');`);
    await goto('/konuyu-ogrenelim/ders/temel-kavramlar');
    await wait(`document.querySelector('.lr-intro')`);
    assert.equal(await evalJs(`localStorage.getItem('ivme:konu-ogrenme:giden:7:v1')`), null);
    assert.equal(await evalJs(`localStorage.getItem('ivme:konu-ogrenme:giden:7:v2:obsolete')`), null);
    assert.equal(await evalJs(`localStorage.getItem('unrelated')`), 'keep');
    assert.deepEqual(events(), [historical]);
    assert.ok(requests.every(r => !(r.events ?? []).some(e => e.id === 'old-unsaved')));
    report.push({ mobile, case: 'existing DB remains; old unsaved queues are discarded without replay', pass: true });
    await click('.lr-intro .btn-primary');
    await click('.lr-choice');
    mode = 'hold';
    await click('.lr-confidence button', 'Eminim');
    await wait(`document.body.innerText.includes('Sunucu onayı bekleniyor.')`);
    assert.equal(await evalJs(`document.body.innerText.includes('Sunucuya kaydedildi.')`), false);
    assert.equal(await evalJs(`document.querySelector('.lr-save-boundary').disabled`), true);
    await wait(`Object.keys(localStorage).some(k => k.includes(':v3:'))`);
    for (let i = 0; i < 50 && held.length === 0; i++) await pause(100);
    assert.ok(held.length);
    mode = 'ok'; held.splice(0).forEach((release) => release());
    await wait(`document.body.innerText.includes('Sunucuya kaydedildi.')`);
    assert.equal((await pending()).length, 0);
    report.push({ mobile, case: 'lesson acknowledgement gates progress', pass: true });

    await goto(practice);
    await click('.lr-bank .choice', 'A');
    assert.equal(await evalJs(`sessionStorage.getItem('ivme:konu-ogrenme:set:practice:old')`), null);
    mode = 'lost';
    await click('.lr-bank .lr-confidence button', 'Eminim');
    await wait(`document.body.innerText.includes('Sunucuya kaydedilemedi')`);
    const original = requests.findLast((r) => r.event)?.event;
    assert.ok(original);
    assert.equal(events().filter((e) => e.id === original.id).length, 1);
    assert.equal(await evalJs(`Boolean(document.querySelector('.lr-bank .lr-feedback'))`), false);
    assert.equal((await pending()).length, 1);
    mode = 'ok';
    await goto(practice);
    await wait(`document.querySelector('.lr-bank .lr-feedback') && !document.querySelector('.lr-save-boundary').disabled`);
    assert.equal((await pending()).length, 0);
    assert.ok(requests.filter((r) => r.event).every((r) => JSON.stringify(r.event) === JSON.stringify(original)));
    assert.equal(events().filter((e) => e.id === original.id).length, 1);
    report.push({ mobile, case: 'lost bank response survives reload without duplicate', pass: true });

    await click('.lr-runner .lr-section-nav button', 'Sonraki');
    await click('.lr-bank .choice', 'B');
    await evalJs(`window.originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(k,v) { if(k.includes('konu-ogrenme:giden')) throw new DOMException('Quota', 'QuotaExceededError'); return window.originalSetItem.call(this,k,v); };`);
    mode = 'offline';
    await click('.lr-bank .lr-confidence button', 'Eminim');
    await wait(`document.body.innerText.includes('sayfayı kapatma')`);
    assert.equal(await evalJs(`document.querySelector('.lr-save-boundary').disabled`), true);
    // SPA navigation must also preserve a draft that could not reach localStorage.
    await evalJs(`history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate'));`);
    await wait(`!document.querySelector('.lr-shell')`);
    await evalJs(`history.pushState({}, '', ${JSON.stringify(practice)}); window.dispatchEvent(new PopStateEvent('popstate'));`);
    await wait(`document.body.innerText.includes('sayfayı kapatma') && document.querySelector('.lr-save-boundary:disabled')`);
    await evalJs(`Storage.prototype.setItem = window.originalSetItem`);
    mode = 'ok'; await click('.lr-sync button', 'Şimdi dene');
    await wait(`document.querySelector('.lr-bank .lr-feedback') && !document.querySelector('.lr-save-boundary').disabled`);
    report.push({ mobile, case: 'quota failure survives SPA navigation and recovers from memory', pass: true });

    await click('.lr-runner .lr-section-nav button', 'Sonraki');
    await click('.lr-bank .choice', 'B'); mode = 'offline';
    await click('.lr-bank .lr-confidence button', 'Eminim');
    await wait(`document.body.innerText.includes('Sunucuya kaydedilemedi')`);
    const firstAccountPending = await pending(); assert.equal(firstAccountPending.length, 1);
    await click('.dev-account-switcher button', 'Öğretmen');
    await wait(`document.querySelector('.dev-account-switcher button[aria-pressed=true]')?.textContent === 'Öğretmen'`);
    mode = 'ok';
    await click('a[href="/konuyu-ogrenelim"]');
    await wait(`document.querySelector('.lr-shell')`);
    assert.equal(await evalJs(`document.querySelector('.lr-save-boundary').disabled`), false);
    assert.equal((rows.get(8) ?? []).length, 0);
    assert.deepEqual(await pending(), firstAccountPending);
    assert.equal(requests.filter((r) => r.owner === 8 && r.expectedUserId === 7).length, 0);
    report.push({ mobile, case: 'same-tab account switch isolates queue and progress', pass: true });
    await b.screenshot(resolve(output, `${mobile ? 'mobile' : 'desktop'}.png`));
    assert.equal(b.errors.length, 0, b.errors.join('\n'));
  } catch (error) {
    await b.screenshot(resolve(output, 'failure.png'));
    report.push({ mobile, pass: false, error: error.message, page: await evalJs('document.body.innerText.slice(-2500)') });
    throw error;
  } finally { b.close(); writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2)); }
}
} finally { server.closeAllConnections(); server.close(); }
console.log(JSON.stringify(report, null, 2));
