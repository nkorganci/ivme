// Browser acceptance with an in-memory API. Real student accounts are never changed.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { makeRows } from '../frontend/src/studentSchedule.js';

const live = process.argv.includes('--live');
const dist = resolve('frontend/dist');
const output = resolve('veri/ui-denetim/admin-ogrenci');
mkdirSync(output, { recursive: true });
const manager = { id: 1, username: 'yonetici', email: 'admin@example.test', role: 'ADMIN', siteManager: true, contactComplete: true, approved: true };
const students = [2, 3, 4, 5].map(id => ({ id, username: `ogrenci${id}`, email: `ogrenci${id}@example.test`,
  role: 'USER', enabled: id !== 4, approved: id !== 5, contactComplete: true, createdAt: '2026-11-01T12:00:00Z' }));
const teacher = { ...students[0], id: 6, username: 'ogretmen', role: 'TEACHER' };
let current, weeks, writes, transitions, failStart, failStop;
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost'), path = url.pathname;
    const json = (body, status = 200) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Set-Cookie': 'XSRF-TOKEN=ui-token; Path=/' });
      res.end(JSON.stringify(body));
    };
    if (path === '/api/auth/me') return json(current);
    if (path === '/api/auth/dev-accounts') return json([]);
    if (path === '/api/auth/dev-review-available') return json(false);
    if (path === '/api/auth/activity') { res.writeHead(204); return res.end(); }
    if (path.startsWith('/api/preferences/')) return json({ value: false });
    if (path === '/api/admin/accounts/registration-notifications') return json({ configured: false, waiting: 0, failed: 0, accepted: 0, recent: [] });
    if (path === '/api/admin/accounts/summary') return json({ total: 6, counts: { USER: 4, ADMIN: 1, TEACHER: 1 }, pending: 1 });
    if (path === '/api/admin/accounts') {
      const role = url.searchParams.get('role');
      const content = [manager, ...students, teacher].filter(row => !role || row.role === role);
      return json({ content, page: 0, totalPages: 1, totalElements: content.length });
    }
    const target = path.match(/^\/api\/admin\/accounts\/(\d+)\/impersonate$/)?.[1];
    if (target) {
      if (failStart) { failStart = false; return json({ hata: 'Geçiş denemesi başarısız.' }, 503); }
      assert.equal(req.method, 'POST');
      assert.equal(req.headers['x-xsrf-token'], 'ui-token');
      assert.equal(req.headers['x-ivme-user-id'], String(manager.id));
      current = { ...students.find(row => row.id === Number(target)), impersonating: true };
      transitions.push(current.id);
      return json(current);
    }
    if (path === '/api/auth/impersonation/stop') {
      if (failStop) { failStop = false; return json({ hata: 'Dönüş denemesi başarısız.' }, 503); }
      assert.equal(req.headers['x-ivme-user-id'], String(current.id));
      current = manager;
      return json(current);
    }
    if (path === '/api/exam-tracks') return json({ currentId: 'YKS', tracks: [{ id: 'YKS', name: 'YKS', family: 'YKS', status: 'ACTIVE', sections: [], readyFeatures: [] }] });
    if (path === '/api/exams/summary') return json({ examCount: 0 });
    if (path === '/api/exams/77') return json({ hata: 'Sınav bulunamadı.' }, 404);
    if (path === '/api/account/contact') return json({ email: current.email, phone: '+905551112233' });
    if (path.startsWith('/api/student-program/weeks/')) {
      if (req.method === 'PUT') {
        let body = ''; for await (const chunk of req) body += chunk;
        const input = JSON.parse(body);
        assert.equal(req.headers['x-ivme-user-id'], String(current.id));
        weeks[current.id] = { ...input, revision: input.revision + 1 };
        writes.push(current.id);
      }
      return json(weeks[current.id] || { rows: makeRows(), revision: 0 });
    }
    if (path.startsWith('/api/')) throw Error(`Unhandled API: ${req.method} ${path}`);
    if (path === '/favicon.ico') { res.writeHead(204); return res.end(); }
    if (live) {
      const remote = await fetch(`http://127.0.0.1:1010${req.url}`);
      res.writeHead(remote.status, { 'Content-Type': remote.headers.get('Content-Type') || 'application/octet-stream' });
      return res.end(Buffer.from(await remote.arrayBuffer()));
    }
    const file = path.startsWith('/assets/') ? resolve(dist, '.' + path) : resolve(dist, 'index.html');
    assert.ok(file.startsWith(dist + sep));
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch (error) { res.writeHead(500); res.end(error.message); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
process.env.IVME_URL = `http://127.0.0.1:${server.address().port}`;
const { tarayiciAc, pause } = await import('./lib/tarayici.mjs');
const reports = [];
try {
  for (const mobile of [false, true]) {
    current = manager; weeks = {}; writes = []; transitions = []; failStart = true; failStop = true;
    const browser = await tarayiciAc({ mobile });
    const { evalJs, wait, goto } = browser;
    const button = id => `document.querySelector('button[aria-label="ogrenci${id} hesabına gir"]')`;
    const returnButton = `[...document.querySelectorAll('.student-account-banner button')][0]`;
    try {
      await goto('/yonetim');
      await wait(button(2));
      assert.equal(await evalJs(`document.documentElement.scrollWidth > innerWidth + 1`), false, 'Admin page overflow');
      await browser.screenshot(resolve(output, `${mobile ? 'mobil' : 'masaustu'}-yonetim.png`));
      assert.equal(await evalJs(`${button(4)}.disabled && ${button(5)}.disabled`), true);
      assert.equal(await evalJs(`document.querySelector('button[aria-label="ogretmen hesabına gir"]')`), null);
      await evalJs(`${button(2)}.click()`);
      await wait(`document.body.innerText.includes('Geçiş denemesi başarısız.')`);
      assert.equal(current.id, manager.id);
      await evalJs(`${button(2)}.click()`);
      await wait(`document.querySelector('.student-account-banner') && document.querySelector('h1')?.textContent.toLowerCase().includes('ogrenci2')`);
      assert.equal(await evalJs(`!!document.querySelector('a[href="/yonetim"]')`), false);
      await browser.cdp('Page.reload', { ignoreCache: true });
      await wait(`document.querySelector('.student-account-banner')?.textContent.toLowerCase().includes('ogrenci2')`);
      await goto('/ogrenci-takip');
      await wait(`document.querySelector('input[aria-label="1. saat aralığı"]')`);
      await evalJs(`(() => { const input = document.querySelector('input[aria-label="1. saat aralığı"]'); input.focus(); input.select(); })()`);
      await browser.cdp('Input.insertText', { text: '08:30-09:45' });
      await evalJs(`document.querySelector('input[aria-label="1. saat aralığı"]').blur()`);
      for (let i = 0; i < 100 && !writes.length; i++) await pause(100);
      assert.ok(writes.length > 0);
      assert.deepEqual([...new Set(writes)], [2]);
      await goto('/hesap');
      await wait(`document.body.innerText.includes('ogrenci2@example.test')`);
      await goto('/sinav/77');
      await wait(`document.body.innerText.includes('Sınav bulunamadı.') && document.querySelector('.student-account-banner')`);
      await evalJs(`${returnButton}.click()`);
      await wait(`document.body.innerText.includes('Dönüş denemesi başarısız.')`);
      await evalJs(`${returnButton}.click()`);
      await wait(`${button(3)} && location.pathname === '/yonetim'`);
      await evalJs(`${button(3)}.click()`);
      await wait(`document.querySelector('.student-account-banner')?.textContent.toLowerCase().includes('ogrenci3') && document.querySelector('h1')?.textContent.toLowerCase().includes('ogrenci3')`);
      await pause(200);
      assert.equal(weeks[3], undefined, 'Second student remains isolated');
      assert.equal(await evalJs(`document.documentElement.scrollWidth > innerWidth + 1`), false, 'Page overflow');
      await browser.screenshot(resolve(output, `${mobile ? 'mobil' : 'masaustu'}.png`));
      await evalJs(`${returnButton}.click()`);
      await wait(button(2));
      assert.deepEqual(transitions, [2, 3]);
      assert.deepEqual(browser.errors, []);
      const unexpected = browser.failedRequests.filter(row => row.status !== 503 && !row.url?.endsWith('/api/exams/77'));
      assert.deepEqual(unexpected, []);
      reports.push({ viewport: mobile ? 'mobile' : 'desktop', ok: true, transitions, savedFor: [...new Set(writes)],
        reload: true, accountPage: true, startAndReturnErrorsRecovered: true });
      console.log(JSON.stringify(reports.at(-1)));
    } catch (error) {
      console.error(JSON.stringify({ error: error.message, mobile, current, text: await evalJs('document.body.innerText'), errors: browser.errors, failures: browser.failedRequests }));
      throw error;
    } finally { browser.close(); }
  }
  writeFileSync(resolve(output, 'rapor.json'), JSON.stringify({ live, reports }, null, 2) + '\n');
} finally { server.close(); }
