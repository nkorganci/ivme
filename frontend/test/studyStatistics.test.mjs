import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAM_BRANCHES, filterStudyRows, groupExamBranches, loadStudyHistory, localDate, practiceDurationSeconds, practiceScope, prepareExamHistory, summarizeExamRows, summarizeStudyRows } from '../src/studyStatistics.js';

test('practice history names the selected catalog topic instead of the question history mode', () => {
  const categories = [
    { id: 'tyt.fizik.vektorler', subjectId: 'fizik', subject: 'Fizik', topic: 'Vektörler' },
    { id: 'tyt.fizik.hareket', subjectId: 'fizik', subject: 'Fizik', topic: 'Hareket' },
  ];
  assert.deepEqual(practiceScope({ subject: 'fizik', categoryIds: ['tyt.fizik.vektorler'], selectionMode: 'MIXED' }, categories),
    { subject: 'Fizik', topic: 'Vektörler' });
  assert.deepEqual(practiceScope({ subject: 'fizik', categoryIds: ['tyt.fizik.vektorler', 'tyt.fizik.hareket'] }, categories),
    { subject: 'Fizik', topic: 'Vektörler; Hareket' });
  assert.deepEqual(practiceScope({ subject: 'fizik', categoryIds: [] }, categories),
    { subject: 'Fizik', topic: 'Tüm konular' });
});

test('all API pages participate in filtering, including records beyond the first 100', async () => {
  const requested = [];
  const records = Array.from({ length: 205 }, (_, id) => ({ id, status: id === 204 ? 'IN_PROGRESS' : 'COMPLETED', date: Date.now() }));
  const rows = await loadStudyHistory('/api/study-sessions', async path => {
    const params = new URL(path, 'http://localhost').searchParams;
    const page = Number(params.get('page'));
    requested.push(page);
    assert.equal(params.get('size'), '100');
    return { content: records.slice(page * 100, (page + 1) * 100), totalPages: 3 };
  });
  assert.deepEqual(requested, [0, 1, 2]);
  assert.equal(rows.length, 205);
  assert.deepEqual(filterStudyRows(rows, { status: 'IN_PROGRESS' }).map(row => row.id), [204]);
});

test('a failed later page rejects the history instead of presenting incomplete totals', async () => {
  await assert.rejects(loadStudyHistory('/api/exams', async path => {
    if (path.includes('page=1')) throw new Error('Geçmiş alınamadı');
    return { content: [{ id: 1 }], totalPages: 2 };
  }), /Geçmiş alınamadı/);
});

test('date bounds include the entire local day and combine with selection and status', () => {
  const rows = [
    { id: 1, date: new Date(2026, 9, 15, 23, 59).getTime(), status: 'COMPLETED', selectionMode: 'NEW' },
    { id: 2, date: new Date(2026, 9, 16, 0, 0).getTime(), status: 'COMPLETED', selectionMode: 'NEW' },
    { id: 3, date: new Date(2026, 9, 16, 23, 59).getTime(), status: 'IN_PROGRESS', selectionMode: 'NEW' },
    { id: 4, date: new Date(2026, 9, 17, 0, 0).getTime(), status: 'COMPLETED', selectionMode: 'REPEAT' },
  ];
  assert.equal(localDate(rows[2].date), '2026-10-16');
  assert.deepEqual(filterStudyRows(rows, { from: '2026-10-16', until: '2026-10-16' }).map(row => row.id), [2, 3]);
  assert.deepEqual(filterStudyRows(rows, { from: '2026-10-16', status: 'COMPLETED', mode: 'NEW' }).map(row => row.id), [2]);
  assert.deepEqual(filterStudyRows(rows, { from: '2026-10-17', until: '2026-10-16' }), []);
});

test('summary uses weighted success and excludes open sessions from question totals', () => {
  const summary = summarizeStudyRows([
    { status: 'COMPLETED', questionCount: 10, correct: 10, wrong: 0, blank: 0 },
    { status: 'COMPLETED', questionCount: 90, correct: 0, wrong: 80, blank: 10 },
    { status: 'IN_PROGRESS', questionCount: 40, correct: null, wrong: null, blank: null },
  ]);
  assert.deepEqual(summary, { sessions: 3, completed: 2, active: 1, questions: 100, correct: 10, wrong: 80, blank: 10, percent: 10 });
});

test('an empty or unfinished selection has no success percentage', () => {
  assert.equal(summarizeStudyRows([]).percent, null);
  const summary = summarizeStudyRows([{ status: 'IN_PROGRESS', questionCount: 20 }]);
  assert.equal(summary.active, 1);
  assert.equal(summary.questions, 0);
  assert.equal(summary.percent, null);
});

test('cancelled practice contributes neither results nor active sessions', () => {
  const summary = summarizeStudyRows([
    { status: 'COMPLETED', questionCount: 2, correct: 1, wrong: 1, blank: 0 },
    { status: 'ABANDONED', questionCount: 40, correct: 30, wrong: 10, blank: 0 },
    { status: 'IN_PROGRESS', questionCount: 10 },
  ]);
  assert.deepEqual(summary, { sessions: 3, completed: 1, active: 1, questions: 2, correct: 1, wrong: 1, blank: 0, percent: 50 });
});

