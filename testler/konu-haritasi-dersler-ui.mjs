// Isolated read-only navigation acceptance: built frontend + in-memory API, no student DB.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'frontend/dist');
const out = join(root, 'veri/ui-denetim/konu-haritasi-dersler');
mkdirSync(out, { recursive: true });
const categories = JSON.parse(readFileSync(join(root, 'frontend/src/data/curriculumIdentities.json'), 'utf8')).canonicalUnits;
const writes = [];
const server = createServer((req, res) => {
  const p = new URL(req.url, 'http://localhost').pathname;
  const json = value => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
  if (p.startsWith('/api/konu-ogrenme') && req.method !== 'GET') writes.push({ path: p, method: req.method });
  if (p === '/api/auth/me') return json({ id: 7, username: 'student', role: 'USER', contactComplete: true, approved: true });
  if (p === '/api/exam-tracks') return json({ currentId: 'yks', tracks: [{ id: 'yks', name: 'YKS', family: 'YKS', status: 'ACTIVE', sections: [], readyFeatures: [] }] });
  if (p.startsWith('/api/preferences/')) return json({ value: p.endsWith('question-image-fit') });
  if (p === '/api/konu-ogrenme') return json({ profile: null, events: [], serverNow: new Date().toISOString() });
  if (p === '/api/learning-resources/metadata') return json({ summary: {}, branches: [], categories });
  if (p.startsWith('/api/')) return json(null);
  const path = resolve(dist, `.${decodeURIComponent(p)}`);
  const file = path.startsWith(dist + sep) && extname(path) && existsSync(path) ? path : join(dist, 'index.html');
  const types = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.json': 'application/json' };
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
process.env.IVME_URL = `http://127.0.0.1:${server.address().port}`;
const { tarayiciAc } = await import('./lib/tarayici.mjs');
const report = [];
try {
  for (const mobile of [false, true]) {
    const browser = await tarayiciAc({ mobile });
    const { goto, wait, evalJs, screenshot } = browser;
    const active = subject => `document.querySelector('.lr-map-subject.active')?.getAttribute('href').includes('ders=${subject}')`;
    const clickSubject = async subject => {
      await evalJs(`document.querySelector('.lr-map-subject[href*="ders=${subject}"]').click()`);
      await wait(active(subject));
    };
    try {
      await goto('/konuyu-ogrenelim/harita');
      await wait("document.querySelectorAll('.lr-concept-link').length === 34");
      assert.equal(await evalJs("document.querySelectorAll('.lr-map-subject').length"), new Set(categories.map(c => c.subjectId)).size);
      await screenshot(join(out, mobile ? 'mobil-matematik.png' : 'masaustu-matematik.png'));
      for (const subject of ['fizik', 'kimya', 'turkce']) {
        await clickSubject(subject);
        assert.equal(await evalJs("document.querySelectorAll('.lr-concept-link').length"), 0);
        const displayed = await evalJs("[...document.querySelectorAll('.lr-reference-topic .lr-concept-title')].map(e=>e.textContent)");
        assert.ok(displayed.length > 0);
        assert.ok(displayed.every(name => categories.some(c => c.subjectId === subject && c.topic === name)));
        assert.equal(await evalJs("document.querySelectorAll('.lr-reference-topic .lr-status').length"), displayed.length);
      }
      await clickSubject('fizik');
      await evalJs("[...document.querySelectorAll('[aria-label=\"Sınav\"] a')].find(e=>e.textContent==='AYT').click()");
      await wait("location.search.includes('sinav=AYT')");
      assert.ok(await evalJs(active('fizik')));
      const unit = await evalJs("document.querySelector('#lr-map-unit option:nth-child(2)').value");
      await evalJs(`const el=document.querySelector('#lr-map-unit');el.value=${JSON.stringify(unit)};el.dispatchEvent(new Event('change',{bubbles:true}));`);
      await wait("new URLSearchParams(location.search).has('unite')");
      assert.equal(await evalJs("document.querySelectorAll('.lr-reference-unit').length"), 1);
      await clickSubject('kimya');
      assert.equal(await evalJs("new URLSearchParams(location.search).has('unite')"), false);
      assert.equal(await evalJs("new URLSearchParams(location.search).get('sinav')"), 'AYT');
      await goto('/konuyu-ogrenelim/harita?ders=fizik&ara=bulunmayanxyz');
      await wait("document.querySelector('.lr-map-content [role=status]')?.textContent.includes('bulunamadı')");
      await evalJs("document.querySelector('.lr-map-content [role=status] button').click()");
      await wait("document.querySelector('.lr-reference-topic')");
      assert.ok(await evalJs(active('fizik')));
      const source = await evalJs("document.querySelector('.lr-reference-topic a').getAttribute('href')");
      assert.ok(new URL(source, 'http://local').searchParams.getAll('categoryId').every(id => categories.some(c => c.id === id && c.subjectId === 'fizik')));
      assert.equal(await evalJs('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2'), false);
      if (mobile) assert.ok(await evalJs("(()=>{const a=document.querySelector('.lr-map-subject.active').getBoundingClientRect();const n=document.querySelector('.lr-map-subjects').getBoundingClientRect();return a.left>=n.left-2&&a.right<=n.right+2;})()"), 'Selected mobile subject stays visible');
      await screenshot(join(out, mobile ? 'mobil-fizik.png' : 'masaustu-fizik.png'));
      await evalJs("document.querySelector('.lr-map-subject').focus()");
      assert.equal(await evalJs("document.activeElement.matches('.lr-map-subject')"), true);
      assert.deepEqual(browser.errors, []);
      assert.deepEqual(browser.failedRequests, []);
      report.push({ mobile, subjects: new Set(categories.map(c => c.subjectId)).size, passed: true });
    } finally { await browser.close(); }
  }
  assert.deepEqual(writes, [], 'Navigation must not write student learning state');
  writeFileSync(join(out, 'rapor.json'), JSON.stringify({ runs: report, studentWrites: writes }, null, 2));
  console.log(JSON.stringify(report));
} finally { await new Promise(done => server.close(done)); }
