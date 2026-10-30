// Konuyu Öğrenelim uçtan uca arayüz denetimi. Derlenmiş frontend/dist, bellekte çalışan sahte API ile açılır;
// gerçek `ivme` veritabanına yazılmaz. Masaüstü ve mobilde: plan → ön test → bütün bölümler ve kontroller →
// son test → açıklama → ders tamam → ustalık testi → Hatalarım, İlerleme, Ayarlar, harita.
//   node testler/konu-ogrenme-ui.mjs [kavram]        (varsayılan: ilk ders)
//   node testler/konu-ogrenme-ui.mjs --live           (yalnız okuma: çalışan 1010 uygulamasında sayfalar açılır)
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORKED_EXAMS } from '../frontend/src/learn/content/worked-exams.js';
import { parseLesson } from '../frontend/src/learn/content/parser.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const dist = process.env.IVME_TEST_DIST ? resolve(process.env.IVME_TEST_DIST) : join(ROOT, 'frontend/dist');
const out = join(ROOT, 'veri/ui-denetim/konu-ogrenme');
mkdirSync(out, { recursive: true });
const live = process.argv.includes('--live');
const discoveryOnly = process.argv.includes('--kesif');
const guidedOnly = process.argv.includes('--gercek-ornek');
const lessonsDir = join(ROOT, 'frontend/src/learn/content/dersler');
const conceptId = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? readdirSync(lessonsDir).filter((n) => n.endsWith('.ders')).sort()[0].replace(/\.ders$/, '');

const db = { events: [], profile: null, seq: 0 };
const LETTERS = 'ABCDE';
const svg = (text) => `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="260"><rect width="720" height="260" fill="white" stroke="black"/><text x="30" y="120" font-size="28">${text}</text><text x="30" y="170" font-size="20">A) 1  B) 2  C) 3  D) 4  E) 5</text></svg>`;