test('latest completed TYT is chosen by date before filtering and trial numbers stay chronological', () => {
  const items = [
    { id: 30, examType: 'TYT', submittedAt: '2026-10-17T12:00:00Z', net: 0 },
    { id: 40, examType: 'AYT', submittedAt: '2026-10-16T12:00:00Z', bySubject: [{ subject: 'Fizik', total: 14, correct: 2, wrong: 10, blank: 2 }] },
    { id: 50, examType: 'TYT', submittedAt: '2026-10-15T12:00:00Z', net: 70 },
  ];
  const rows = prepareExamHistory(items);
  assert.deepEqual(rows.map(row => row.number), [3, 2, 1]);
  const ayt = rows.find(row => row.examType === 'AYT');
  assert.equal(ayt.latestTytId, 30);
  assert.equal(ayt.latestTytNumber, 3);
  assert.equal(ayt.latestTytNet, 0);
  assert.equal(ayt.bySubject[0].net, -0.5);
  assert.equal(filterStudyRows(rows, { until: '2026-10-16' }).find(row => row.id === 40).latestTytId, 30);
  assert.equal(rows[0].latestTytId, null);
  assert.equal(Object.hasOwn(ayt, 'score'), false);
});

test('missing TYT is explicit and untyped exams are never guessed from their title', () => {
  const [ayt] = prepareExamHistory([
    { id: 1, examType: 'AYT', submittedAt: '2026-10-17T12:00:00Z' },
    { id: 2, title: 'TYT denemesi', submittedAt: '2026-10-18T12:00:00Z', net: 80 },
  ]);
  assert.equal(ayt.latestTytNet, null);
  assert.equal(ayt.latestTytDate, null);
  assert.match(ayt.tytContext, /tamamlanmış TYT denemesi yok/);
});

test('fixed branches combine AYT subtests without inventing absent results', () => {
  const grouped = groupExamBranches([
    { subject: 'Tarih-1', total: 10, correct: 4, wrong: 2, blank: 4 },
    { subject: 'Tarih-2', total: 11, correct: 5, wrong: 3, blank: 3 },
    { subject: 'Coğrafya-2', total: 11, correct: 0, wrong: 0, blank: 11 },
    { subject: 'Felsefe Grubu', total: 12, correct: 4, wrong: 4, blank: 4 },
  ]);
  assert.deepEqual(Object.keys(grouped), EXAM_BRANCHES.map(branch => branch.key));
  assert.deepEqual(grouped.history, { total: 21, correct: 9, wrong: 5, blank: 7 });
  assert.deepEqual(grouped.geography, { total: 11, correct: 0, wrong: 0, blank: 11 });
  assert.equal(grouped.physics, null);
  assert.equal(grouped.philosophy.correct, 4);
  assert.deepEqual(Object.keys(groupExamBranches([])), Object.keys(grouped));
});

test('TYT and AYT summaries keep separate counts and weighted success, including an empty category', () => {
  const rows = [
    { examType: 'TYT', status: 'COMPLETED', questionCount: 120, correct: 60, wrong: 40, blank: 20 },
    { examType: 'TYT', status: 'COMPLETED', questionCount: 120, correct: 30, wrong: 50, blank: 40 },
    { examType: 'AYT', status: 'COMPLETED', questionCount: 80, correct: 60, wrong: 10, blank: 10 },
  ];
  const [tyt, ayt] = summarizeExamRows(rows);
  assert.deepEqual([tyt.examType, tyt.sessions, tyt.questions, tyt.correct, tyt.percent], ['TYT', 2, 240, 90, 37.5]);
  assert.deepEqual([ayt.examType, ayt.sessions, ayt.questions, ayt.correct, ayt.percent], ['AYT', 1, 80, 60, 75]);
  const filtered = summarizeExamRows(rows.filter(row => row.examType === 'AYT'));
  assert.equal(filtered[0].sessions, 0);
  assert.equal(filtered[0].percent, null);
  assert.equal(filtered[1].sessions, 1);
});

test('practice completion duration uses saved timestamps only for completed sessions', () => {
  const row = { status: 'COMPLETED', startedAt: '2026-10-17T12:00:00Z', endedAt: '2026-10-17T12:02:30.999Z' };
  assert.equal(practiceDurationSeconds(row), 150);
  assert.equal(practiceDurationSeconds({ ...row, endedAt: row.startedAt }), 0);
  assert.equal(practiceDurationSeconds({ ...row, status: 'IN_PROGRESS' }), null);
  assert.equal(practiceDurationSeconds({ ...row, status: 'ABANDONED' }), null);
  assert.equal(practiceDurationSeconds({ ...row, endedAt: null }), null);
  assert.equal(practiceDurationSeconds({ ...row, endedAt: 'invalid' }), null);
  assert.equal(practiceDurationSeconds({ ...row, endedAt: '2026-10-17T11:59:00Z' }), null);
});
