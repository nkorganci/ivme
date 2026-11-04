// TAS-06 arayüz kabulü: kişisel zorluk etiketi ve tekrar tercihi soru ekranında kaydedilir; Soru Çöz & Pratik'te kişisel süzgeçler
// ve sıfırlama çalışır, gösterilen sayı oturum kurulurken uygulanan süzgeçle aynıdır. Sahte API bellektedir; gerçek DB'ye yazılmaz.
//   node testler/kisisel-tercih-ui.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const dist = process.env.IVME_TEST_DIST ? resolve(process.env.IVME_TEST_DIST) : join(ROOT, 'frontend/dist');
const out = join(ROOT, 'veri/ui-denetim/kisisel-tercih');
mkdirSync(out, { recursive: true });

const svg = (text) => `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="260"><rect width="720" height="260" fill="white" stroke="black"/><text x="30" y="120" font-size="28">${text}</text></svg>`;
const categories = [{ id: 'tyt.matematik.sayilar', exam: 'TYT', subject: 'Matematik', subjectId: 'matematik', topic: 'Sayılar', origin: 'SOURCE' }];
const POOL = 100;
const mock = { hidden: 3, again: 2, easy: 0, medium: 1, hard: 1, availability: [], sessions: [], puts: [], resets: [], question: { difficulty: null, repeat: 'DEFAULT' } };
let yurtDisi = false;
const summary = () => ({ again: mock.again, hidden: mock.hidden, easy: mock.easy, medium: mock.medium, hard: mock.hard });

