// Isolated browser check for the reviewed PDF -> practice/exam builder flow.
// Run after `npm run build` in frontend. No live API or database is contacted.
// --pdf-only limits this older combined suite to the PDF and scoped study flows.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../frontend/dist', import.meta.url));
const fixture = {
  id: 1099, title: 'NOKTALAMA İŞARETLERİ', exam: 'TYT', subject: 'turkce',
  kind: 'topic_summary', pageCount: 1, status: 'available', verifiedTopic: 'Noktalama İşaretleri',
};
const chicagoDate = (date) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};
let goals = [];
let recommendationFixture = false;
let recommendationStatus = 'SUGGESTIONS';
let currentRole = 'USER';
const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const json = (value, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(value));
  };
  if (pathname === '/api/auth/me') return json({ id: 1, username: 'test',
    role: currentRole, contactComplete: true, passwordChangeRequired: false });
  if (pathname === '/api/account/contact') return json({ email: 'test@example.com', phone: '+905551112233' });
  if (pathname === '/api/study-sessions/active') { res.writeHead(204); return res.end(); }
  if (pathname === '/api/questions/filters') return json(recommendationFixture
    ? [{ bank: 'CIKMIS', examType: 'TYT', subject: 'Türkçe', topic: 'Noktalama', count: 3 }] : []);
  if (pathname === '/api/recommendations') return json(recommendationStatus === 'SUGGESTIONS'
    ? { subject: 'Türkçe', labeledQuestions: 30, distinctTypes: 3, status: 'SUGGESTIONS', suggestions: [{
      questionTypeCode: 'tyt.turkce.tip.noktalama', questionType: 'Noktalama sorusu',
      skill: 'Noktalama kuralını uygulama', subtopic: 'Noktalama İşaretleri',
      prerequisite: 'Yazım Kuralları', questions: 10, correct: 3, wrong: 7,
      recentWeightedSuccess: 30, averageActiveSeconds: 45, slowerThanSubject: false,
      exampleQuestionId: 41, exampleQuestionCode: 'TEST-1',
    }] } : { subject: 'Türkçe', labeledQuestions: 0, distinctTypes: 0,
      status: 'INSUFFICIENT_DATA', suggestions: [] });
  if (pathname === '/api/feedback' && req.method === 'POST') return json({ id: 1 }, 201);
  if (pathname === '/api/admin/stats') return json({ userCount: 5, submittedExamCount: null,
    usage: { period: 'DAY', zone: 'Europe/Istanbul', startsAt: '2026-10-08T21:00:00Z',
      endsAt: '2026-10-09T21:00:00Z', activeUsers: 5, studySessions: null,
      examsStarted: null, answersSubmitted: 10, serviceErrors: null },
    content: { total: 3, cikmis: 2, ogm: 1, tyt: 2, ayt: 1 } });
  if (pathname === '/api/progress/first-attempts') return json({
    period: 'DAY', zone: 'America/Chicago', startsAt: '2026-10-09T05:00:00Z',
    endsAt: '2026-10-10T05:00:00Z', correct: 1, wrong: 0, blank: 0,
    total: 1, successPercent: 100, breakdown: [],
  });
  if (pathname === '/api/progress/timeline') return json({
    period: 'DAY', zone: 'America/Chicago', days: [{ date: '2026-10-09', activeSeconds: 90,
      logins: 1, closedSessions: 1, sessionSeconds: 3600 }],
  });
  if (pathname === '/api/goals' && req.method === 'GET') return json(goals);
  if (pathname === '/api/goals' && req.method === 'POST') {
    let body = '';
    req.on('data', (part) => { body += part; });
    return req.on('end', () => {
      const input = JSON.parse(body);
      goals = [{ id: goals.length + 1, ...input, startsOn: '2026-10-09', endsOn: '2026-10-31',
        status: 'ACTIVE', progressCount: 0, remainingCount: input.targetCount }, ...goals];
      json(goals[0], 201);
    });
  }
  if (/^\/api\/goals\/\d+$/.test(pathname) && req.method === 'PATCH') {
    let body = '';
    req.on('data', (part) => { body += part; });
    return req.on('end', () => {
      const goal = goals.find((item) => item.id === Number(pathname.split('/').at(-1)));
      Object.assign(goal, JSON.parse(body));
      json(goal);
    });
  }
  if (/^\/api\/goals\/\d+\/stop$/.test(pathname) && req.method === 'POST') {
    const goal = goals.find((item) => item.id === Number(pathname.split('/')[3]));
    goal.status = 'ENDED';
    return json(goal);
  }
  if (pathname === '/api/questions/code/TEST-1') return json({
    id: 41, code: 'TEST-1', bank: 'CIKMIS', examType: 'TYT', subject: 'Türkçe', topic: 'Noktalama',
    choiceCount: 5, hasSolutionImage: false, avgRating: null, ratingCount: 0,
    difficultyVotes: {}, myEvaluation: null, approvedLabels: [],
    helpfulness: { helpful: 0, notHelpful: 0, mine: null, canVote: true },
  });
  if (pathname === '/api/questions/41/practice') return json({ round: 1, attempts: [], remainingAttempts: 2,
    canAnswer: true, canReveal: true, roundComplete: false, correctAnswer: null, solutionUrl: null });
  if (pathname === '/api/questions/41/helpfulness' && req.method === 'POST') {
    return json({ helpful: 1, notHelpful: 0, mine: true, canVote: true });
  }
  if (pathname === '/api/questions/availability') {
    const query = new URL(req.url, 'http://localhost').searchParams;
    return query.get('topicPdfId') === '1099'
      ? json({ total: 3, solved: 1, remaining: 2, everWrong: 1 })
      : json({ total: 0, solved: 0, remaining: 0, everWrong: 0 });
  }
  if (pathname === '/api/topic-pdfs/1099') return json(fixture);
  if (pathname === '/api/topic-pdfs/1099/file') {
    res.writeHead(200, { 'Content-Type': 'application/pdf' });
    return res.end('%PDF-1.4\n%%EOF');
  }
  const safe = pathname.startsWith('/assets/') ? pathname.slice(1) : 'index.html';
  const file = resolve(dist, safe);
  if (!file.startsWith(dist)) { res.writeHead(404); return res.end(); }
  try {
    const body = readFileSync(file);
    res.writeHead(200, { 'Content-Type': extname(file) === '.js' ? 'text/javascript'
      : extname(file) === '.css' ? 'text/css' : 'text/html' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const site = `http://127.0.0.1:${server.address().port}`;
const profile = mkdtempSync(join(tmpdir(), 'topic-pdf-ui-'));
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
  const response = await cdp('Runtime.evaluate', { expression, returnByValue: true });
  if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.text);
  return response.result.result.value;
};
const waitFor = async (expression) => {
  for (let i = 0; i < 80; i++) {
    if (await evaluate(expression)) return;
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error(`UI bekleneni göstermedi: ${expression}; sayfa=${await evaluate('location.href')}; içerik=${String(await evaluate('document.body.innerText')).slice(0, 400)}`);
};
try {
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  for (const width of [1280, 390]) {
    await cdp('Emulation.setDeviceMetricsOverride', {
      width, height: 900, deviceScaleFactor: 1, mobile: width === 390,
    });
    for (const [page, expected] of [
      ['/konu-anlatimlari/1099', 'Bu konudan soru çöz'],
      ['/pratik/yeni?topicPdfId=1099', 'Bu konu anlatımına bağlı doğrulanmış sorular'],
      ['/sinav/yeni?topicPdfId=1099', 'Bu konu anlatımına bağlı doğrulanmış sorular'],
      ['/hesap', 'Verilerimi indir'],
      ['/ilerleme', 'Çalışma zaman çizelgesi'],
      ['/hedefler', 'Hedeflerim ve geçmiş'],
      ['/oneriler', 'Çalışma önerileri'],
      ['/yonetim', 'Yönetim · Kullanım özeti'],
      ['/soru/TEST-1', 'Onaylı etiket yok'],
    ].filter(([page]) => !process.argv.includes('--pdf-only')
      || page.startsWith('/konu-anlatimlari/') || page.includes('/yeni?topicPdfId='))) {
      if (page === '/hedefler') goals = [];
      if (page === '/oneriler') { recommendationFixture = true; recommendationStatus = 'SUGGESTIONS'; }
      currentRole = page === '/yonetim' ? 'ADMIN' : 'USER';
      await cdp('Page.navigate', { url: site + page });
      await waitFor(`document.body.innerText.includes(${JSON.stringify(expected)})`);
      if (page.includes('yeni')) {
        await waitFor('document.body.innerText.includes("3")');
        await waitFor('document.body.innerText.includes("Konu ve kaynak sabit")');
        if (await evaluate('!![...document.querySelectorAll("label")].find(x => x.innerText === "Kaynak")')) {
          throw new Error(`${width}px ${page}: kapsam filtresi görünür kaldı`);
        }
      }
      if (page === '/hesap') await waitFor('document.body.innerText.includes("Hesabımı sil")');
      if (page === '/ilerleme') {
        await waitFor('document.body.innerText.includes("1 sa 0 dk")');
        await waitFor('document.body.innerText.includes("Aktif süre gönderilmiş soru olaylarından gelir")');
      }
      if (page === '/hedefler') {
        await waitFor('document.body.innerText.includes("Henüz hedef oluşturmadın")');
        await waitFor('document.body.innerText.includes("Bugünkü hedefler") && document.body.innerText.includes("Bu haftaki hedefler")');
        await evaluate('[...document.querySelectorAll("button")].find(x => x.innerText === "Hedef oluştur")?.click()');
        await waitFor('document.body.innerText.includes("Hedef oluşturuldu")');
        await waitFor('document.body.innerText.includes("Düzenle")');
        await waitFor('document.body.innerText.includes("İlerleme: 0 / 10")');
        await waitFor('[...document.querySelectorAll("section")].find(x => x.getAttribute("aria-label") === "Bugünkü hedefler")?.innerText.includes("0/10")');
        await evaluate('document.querySelector("form.card select").value = "WEEK"; document.querySelector("form.card select").dispatchEvent(new Event("change", {bubbles: true}))');
        await evaluate('[...document.querySelectorAll("button")].find(x => x.innerText === "Hedef oluştur")?.click()');
        await waitFor('[...document.querySelectorAll("section")].find(x => x.getAttribute("aria-label") === "Bu haftaki hedefler")?.innerText.includes("0/10")');
        await evaluate('[...document.querySelectorAll("button")].find(x => x.innerText === "Düzenle")?.click()');
        await waitFor('!!document.querySelector(".goal-edit")');
        await evaluate('[...document.querySelectorAll("button")].find(x => x.innerText === "Durdur")?.click()');
        await waitFor('document.body.innerText.includes("Hedef durduruldu")');
        await waitFor('!document.querySelector(".goal-edit")');
        const yesterday = chicagoDate(new Date(Date.now() - 86400000));
        goals = [{ id: 99, period: 'DAY', metric: 'UNIQUE_QUESTIONS', subject: null,
          targetCount: 10, startsOn: yesterday, endsOn: yesterday, zone: 'America/Chicago',
          status: 'ACTIVE', progressCount: 5, remainingCount: 5 }];
        await cdp('Page.navigate', { url: site + page });
        await waitFor('document.body.innerText.includes("daha küçük bir hedefle yeniden başlayabilirsin")');
      }
      if (page === '/oneriler') {
        await waitFor('document.querySelector("select")?.options.length === 2');
        await evaluate('document.querySelector("select").value = "Türkçe"; document.querySelector("select").dispatchEvent(new Event("change", {bubbles:true}))');
        await waitFor('document.body.innerText.includes("Noktalama sorusu")');
        await waitFor('[...document.querySelectorAll("a")].find(x => x.getAttribute("href") === "/soru/TEST-1")?.innerText.includes("Şimdi çalış")');
        await evaluate('document.querySelector("summary")?.click()');
        await waitFor('document.body.innerText.includes("Ağırlıklı ilk deneme başarısı %30")');
        await evaluate('[...document.querySelectorAll("button")].find(x => x.innerText === "Etiket hatası bildir")?.click()');
        await waitFor('document.body.innerText.includes("Etiketteki sorunu anlat")');
        await evaluate('document.querySelector(".recommendation-card textarea")?.focus()');
        await cdp('Input.insertText', { text: 'Bu soru tipi farklı olmalı' });
        await evaluate('[...document.querySelectorAll("button")].find(x => x.innerText === "Bildir")?.click()');
        await waitFor('document.body.innerText.includes("Etiket bildirimin alındı")');
        recommendationStatus = 'INSUFFICIENT_DATA';
        await cdp('Page.navigate', { url: site + page });
        await waitFor('document.querySelector("select")?.options.length === 2');
        await evaluate('document.querySelector("select").value = "Türkçe"; document.querySelector("select").dispatchEvent(new Event("change", {bubbles:true}))');
        await waitFor('document.body.innerText.includes("yeterli onaylı ve çeşitli ilk deneme yok")');
        recommendationFixture = false;
      }
      if (page === '/yonetim') {
        await waitFor('document.body.innerText.includes("Etkin öğrenci")');
        await waitFor('document.body.innerText.includes("İçerik kapsamı")');
        await waitFor('document.body.innerText.includes("Beklenmeyen API hatası")');
        await waitFor('document.body.innerText.includes("Etkin soru kayıtlarıdır")');
        await waitFor('document.body.innerText.includes("5–9") && document.body.innerText.includes("5’ten az")');
        if (await evaluate('document.body.innerText.includes("test@example.com")')) {
          throw new Error(`${width}px yönetici ekranında bireysel veri görüldü`);
        }
        await cdp('Page.navigate', { url: site + '/hedefler' });
        await new Promise((done) => setTimeout(done, 150));
        await waitFor('location.pathname === "/yonetim"');
        currentRole = 'OPERATOR';
        await cdp('Page.navigate', { url: site + '/yonetim' });
        await new Promise((done) => setTimeout(done, 150));
        await waitFor('location.pathname === "/icerik-bakimi"');
        currentRole = 'USER';
        await cdp('Page.navigate', { url: site + '/yonetim' });
        await new Promise((done) => setTimeout(done, 150));
        await waitFor('location.pathname === "/"');
      }
      if (page === '/soru/TEST-1') {
        await waitFor('document.body.innerText.includes("Bu soru faydalı mı?")');
        await evaluate('[...document.querySelectorAll("summary")].find(x => x.innerText.includes("Bu soru faydalı mı?"))?.click()');
        await evaluate('[...document.querySelectorAll("button")].find(x => x.innerText === "Faydalı")?.click()');
        await waitFor('document.body.innerText.includes("Faydalı: 1")');
      }
      if (await evaluate('document.documentElement.scrollWidth > innerWidth + 1')) {
        throw new Error(`${width}px ${page}: yatay taşma`);
      }
      console.log(`OK ${width}px ${page}`);
    }
  }
} finally {
  socket.close();
  chrome.kill();
  server.close();
  if (resolve(profile).startsWith(resolve(tmpdir()) + sep)) {
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
    catch { /* Chrome may still hold its profile briefly on Windows. */ }
  }
}
