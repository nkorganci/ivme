import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseLesson, scopeToTracks } from '../frontend/src/learn/content/parser.js';
import { WORKED_EXAMS } from '../frontend/src/learn/content/worked-exams.js';
import { expandBank, collapseTwins } from '../frontend/src/learn/engine/selection.js';
import { plannedSize, pickSharedSet } from '../frontend/src/learn/engine/sharedSet.js';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url));
const evidence = JSON.parse(read('frontend/src/learn/content/bolme-pilot-evidence.json'));
const lessonBytes = read('frontend/src/learn/content/dersler/bolme-bolunebilme.ders');
const lesson = parseLesson(lessonBytes.toString());
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const bank = collapseTwins(expandBank(lesson.id, JSON.parse(read(`frontend/src/learn/bank/${lesson.id}.json`)).questions),
  JSON.parse(read('frontend/src/learn/bank/_gorsel.json')).groups);
const state = { now: new Date('2026-10-31T12:00:00Z'), seen: {}, queue: {}, concepts: {}, dueCards: [], hidden: new Set(), again: new Set() };

test('kaynak, bölüm ve çözüm sürümü: değişen içerik eski kanıtla kabul edilmez', () => {
  assert.equal(digest(lessonBytes), evidence.lessonSha256);
  assert.deepEqual(Object.keys(evidence.sections), lesson.sections.map((s) => s.id));
  for (const section of lesson.sections) {
    assert.deepEqual(section.exams.length ? section.exams : lesson.exams, evidence.sections[section.id].exams);
    for (const ref of evidence.sections[section.id].claims) {
      const claim = evidence.claims[ref];
      assert.ok(claim.blocks.length > 0 && claim.blocks.every((b) => b.bbox.length === 4 && /^[a-f0-9]{64}$/.test(b.textSha256)));
      assert.ok(claim.url.endsWith('#page=' + claim.page));
    }
  }
  for (const track of ['TYT', 'AYT']) assert.equal(scopeToTracks(lesson, [track]).sections.length, 8);
  for (const [code, source] of Object.entries(evidence.questions)) {
    const solution = WORKED_EXAMS[code];
    assert.equal(digest(JSON.stringify(solution)), source.solutionSha256, code);
    assert.equal(solution.answer, source.answerKey, code);
    assert.ok(solution.steps.every((s) => s.text && s.why));
    assert.ok(solution.check && solution.tip && solution.mistake);
    assert.equal(source.teacherApproved, false);
    assert.equal(source.role === 'guided', lesson.practiceIds.includes(code));
  }
});

test('iki aktarım sorusu: bütün üç basamaklı sayıları bağımsız tarama', () => {
  const all = Array.from({ length: 900 }, (_, i) => i + 100);
  const ortak = all.filter((n) => {
    const [a, b, c] = [...String(n)].map(Number);
    return a && b && c && new Set([a, b, c]).size === 3 && a % b === 0 && c % b === 0;
  });
  assert.equal(Math.max(...ortak), 936); assert.equal(Math.min(...ortak), 213);
  assert.equal(Math.max(...ortak) - Math.min(...ortak), 723);
  assert.equal(WORKED_EXAMS['TYT-0592'].result, 'A · 723');
  const zincir = all.filter((n) => {
    const [a, b, c] = [...String(n)].map(Number);
    return b && c && new Set([a, b, c]).size === 3 && a % b === 0 && b % c === 0 && n % 3 === 0;
  });
  assert.deepEqual(zincir, [621]);
  assert.equal([...String(zincir[0])].reduce((p, n) => p * Number(n), 1), 12);
  assert.equal(WORKED_EXAMS['TYT-0597'].result, 'B · 12');
});

test('pilot seti yalnız bağımsız ve açıklamalı sorular: gizlenen/eksik soruyu başka soruyla doldurma', () => {
  const pick = (pool, student = state) => pickSharedSet({ type: 'test', meta: lesson, bank: pool, state: student, seed: 'tas08' });
  assert.deepEqual(pick(bank).map((i) => i.question.code).sort(), ['TYT-0592', 'TYT-0597']);
  for (const q of pick(bank)) assert.ok(!lesson.practiceIds.includes(q.question.code));
  const hidden = new Set(bank.filter((q) => evidence.independentCodes.includes(q.code)).map((q) => q.id));
  assert.equal(plannedSize('test', bank, null, { ...state, hidden }), 0);
  assert.deepEqual(pick(bank, { ...state, hidden }), []);
  const missing = bank.filter((q) => q.code !== 'TYT-0597');
  assert.equal(pick(missing).length, 1);
  assert.equal(plannedSize('test', missing), 1);
});
