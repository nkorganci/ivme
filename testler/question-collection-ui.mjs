// Isolated desktop/mobile check for both question collections. Run after frontend `npm run build`.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GUIDE_QUIZ } from '../frontend/src/coachingGuide.js';

const dist = fileURLToPath(new URL('../frontend/dist', import.meta.url));
const questions = [
  { id: 1, code: 'TYT-0001', bank: 'CIKMIS', examType: 'TYT', subject: 'Türkçe', topic: 'Paragraf', year: 2023 },
  { id: 2, code: 'TYT-0002', bank: 'CIKMIS', examType: 'TYT', subject: 'Matematik', topic: 'Üslü Sayılar', year: 2022 },
  { id: 3, code: 'AYT-0001', bank: 'CIKMIS', examType: 'AYT', subject: 'Edebiyat', topic: 'Şiir Bilgisi', year: 2024 },
  { id: 4, code: 'AYT-0002', bank: 'CIKMIS', examType: 'AYT', subject: 'Matematik', topic: 'Fonksiyonlar', year: 2024 },
  { id: 5, code: 'sb-20139', bank: 'OGM', examType: 'TYT', subject: 'Türkçe', topic: 'Paragraf', source: 'OGM soru bankası' },
  { id: 6, code: 'sb-20140', bank: 'OGM', examType: 'TYT', subject: 'Matematik', topic: 'Problemler', source: 'OGM soru bankası' },
  { id: 7, code: 'sb-20141', bank: 'OGM', examType: 'AYT', subject: 'Fizik', topic: 'Hareket', source: 'OGM soru bankası' },
];
let lastStarted = null;
const categories = [
  { id: 'tyt-fizik-isi', exam: 'TYT', subject: 'Fizik', topic: 'Isı ve Sıcaklık', subtopic: 'Genleşme', origin: 'CURRICULUM' },
  { id: 'ayt-mat-integral', exam: 'AYT', subject: 'Matematik', topic: 'İntegral', origin: 'CURRICULUM' },
  { id: 'ayt-fizik-hareket', exam: 'AYT', subject: 'Fizik', topic: 'Hareket', origin: 'SOURCE' },
  { id: 'tyt-biyoloji', exam: 'TYT', subject: 'Biyoloji', topic: 'Hücre' },
  { id: 'ayt-fizik-dalga', exam: 'AYT', subject: 'Fizik', topic: 'Dalga Mekaniği', origin: 'SOURCE' },
];
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const json = (value) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(value));
  };
  if (url.pathname === '/api/auth/me') return json({ id: 1, username: 'student',
    role: 'USER', contactComplete: true });
  if (url.pathname === '/api/learning-resources/metadata') return json({
    categories, questionTypes: [], labels: { difficulty: {} },
  });
  if (url.pathname === '/api/test/category-name') {
    categories.find(category => category.id === 'ayt-fizik-hareket').topic = url.searchParams.get('name');
    return json(true);
  }
  if (url.pathname === '/api/questions/category-counts') return json(Object.fromEntries(
    categories.filter(category => !url.searchParams.get('examType') || category.exam === url.searchParams.get('examType'))
      .filter(category => !url.searchParams.get('subject') || category.subject === url.searchParams.get('subject'))
      .map(category => [category.id, 1])));
  if (url.pathname === '/api/progress/first-attempts') return json({
    startsAt: '2026-10-12T00:00:00Z', endsAt: '2026-10-13T00:00:00Z',
    total: 0, correct: 0, wrong: 0, blank: 0, breakdown: [],
  });
  if (url.pathname === '/api/progress/timeline') return json({ days: [] });
  if (url.pathname === '/api/questions/filters') {
    const rows = questions.filter((item) => !url.searchParams.get('bank') || item.bank === url.searchParams.get('bank'));
    return json(rows.map(({ examType, subject, topic }) => ({ examType, subject, topic, count: 1 })));
  }
  if (url.pathname === '/api/recommendations') {
    const subject = url.searchParams.get('subject');
    return json({ subject, status: subject === 'Türkçe' ? 'OK' : 'NO_CLEAR_WEAKNESS',
      suggestions: subject === 'Türkçe' ? [{ questionTypeCode: 'PAR', questionType: 'Paragraf',
        subtopic: 'Ana düşünce', skill: 'Çıkarım', questions: 8, correct: 3, wrong: 5,
        recentWeightedSuccess: 38, exampleQuestionId: 1, exampleQuestionCode: 'TYT-0001' }] : [] });
  }
  if (url.pathname === '/api/questions/availability') {
    const total = questions.filter((item) => ['bank', 'examType', 'subject', 'topic']
      .every((key) => !url.searchParams.get(key) || item[key] === url.searchParams.get(key))).length;
    const available = url.searchParams.has('categoryId') && url.searchParams.get('includeCandidates') === 'false' ? 0 : total;
    return json({ total: available, solved: 0, remaining: available, everWrong: 0 });
  }
  if (url.pathname === '/api/study-sessions/active') return json(null);
  if (req.method === 'POST' && ['/api/study-sessions', '/api/exams'].includes(url.pathname)) {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const payload = JSON.parse(body);
      if (['examType', 'subject', 'topic'].some((key) => payload[key] === '')) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ hata: 'İstek geçersiz: eksik veya hatalı bir değer var.' }));
        return;
      }
      lastStarted = { path: url.pathname, payload };
      const first = questions.find((item) => ['bank', 'examType', 'subject', 'topic']
        .every((key) => !payload[key] || item[key] === payload[key]));
      json(url.pathname === '/api/exams' ? { id: 77 } : {
        id: 88, questions: first ? [{ code: first.code, bank: first.bank }] : [],
      });
    });
    return;
  }
  if (url.pathname === '/api/test/last-started') return json(lastStarted);
  if (url.pathname === '/api/questions') {
    const params = url.searchParams;
    const rows = questions.filter((item) => ['bank', 'examType', 'subject', 'topic']
      .every((key) => !params.get(key) || item[key] === params.get(key)));
    const page = Number(params.get('page') || 0);
    return json({ content: rows, page, size: 20, totalElements: rows.length,
      totalPages: page ? 2 : rows.length ? 1 : 0 });
  }
  if (url.pathname.startsWith('/api/')) return json([]);
  const safe = url.pathname.startsWith('/assets/') ? url.pathname.slice(1) : 'index.html';
  const file = resolve(dist, safe);
  if (!file.startsWith(dist + sep) && file !== resolve(dist, 'index.html')) {
    res.writeHead(404); return res.end();
  }
  try {
    const body = readFileSync(file);
    res.writeHead(200, { 'Content-Type': extname(file) === '.js' ? 'text/javascript'
      : extname(file) === '.css' ? 'text/css' : 'text/html' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const site = `http://127.0.0.1:${server.address().port}`;
const profile = mkdtempSync(join(tmpdir(), 'question-collection-ui-'));
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
try {
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  for (const width of [1280, 1024, 390]) {
    await cdp('Emulation.setDeviceMetricsOverride', {
      width, height: 900, deviceScaleFactor: 1, mobile: width === 390,
    });
    await cdp('Page.navigate', { url: site + '/cikmis-sorular' });
    await waitFor('document.querySelectorAll(".qcards li").length === 4');
    await waitFor('document.querySelectorAll(".shared-category-select optgroup").length === 4');
    const topicGroups = await evaluate('[...document.querySelectorAll(".shared-category-select optgroup")].map(group=>group.label)');
    if (JSON.stringify(topicGroups) !== JSON.stringify(['AYT · Fizik', 'AYT · Matematik', 'TYT · Biyoloji', 'TYT · Fizik'])) throw Error('Konu grupları yanlış sırada: ' + JSON.stringify(topicGroups));
    if (width === 1280) {
      const labels = await evaluate('[...document.querySelectorAll(".sidebar .sidenav > a, .sidebar .sidenav > .side-nav-group > button")].map(item => item.getAttribute("aria-label"))');
      const expected = ['Ana Sayfa', 'Konular ve Kaynaklar', 'Çalışma önerileri', 'Öğrenci Takip Portalı alt menüsünü aç',
        'Soru Çöz & Pratik', 'Geçmişim ve İlerlemem', 'Geri Bildirim'];
      if (JSON.stringify(labels) !== JSON.stringify(expected)) throw new Error(`Sol menü sırası yanlış: ${JSON.stringify(labels)}`);
    }
    await waitFor('document.querySelector(".sidebar a[aria-current=page]")?.getAttribute("aria-label") === "Soru Çöz & Pratik"');
    await waitFor('document.querySelectorAll(".study-tabs a").length === 1 && document.querySelector(".study-tabs a")?.pathname === "/calisma/yeni"');
    await evaluate('[...document.querySelectorAll(".question-collection-choice")].find(x => x.innerText.startsWith("AYT"))?.click()');
    await waitFor('document.querySelectorAll(".qcards li").length === 2');
    await evaluate('[...document.querySelectorAll(".question-collection-option")].find(x => x.innerText.includes("Edebiyat"))?.click()');
    await waitFor('document.querySelectorAll(".qcards li").length === 1');
    await evaluate('document.querySelector(".question-collection-topic-search")?.focus()');
    await cdp('Input.insertText', { text: 'Şiir' });
    await waitFor('[...document.querySelectorAll(".question-collection-topics button")].some(x => x.innerText.includes("Şiir Bilgisi"))');
    await evaluate('[...document.querySelectorAll(".question-collection-topics button")].find(x => x.innerText.includes("Şiir Bilgisi"))?.click()');
    await waitFor('location.search.includes("topic=") && document.querySelector(".question-collection-list .qcards li")?.innerText.includes("AYT-0001")');
    // Gizlenen sekmelerin liste adresleri ve çalışma kurucusuna konu aktarımı korunur.
    const collectionSearch = await evaluate('location.search');
    await cdp('Page.navigate', { url: site + '/soru-bankasi' + collectionSearch });
    await waitFor('location.pathname === "/soru-bankasi" && document.querySelector(".state-title")?.innerText.includes("Bu filtreye uyan soru yok")');
    await cdp('Page.navigate', { url: site + '/cikmis-sorular' + collectionSearch });
    await waitFor('document.querySelectorAll(".qcards li").length === 1');
    await evaluate('[...document.querySelectorAll(".study-tabs a")].find(a => a.pathname === "/calisma/yeni").click()');
    await waitFor('document.querySelector(".study-scopes button[aria-pressed=true]")?.innerText.includes("Konu")');
    await waitFor('[...document.querySelectorAll("form > .filters select")].at(-1)?.value === "Şiir Bilgisi"');
    const selected = await evaluate('[...document.querySelectorAll("form select")].slice(0, 4).map(item => item.value)');
    if (JSON.stringify(selected) !== JSON.stringify(['CIKMIS', 'AYT', 'Edebiyat', 'Şiir Bilgisi'])) {
      throw new Error(`Çalışma kurucusu konu kapsamını kaybetti: ${JSON.stringify(selected)}`);
    }
    await waitFor('!document.querySelector(".study-tabs") && document.querySelector("h1")?.textContent === "Pratik Yap ve Test Oluştur"');
    await cdp('Page.navigate', { url: site + '/cikmis-sorular' + collectionSearch });
    await waitFor('!!document.querySelector(".question-collection-list")');
    await waitFor('document.querySelector(".question-collection-start button[type=submit]")?.disabled === false');
    await evaluate('document.querySelector(".question-collection-start button[type=submit]").click()');
    await waitFor('location.pathname === "/soru/AYT-0001"');
    await waitFor('document.querySelector(".sidebar a[aria-current=page]")?.getAttribute("aria-label") === "Soru Çöz & Pratik"');
    const practiceStart = await evaluate('fetch("/api/test/last-started").then(r => r.json())');
    if (practiceStart.path !== '/api/study-sessions' || practiceStart.payload.bank !== 'CIKMIS'
      || practiceStart.payload.examType !== 'AYT' || practiceStart.payload.subject !== 'Edebiyat'
      || practiceStart.payload.topic !== 'Şiir Bilgisi' || practiceStart.payload.questionCount !== 1) {
      throw new Error(`Filtreli pratik yanlış başlatıldı: ${JSON.stringify(practiceStart)}`);
    }
    await cdp('Page.navigate', { url: site + '/cikmis-sorular?examType=AYT&subject=Edebiyat&topic=%C5%9Eiir+Bilgisi' });
    await waitFor('!!document.querySelector(".question-collection-list")');
    if (width >= 1024 && !await evaluate('document.querySelector(".question-collection-list").scrollWidth <= document.querySelector(".question-collection-list").clientWidth + 1')) {
      throw new Error(`${width}px soru tablosu yatay kaydırma gerektiriyor.`);
    }
    if (width === 390 && !await evaluate('getComputedStyle(document.querySelector(".qcards")).display !== "none" && document.documentElement.scrollWidth <= innerWidth + 1')) {
      throw new Error('Mobil soru kartları veya sayfa genişliği yanlış.');
    }
    await cdp('Page.navigate', { url: site + '/soru-bankasi' });
    await waitFor('document.querySelectorAll(".qcards li").length === 3');
    await waitFor('document.querySelector(".question-collection-start button[type=submit]")?.disabled === false');
    await evaluate('document.querySelector(".question-collection-start button[type=submit]").click()');
    await waitFor('location.pathname === "/soru/sb-20139"');
    const unfilteredStart = await evaluate('fetch("/api/test/last-started").then(r => r.json())');
    if (unfilteredStart.path !== '/api/study-sessions' || unfilteredStart.payload.bank !== 'OGM'
      || 'examType' in unfilteredStart.payload || 'subject' in unfilteredStart.payload
      || 'topic' in unfilteredStart.payload || unfilteredStart.payload.questionCount !== 3) {
      throw new Error(`Filtresiz soru bankası pratiği yanlış başlatıldı: ${JSON.stringify(unfilteredStart)}`);
    }
    await cdp('Page.navigate', { url: site + '/soru-bankasi' });
    await waitFor('document.querySelectorAll(".qcards li").length === 3');
    await evaluate('[...document.querySelectorAll(".question-collection-choice")].find(x => x.innerText.startsWith("TYT"))?.click()');
    await waitFor('document.querySelectorAll(".qcards li").length === 2');
    await evaluate('[...document.querySelectorAll(".question-collection-option")].find(x => x.innerText.includes("Türkçe"))?.click()');
    await waitFor('document.querySelectorAll(".qcards li").length === 1 && document.querySelector(".qcards li")?.innerText.includes("sb-20139")');
    await waitFor('document.querySelector(".question-collection-start button[type=submit]")?.disabled === false');
    await evaluate('document.querySelector(".question-collection-start select").value = "exam"; document.querySelector(".question-collection-start select").dispatchEvent(new Event("change", { bubbles: true }))');
    await evaluate('document.querySelector(".question-collection-start button[type=submit]").click()');
    await waitFor('location.pathname === "/calisma/yeni" && location.search.includes("mode=sinav")');
    const examQuery = await evaluate('Object.fromEntries(new URLSearchParams(location.search))');
    if (examQuery.bank !== 'OGM' || examQuery.examType !== 'TYT' || examQuery.subject || examQuery.topic) {
      throw new Error(`Deneme oluşturucuya geçiş yanlış: ${JSON.stringify(examQuery)}`);
    }
    await cdp('Page.navigate', { url: site + '/soru-bankasi?page=1' });
    await waitFor('document.querySelector(".qcards a")?.getAttribute("href")?.includes("page=1")');
    console.log(`OK ${width}px çıkmış sorular ve soru bankası kategorileri`);
  }
  await cdp('Page.navigate', { url: site + '/sorular?examType=TYT&subject=T%C3%BCrk%C3%A7e&topic=Paragraf' });
  await waitFor('location.pathname === "/cikmis-sorular" && document.querySelectorAll(".qcards li").length === 1');
  if (!await evaluate('new URLSearchParams(location.search).get("topic") === "Paragraf"')) {
    throw new Error('Eski soru bağlantısı konu filtresini kaybetti.');
  }
  console.log('OK Soru Çöz & Pratik gezinmesi, konu kapsamı ve eski bağlantılar');
  for (const width of [1280, 390]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
    await cdp('Page.navigate', { url: site + '/calisma/yeni' });
    await waitFor('document.querySelector("input[role=combobox]")?.disabled === false');
    const labels = await evaluate('[...document.querySelectorAll("form label")].map(label => label.textContent)');
    if (labels.includes('Konu eşleşmesi') || labels.includes('Onaylı soru tipi') || labels.includes('Ortak konu / alt konu')) throw Error('Kaldırılan filtreler çalışma ekranında kaldı.');
    const layout = await evaluate(`(() => {const fields=[...document.querySelectorAll('form .field')]; const control=name=>fields.find(field=>field.querySelector('label')?.textContent===name).querySelector('input,select').getBoundingClientRect();return {source:control('Kaynak').top,exam:control('Sınav türü').top,search:control('Konu adı ara').top,difficulty:control('Öğretmen zorluk etiketi').top};})()`);
    if (Math.abs(layout.source - layout.exam) > 1 || Math.abs(layout.search - layout.difficulty) > 1) throw Error('Filtreler aynı satırda hizalanmadı: ' + JSON.stringify(layout));
    await evaluate('document.querySelector("input[role=combobox]").focus()');
    await cdp('Input.insertText', { text: 'isi genlesme' });
    await waitFor('document.querySelectorAll(".category-suggestions [role=option]").length === 1 && document.querySelector(".category-suggestions")?.textContent.includes("Isı ve Sıcaklık")');
    await evaluate('document.querySelector("input[role=combobox]").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}))');
    await waitFor('new URLSearchParams(location.search).get("categoryId") === "tyt-fizik-isi" && !document.querySelector(".category-suggestions")');
    await evaluate('document.querySelector(".shared-category-select .checkbox input").click()');
    await waitFor('document.querySelector(".alert-warn")?.textContent.includes("doğrulanmış eşlemeye sahip soru yok")');
    await evaluate('document.querySelector(".alert-warn button").click()');
    await waitFor('document.querySelector(".shared-category-select .checkbox input")?.checked === true && !document.querySelector(".alert-warn")?.textContent.includes("doğrulanmış eşlemeye sahip soru yok")');
    await evaluate('document.querySelector(".shared-category-select > div:last-child button").click()');
    await waitFor('!new URLSearchParams(location.search).has("categoryId")');
    await cdp('Page.navigate', { url: site + '/calisma/yeni' });
    await waitFor('document.querySelector("input[role=combobox]")?.disabled === false');
    const newName = 'Güncel Hareket ' + width;
    await evaluate(`fetch('/api/test/category-name?name='+encodeURIComponent(${JSON.stringify(newName)})).then(r=>r.json())`);
    await evaluate('window.dispatchEvent(new Event("focus"))');
    await evaluate('document.querySelector("input[role=combobox]").focus()');
    await cdp('Input.insertText', { text: 'fizik hareket' });
    await waitFor(`document.querySelectorAll('.category-suggestions [role=option]').length === 1 && document.querySelector('.category-suggestions [role=option]')?.textContent.includes(${JSON.stringify(newName)})`);
    await evaluate('document.querySelector(".category-suggestions [role=option]").click()');
    await waitFor('new URLSearchParams(location.search).get("categoryId") === "ayt-fizik-hareket"');
    if (!await evaluate('document.documentElement.scrollWidth <= innerWidth + 1')) throw Error('Konu araması sayfayı taşırıyor.');
    console.log(`OK ${width}px hizalama, gruplu konu listesi, yazarken öneri, klavye/tıklama ve güncel katalog adları`);
  }
  await cdp('Page.navigate', { url: site + '/calisma/yeni?examType=AYT&scope=subject&includeCandidates=false' });
  await waitFor('document.querySelector(".study-scopes button[aria-pressed=true]")?.textContent.includes("Ders") && document.querySelectorAll("form > .filters select").length === 3');
  await evaluate('(()=>{const select=[...document.querySelectorAll("form > .filters select")].at(-1);Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set.call(select,"Edebiyat");select.dispatchEvent(new Event("change",{bubbles:true}));})()');
  await waitFor('new URLSearchParams(location.search).get("subject")==="Edebiyat" && [...document.querySelectorAll("p")].some(p=>p.textContent.includes("1 uygun soru var"))');
  await cdp('Page.reload');
  await waitFor('[...document.querySelectorAll("form > .filters select")].at(-1)?.value==="Edebiyat" && [...document.querySelectorAll("p")].some(p=>p.textContent.includes("1 uygun soru var"))');
  await evaluate('document.querySelector(".study-scopes button").click()');
  await waitFor('!new URLSearchParams(location.search).has("subject") && [...document.querySelectorAll("p")].some(p=>p.textContent.includes("3 uygun soru var"))');
  await evaluate('(()=>{const select=[...document.querySelectorAll("form label")].find(label=>label.textContent==="Soru geçmişi").nextElementSibling;select.value="WRONG";select.dispatchEvent(new Event("change",{bubbles:true}));})()');
  await waitFor('document.querySelector(".alert-warn")?.textContent.includes("soru geçmişine uyan soru yok")');
  console.log('OK sıfır havuz nedeni, açık aday seçimi, URL/yenileme ve kapsam değişimi');
  await cdp('Page.navigate', { url: site + '/ilerleme' });
  await waitFor('location.pathname === "/gecmis" && location.search === "?tab=progress"');
  await waitFor('document.querySelectorAll(".history-tabs a").length === 3 && document.querySelector(".history-tabs a[aria-current=page]")?.innerText === "İlerlemem"');
  console.log('OK geçmiş ve ilerleme ortak sayfası');
  await cdp('Page.navigate', { url: site + '/oneriler' });
  await waitFor('document.querySelectorAll(".coach-question").length === 5');
  if (!await evaluate('document.querySelector("#program")?.innerText.includes("okula devam etmeyen") && document.querySelector("#program")?.innerText.includes("Evde tam zamanlı bir gün")')) {
    throw new Error('Program okula devam etmeyen öğrenciye göre düzenlenmedi.');
  }
  if (!await evaluate('document.documentElement.scrollWidth <= innerWidth + 1')) {
    throw new Error('Çalışma önerileri mobilde yatay taşma yapıyor.');
  }
  if (await evaluate('!!document.querySelector(".recommendation-subject, .coach-page select")')) {
    throw new Error('Çalışma önerileri sayfasında ders filtresi kaldı.');
  }
  await evaluate('[...document.querySelectorAll(".coach-section button")].find(button => button.innerText === "Kişisel önerilerimi göster")?.click()');
  await waitFor('document.querySelector(".coach-personal .recommendation-card h3")?.innerText.includes("Türkçe · Paragraf")');
  if (GUIDE_QUIZ.length !== 40 || new Set(GUIDE_QUIZ.map((question) => question.topic)).size !== 8) {
    throw new Error('Bilgi testi 8 bölümde 40 soru içermiyor.');
  }
  for (let page = 0; page < 8; page++) {
    const choices = GUIDE_QUIZ.slice(page * 5, page * 5 + 5).map((question) => question.answer);
    await evaluate(`(${JSON.stringify(choices)}).forEach((answer, index) => document.querySelectorAll('.coach-question')[index].querySelector('input[value="' + answer + '"]').click())`);
    await waitFor('document.querySelector(".coach-quiz-actions button[type=submit]")?.disabled === false');
    await evaluate('document.querySelector(".coach-quiz-actions button[type=submit]").click()');
    if (page < 7) await waitFor(`document.querySelector('.coach-quiz-progress strong')?.innerText.startsWith('${page + 2} / 8')`);
  }
  await waitFor('document.querySelector(".coach-score strong")?.innerText === "40 / 40"');
  if (!await evaluate('document.querySelectorAll(".coach-review-topic").length === 8')) {
    throw new Error('Bilgi testi konu sonuçları eksik.');
  }
  await evaluate('document.querySelector(".coach-score button").click()');
  await waitFor('!document.querySelector(".coach-score") && document.querySelector(".coach-quiz-actions button[type=submit]")?.disabled === true');
  for (let page = 0; page < 8; page++) {
    const choices = GUIDE_QUIZ.slice(page * 5, page * 5 + 5).map((question, offset) =>
      page === 0 && offset === 0 ? (question.answer + 1) % question.options.length : question.answer);
    await evaluate(`(${JSON.stringify(choices)}).forEach((answer, index) => document.querySelectorAll('.coach-question')[index].querySelector('input[value="' + answer + '"]').click())`);
    await evaluate('document.querySelector(".coach-quiz-actions button[type=submit]").click()');
    if (page < 7) await waitFor(`document.querySelector('.coach-quiz-progress strong')?.innerText.startsWith('${page + 2} / 8')`);
  }
  await waitFor('document.querySelector(".coach-score strong")?.innerText === "39 / 40"');
  await evaluate('document.querySelector(".coach-review-topic summary").click()');
  if (!await evaluate('document.querySelector(".coach-review-answer")?.innerText.includes("En iyi yanıt:")')) {
    throw new Error('Yanlış yanıtın doğru seçeneği ve açıklaması görünmüyor.');
  }
  console.log('OK çalışma önerileri ve açıklamalı bilgi testi');
} finally {
  socket.close();
  chrome.kill();
  server.close();
  if (resolve(profile).startsWith(resolve(tmpdir()) + sep)) {
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
    catch { /* Chrome may still hold its profile briefly on Windows. */ }
  }
}
