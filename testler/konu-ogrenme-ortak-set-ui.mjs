// TAS-05 arayüz kabulü: Konuyu Öğrenelim bağlantısı yeni sekmede ortak PRATIK oturumunu açar; gösterilen sayı kurulan setle aynıdır.
// Derlenmiş frontend/dist, bellekte çalışan sahte API ile açılır; gerçek `ivme` veritabanına yazılmaz.
//   node testler/konu-ogrenme-ortak-set-ui.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORKED_EXAMS } from '../frontend/src/learn/content/worked-exams.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const dist = process.env.IVME_TEST_DIST ? resolve(process.env.IVME_TEST_DIST) : join(ROOT, 'frontend/dist');
const out = join(ROOT, 'veri/ui-denetim/konu-ogrenme');
mkdirSync(out, { recursive: true });
const pilot = process.argv.includes('--pilot');
const CONCEPT = pilot ? 'bolme-bolunebilme' : 'temel-kavramlar';
const groups = JSON.parse(readFileSync(join(ROOT, 'frontend/src/learn/bank/_gorsel.json'), 'utf8')).groups;
const bank = JSON.parse(readFileSync(join(ROOT, `frontend/src/learn/bank/${CONCEPT}.json`), 'utf8')).questions;
const codeOf = new Map(bank.map((q) => [q.i, q.c]));

const server = { posts: [], sessions: new Map(), failNext: 0, nextId: 700, answers: new Map(), answerPosts: [] };
const svg = (text) => `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="260"><rect width="720" height="260" fill="white" stroke="black"/><text x="30" y="120" font-size="28">${text}</text></svg>`;