const server = live ? null : createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const body = await new Promise((done) => { let data = ''; req.on('data', (c) => { data += c; }); req.on('end', () => done(data ? JSON.parse(data) : null)); });
  const json = (value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
  const p = url.pathname;
  if (p === '/api/auth/me') return json({ id: 7, username: 'student', role: 'USER', contactComplete: true, approved: true });
  if (p === '/api/auth/activity') { res.writeHead(204); return res.end(); }
  if (p === '/api/exam-tracks') return json({ currentId: 'yks', tracks: [{ id: 'yks', name: 'YKS', family: 'YKS', status: 'ACTIVE', sections: [], readyFeatures: [] }] });
  if (p.startsWith('/api/preferences/')) return json({ value: req.method === 'PUT' ? body?.value : p.endsWith('question-image-fit') });
  if (p === '/api/konu-ogrenme' && req.method === 'GET') return json({ profile: db.profile, events: db.events, serverNow: new Date().toISOString() });
  if (p === '/api/konu-ogrenme/profile' && req.method === 'PUT') {
    if ((db.profile?.revision ?? null) !== (body.revision ?? null)) return json({ hata: 'Ayarlar başka bir pencerede değişmiş.' }, 409);
    db.profile = { settings: body.settings, revision: (db.profile?.revision ?? 0) + 1, updatedAt: new Date().toISOString() };
    return json(db.profile);
  }
  if (p === '/api/konu-ogrenme/events' && req.method === 'POST') {
    const saved = body.events.map((event) => {
      assert.notEqual(event.itemType, 'bank', 'banka cevabı /events ile gönderilmemeli');
      const existing = db.events.find((e) => e.id === event.id);
      if (existing) return existing;
      const stored = { ...event, seq: ++db.seq };
      db.events.push(stored);
      return stored;
    });
    return json({ events: saved });
  }
  if (p === '/api/konu-ogrenme/bank-answer' && req.method === 'POST') {
    const event = body.event;
    const correctAnswer = LETTERS[event.questionId % 5];
    const existing = db.events.find((e) => e.id === event.id);
    const stored = existing ?? { ...event, correct: event.chosen === correctAnswer, correctAnswer, seq: ++db.seq };
    if (!existing) db.events.push(stored);
    return json({ event: stored, correct: stored.correct, correctAnswer, hasSolution: true });
  }
  const image = p.match(/^\/api\/questions\/(\d+)\/(image|solution-image)$/);
  if (image) { res.writeHead(200, { 'Content-Type': 'image/svg+xml' }); return res.end(svg(`${image[2] === 'image' ? 'Soru' : 'Çözüm'} ${image[1]}`)); }
  if (p.startsWith('/api/')) return json(null);
  const path = resolve(dist, `.${decodeURIComponent(p)}`);
  const file = path.startsWith(dist + sep) && extname(path) && existsSync(path) ? path : join(dist, 'index.html');
  const types = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.json': 'application/json' };
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
if (server) await new Promise((done) => server.listen(0, '127.0.0.1', done));
if (server) process.env.IVME_URL = `http://127.0.0.1:${server.address().port}`;
const { tarayiciAc, pause } = await import('./lib/tarayici.mjs');

const report = { concept: conceptId, live, runs: [] };
const click = (selector, text) => `(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => !e.disabled && ${text ? `e.textContent.includes(${JSON.stringify(text)})` : 'true'}); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true; })()`;

async function run(mobile) {
  const browser = await tarayiciAc({ mobile });
  const { evalJs, wait, goto, screenshot, errors, failedRequests, login } = browser;
  const shot = (name) => screenshot(join(out, `${mobile ? 'mobil' : 'masaustu'}-${name}.png`));
  const overflow = () => evalJs('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2');
  const steps = [];
  try {
    if (live) {
      await login('student');
      // Girişten önceki beklenen 401 yalnız kimlik kontrolüdür. Giriş sonrası 401 hatadır.
      for (let i = failedRequests.length - 1; i >= 0; i--) {
        const f = failedRequests[i];
        if ((f.status === 401 && new URL(f.url).pathname === '/api/auth/me') || new URL(f.url).pathname === '/favicon.ico') failedRequests.splice(i, 1);
      }
    }
    await goto('/konuyu-ogrenelim');
    await wait('document.body.innerText.includes("Bugünün planı")', 30000);
    await shot('bugun');
    steps.push({ step: 'bugun', overflow: await overflow() });
    if (live) {
      for (const path of ['/konuyu-ogrenelim/harita', `/konuyu-ogrenelim/konu/${conceptId}`, `/konuyu-ogrenelim/ders/${conceptId}`, '/konuyu-ogrenelim/hatalarim', '/konuyu-ogrenelim/ilerleme', '/konuyu-ogrenelim/ayarlar']) {
        await goto(path);
        await wait('document.querySelector("main h1, main h2")', 30000);
        await pause(400);
        steps.push({ step: path, overflow: await overflow() });
        await shot(path.split('/').filter(Boolean).slice(1).join('-') || 'kok');
      }
      return { mobile, steps, errors: [...errors], failedRequests: [...failedRequests] };
    }

    await goto(`/konuyu-ogrenelim/ders/${conceptId}`);
    await wait('document.querySelector(".lr-intro")');
    await shot('ders-giris');
    assert.ok(await evalJs(click('.lr-intro .btn-primary')));
    // Ön test: şık → güven; cevap gösterilmez.
    for (let i = 0; i < 6; i += 1) {
      if (await evalJs('document.body.innerText.includes("Derse geç")')) break;
      await wait('[...document.querySelectorAll(".lr-choice")].some((c) => !c.disabled)');
      await evalJs(click('.lr-choice'));
      await wait('document.querySelector(".lr-confidence")');
      await evalJs(click('.lr-confidence button', 'Emin değilim'));
      await pause(150);
    }
    assert.ok(await evalJs(click('button', 'Derse geç')));
    let sections = 0;
    for (let guard = 0; guard < 40; guard += 1) {
      await wait('document.querySelector(".lr-section, .lr-break, .lr-compare, .lr-pretest-item")');
      if (await evalJs('Boolean(document.querySelector(".lr-break"))')) {
        await shot('oturum-arasi');
        await evalJs(click('.lr-break button', 'Sonraki oturuma'));
        continue;
      }
      if (!(await evalJs('Boolean(document.querySelector(".lr-section"))'))) break;
      sections += 1;
      // Bölümdeki bütün kontrolleri cevapla.
      await evalJs(`(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const setValue = (input, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); };
        for (const check of document.querySelectorAll('.lr-check')) {
          const choice = [...check.querySelectorAll('.lr-choice')].find((c) => !c.disabled);
          if (!choice) continue;
          choice.click(); await wait(80);
          const sure = [...check.querySelectorAll('.lr-confidence button')].find((b) => b.textContent.includes('Eminim'));
          sure?.click(); await wait(80);
        }
        for (const fill of document.querySelectorAll('.lr-fill')) {
          const input = fill.querySelector('input:not(:disabled)'); if (!input) continue;
          setValue(input, '12'); await wait(50);
          [...fill.querySelectorAll('button')].find((b) => b.textContent.includes('Kontrol'))?.click(); await wait(80);
        }
        for (const box of document.querySelectorAll('.lr-sort, .lr-match')) {
          for (const row of box.querySelectorAll('li')) { row.querySelector('button:not(:disabled)')?.click(); await wait(20); }
          [...box.querySelectorAll('button')].find((b) => b.textContent.includes('Kontrol'))?.click(); await wait(80);
        }
        for (const box of document.querySelectorAll('.lr-order')) {
          [...box.querySelectorAll('button')].find((b) => b.textContent.includes('Kontrol'))?.click(); await wait(80);
        }
        for (const step of document.querySelectorAll('.lr-step-hidden button')) { step.click(); await wait(20); }
        for (const button of document.querySelectorAll('.lr-reveal button, .lr-why-btn')) { button.click(); await wait(20); }
      })()`);
      await pause(200);
      if (sections === 1) await shot('bolum-1');
      if (!(await evalJs('Boolean([...document.querySelectorAll(".lr-section-nav .btn-primary")].find((b) => !b.disabled))'))) {
        const blocked = await evalJs('document.querySelector(".lr-section-nav").innerText');
        throw Error(`Devam açılmadı (bölüm ${sections}): ${blocked}`);
      }
      steps.push({ step: `bolum-${sections}`, overflow: await overflow() });
      await evalJs(click('.lr-section-nav .btn-primary'));
      await pause(250);
    }
    assert.ok(sections >= 3, `en az 3 bölüm gezilmeliydi (${sections})`);
    // Son test (cevaplı) → karşılaştırma
    for (let i = 0; i < 6; i += 1) {
      if (await evalJs('Boolean(document.querySelector(".lr-compare"))')) break;
      await wait('[...document.querySelectorAll(".lr-choice")].some((c) => !c.disabled)');
      await evalJs(click('.lr-choice'));
      await wait('document.querySelector(".lr-confidence")');
      await evalJs(click('.lr-confidence button', 'Eminim'));
      await pause(150);
    }
    await shot('son-test');
    assert.ok(await evalJs(click('.lr-compare button', 'Devam')));
    await wait('document.querySelector(".lr-explain-box")');
    await evalJs(`(() => { const box = document.querySelector('.lr-explain-box'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(box, 'İki tek sayıda açıkta kalan iki birim eşleşir; terim sayısında başlangıcı da sayarız.'); box.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    assert.ok(await evalJs(click('button', 'Ana noktalarla')));
    await wait('document.querySelector(".lr-keypoints")');
    await evalJs(`document.querySelectorAll('.lr-kp-rate button:first-child').forEach((b) => b.click())`);
    await shot('ana-noktalar');
    assert.ok(await evalJs(click('button', 'Dersi tamamla')));
    await wait('document.querySelector(".lr-done")');
    await shot('ders-tamam');
    await pause(1200);
    const after = await evalJs(`fetch('/api/konu-ogrenme').then((r) => r.json())`);
    assert.ok(after.events.some((e) => e.kind === 'lesson' && e.action === 'complete' && e.conceptId === conceptId), 'ders tamam olayı kaydedilmeli');
    assert.ok(after.events.some((e) => e.context === 'pretest') && after.events.some((e) => e.context === 'posttest'), 'ön/son test denemeleri kaydedilmeli');
    steps.push({ step: 'ders', sections, events: after.events.length });

    await goto(`/konuyu-ogrenelim/konu/${conceptId}`);
    await wait('document.querySelector(".lr-concept-head")');
    await shot('konu');
    const masteryLink = await evalJs(click('.lr-concept-head a.btn-primary', 'Ustalık testi'));
    assert.ok(masteryLink, 'ders bitince kavram sayfası ustalık testini önermeli');
    await wait('document.querySelector(".lr-runner, .lr-result") || document.body.innerText.includes("uygun soru bulunamadı")', 30000);
    let answered = 0;
    for (let guard = 0; guard < 12; guard += 1) {
      if (!(await evalJs('Boolean(document.querySelector(".lr-runner"))'))) break;
      const bank = await evalJs('Boolean(document.querySelector(".lr-runner .choices"))');
      if (bank) {
        await evalJs(click('.lr-runner .choice', 'B'));
      } else {
        await evalJs(click('.lr-runner .lr-choice'));
      }
      await wait('document.querySelector(".lr-runner .lr-confidence")');
      await evalJs(click('.lr-runner .lr-confidence button', 'Eminim'));
      await wait('document.querySelector(".lr-runner .lr-feedback")', 15000);
      if (answered === 0) await shot('ustalik-soru');
      answered += 1;
      await evalJs(click('.lr-runner .lr-section-nav .btn-primary'));
      await pause(250);
    }
    await wait('document.querySelector(".lr-result") || document.body.innerText.includes("uygun soru bulunamadı")', 15000);
    await shot('ustalik-sonuc');
    steps.push({ step: 'ustalik', answered });

    for (const [path, name, ready] of [
      ['/konuyu-ogrenelim/hatalarim', 'hatalarim', 'document.body.innerText.includes("Bütün hatalar")'],
      ['/konuyu-ogrenelim/ilerleme', 'ilerleme', 'document.querySelector(".ag-root-wrapper")'],
      ['/konuyu-ogrenelim/ilerleme?sekme=kalibrasyon', 'kalibrasyon', 'document.querySelector(".lr-chart")'],
      ['/konuyu-ogrenelim/ilerleme?sekme=tahmin', 'tahmin', 'document.querySelector(".lr-forecast")'],
      ['/konuyu-ogrenelim/harita', 'harita', 'document.querySelector(".lr-concepts")'],
      ['/konuyu-ogrenelim', 'bugun-sonra', 'document.body.innerText.includes("Bugünün planı")'],
    ]) {
      await goto(path);
      await wait(ready, 20000);
      await pause(300);
      steps.push({ step: name, overflow: await overflow() });
      await shot(name);
    }
    await goto('/konuyu-ogrenelim/ayarlar');
    await wait('document.querySelector(".lr-form")');
    await evalJs(`(() => { const input = document.querySelector('.lr-form input[type=number]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '150'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    assert.ok(await evalJs(click('.lr-form button[type=submit]')));
    await wait('document.body.innerText.includes("Kaydedildi")');
    await shot('ayarlar');
    assert.equal(db.profile.settings.dailyMinutes, 150);
    return { mobile, steps, errors: [...errors], failedRequests: [...failedRequests].filter((f) => !f.url?.includes('favicon')) };
  } catch (error) {
    await shot('hata').catch(() => {});
    return { mobile, steps, failure: error.message, page: await evalJs('location.pathname + " :: " + document.body.innerText.slice(0, 600)').catch(() => ''), errors: [...errors], failedRequests: [...failedRequests] };
  } finally {
    browser.close();
  }
}

async function runDiscoveries(mobile) {
  const browser = await tarayiciAc({ mobile });
  const { goto, wait, evalJs, screenshot, errors, failedRequests } = browser;
  const steps = [];
  try {
    for (const file of readdirSync(lessonsDir).filter((f) => f.endsWith('.ders'))) {
      const id = file.replace(/\.ders$/, '');
      await goto(`/konuyu-ogrenelim/ders/${id}`);
      await wait('document.querySelector(".lr-intro .btn-secondary")');
      await evalJs(click('.lr-intro .btn-secondary'));
      await wait('document.querySelector(".lm-lab")');
      assert.equal(await evalJs('document.querySelector(".lr-reader-tools button[aria-pressed=true]").textContent'), 'Temelden');
      await evalJs(`(async () => {
        const pause = (ms) => new Promise((r) => setTimeout(r, ms));
        for (const input of document.querySelectorAll('.lm-control input, .lm-control select')) {
          const proto = input.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
          const value = input.tagName === 'SELECT' ? input.options[input.options.length - 1].value : input.max;
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value);
          input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
          await pause(20);
        }
      })()`);
      assert.ok(await evalJs('document.querySelector(".lm-observation").textContent.length > 40'));
      assert.ok(!(await evalJs('Boolean(document.querySelector(".katex-error"))')), `${id} formül hatası`);
      await evalJs(click('.lm-zoom-button'));
      await wait('document.querySelector("dialog[open]")');
      await evalJs(click('dialog[open] button', 'Kapat'));
      assert.equal(await evalJs('Boolean(document.querySelector("dialog[open]"))'), false);
      if (['rasyonel-sayilar', 'birinci-derece-denklemler', 'carpanlara-ayirma', 'temel-kavramlar'].includes(id)) {
        await evalJs('document.querySelector(".lm-exploration").scrollIntoView({ block: "start" })');
        await screenshot(join(out, `${mobile ? 'mobil' : 'masaustu'}-kesif-${id}.png`));
      }
      await evalJs(click('.lm-phases button', 'Birlikte'));
      await wait('document.querySelector(".lm-reasoning li")');
      for (let i = 0; i < 6; i++) {
        if (!(await evalJs(click('.lm-phase .btn-primary', 'Sonraki adım')))) break;
        await pause(25);
      }
      assert.ok(await evalJs('document.querySelectorAll(".lm-reasoning li").length >= 3'));
      await evalJs(click('.lm-phase .btn-primary', 'Benzer'));
      await wait('document.querySelector(".lm-transfer-options")');
      await evalJs(click('.lm-transfer-options button'));
      await evalJs(click('.lm-transfer .btn-primary', 'kontrol'));
      await wait('document.querySelector(".lm-transfer .lr-feedback")');
      steps.push({ step: id, overflow: await evalJs('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2') });
    }
    return { mobile, steps, errors: [...errors], failedRequests: [...failedRequests].filter((f) => !f.url?.includes('favicon')) };
  } catch (error) {
    await screenshot(join(out, `${mobile ? 'mobil' : 'masaustu'}-kesif-hata.png`));
    return { mobile, steps, failure: error.message, page: await evalJs('location.pathname'), errors: [...errors], failedRequests: [...failedRequests] };
  } finally { browser.close(); }
}

async function runGuided(mobile) {
  const browser = await tarayiciAc({ mobile });
  const { goto, wait, evalJs, screenshot, errors, failedRequests } = browser;
  const steps = [];
  try {
    for (const [code, guide] of Object.entries(WORKED_EXAMS)) {
      const lesson = parseLesson(readFileSync(join(lessonsDir, `${guide.conceptId}.ders`), 'utf8'), guide.conceptId);
      const section = lesson.sections.findIndex((s) => s.blocks.some((b) => b.code === code));
      db.events = [{ id: `open-${code}`, seq: ++db.seq, at: new Date().toISOString(), kind: 'lesson', action: 'open', conceptId: guide.conceptId }];
      for (let i = 0; i < section; i++) db.events.push({ id: `${code}-${i}`, seq: ++db.seq, at: new Date().toISOString(), kind: 'lesson', action: 'section', conceptId: guide.conceptId, sectionId: lesson.sections[i].id, nextSectionId: lesson.sections[i + 1].id, ms: 1 });
      await goto(`/konuyu-ogrenelim/ders/${guide.conceptId}`);
      await wait('document.querySelector(".lr-guided-exam .image-btn img")?.naturalWidth > 0');
      const before = db.events.length;
      assert.equal(await evalJs('Boolean(document.querySelector(".lm-exam-conclusion"))'), false, 'cevap başlangıçta görünmemeli');
      await evalJs('document.querySelector(".lr-guided-exam").scrollIntoView({block:"start"})');
      const width = await evalJs('document.querySelector(".lr-guided-exam .image-btn img").getBoundingClientRect().width');
      assert.ok(width > (mobile ? 200 : 400), `${code}: özgün soru çok küçük (${width})`);
      for (let i = 0; i < guide.steps.length; i++) {
        assert.ok(await evalJs(click('.lr-guided-exam .btn-primary')));
        await pause(40);
      }
      await wait('document.querySelector(".lm-exam-conclusion")');
      assert.ok(await evalJs(`document.querySelector('.lm-exam-conclusion').textContent.includes(${JSON.stringify(guide.result)})`));
      assert.ok(await evalJs(`document.querySelector('.lm-exam-conclusion a').href.includes('tip=${guide.archetype}')`));
      assert.ok(!(await evalJs('Boolean(document.querySelector(".katex-error"))')));
      assert.equal(db.events.length, before, 'rehberli çözüm puan/deneme olayı üretmemeli');
      await evalJs('document.querySelector(".lm-exam-conclusion").scrollIntoView({block:"center"})');
      await screenshot(join(out, `${mobile ? 'mobil' : 'masaustu'}-gercek-${code}.png`));
      steps.push({ step: code, width, overflow: await evalJs('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2') });
    }
    return { mobile, steps, errors: [...errors], failedRequests: [...failedRequests].filter((f) => !f.url?.includes('favicon')) };
  } catch (error) {
    await screenshot(join(out, `${mobile ? 'mobil' : 'masaustu'}-gercek-hata.png`));
    return { mobile, steps, failure: error.message, page: await evalJs('location.pathname'), errors: [...errors], failedRequests: [...failedRequests] };
  } finally { browser.close(); }
}

try {
  for (const mobile of [false, true]) {
    db.events = []; db.profile = null; db.seq = 0;
    report.runs.push(await (guidedOnly ? runGuided(mobile) : discoveryOnly ? runDiscoveries(mobile) : run(mobile)));
  }
} finally {
  server?.close();
}
const problems = report.runs.flatMap((r) => [
  ...(r.failure ? [`${r.mobile ? 'mobil' : 'masaüstü'}: ${r.failure} — ${r.page ?? ''}`] : []),
  ...r.errors.map((e) => `${r.mobile ? 'mobil' : 'masaüstü'} konsol: ${e}`),
  ...r.failedRequests.map((f) => `${r.mobile ? 'mobil' : 'masaüstü'} istek ${f.status}: ${f.url}`),
  ...r.steps.filter((s) => s.overflow).map((s) => `${r.mobile ? 'mobil' : 'masaüstü'} yatay taşma: ${s.step}`),
]);
console.log(JSON.stringify({ ...report, problems, screenshots: out }, null, 2));
process.exitCode = problems.length ? 1 : 0;