const http = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const body = await new Promise((done) => { let data = ''; req.on('data', (c) => { data += c; }); req.on('end', () => done(data ? JSON.parse(data) : null)); });
  const json = (value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
  const p = url.pathname;
  if (p === '/api/auth/me') return json({ id: 7, username: 'student', role: 'USER', contactComplete: true, approved: true });
  if (p === '/api/auth/activity') { res.writeHead(204); return res.end(); }
  if (p === '/api/exam-tracks') return json({ currentId: 'test-track', tracks: [{ id: 'test-track', name: yurtDisi ? 'Yurt Dışı Öğretmenlik' : 'YKS', family: yurtDisi ? 'YURT_DISI' : 'YKS', status: 'ACTIVE', sections: yurtDisi ? [{ examId: 'YURT_DISI_MY', name: 'Mesleki Yeterlilik' }] : [], readyFeatures: [] }] });
  if (p.startsWith('/api/preferences/')) return json({ value: req.method === 'PUT' ? body?.value : p.endsWith('question-image-fit') });
  if (p === '/api/learning-resources/metadata') return json({ categories });
  if (p === '/api/questions/filters') return json([]);
  if (p === '/api/questions/category-counts') return json({});
  if (p === '/api/study-sessions/unfinished-summary') return json({ count: 0, latestSessionId: null });
  if (p === '/api/questions/pool-summary') return json({ total: POOL, solved: 0, remaining: POOL, everWrong: 0, correct: 0, sources: {} });
  if (p === '/api/question-preferences/summary') return json(summary());
  if (p === '/api/question-preferences/reset' && req.method === 'POST') {
    mock.resets.push(body.scope);
    if (body.scope !== 'DIFFICULTY') { mock.hidden = 0; mock.again = 0; }
    if (body.scope !== 'REPEAT') { mock.easy = 0; mock.medium = 0; mock.hard = 0; }
    return json(summary());
  }
  if (p === '/api/questions/availability') {
    mock.availability.push(Object.fromEntries(url.searchParams));
    const mark = url.searchParams.get('mark');
    const total = mark === 'HIDE' ? mock.hidden : mark === 'AGAIN' ? mock.again : url.searchParams.get('myDifficulty') === 'ZOR' ? mock.hard
      : url.searchParams.get('practice') === 'true' ? POOL - mock.hidden : POOL;
    return json({ total, solved: 0, remaining: total, everWrong: 0, correct: 0 });
  }
  if (p === '/api/study-sessions' && req.method === 'POST') {
    mock.sessions.push(body);
    return json({ id: 900, status: 'IN_PROGRESS', questionCount: body.questionCount, questions: [{ questionId: 1, position: 1, code: 'Q-1', bank: 'OGM', status: 'NOT_STARTED' }] }, 201);
  }
  if (p === '/api/study-sessions/900') return json({ id: 900, status: 'IN_PROGRESS', questionCount: 1, questions: [{ questionId: 1, position: 1, code: 'Q-1', bank: 'OGM', status: 'NOT_STARTED' }] });
  const questionPref = p.match(/^\/api\/question-preferences\/questions\/(\d+)$/);
  if (questionPref) {
    if (req.method === 'PUT') {
      mock.puts.push(body);
      if (body.difficulty) mock.question.difficulty = body.difficulty === 'NONE' ? null : body.difficulty;
      if (body.repeat) mock.question.repeat = body.repeat;
    }
    return json({ questionId: Number(questionPref[1]), difficulty: mock.question.difficulty, repeat: mock.question.repeat });
  }
  const byCode = p.match(/^\/api\/questions\/code\/(.+)$/);
  if (byCode) return json({ id: 1, code: decodeURIComponent(byCode[1]), bank: yurtDisi ? 'CIKMIS' : 'OGM', examType: yurtDisi ? 'YURT_DISI_MY' : 'TYT', subject: 'Matematik', topic: 'Sayılar', choiceCount: 5, hasSolutionImage: false,
    hasApprovedHint: false, difficultyVotes: {}, myEvaluation: mock.question.difficulty ? { difficultyVote: mock.question.difficulty, rating: null } : null, approvedLabels: [], myRepeat: mock.question.repeat });
  if (/^\/api\/questions\/\d+\/practice$/.test(p) && req.method === 'GET') return json({ attempts: [], canAnswer: true, canReveal: false, roundComplete: false, round: 1, remainingAttempts: 2 });
  if (/^\/api\/questions\/\d+\/board$/.test(p)) return json({ version: 0, strokes: [] });
  if (/^\/api\/questions\/\d+\/(image|solution-image)$/.test(p)) { res.writeHead(200, { 'Content-Type': 'image/svg+xml' }); return res.end(svg('Soru')); }
  if (p.startsWith('/api/')) return json(null);
  const path = resolve(dist, `.${decodeURIComponent(p)}`);
  const file = path.startsWith(dist + sep) && extname(path) && existsSync(path) ? path : join(dist, 'index.html');
  const types = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.json': 'application/json' };
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((done) => http.listen(0, '127.0.0.1', done));
process.env.IVME_URL = `http://127.0.0.1:${http.address().port}`;
const { tarayiciAc, pause } = await import('./lib/tarayici.mjs');

async function run(mobile) {
  Object.assign(mock, { hidden: 3, again: 2, easy: 0, medium: 1, hard: 1, availability: [], sessions: [], puts: [], resets: [], question: { difficulty: null, repeat: 'DEFAULT' } });
  const browser = await tarayiciAc({ mobile });
  const { evalJs, wait, goto, screenshot, errors } = browser;
  const label = (yurtDisi ? 'yurt-disi-' : 'yks-') + (mobile ? 'mobil' : 'masaustu');
  const overflow = () => evalJs('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2');
  const pick = (selector, text) => evalJs(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.textContent.includes(${JSON.stringify(text)})); el?.click(); return !!el; })()`);
  const choose = (selectLabel, optionText) => evalJs(`(() => { const field = [...document.querySelectorAll('.personal-marks .field')].find((f) => f.querySelector('label')?.textContent.includes(${JSON.stringify(selectLabel)}));
    const select = field.querySelector('select'); const option = [...select.options].find((o) => o.textContent.includes(${JSON.stringify(optionText)}));
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; setter.call(select, option.value); select.dispatchEvent(new Event('change', { bubbles: true })); return option.value; })()`);
  const steps = [];
  try {
    // 1) Soru Çöz & Pratik: kişisel işaret özeti ve varsayılan havuz (gizlenenler hariç, practice=true).
    await goto('/calisma/yeni');
    await wait('document.querySelector(".personal-marks")', 30000);
    await wait('document.body.innerText.includes("97") && document.body.innerText.includes("uygun soru var")', 30000);
    const summaryText = await evalJs('document.querySelector(".personal-marks").innerText');
    assert.match(summaryText, /2 soru için tekrar istedin, 3 soruyu gizledin/);
    assert.match(summaryText, /1 orta, 1 zor/);
    assert.match(summaryText, /Gizlediklerin bu havuza dahil değil/);
    assert.ok(mock.availability.every((q) => q.practice === 'true'), 'pratik havuzu practice=true ile sayılır');
    assert.ok(mock.availability.at(-1).mark === undefined && mock.availability.at(-1).myDifficulty === undefined);
    assert.equal(await overflow(), false);
    await screenshot(join(out, `${label}-pratik-kisisel.png`));
    steps.push({ step: 'varsayilan-havuz', available: 97 });

    // 2) Gizlediklerim süzgeci: sayı gizli soru sayısıdır ve oturum isteği aynı süzgeci taşır.
    await choose('Kişisel işaret', 'Gizlediklerim');
    await wait('document.body.innerText.includes("Bu seçimde 3 uygun soru var")', 30000);
    assert.equal(mock.availability.at(-1).mark, 'HIDE');
    await evalJs(`(() => { const input = [...document.querySelectorAll('.field')].find((f) => f.querySelector('label')?.textContent.includes('Soru sayısı')).querySelector('input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(input, '3'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await wait('[...document.querySelectorAll("button[type=submit]")].find((b) => /başlat/i.test(b.textContent))?.disabled === false', 30000);
    assert.ok(await pick('button[type=submit]', 'başlat'));
    await wait('location.pathname.startsWith("/soru/")', 30000);
    assert.equal(mock.sessions.length, 1);
    assert.equal(mock.sessions[0].mark, 'HIDE');
    assert.equal(mock.sessions[0].questionCount, 3);
    steps.push({ step: 'gizlediklerim-oturumu', body: mock.sessions[0].mark });

    // 3) Soru ekranı: kişisel zorluk etiketi ve tekrar tercihi anında kaydedilir; yenilemede korunur.
    await wait('document.querySelector(".qside")', 30000);
    await wait('document.querySelector(".qdock .question-prefs")', 30000);
    assert.ok(await evalJs('(() => { const r = document.querySelector(".question-prefs").getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight && !document.querySelector(".question-prefs").closest("details"); })()'), 'tercihler kapalı bölüme girmeden yanıtların yanında görünür');
    assert.ok(await evalJs('(() => { const [a,b] = [...document.querySelectorAll(".question-prefs-controls [role=radiogroup]")].map(e => e.getBoundingClientRect()); return Math.abs(a.top-b.top)<2 && a.right<=b.left; })()'), 'zorluk ve tekrar seçimleri aynı satırda');
    assert.equal(await evalJs('[...document.querySelectorAll(".question-prefs-controls .seg span")].some(e => e.scrollWidth > e.clientWidth + 1)'), false, 'seçenek metinleri taşmaz');
    assert.ok(await pick('.question-prefs .seg', 'Zor'));
    await wait('document.querySelector(".question-prefs").innerText.includes("Zorluk etiketin: Zor")', 30000);
    assert.ok(await pick('.question-prefs .seg', 'Tekrar gösterme'));
    await wait('document.querySelector(".question-prefs").innerText.includes("Tekrar tercihin: Tekrar gösterme")', 30000);
    assert.match(await evalJs('document.querySelector(".question-prefs").innerText'), /Otomatik pratik, öneri ve konu setlerinden çıkar/);
    assert.deepEqual(mock.puts, [{ difficulty: 'ZOR' }, { repeat: 'HIDE' }]);
    await screenshot(join(out, `${label}-soru-kisisel.png`));
    await goto('/soru/Q-1');
    await wait('document.querySelector(".qside")', 30000);
    await wait('document.querySelector(".question-prefs input:checked")', 30000);
    const checked = await evalJs('[...document.querySelectorAll(".question-prefs input:checked")].map((i) => i.parentElement.textContent.trim())');
    assert.deepEqual(checked, ['Zor', 'Tekrar gösterme']);
    assert.ok(await pick('.question-prefs .seg', 'Etiketsiz'));
    await wait('document.querySelector(".question-prefs").innerText.includes("Zorluk etiketin kaldırıldı")', 30000);
    assert.deepEqual(mock.puts.at(-1), { difficulty: 'NONE' });
    steps.push({ step: 'soru-ekrani', puts: mock.puts.length });

    // 4) Sıfırlama: onay sonrası yalnız seçilen kapsam silinir, özet yenilenir, havuz tam sayıya döner.
    await goto('/calisma/yeni');
    await wait('document.querySelector(".personal-marks")', 30000);
    await evalJs('window.confirm = () => true');
    await wait('[...document.querySelectorAll(".personal-marks button")].some((b) => b.textContent.includes("Tekrar tercihlerimi sıfırla"))', 30000);
    assert.ok(await pick('.personal-marks button', 'Tekrar tercihlerimi sıfırla'));
    await wait('document.querySelector(".personal-marks").innerText.includes("0 soru için tekrar istedin, 0 soruyu gizledin")', 30000);
    assert.deepEqual(mock.resets, ['REPEAT']);
    await wait('document.body.innerText.includes("Bu seçimde 100 uygun soru var")', 30000);
    assert.ok(await pick('.personal-marks button', 'Zorluk etiketlerimi sıfırla'));
    await wait('![...document.querySelectorAll(".personal-marks button")].length', 30000);
    assert.deepEqual(mock.resets, ['REPEAT', 'DIFFICULTY']);
    assert.equal(await overflow(), false);
    await screenshot(join(out, `${label}-sifirlama.png`));
    steps.push({ step: 'sifirlama', resets: mock.resets });

    // PDF'den açılan pratikte de kişisel seçim sayı ve oluşturma isteğine aynen taşınır.
    mock.hard = 10;
    await goto('/calisma/yeni?topicPdfId=42');
    await wait('document.querySelector(".personal-marks")', 30000);
    await choose('Öğrenci zorluk etiketi', 'Zor dediklerim');
    await wait('document.body.innerText.includes("Bu seçimde 10 uygun soru var")', 30000);
    assert.equal(mock.availability.at(-1).topicPdfId, '42');
    assert.equal(mock.availability.at(-1).myDifficulty, 'ZOR');
    await wait('[...document.querySelectorAll("button[type=submit]")].find((b) => /başlat/i.test(b.textContent))?.disabled === false', 30000);
    assert.ok(await pick('button[type=submit]', 'başlat'));
    await wait('location.pathname.startsWith("/soru/")', 30000);
    assert.equal(mock.sessions.at(-1).topicPdfId, 42);
    assert.equal(mock.sessions.at(-1).myDifficulty, 'ZOR');
    steps.push({ step: 'pdf-kisisel-filtre', difficulty: 'ZOR' });

    const relevant = errors.filter((e) => !/favicon|Failed to load resource/.test(e));
    assert.deepEqual(relevant, [], `konsol hatası: ${relevant.join(' | ')}`);
    return { track: yurtDisi ? 'YURT_DISI' : 'YKS', mobile, steps };
  } catch (error) {
    const page = await evalJs('location.href + " | " + (document.querySelector("main")?.innerText ?? "").slice(0, 900)').catch(() => '?');
    console.error('SAYFA:', page.slice(0, 300), '| HATALAR:', errors.slice(0, 5), '| OTURUM İSTEKLERİ:', JSON.stringify(mock.sessions), '| SON SORGU:', JSON.stringify(mock.availability.at(-1)));
    console.error('ALTI:', await evalJs('(document.querySelector("main")?.innerText ?? "").slice(-500)').catch(() => "?"));
    console.error('FORM:', await evalJs('JSON.stringify({ disabled: document.querySelector("button[type=submit]")?.disabled, count: document.querySelector("input[type=number]")?.value, alerts: [...document.querySelectorAll("[role=alert],.alert")].map((a) => a.innerText) })').catch(() => '?'));
    await screenshot(join(out, `${label}-hata.png`)).catch(() => {});
    throw error;
  } finally {
    browser.close();
  }
}

const report = [];
try {
  for (const yd of [false, true]) { yurtDisi = yd; for (const mobile of [false, true]) report.push(await run(mobile)); }
  console.log(JSON.stringify(report, null, 1));
} finally {
  http.close();
}
process.exit(0);
