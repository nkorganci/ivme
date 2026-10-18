// Read the real published question catalogue. Never starts a session or answers a question.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { countQuestionRows } from '../frontend/src/questionFilters.js';

const base = process.env.IVME_UI_BASE_URL || 'http://127.0.0.1:5173';
const cookies = new Map(), checks = [];
const qs = value => '?' + new URLSearchParams(Object.entries(value).filter(([, item]) => item !== '' && item != null));
async function request(path, method = 'GET') {
  const headers = { Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; ') };
  if (method !== 'GET' && cookies.has('XSRF-TOKEN')) headers['X-XSRF-TOKEN'] = decodeURIComponent(cookies.get('XSRF-TOKEN'));
  const start = performance.now();
  const response = await fetch(base + path, { method, headers, signal: AbortSignal.timeout(45000) });
  for (const value of response.headers.getSetCookie()) { const first = value.split(';')[0], at = first.indexOf('='); cookies.set(first.slice(0, at), first.slice(at + 1)); }
  const body = await response.text();
  if (path === '/api/auth/me' && response.status === 401) return null;
  assert.equal(response.status, 200, `${path}: ${response.status} ${body.slice(0, 180)}`);
  const data = JSON.parse(body);
  checks.push({ path, milliseconds: Math.round(performance.now() - start) });
  return data;
}
await request('/api/auth/me');
await request('/api/auth/dev-login', 'POST');
const metadata = await request('/api/learning-resources/metadata');
const matrix = [];
for (const bank of ['', 'OGM', 'CIKMIS']) {
  const rows = await request('/api/questions/filters' + qs({ bank }));
  const total = await request('/api/questions/availability' + qs({ bank, includeCandidates: true }));
  const strictGeneral = await request('/api/questions/availability' + qs({ bank, includeCandidates: false }));
  assert.equal(countQuestionRows(rows), total.total, `${bank}: published total differs from selection`);
  assert.equal(strictGeneral.total, total.total, `${bank}: candidate switch erased the general bank`);
  for (const examType of ['TYT', 'AYT']) {
    const filter = { bank, examType };
    const count = await request('/api/questions/availability' + qs(filter));
    assert.equal(countQuestionRows(rows, filter), count.total, `${bank}/${examType}: dropdown differs`);
    const subject = examType === 'TYT' ? 'Fizik' : 'Matematik';
    const subjectFilter = { ...filter, subject };
    const lesson = await request('/api/questions/availability' + qs({ ...subjectFilter, includeCandidates: false }));
    assert.equal(countQuestionRows(rows, subjectFilter), lesson.total, `${bank}/${examType}/${subject}: lesson differs`);
    assert.ok(lesson.total > 0);
    const listed = await request('/api/questions' + qs({ ...subjectFilter, size: 1, includeCandidates: false }));
    assert.equal(listed.totalElements, lesson.total);
    assert.equal(listed.content.length, 1);
    assert.ok(!Object.hasOwn(listed.content[0], 'correctAnswer'));
    if (bank) assert.equal(listed.content[0].bank, bank);
    const counts = await request('/api/questions/category-counts' + qs(subjectFilter));
    const [categoryId, categoryCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const definition = metadata.categories.find(category => category.id === categoryId);
    assert.ok(definition, 'Facet must reference a published category');
    const scoped = { ...subjectFilter, categoryId, includeCandidates: true };
    const available = await request('/api/questions/availability' + qs(scoped));
    assert.equal(available.total, categoryCount);
    const categoryList = await request('/api/questions' + qs({ ...scoped, size: 1 }));
    assert.equal(categoryList.totalElements, categoryCount);
    assert.ok(categoryList.content[0].resource.labels.assignments.some(assignment => assignment.categoryId === categoryId));
    if (bank) assert.equal(categoryList.content[0].bank, bank);
    const strict = await request('/api/questions/availability' + qs({ ...scoped, includeCandidates: false }));
    assert.ok(strict.total <= categoryCount, 'Strict category filter must remain strict');
    const library = await request('/api/learning-resources' + qs({ kind: 'QUESTION', bankOnly: true, exam: examType,
      subject: definition.subjectId, categoryId, includeCandidates: true }));
    if (!bank) assert.equal(library.totalElements, categoryCount);
    matrix.push({ bank: bank || 'ALL', examType, subject, examCount: count.total, subjectCount: lesson.total,
      categoryId, categoryCount, strictCategoryCount: strict.total, example: categoryList.content[0].code });
  }
  console.log(`OK ${bank || 'ALL'}: general, exam, lesson, category and list counts agree`);
}
const report = { status: 'PASS', checkedAtUtc: new Date().toISOString(), site: base, runKey: metadata.summary.runKey,
  originalReproduction: { query: 'examType=AYT&includeCandidates=false', totalBefore: 0, totalWithCandidatesBefore: 42166 },
  matrix, requests: checks, mutations: 'Local development login only. No answers, sessions, reviews or source changes.' };
const output = new URL('../veri/content-labels/integration/question-filter-20261016/', import.meta.url);
mkdirSync(output, { recursive: true });
writeFileSync(new URL('api-report.json', output), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, scenarios: matrix.length, requests: checks.length, runKey: report.runKey }));