const http = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const body = await new Promise((done) => { let data = ''; req.on('data', (c) => { data += c; }); req.on('end', () => done(data ? JSON.parse(data) : null)); });
  const json = (value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
  const p = url.pathname;
  if (p === '/api/auth/me') return json({ id: 7, username: 'student', role: 'USER', contactComplete: true, approved: true });
  if (p === '/api/auth/activity') { res.writeHead(204); return res.end(); }
  if (p === '/api/exam-tracks') return json({ currentId: 'yks', tracks: [{ id: 'yks', name: 'YKS', family: 'YKS', status: 'ACTIVE', sections: [], readyFeatures: [] }] });
  if (p.startsWith('/api/preferences/')) return json({ value: req.method === 'PUT' ? body?.value : p.endsWith('question-image-fit') });
  if (p === '/api/konu-ogrenme' && req.method === 'GET') {
    const open = [...server.sessions.values()].filter((s) => s.status === 'IN_PROGRESS').map((s) => ({
      id: s.id, status: s.status, kind: s.origin.kind, conceptId: s.origin.conceptId, archetypeId: s.origin.archetypeId, title: s.origin.title,
      total: s.questions.length, answered: 0, firstCorrect: 0 }));
    return json({ profile: null, serverNow: new Date().toISOString(), practiceSets: open,
      events: [{ id: 'lesson-open-1', at: new Date(Date.now() - 86400000).toISOString(), kind: 'lesson', action: 'open', conceptId: CONCEPT, seq: 1 }] });
  }
  if (p === '/api/konu-ogrenme/practice-sets' && req.method === 'POST') {
    server.posts.push(body);
    if (server.failNext > 0) { server.failNext -= 1; return json({ hata: 'Şu sorular bu konuda kullanılamıyor: sahte hata' }, 409); }
    const previous = [...server.sessions.values()].find((s) => s.requestId === body.clientRequestId);
    if (previous) return json({ session: previous, resumed: false });
    const id = server.nextId++;
    const session = {
      id, requestId: body.clientRequestId, status: 'IN_PROGRESS', questionCount: body.items.length, startedAt: new Date().toISOString(),
      selectionMode: 'MIXED', subject: 'Matematik', topic: body.title, origin: { kind: body.kind, conceptId: body.conceptId, archetypeId: body.archetypeId, title: body.title },
      questions: body.items.map((item, i) => ({ questionId: item.questionId, position: i + 1, code: codeOf.get(item.questionId) ?? `Q-${item.questionId}`, bank: 'OGM',
        subject: 'Matematik', topic: body.title, status: 'NOT_STARTED' })),
    };
    server.sessions.set(id, session);
    return json({ session, resumed: false }, 201);
  }
  const sessionMatch = p.match(/^\/api\/study-sessions\/(\d+)$/);
  if (sessionMatch) return server.sessions.has(Number(sessionMatch[1])) ? json(server.sessions.get(Number(sessionMatch[1]))) : json({ hata: 'yok' }, 404);
  const byCode = p.match(/^\/api\/questions\/code\/(.+)$/);
  if (byCode) {
    const code = decodeURIComponent(byCode[1]);
    const row = bank.find((q) => q.c === code);
    return json({ id: row?.i ?? 1, code, bank: 'OGM', examType: row?.x ?? 'TYT', year: row?.y,
      source: 'OGM çıkmış sorular', subject: 'Matematik', topic: pilot ? 'Bölme ve bölünebilme' : 'Temel kavramlar',
      choiceCount: 5, hasSolutionImage: false, hasApprovedHint: false,
      helpfulness: { helpful: 0, notHelpful: 0, mine: null, canVote: false } });
  }
  if (/^\/api\/questions\/\d+\/practice$/.test(p)) {
    if (req.method === 'POST') {
      server.answerPosts.push(body);
      const code = codeOf.get(Number(p.split('/')[3]));
      const correct = body.answer === WORKED_EXAMS[code]?.answer;
      const result = { attempts: [{ eventType: 'ANSWER', selectedAnswer: body.answer, correct }], canAnswer: !correct,
        canReveal: !correct, roundComplete: correct, round: 1, remainingAttempts: correct ? 0 : 1,
        correctAnswer: correct ? WORKED_EXAMS[code].answer : null };
      server.answers.set(p, result);
      return json(result);
    }
    return json(server.answers.get(p) ?? { attempts: [], canAnswer: true, canReveal: false, roundComplete: false, round: 1, remainingAttempts: 2 });
  }
  if (/^\/api\/questions\/\d+\/board$/.test(p)) return json({ version: 0, strokes: [] });
  const image = p.match(/^\/api\/questions\/(\d+)\/(image|solution-image)$/);
  if (image) {
    const code = codeOf.get(Number(image[1]));
    const file = join(ROOT, `veri/resimler-pilot/kirpilmis/TYT/matematik/${code}.webp`);
    if (pilot && existsSync(file)) { res.writeHead(200, { 'Content-Type': 'image/webp' }); return res.end(readFileSync(file)); }
    res.writeHead(200, { 'Content-Type': 'image/svg+xml' }); return res.end(svg(`Soru ${image[1]}`));
  }
  if (p === '/api/learning-resources/metadata') return json({ summary: {}, branches: [], categories: JSON.parse(readFileSync(join(ROOT, 'frontend/src/data/curriculumIdentities.json'), 'utf8')).canonicalUnits });
  if (p.startsWith('/api/')) return json(null);
  const path = resolve(dist, `.${decodeURIComponent(p)}`);
  const file = path.startsWith(dist + sep) && extname(path) && existsSync(path) ? path : join(dist, 'index.html');
  const types = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.json': 'application/json' };
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((done) => http.listen(0, '127.0.0.1', done));
process.env.IVME_URL = `http://127.0.0.1:${http.address().port}`;
const { tarayiciAc } = await import('./lib/tarayici.mjs');

async function run(mobile) {
  const browser = await tarayiciAc({ mobile });
  const { evalJs, wait, goto, screenshot, errors } = browser;
  const label = mobile ? 'mobil' : 'masaustu';
  const overflow = () => evalJs('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2');
  const steps = [];
  server.sessions.clear();
  try {
    // 1) Konu sayfası: bağlantılar yeni sekmede açılır ve sayılar gerçek setlerdir (413 kayıt → 360 tekil; 52 çıkmış; konu testi 12).
    await goto(`/konuyu-ogrenelim/konu/${CONCEPT}`);
    await wait('document.querySelector(".lr-concept-page")', 30000);
    await wait('[...document.querySelectorAll(".lr-actions a")].some((a) => a.textContent.includes("Çıkmış sorular (52 soru)")) && [...document.querySelectorAll(".lr-actions a")].some((a) => a.textContent.includes("Konu testi (12 soru)"))', 30000);
    const links = await evalJs(`[...document.querySelectorAll('.lr-actions a')].map((a) => ({ text: a.textContent.replace(/\\s+/g, ' ').trim(), target: a.target, rel: a.rel, href: a.getAttribute('href') }))`);
    const past = links.find((l) => l.text.startsWith('Çıkmış sorular'));
    const test = links.find((l) => l.text.startsWith('Konu testi'));
    assert.ok(past && test, JSON.stringify(links));
    assert.match(past.text, /Çıkmış sorular \(52 soru\)/);
    assert.match(test.text, /Konu testi \(12 soru\)/);
    for (const link of [past, test]) { assert.equal(link.target, '_blank'); assert.match(link.rel, /noopener/); }
    assert.equal(past.href, `/konuyu-ogrenelim/pratik?tur=cikmis&konu=${CONCEPT}`);
    assert.ok(await evalJs('document.body.innerText.includes("360 tekil soru")'), 'banka satırı tekil soru sayısını göstermeli');
    assert.equal(await overflow(), false);
    await screenshot(join(out, `${label}-ortak-set-konu.png`));
    steps.push({ step: 'konu-baglantilari', past: past.text, test: test.text });

    // 2) Çıkmış sorular: bağlantı hedefi oturumu kurar (tek POST) ve ortak çözüm ekranına geçer.
    server.posts.length = 0;
    const firstId = server.nextId;
    await goto(past.href);
    await wait('location.pathname.startsWith("/soru/")', 30000);
    await wait('document.querySelector(".qpage")', 30000);
    assert.equal(server.posts.length, 1);
    const pastBody = server.posts[0];
    assert.equal(pastBody.kind, 'PAST_EXAM');
    assert.equal(pastBody.items.length, 52, 'gizli 40 sınırı yok');
    assert.equal(new Set(pastBody.items.map((i) => i.questionId)).size, 52);
    assert.match(pastBody.clientRequestId, /^[0-9a-f-]{36}$/);
    const location = await evalJs('location.pathname + location.search');
    assert.match(location, new RegExp(`sessionId=${firstId}`));
    assert.ok(await evalJs('document.querySelector(".qstrip").innerText.includes("1 / 52")'), 'sıra göstergesi 1 / 52 olmalı');
    assert.ok(await evalJs('[...document.querySelectorAll(".qstrip a")].some((a) => a.textContent.includes("Konuya dön") && a.getAttribute("href").endsWith("/konuyu-ogrenelim/konu/temel-kavramlar"))'));
    await screenshot(join(out, `${label}-ortak-set-soru.png`));
    steps.push({ step: 'cikmis-oturumu', items: pastBody.items.length, location });

    // 3) Sonuç/oturum ekranı konuya geri bağlantı verir.
    await goto(`/pratik/${firstId}`);
    await wait('document.querySelector(".practice-list li")', 30000);
    assert.ok(await evalJs('document.querySelector("h1").innerText.includes("Çıkmış sorular")'));
    assert.equal(await evalJs('document.querySelectorAll(".practice-list li").length'), 52);
    assert.equal(await evalJs('[...document.querySelectorAll("a")].some((a) => a.textContent.includes("Konuya dön"))'), true);
    steps.push({ step: 'oturum-ekrani' });

    // 4) Konu testi: 12 tekil soru, hiçbir görsel ikizi sette değil; aynı istek kimliği aynı seti döndürür.
    server.posts.length = 0;
    await goto(`${test.href}&istek=11111111-1111-4111-8111-111111111111`);
    await wait('location.pathname.startsWith("/soru/")', 30000);
    const testBody = server.posts[0];
    assert.equal(testBody.kind, 'TOPIC_TEST');
    assert.equal(testBody.items.length, 12);
    const testCodes = testBody.items.map((i) => codeOf.get(i.questionId));
    const images = testCodes.map((c) => groups[c] ?? c);
    assert.equal(new Set(images).size, 12, 'aynı görsel iki kez yok');
    const first = server.sessions.size;
    await goto(`${test.href}&istek=11111111-1111-4111-8111-111111111111`);
    await wait('location.pathname.startsWith("/soru/")', 30000);
    assert.equal(server.sessions.size, first, 'aynı istek kimliği ikinci oturum açmaz');
    steps.push({ step: 'konu-testi', items: testBody.items.length });

    // Açık setler ders sayfasında "devam" olarak görünür ve ilerleme sayısını taşır.
    await goto(`/konuyu-ogrenelim/konu/${CONCEPT}`);
    await wait('[...document.querySelectorAll(".lr-actions a")].some((a) => a.textContent.includes("Çıkmış sorular: devam (0/52)"))', 30000);
    assert.ok(await evalJs('[...document.querySelectorAll(".lr-actions a")].some((a) => a.textContent.includes("Konu testi: devam (0/12)"))'));

    // 5) Eski adres başlatma sayfasına yönlenir.
    await goto(`/konuyu-ogrenelim/calis?tur=cikmis&konu=${CONCEPT}`);
    await wait('location.pathname.startsWith("/soru/")', 30000);
    steps.push({ step: 'eski-adres' });

    // 6) Sunucu hatası boş sekmede gizli kalmaz; "Tekrar dene" aynı istek kimliğiyle yeniden dener.
    server.failNext = 1;
    server.posts.length = 0;
    await goto(`/konuyu-ogrenelim/pratik?tur=test&konu=${CONCEPT}&istek=22222222-2222-4222-8222-222222222222`);
    await wait('document.querySelector("[role=alert]")', 30000);
    assert.ok(await evalJs('document.querySelector("[role=alert]").innerText.includes("kullanılamıyor")'));
    assert.equal(await overflow(), false);
    await screenshot(join(out, `${label}-ortak-set-hata.png`));
    assert.ok(await evalJs('(() => { const b = [...document.querySelectorAll("button")].find((e) => e.textContent.includes("Tekrar dene")); b?.click(); return !!b; })()'));
    await wait('location.pathname.startsWith("/soru/")', 30000);
    assert.deepEqual([...new Set(server.posts.map((p) => p.clientRequestId))], ['22222222-2222-4222-8222-222222222222']);
    steps.push({ step: 'hata-ve-yeniden-dene', posts: server.posts.length });

    const relevant = errors.filter((e) => !/favicon|Failed to load resource/.test(e));
    assert.deepEqual(relevant, [], `konsol hatası: ${relevant.join(' | ')}`);
    return { mobile, steps };
  } catch (error) {
    const page = await evalJs('location.href + " | " + (document.querySelector("main")?.innerText ?? "").slice(0, 900)').catch(() => '?');
    console.error('SAYFA:', page, '| HATALAR:', errors.slice(0, 5));
    throw error;
  } finally {
    browser.close();
  }
}

async function runPilot(mobile) {
  const browser = await tarayiciAc({ mobile });
  const { goto, wait, evalJs, screenshot, errors } = browser;
  server.sessions.clear(); server.answers.clear(); server.answerPosts.length = 0; server.posts.length = 0;
  try {
    await goto(`/konuyu-ogrenelim/konu/${CONCEPT}`);
    await wait('[...document.querySelectorAll("a")].some(a => a.textContent.includes("Konu testi (2 soru)"))');
    assert.ok(await evalJs('document.body.innerText.includes("bütün soru tiplerini kapsayan ustalık testi değildir")'));
    await goto(`/konuyu-ogrenelim/pratik?tur=test&konu=${CONCEPT}`);
    await wait('document.querySelector(".qpage .choices button:not(:disabled)")');
    assert.deepEqual(server.posts[0].items.map((i) => codeOf.get(i.questionId)).sort(), ['TYT-0592', 'TYT-0597']);
    const session = [...server.sessions.values()][0];
    for (const q of session.questions) {
      await goto(`/soru/${q.code}?sessionId=${session.id}`);
      await wait('document.querySelector(".qpage .choices button:not(:disabled)")');
      await wait('document.querySelector(".board-status") && !document.querySelector(".board-error")');
      assert.equal(await evalJs('!!document.querySelector(".board-retry")'), false, 'karalama hatası yok');
      assert.equal(await evalJs('!!document.querySelector(".lr-guided-exam")'), false, 'cevaptan önce çözüm yok');
      const answer = WORKED_EXAMS[q.code].answer;
      await evalJs(`document.querySelector('.choices button[aria-label="Şık E"]').click()`);
      await wait('document.querySelector(".choice.wrong")');
      assert.equal(await evalJs('!!document.querySelector(".lr-guided-exam")'), false, 'ilk yanlış çözümü açmaz');
      await evalJs('[...document.querySelectorAll("button")].find(b => b.textContent.includes("Tekrar dene")).click()');
      await wait('document.querySelector(".choices button:not(:disabled)")');
      await evalJs(`document.querySelector('.choices button[aria-label="Şık ${answer}"]').click()`);
      await wait('document.querySelector(".lr-guided-exam .btn-primary")');
      assert.ok(await evalJs(`document.querySelector('.lr-guided-exam .lr-question-source').innerText.includes(${JSON.stringify(String(bank.find((row) => row.c === q.code).y))})`), 'çözümün sınav yılı API year alanından gelir');
      const writes = server.answerPosts.length;
      for (const step of WORKED_EXAMS[q.code].steps) {
        await evalJs('document.querySelector(".lr-guided-exam .btn-primary").click()');
        await new Promise((r) => setTimeout(r, 50));
      }
      await wait('document.querySelector(".lm-exam-conclusion")');
      assert.ok(await evalJs(`document.querySelector('.lm-exam-conclusion').innerText.includes(${JSON.stringify(WORKED_EXAMS[q.code].result)})`));
      await evalJs('document.querySelector(".lr-pilot-solution-source summary").click()');
      assert.ok(await evalJs('document.querySelector(".lr-pilot-solution-source").innerText.includes("öğretmen incelemesi bekleniyor")'));
      assert.equal(server.answerPosts.length, writes, 'çözüm okumak yeni cevap üretmez');
      assert.equal(await evalJs('!!document.querySelector(".katex-error")'), false);
      assert.equal(await evalJs('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2'), false);
      await evalJs('document.querySelector(".lr-guided-exam").scrollIntoView({block:"start"})');
      await screenshot(join(out, `${mobile ? 'mobil' : 'masaustu'}-tas08-${q.code}.png`));
      await evalJs('[...document.querySelectorAll("button")].find(b => b.textContent.includes("Yeniden çalış")).click()');
      assert.equal(await evalJs('!!document.querySelector(".lr-guided-exam")'), false, 'yeni denemede çözüm saklanır');
    }
    assert.deepEqual(errors.filter((e) => !/favicon|Failed to load resource/.test(e)), []);
    return { mobile, pilot: true, questions: session.questions.map((q) => q.code), answerPosts: server.answerPosts.length };
  } catch (error) {
    console.error('PİLOT:', { mobile, posts: server.answerPosts, errors,
      page: await evalJs('document.querySelector("main")?.innerText').catch(() => '?') });
    throw error;
  } finally { browser.close(); }
}

const report = [];
try {
  for (const mobile of [false, true]) report.push(await (pilot ? runPilot(mobile) : run(mobile)));
  console.log(JSON.stringify(report, null, 1));
} finally {
  http.close();
}
process.exit(0);
