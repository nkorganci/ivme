// End-to-end check that a finished practice updates Dersler > Konu takibi for exactly the topics
// its questions belong to. Writes one small practice for the local `student` test account only;
// the report lists the session id so the caller can remove it afterwards.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const site = process.env.IVME_SITE || 'http://127.0.0.1:1010';
const [exam, subjectId, topicName] = ['TYT', process.argv[3] || 'fizik', process.argv[2] || 'Mercekler'];
const output = resolve('veri/content-labels/integration/practice-topic-sync-20261023', subjectId);
fs.mkdirSync(output, { recursive: true });
const profile = fs.mkdtempSync(join(tmpdir(), 'ivme-sync-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore', windowsHide: true });
const pause = ms => new Promise(done => setTimeout(done, ms));
const report = { status: 'RUNNING', site, exam, subjectId, topicName, checks: [] };
let socket;
try {
  let address;
  for (let n = 0; n < 150 && !address; n++) {
    try {
      const port = Number(fs.readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
      address = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(p => p.type === 'page')?.webSocketDebuggerUrl;
    } catch { /* Chrome is still starting. */ }
    if (!address) await pause(100);
  }
  assert.ok(address, 'Chrome started');
  socket = new WebSocket(address); await new Promise(done => { socket.onopen = done; });
  let sequence = 0; const pending = new Map();
  socket.onmessage = ({ data }) => {
    const m = JSON.parse(data), p = pending.get(m.id);
    if (p) { pending.delete(m.id); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result); }
  };
  const cdp = (method, params = {}) => new Promise((resolveCall, reject) => {
    const id = ++sequence; pending.set(id, { resolve: resolveCall, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const wait = async expression => {
    for (let n = 0; n < 300; n++) { try { if (await evaluate(`!!(${expression})`)) return; } catch {} await pause(100); }
    throw Error('Timeout ' + expression);
  };
  const call = async (method, path, body) => {
    const r = await evaluate(`(async()=>{const c=document.cookie.split('; ').find(p=>p.startsWith('XSRF-TOKEN'));
      const t=c&&decodeURIComponent(c.split('=').slice(1).join('='));
      const r=await fetch(${JSON.stringify(path)},{method:${JSON.stringify(method)},credentials:'include',
        headers:{'Content-Type':'application/json',...(t?{'X-XSRF-TOKEN':t}:{})},body:${body ? JSON.stringify(JSON.stringify(body)) : 'undefined'}});
      return {status:r.status,body:await r.json().catch(()=>null)};})()`);
    assert.ok(r.status >= 200 && r.status < 300, `${method} ${path} → ${r.status} ${JSON.stringify(r.body)}`);
    return r.body;
  };
  const trackingRow = async () => {
    await cdp('Page.navigate', { url: `${site}/dersler-ve-konular?tab=konular&sinav=${exam}&ders=${subjectId}` });
    await wait(`document.querySelector('.ag-row .ag-cell[col-id="subject"]') && !Array.from(document.querySelectorAll('[role="status"]')).some(e=>e.innerText.includes('yükleniyor'))`);
    await pause(500);
    return evaluate(`(()=>{const rows=new Map();for(const r of document.querySelectorAll('.ag-row[row-index]')){const k=r.getAttribute('row-index');rows.set(k,[...(rows.get(k)||[]),r]);}
      for(const parts of rows.values()){const cell=id=>parts.map(p=>p.querySelector('.ag-cell[col-id="'+id+'"]')).find(Boolean)?.innerText.trim();
        if(cell('topic')===${JSON.stringify(topicName)})return {solved:Number(cell('solved')),correct:Number(cell('correct')),wrong:Number(cell('wrong'))};}
      return null;})()`);
  };
  await cdp('Runtime.enable'); await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1680, height: 1100, deviceScaleFactor: 1, mobile: false });
  const before = await trackingRow();
  assert.ok(before, 'Topic row is visible in Konu takibi');
  const me = await call('GET', '/api/auth/me');
  assert.equal(String(me.username).toLowerCase(), 'student', 'Only the local student test account is used');
  const catalog = await call('GET', '/api/learning-resources/metadata');
  const target = catalog.categories.find(c => c.selectable !== false && c.exam === exam && c.subjectId === subjectId && c.topic === topicName);
  assert.ok(target, 'Target topic comes from the shared Excel catalogue');
  const progress = async () => new Map((await call('GET', '/api/learning-resources/progress?classification=CURRENT')).categories.map(c => [c.categoryId, c]));
  const initial = await progress();

  const session = await call('POST', '/api/study-sessions', { bank: 'OGM', source: ['OGM_TYT'], examType: exam, selectionMode: 'NEW',
    questionCount: 4, clientRequestId: randomUUID(), categoryId: [target.id], categoryMatch: 'ANY', includeCandidates: true });
  report.sessionId = session.id;
  assert.ok(session.questions?.length > 0, 'Practice received questions');
  const items = await call('GET', '/api/learning-resources/items?' + session.questions.map(q => 'key=' + encodeURIComponent('question:' + q.code)).join('&'));
  // Answer keys are read from the local database so both the correct and the wrong path are exercised.
  const keys = new Map(execFileSync('C:/Program Files/PostgreSQL/18/bin/psql.exe', ['-h', 'localhost', '-U', 'root', '-d', 'ivme', '-At', '-F', '|',
    '-c', `SELECT code, correct_answer FROM questions WHERE code IN (${session.questions.map(q => `'${q.code.replaceAll("'", "''")}'`).join(',')})`],
    { env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD || 'root' }, encoding: 'utf8' }).trim().split(/\r?\n/).map(line => line.split('|')));
  const expected = new Map(), answered = [];
  for (const [index, question] of session.questions.entries()) {
    // Same rule as the progress API: every non-prerequisite, non-system topic relation counts.
    const categoryIds = [...new Set((items['question:' + question.code]?.labels?.assignments || [])
      .filter(a => a.relation !== 'PREREQUISITE' && !a.categoryId.startsWith('system.')).map(a => a.categoryId))];
    assert.ok(categoryIds.includes(target.id), `${question.code} belongs to ${topicName}`);
    const key = keys.get(question.code);
    assert.ok(/^[A-E]$/.test(key || ''), `${question.code} has an answer key`);
    const answer = index % 2 ? 'ABCDE'.replace(key, '')[0] : key;
    const state = await call('POST', `/api/questions/${question.questionId}/practice`, { clientEventId: randomUUID(), eventType: 'ANSWER',
      answer, activeSeconds: 5, sessionId: session.id });
    const correct = state.attempts.find(a => a.eventType === 'ANSWER').correct;
    assert.equal(correct, answer === key, `${question.code} answer is graded against its key`);
    answered.push({ code: question.code, correct, topics: categoryIds.map(id => catalog.categories.find(c => c.id === id)?.topic) });
    for (const id of categoryIds) {
      const row = expected.get(id) || { total: 0, correct: 0, wrong: 0 };
      row.total++; row[correct ? 'correct' : 'wrong']++; expected.set(id, row);
    }
  }
  report.answered = answered;
  report.checks.push(`${answered.length} practice questions were all published under ${exam} · ${target.subject} · ${topicName}`);

  const open = await progress();
  assert.deepEqual(open.get(target.id) || null, initial.get(target.id) || null, 'An unfinished practice is not counted yet');
  report.checks.push('Answers of an unfinished practice are not counted (V54 completed-practice rule)');

  await call('POST', `/api/study-sessions/${session.id}/finish`);
  const finished = await progress();
  for (const id of new Set([...expected.keys(), ...finished.keys(), ...initial.keys()])) {
    const delta = key => (finished.get(id)?.[key] || 0) - (initial.get(id)?.[key] || 0);
    const want = expected.get(id) || { total: 0, correct: 0, wrong: 0 };
    assert.deepEqual({ total: delta('total'), correct: delta('correct'), wrong: delta('wrong') }, want, `Progress delta for ${id}`);
  }
  report.topicDeltas = Object.fromEntries([...expected].map(([id, value]) => [catalog.categories.find(c => c.id === id)?.topic || id, value]));
  report.checks.push('After finishing, every topic count changed exactly by the answered questions published under it');

  const after = await trackingRow();
  const want = expected.get(target.id);
  assert.deepEqual(after, { solved: before.solved + want.correct + want.wrong, correct: before.correct + want.correct, wrong: before.wrong + want.wrong },
    'Konu takibi shows the same solved/correct/wrong counts');
  report.tracking = { before, after };
  report.checks.push('Konu takibi row shows the finished practice in Çözdüğüm / Doğru / Yanlış');
  report.status = 'PASS';
} catch (error) { report.status = 'FAIL'; report.error = error.stack; process.exitCode = 1; }
finally {
  fs.writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report)); socket?.close(); chrome.kill();
}
