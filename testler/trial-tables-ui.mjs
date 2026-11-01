// TYT/AYT ders sütunları, alan geçişi, eski netler ve kaydetme kabulü.
// API bellektedir; gerçek öğrenci DB'sine yazılmaz. --live: assetler çalışan 1010'dan.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';

const dist = resolve('frontend/dist');
const output = resolve('veri/ui-denetim/deneme-tablolari');
mkdirSync(output, { recursive: true });
const live = process.argv.includes('--live');
let sheets;
const initialSheets = () => ({
  tyt: { revision: 1, area: 'TYT', obp: '400', rows: [{ id: 'legacy', date: '2026-09-01', name: 'Eski deneme',
    answers: {}, nets: {}, testNets: { math: '20', turkish: '30', science: '11', social: '14' } }] },
  ayt: { revision: 1, area: 'SAY', rows: [{ id: 'ayt', date: '2026-09-01', testNets: {
    math: '20', physics: '7', chemistry: '6,5', biology: '6,5', literature: '10', history1: '4', geography1: '2',
    history2: '5', geography2: '5', philosophy: '6', religion: '3', language: '40',
  } }] },
});
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/favicon.ico') { res.writeHead(204); return res.end(); }
    const json = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
    if (path === '/api/auth/me') return json({ id: 7, username: 'student', role: 'USER', contactComplete: true, approved: true });
    if (path === '/api/auth/activity') { res.writeHead(204); return res.end(); }
    if (path === '/api/exam-tracks') return json({ currentId: 'YKS', tracks: [{ id: 'YKS', name: 'YKS', family: 'YKS', status: 'ACTIVE', sections: [], readyFeatures: [] }] });
    if (path.startsWith('/api/preferences/')) return json({ value: false });
    const sheet = path.match(/^\/api\/(tyt|ayt)-trials$/)?.[1];
    if (sheet) {
      if (req.method === 'PUT') {
        let text = '';
        for await (const chunk of req) text += chunk;
        const body = JSON.parse(text);
        if (body.revision !== sheets[sheet].revision) return json({ hata: 'Eski revizyon' }, 409);
        sheets[sheet] = { ...body, revision: body.revision + 1 };
      }
      return json(sheets[sheet]);
    }
    if (path.startsWith('/api/')) return json(null);
    if (live) {
      const remote = await fetch(`http://127.0.0.1:1010${req.url}`);
      res.writeHead(remote.status, { 'Content-Type': remote.headers.get('Content-Type') || 'application/octet-stream' });
      return res.end(Buffer.from(await remote.arrayBuffer()));
    }
    const file = resolve(dist, `.${decodeURIComponent(path)}`);
    const target = file.startsWith(dist + sep) && extname(file) && existsSync(file) ? file : join(dist, 'index.html');
    const types = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.json': 'application/json' };
    res.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream' });
    res.end(readFileSync(target));
  } catch (error) { res.writeHead(500); res.end(error.message); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
process.env.IVME_URL = `http://127.0.0.1:${server.address().port}`;
const { tarayiciAc, pause } = await import('./lib/tarayici.mjs');
const reports = [];
try {
  for (const mobile of [false, true]) {
    sheets = initialSheets();
    const browser = await tarayiciAc({ mobile });
    const { evalJs, wait, goto } = browser;
    const scroll = async left => {
      await evalJs(`document.querySelectorAll('.ag-body-horizontal-scroll-viewport').forEach(e => { e.scrollLeft = ${left}; });`);
      await pause(100);
    };
    const columns = async () => {
      const found = new Map();
      const width = await evalJs(`document.querySelector('.ag-body-horizontal-scroll-viewport').scrollWidth`);
      for (let left = 0; left <= width + 300; left += 300) {
        await scroll(left);
        assert.ok(await evalJs(`document.querySelector('.ag-header').getBoundingClientRect().height <= 84`), 'Compact header height');
        const clipped = await evalJs(`[...document.querySelectorAll('.ag-header-cell-text')].filter(e => e.scrollHeight > e.closest('.ag-header-cell').clientHeight || e.scrollWidth > e.clientWidth + 1).map(e => e.textContent)`);
        assert.deepEqual(clipped, [], 'Complete header labels');
        for (const [id, text] of await evalJs(`[...document.querySelectorAll('.ag-header-cell')].map(e => [e.getAttribute('col-id'), e.innerText.replace(/\\s+/g, ' ').trim()])`)) found.set(id, text);
      }
      await scroll(0);
      assert.ok(!['score', 'placement', 'rank', 'remove'].some(id => found.has(id)), 'Removed columns');
      return Object.fromEntries(found);
    };
    const input = async (key, value, rowId) => {
      const width = await evalJs(`document.querySelector('.ag-body-horizontal-scroll-viewport').scrollWidth`);
      const selector = `${rowId ? `.ag-row[row-id="${rowId}"] ` : ''}.ag-cell[col-id="${key}.net"] input`;
      for (let left = 0; left <= width + 300; left += 300) {
        await scroll(left);
        if (await evalJs(`!!document.querySelector(${JSON.stringify(selector)})`)) break;
      }
      assert.ok(await evalJs(`(() => {
        const input = document.querySelector(${JSON.stringify(selector)});
        if (!input) return false;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      })()`), key);
      await pause(150);
    };
    const selectArea = async area => {
      await evalJs(`(() => { const select = document.querySelector('.tyt-controls select'); select.value = ${JSON.stringify(area)}; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await pause(150);
    };
    try {
      await goto('/ogrenci-takip/tyt-denemeleri');
      await wait(`document.querySelector('.ag-row')`);
      const options = await evalJs(`[...document.querySelector('.tyt-controls select').options].map(o => o.value)`);
      for (const area of ['SAY', 'SOZ', 'EA']) assert.ok(options.includes(area));
      const tytColumns = await columns();
      assert.deepEqual(Object.keys(tytColumns).sort(), ['date', 'math.net', 'turkish.net', 'fizik.net', 'kimya.net', 'biyoloji.net', 'tarih.net', 'cografya.net', 'felsefe.net', 'din.net', 'net'].sort());
      assert.ok(await evalJs(`document.body.innerText.includes('Fen Bilimleri: 11 net')`));
      for (const [key, value] of [['fizik', '5,25'], ['kimya', '4'], ['biyoloji', '0']]) await input(key, value);
      assert.equal(sheets.tyt.rows[0].testNets.science, undefined);
      assert.equal(sheets.tyt.rows[0].testNets.social, '14');
      assert.equal(sheets.tyt.rows[0].nets.fizik, '5,25');
      assert.equal(sheets.tyt.obp, '400', 'Existing OBP retained');
      await input('fizik', '8');
      assert.equal(sheets.tyt.rows[0].nets.fizik, '5,25', 'Subject limit');
      for (const area of ['SAY', 'SOZ', 'EA']) { await selectArea(area); assert.deepEqual(await columns(), tytColumns); }
      await evalJs(`[...document.querySelectorAll('button')].find(e => e.textContent.includes('Deneme ekle')).click()`);
      await wait(`new Set([...document.querySelectorAll('.ag-row[row-id]')].map(e => e.getAttribute('row-id'))).size === 2`);
      await pause(150);
      const newId = sheets.tyt.rows.find(row => row.id !== 'legacy').id;
      for (const [key, value] of Object.entries({ math: '40', turkish: '40', fizik: '7', kimya: '7', biyoloji: '6', tarih: '5', cografya: '5', felsefe: '5', din: '5' })) await input(key, value, newId);
      await scroll(10000);
      await wait(`document.querySelector('.ag-row[row-id="${newId}"] .ag-cell[col-id="net"]')?.innerText === '120,00'`);
      await scroll(0);
      await evalJs(`document.querySelector('.tyt-grid-frame').scrollIntoView({ block: 'center' })`);
      await browser.screenshot(join(output, `${mobile ? 'mobil' : 'masaustu'}-tyt.png`));
      await goto('/ogrenci-takip/tyt-denemeleri');
      await wait(`document.querySelector('.ag-row')`);
      await wait(`document.querySelector('.ag-row[row-id="${newId}"] .ag-cell[col-id="math.net"] input')?.value === '40'`);
      assert.equal(sheets.tyt.rows[0].nets.fizik, '5,25');
      await goto('/ogrenci-takip/ayt-denemeleri');
      await wait(`document.querySelector('.ag-row')`);
      const expected = { SAY: ['math', 'physics', 'chemistry', 'biology'], EA: ['math', 'literature', 'history1', 'geography1'],
        SOZ: ['literature', 'history1', 'geography1', 'history2', 'geography2', 'philosophy', 'religion'], DIL: ['language'] };
      const totals = { SAY: '40,00', EA: '36,00', SOZ: '35,00', DIL: '40,00' };
      for (const [area, keys] of Object.entries(expected)) {
        await selectArea(area);
        const headers = await columns();
        assert.deepEqual(Object.keys(headers).sort(), ['date', ...keys.map(k => `${k}.net`), 'net'].sort(), area);
        await scroll(10000);
        await wait(`document.querySelector('.ag-cell[col-id="net"]')?.innerText === ${JSON.stringify(totals[area])}`);
        assert.ok(!await evalJs(`document.body.innerText.includes('önce TYT')`));
        await scroll(0);
        if (area === 'SOZ') {
          await evalJs(`document.querySelector('.tyt-grid-frame').scrollIntoView({ block: 'center' })`);
          await browser.screenshot(join(output, `${mobile ? 'mobil' : 'masaustu'}-ayt-sozel.png`));
        }
      }
      await selectArea('SAY');
      await input('physics', '14');
      assert.equal(sheets.ayt.rows[0].testNets.physics, '14');
      assert.equal(sheets.ayt.rows[0].testNets.history2, '5', 'Other area values retained');
      assert.equal(await evalJs(`document.documentElement.scrollWidth > innerWidth + 2`), false, 'Page overflow');
      assert.deepEqual(browser.errors, []);
      assert.deepEqual(browser.failedRequests, []);
      reports.push({ viewport: mobile ? 'mobil' : 'masaustu', liveAssets: live, ok: true, tytColumns, aytAreas: Object.keys(expected), retainedLegacyTotals: true, savedAndReloaded: true });
      console.log(JSON.stringify(reports.at(-1)));
    } catch (error) {
      await browser.screenshot(join(output, `${mobile ? 'mobil' : 'masaustu'}-hata.png`));
      console.error(await evalJs(`({ text: document.body.innerText.slice(0, 2400) })`), browser.errors, browser.failedRequests);
      throw error;
    } finally { browser.close(); }
  }
  writeFileSync(join(output, live ? 'canli-rapor.json' : 'rapor.json'), JSON.stringify(reports, null, 2) + '\n');
} finally { server.closeAllConnections(); server.close(); }
