/** Kaynaklı notları ve etiketleri gerçek Chrome/Edge ile, yalıtılmış API üzerinde denetler. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCE_NOTE_SUBJECTS } from '../frontend/src/sourceNoteSubjects.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = join(root, 'frontend', 'dist');
const edge = process.env.YKS_TEST_BROWSER || [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync);
assert.ok(existsSync(join(dist, 'kaynakli-etiketler', 'manifest.json')), 'Önce etiketleri yayınlayıp ön yüzü derleyin.');
assert.ok(edge && existsSync(edge), 'Chrome veya Edge bulunamadı.');
const manifest = JSON.parse(readFileSync(join(dist, 'kaynakli-etiketler', 'manifest.json'), 'utf8'));
const notes = JSON.parse(readFileSync(join(dist, 'kaynakli-notlar.json'), 'utf8'));
assert.deepEqual(SOURCE_NOTE_SUBJECTS.map(([id]) => id), notes.groups.map((group) => group.id));
let failLabelsOnce = false;
let failNotesOnce = false;

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if ((pathname === '/kaynakli-etiketler/manifest.json' && failLabelsOnce)
      || (pathname === '/kaynakli-notlar.json' && failNotesOnce)) {
    if (pathname.includes('manifest')) failLabelsOnce = false; else failNotesOnce = false;
    response.writeHead(503); response.end('Geçici test hatası'); return;
  }
  if (pathname === '/api/auth/me') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ id: 1, username: 'student', role: 'USER', contactComplete: true }));
    return;
  }
  if (pathname.startsWith('/api/')) {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end('[]');
    return;
  }
  let file = resolve(dist, `.${decodeURIComponent(pathname)}`);
  if (!file.startsWith(`${resolve(dist)}${sep}`) || !existsSync(file)) file = join(dist, 'index.html');
  response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
  response.end(readFileSync(file));
});

const pause = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));
async function until(check, label, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await check();
    if (value) return value;
    await pause(100);
  }
  throw new Error(`Zaman aşımı: ${label}`);
}

async function main() {
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  console.log('UI test: yerel sunucu hazır.');
  const base = `http://127.0.0.1:${server.address().port}`;
  const profile = mkdtempSync(join(tmpdir(), 'kaynakli-edge-'));
  const edgeProcess = spawn(edge, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore', windowsHide: true });
  let socket;
  try {
    const port = await until(() => {
      const path = join(profile, 'DevToolsActivePort');
      return existsSync(path) ? Number(readFileSync(path, 'utf8').split('\n')[0]) : 0;
    }, 'Edge DevTools');
    console.log('UI test: tarayıcı DevTools hazır.');
    const tabs = await until(async () => {
      try { return await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); }
      catch { return null; }
    }, 'Edge sekmesi');
    const tab = tabs.find((item) => item.type === 'page');
    assert.ok(tab?.webSocketDebuggerUrl, 'Edge sayfa hedefi bulunamadı.');
    socket = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((done, fail) => {
      socket.addEventListener('open', done, { once: true });
      socket.addEventListener('error', fail, { once: true });
    });
    console.log('UI test: sayfa bağlantısı hazır.');
    let nextId = 0;
    const pending = new Map();
    const pageErrors = [];
    socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.method === 'Runtime.exceptionThrown') pageErrors.push(data.params.exceptionDetails.text);
      if (data.id && pending.has(data.id)) {
        const { done, fail } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) fail(new Error(data.error.message)); else done(data.result);
      }
    });
    const send = (method, params = {}) => new Promise((done, fail) => {
      const id = ++nextId;
      const timeout = setTimeout(() => { pending.delete(id); fail(new Error(`CDP zaman aşımı: ${method}`)); }, 12000);
      pending.set(id, { done: (value) => { clearTimeout(timeout); done(value); }, fail: (error) => { clearTimeout(timeout); fail(error); } });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    const waitFor = (expression, label) => until(() => evaluate(expression), label);
    const select = async (label, value) => {
      await evaluate(`(() => {
        const field = Array.from(document.querySelectorAll('label')).find(label => label.firstChild.textContent.trim() === ${JSON.stringify(label)});
        const select = field.querySelector('select');
        select.value = ${JSON.stringify(value)};
        select.dispatchEvent(new Event('change', { bubbles: true }));
      })()`);
    };
    await send('Page.enable');
    await send('Runtime.enable');

    for (const width of [1280, 390]) {
      console.log(`UI test: ${width}px ekran denetleniyor.`);
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
      await send('Page.navigate', { url: `${base}/kaynakli-ders-notlari/tyt-turkce` });
      await waitFor(`document.body.innerText.includes('Sözcükte Anlam')`, 'Türkçe ders notu');
      assert.ok(await evaluate(`document.querySelector('a[href="/kaynakli-ders-notlari/etiketler"]') !== null`));
      await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Çözümü göster')).click()`);
      await waitFor(`document.body.innerText.includes('C · Mecaz anlam.')`, 'özgün soru çözümü');
      await evaluate(`document.querySelector('.source-notes-status summary').click()`);
      await evaluate(`document.querySelector('a[href="/kaynakli-ders-notlari/etiketler"]').click()`);
      await waitFor(`document.body.innerText.includes('${manifest.total.toLocaleString('tr-TR')} kaynak sorusu')`, 'etiket dizini');
      await waitFor(`Array.from(document.querySelectorAll('.source-labels-list a')).some(a => a.textContent === 'TYT-0001')`, 'TYT-0001');
      await evaluate(`(() => { const input = document.querySelector('input[type=search]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'TYT-0001'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await waitFor(`document.querySelector('[role=status]')?.textContent.includes('1 soru bulundu')`, 'arama');
      await evaluate(`(() => { const select = Array.from(document.querySelectorAll('select')).find(s => s.parentElement.textContent.includes('Koleksiyon')); select.value = 'OGM'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await waitFor(`document.querySelector('[role=status]')?.textContent.includes('0 soru bulundu')`, 'OGM filtresi');
      await evaluate(`(() => { const select = Array.from(document.querySelectorAll('select')).find(s => s.parentElement.textContent.includes('Ders')); select.value = 'ayt-turk-dili-ve-edebiyati'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await waitFor(`document.body.innerText.includes('AYT · Türk Dili ve Edebiyatı: 7.476 kayıt')`, 'AYT ders grubu');
      await waitFor(`document.querySelector('.source-labels-cancelled')?.textContent.includes('iptal')`, 'iptal soru uyarısı');
      for (const group of manifest.groups) {
        await select('Ders', group.id);
        await waitFor(`document.querySelector('.source-labels-list a')?.textContent === ${JSON.stringify(JSON.parse(readFileSync(join(dist, 'kaynakli-etiketler', `${group.id}.json`), 'utf8'))[0].code)}`, group.id);
        await waitFor(`document.querySelector('[role=status]')?.textContent === '${group.count.toLocaleString('tr-TR')} soru bulundu.'`, `${group.id} sayısı`);
        assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), `${group.id}: sayfa yatay taşıyor`);
      }
      await select('Ders', 'tyt-turkce');
      await waitFor(`document.querySelector('.source-labels-list a')?.textContent === 'TYT-0001'`, 'Türkçe tekrar');
      await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Sonraki').click()`);
      await waitFor(`document.querySelector('.source-labels-list a')?.textContent !== 'TYT-0001'`, 'ikinci sayfa');
      await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Önceki').click()`);
      await waitFor(`document.querySelector('.source-labels-list a')?.textContent === 'TYT-0001'`, 'ilk sayfa');
      await select('Güven', 'medium');
      await waitFor(`Array.from(document.querySelectorAll('.source-labels-row-head span')).every(e => e.textContent.includes('Orta')) && document.querySelectorAll('.source-labels-list li').length > 0`, 'orta güven filtresi');
      await select('Güven', '');
      await evaluate(`document.querySelector('input[type=checkbox]').click()`);
      await waitFor(`document.querySelectorAll('.source-labels-list li').length > 0 && Array.from(document.querySelectorAll('.source-labels-list li')).every(e => e.querySelector('.source-labels-review'))`, 'inceleme filtresi');
      for (const group of notes.groups) {
        await send('Page.navigate', { url: `${base}/kaynakli-ders-notlari/${group.id}` });
        await waitFor(`document.querySelector('article h2')?.textContent === ${JSON.stringify(group.lessons[0].title)}`, `${group.id} öğretim taslağı`);
        assert.equal(await evaluate(`document.querySelectorAll('.source-notes-example').length`), 2);
        assert.equal(await evaluate(`document.querySelectorAll('.source-notes-citation a').length`), group.lessons[0].sources.length * 2);
        await waitFor(`document.querySelector('.source-notes-index details').open === ${width > 800}`, 'duyarlı konu dizini');
        await evaluate(`document.querySelector('.source-notes-index summary').click()`);
        await waitFor(`document.querySelector('.source-notes-index details').open === ${width <= 800}`, 'konu dizinini aç/kapat');
        await evaluate(`document.querySelector('.source-notes-index summary').click()`);
        assert.equal(await evaluate(`document.querySelector('.source-notes-answer')`), null, 'Yeni derste çözüm kapalı olmalı');
        await evaluate(`document.querySelector('.source-notes-practice .btn-secondary').click()`);
        await waitFor(`document.querySelector('.source-notes-answer')?.textContent === ${JSON.stringify(group.lessons[0].practice.explanation)}`, `${group.id} özgün çözüm`);
        await evaluate(`document.querySelector('.source-notes-evidence > summary').click()`);
        await evaluate(`document.querySelector('.source-notes-example summary').click()`);
        assert.ok(await evaluate(`document.querySelector('.source-notes-example details').open`));
        assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), `${group.id}: sayfa yatay taşıyor`);
        for (const lesson of group.lessons) {
          await send('Page.navigate', { url: `${base}/kaynakli-ders-notlari/${group.id}?konu=${lesson.id}` });
          await waitFor(`document.querySelector('article h2')?.textContent === ${JSON.stringify(lesson.title)}`, `${lesson.id} konu bağlantısı`);
          assert.equal(await evaluate(`document.querySelectorAll('article').length`), 1, 'Yalnız seçilen konu gösterilmeli');
          for (let index = 0; index < lesson.patterns.length; index++) {
            await evaluate(`document.querySelectorAll('[role=tab]')[${index}].click()`);
            await waitFor(`document.querySelector('[role=tabpanel] h4')?.textContent === ${JSON.stringify(lesson.patterns[index].title)}`, `${lesson.id} soru kalıbı`);
            assert.equal(await evaluate(`document.querySelector('.source-thinking-answer')`), null);
            await evaluate(`document.querySelector('.source-thinking-example button').click()`);
            await waitFor(`document.querySelector('.source-thinking-answer')?.textContent === ${JSON.stringify(lesson.patterns[index].mini.answer)}`, 'düşünme provası');
          }
          const wrong = (lesson.practice.answer + 1) % lesson.practice.choices.length;
          await evaluate(`document.querySelector('input[type=radio][value="${wrong}"]').click(); document.querySelector('.source-notes-practice .btn-primary').click();`);
          await waitFor(`document.querySelector('.source-practice-retry')?.textContent.includes('doğru değil')`, 'yanlış yanıt yönlendirmesi');
          await evaluate(`Array.from(document.querySelectorAll('.source-study-next button')).find(b => b.textContent.includes('yeniden dene')).click()`);
          await waitFor(`document.querySelectorAll('input[type=radio]:checked').length === 0 && document.querySelector('.source-notes-answer') === null`, 'alıştırma sıfırlama');
          await evaluate(`document.querySelector('input[type=radio][value="${lesson.practice.answer}"]').click(); document.querySelector('.source-notes-practice .btn-primary').click();`);
          await waitFor(`document.querySelector('.source-practice-correct')?.textContent.startsWith('Doğru.')`, 'doğru yanıt gerekçesi');
          assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), `${lesson.id}: yatay taşma`);
        }
      }
      await select('Ders notu seç', 'tyt-tarih');
      await waitFor(`location.pathname.endsWith('/tyt-tarih') && document.querySelector('.source-notes-answer') === null`, 'ders değişiminde çözüm sıfırlama');
      await evaluate(`document.querySelector('.source-notes-status summary').click()`);
      await evaluate(`document.querySelector('.source-notes-status a').click()`);
      await waitFor(`document.querySelector('select')?.value === 'tyt-tarih' && document.querySelector('.source-labels-list a')?.textContent === 'TYT-0361'`, 'dersin etiketlerine geçiş');
      assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
      const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      writeFileSync(join(tmpdir(), `kaynakli-etiketler-${width}.png`), Buffer.from(screenshot.data, 'base64'));
      await send('Page.navigate', { url: `${base}/kaynakli-ders-notlari/tyt-kimya` });
      await waitFor(`document.querySelector('article h2')?.textContent === 'Atom Modelleri: Kanıt ve Sınırlar'`, 'not ekran görüntüsü');
      const lessonScreenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      writeFileSync(join(tmpdir(), `kaynakli-notlar-${width}.png`), Buffer.from(lessonScreenshot.data, 'base64'));
      await send('Page.navigate', { url: `${base}/kaynakli-ders-notlari/tyt-turkce` });
      await waitFor(`document.querySelector('article h2')?.textContent === 'Sözcükte Anlam'`, 'konu aramasına dönüş');
      await evaluate(`document.querySelector('.source-notes-index details').open = true`);
      await evaluate(`(() => { const input = document.querySelector('.source-topic-search input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'noktalama'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await waitFor(`document.querySelectorAll('.source-topic-choice').length === 1`, 'konu araması');
      await evaluate(`document.querySelector('.source-topic-choice').click()`);
      await waitFor(`location.search.includes('konu=noktalama-isaretleri') && document.querySelector('article h2')?.textContent === 'Noktalama İşaretleri'`, 'konu seçimi');
      await send('Page.navigate', { url: `${base}/kaynakli-ders-notlari/tyt-turkce?baslik=${encodeURIComponent('Sözel mantık')}` });
      await waitFor(`document.querySelector('.source-notes-pending h2')?.textContent === 'Sözel mantık'`, 'incelenmemiş konu');
      assert.ok(await evaluate(`document.querySelector('.source-notes-pending a[href^="/api/topic-pdfs/"]') !== null`), 'Bekleyen konuda kaynak yolu bulunmalı');
      if (width < 500) await evaluate(`document.querySelector('button[aria-label="Menüyü aç"]').click()`);
      assert.equal(await evaluate(`document.querySelectorAll('#notes-subnav a').length`), SOURCE_NOTE_SUBJECTS.length + 2);
      await evaluate(`document.querySelector('#notes-subnav a[href="/kaynakli-ders-notlari/analiz"]').click()`);
      await waitFor(`document.querySelector('h1')?.textContent === 'Analiz ve çalışma planı'`, 'menüden analiz planı');
      assert.equal(await evaluate(`document.querySelectorAll('.source-overview-list > li').length`), manifest.groups.filter((group) => group.exam === 'TYT').length);
      await evaluate(`Array.from(document.querySelectorAll('.source-overview-exams button')).find(b => b.textContent === 'AYT').click()`);
      await waitFor(`document.querySelectorAll('.source-overview-list > li').length === ${manifest.groups.filter((group) => group.exam === 'AYT').length}`, 'AYT kaynak grupları');
      assert.ok(await evaluate(`Array.from(document.querySelectorAll('.source-overview-list > li')).every(card => card.querySelector('a[href^="/api/topic-pdfs/"]'))`));
      assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Analiz planı yatay taşmamalı');
    }
    failLabelsOnce = true;
    await send('Page.navigate', { url: `${base}/kaynakli-ders-notlari/etiketler` });
    await waitFor(`document.querySelector('[role=alert]')?.textContent.includes('Etiket dizini yüklenemedi')`, 'etiket hata durumu');
    await evaluate(`document.querySelector('[role=alert] button').click()`);
    await waitFor(`document.querySelector('.source-labels-list a')?.textContent === 'TYT-0001'`, 'etiket yeniden deneme');
    failNotesOnce = true;
    await send('Page.navigate', { url: `${base}/kaynakli-ders-notlari/tyt-turkce` });
    await waitFor(`document.querySelector('[role=alert]')?.textContent.includes('Ders notları yüklenemedi')`, 'not hata durumu');
    await evaluate(`document.querySelector('[role=alert] button').click()`);
    await waitFor(`document.querySelector('article h2')?.textContent === 'Sözcükte Anlam'`, 'not yeniden deneme');
    await send('Page.navigate', { url: `${base}/kaynakli-ders-notlari/olmayan-ders` });
    await waitFor(`document.querySelector('[role=alert]')?.textContent.includes('not bulunamadı')`, 'bilinmeyen ders');
    await send('Page.navigate', { url: `${base}/kaynakli-ders-notlari/etiketler?ders=olmayan-ders` });
    await waitFor(`document.querySelector('select')?.value === 'tyt-turkce' && document.querySelector('.source-labels-list a')?.textContent === 'TYT-0001'`, 'bilinmeyen etiket dersi');
    assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
    console.log('Kaynaklı not ve etiket UI: masaüstü + mobil geçti.');
  } finally {
    socket?.close();
    edgeProcess.kill();
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
    const tempRoot = realpathSync(tmpdir());
    const target = realpathSync(profile);
    if (target.startsWith(`${tempRoot}${sep}`) && target.includes(`${sep}kaynakli-edge-`)) {
      try { rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); }
      catch { /* Edge süreçleri profili kısa süre daha tutabilir. */ }
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
