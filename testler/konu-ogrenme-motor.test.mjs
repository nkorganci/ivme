// Konuyu Öğrenelim motoru: spec kurallarının birim testleri.
// node --test testler/konu-ogrenme-motor.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { interval, planMode, reviewOutcome } from '../frontend/src/learn/engine/ladder.js';
import { masteryScore, setResult, solvedTypes } from '../frontend/src/learn/engine/mastery.js';
import { applyBankAttempt, addSibling, dueItems } from '../frontend/src/learn/engine/missed.js';
import { derive } from '../frontend/src/learn/engine/derive.js';
import { buildPlan, dueLoad, isDone, lessonProgress } from '../frontend/src/learn/engine/plan.js';
import { streakOf } from '../frontend/src/learn/engine/streak.js';
import { addDays, daysBetween, dayKey } from '../frontend/src/learn/engine/dates.js';
import { buildIndex } from '../frontend/src/learn/content/parser.js';
import { expandBank, orderConfusedPairs, pickMastery, pickReview, pickSibling } from '../frontend/src/learn/engine/selection.js';
import { placementResult, nextPlacementQuestion } from '../frontend/src/learn/engine/placement.js';
import { calibration, forecast } from '../frontend/src/learn/engine/stats.js';
import { ratingFor, RATING } from '../frontend/src/learn/engine/cards.js';
import { normalizeSettings } from '../frontend/src/learn/engine/config.js';

const at = (day, hour = 10) => new Date(`${day}T${String(hour).padStart(2, '0')}:00:00`).toISOString();
const noon = (day) => new Date(`${day}T12:00:00`);

function lesson(id, order, extra = {}) {
  return {
    id, title: id.toUpperCase(), short: id, exams: ['TYT', 'AYT'], unit: 'temel', grade: 9, order, prereq: [], confused: [], categories: [],
    goal: 'g', why: 'w', archetypes: [{ id: 'a', share: 0.6, core: 's1', title: 'A tipi', cue: 'c', strategy: 's' }, { id: 'b', share: 0.4, core: 's2', title: 'B tipi', cue: 'c', strategy: 's' }],
    mastery: { minutes: 15, mix: [{ archetype: 'a', count: 3, lo: 1, hi: 3 }, { archetype: 'b', count: 2, lo: 1, hi: 3 }], passPct: 80, minCorrect: 1 },
    review: { minutes: 12 }, sessions: [{ title: 'O1', sections: ['s1', 's2'], minutes: 20 }, { title: 'O2', sections: ['s3'], minutes: 10 }],
    sections: [{ id: 's1', title: 'S1', minutes: 10, blocks: [] }, { id: 's2', title: 'S2', minutes: 10, blocks: [] }, { id: 's3', title: 'S3', minutes: 10, blocks: [] }],
    minutes: 30, practiceIds: [], flashcards: [{ id: 'k1' }, { id: 'k2' }], ...extra,
  };
}

const UNITS = [{ id: 'temel', title: 'Temel', grade: 9 }];
const index = buildIndex([lesson('alfa', 1), lesson('beta', 2, { prereq: ['alfa'] }), lesson('gama', 3, { exams: ['AYT'], prereq: ['beta'], confused: ['alfa'] })], UNITS);
const settings = { dailyMinutes: 120, tracks: ['TYT', 'AYT'] };
let seq = 0;
const ev = (fields) => ({ id: `e${++seq}`, seq, ...fields });
const attempt = (day, fields) => ev({ kind: 'attempt', at: at(day, fields.hour ?? 10), timeMs: 60000, hintUsed: false, ...fields });
const masterySet = (day, conceptId, results, setType = 'mastery', hour = 11) => {
  const setId = `set-${conceptId}-${day}-${setType}-${hour}`;
  const list = results.map((correct, i) => attempt(day, { hour, itemType: 'bank', itemId: `${conceptId}-${day}-${hour}-${i}`, questionId: i + 1, conceptId,
    archetypeId: i % 2 ? 'b' : 'a', difficulty: 2, context: setType, correct, confidence: 3, setId, exam: 'TYT' }));
  return [...list, ev({ kind: 'set', action: 'done', at: at(day, hour + 1), setId, setType, conceptId })];
};

test('tekrar merdiveni ve sınav sıkıştırması (spec §5.1–5.2)', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 9].map((s) => interval(s, {})), [1, 3, 7, 14, 30, 60, 60]);
  // 30 gün kala: floor(30/3)=10 üst sınır
  assert.equal(interval(3, { examDate: '2026-12-01', today: '2026-11-01' }), 10);
  assert.equal(interval(1, { examDate: '2026-12-01', today: '2026-11-01' }), 3);
  // 21 gün ve altı: en çok 7, ayrıca floor(20/3)=6
  assert.equal(interval(5, { examDate: '2026-11-21', today: '2026-11-01' }), 6);
  assert.equal(interval(4, { examDate: '2026-11-03', today: '2026-11-01' }), 1);
  assert.equal(planMode('2026-11-21', '2026-11-01'), 'exam_final');
  assert.equal(planMode('', '2026-11-01'), 'normal');
  assert.deepEqual([95, 80, 79, 60, 59].map(reviewOutcome), ['up', 'up', 'same', 'same', 'lapse']);
});

test('ustalık puanı ağırlıkları: zorluk/3 ve 14 günlük yarı ömür (spec §4)', () => {
  const now = noon('2026-10-29');
  const attempts = new Map([
    ['a', [{ at: noon('2026-10-29').toISOString(), correct: true, difficulty: 3 }, { at: noon('2026-10-15').toISOString(), correct: false, difficulty: 3 }]],
  ]);
  const { score, perArchetype } = masteryScore([{ id: 'a', share: 0.5 }, { id: 'b', share: 0.5 }], attempts, now);
  // a: w1 = 1, w2 = 0.5 → acc = 1 / 1.5 = 0.667; b hiç yok → 0; puan = 100 × 0.5 × 0.667 = 33
  assert.equal(Math.round(perArchetype[0].acc * 1000), 667);
  assert.equal(perArchetype[1].acc, 0);
  assert.equal(score, 33);
  assert.equal(solvedTypes(perArchetype), 1);
  // Son 10 deneme penceresi
  const many = new Map([['a', [...Array(10).fill({ at: now.toISOString(), correct: false, difficulty: 2 }), ...Array(10).fill({ at: now.toISOString(), correct: true, difficulty: 2 })]]]);
  assert.equal(masteryScore([{ id: 'a', share: 1 }], many, now).score, 100);
});

test('ustalık testi: %80 ve her tipte en az bir doğru', () => {
  const pass = setResult([{ archetypeId: 'a', correct: true }, { archetypeId: 'a', correct: true }, { archetypeId: 'b', correct: true }, { archetypeId: 'b', correct: true }, { archetypeId: 'a', correct: false }]);
  assert.equal(pass.pct, 80);
  assert.equal(pass.passed, true);
  const missingType = setResult([...Array(4).fill({ archetypeId: 'a', correct: true }), { archetypeId: 'b', correct: false }]);
  assert.equal(missingType.pct, 80);
  assert.equal(missingType.passed, false);
  assert.deepEqual(missingType.weak, ['b']);
});

test('yanlış soru kuyruğu: +1, +3, temizleme, öncelik, tahmin ve kardeş (spec §5.3)', () => {
  const queue = {};
  const base = { itemId: 'q1', questionId: 1, conceptId: 'alfa', archetypeId: 'a' };
  applyBankAttempt(queue, { ...base, at: at('2026-10-01'), correct: false, confidence: 2 });
  assert.equal(queue.q1.dueDay, '2026-10-02');
  applyBankAttempt(queue, { ...base, at: at('2026-10-02'), correct: true, confidence: 3 });
  assert.equal(queue.q1.dueDay, '2026-10-05');
  applyBankAttempt(queue, { ...base, at: at('2026-10-05'), correct: false, confidence: 2 });
  assert.equal(queue.q1.dueDay, '2026-10-06');
  assert.equal(queue.q1.consecutiveCorrect, 0);
  applyBankAttempt(queue, { ...base, at: at('2026-10-06'), correct: true, confidence: 2 });
  applyBankAttempt(queue, { ...base, at: at('2026-10-09'), correct: true, confidence: 3 });
  assert.equal(queue.q1.status, 'cleared');

  applyBankAttempt(queue, { ...base, itemId: 'q2', at: at('2026-10-01'), correct: false, confidence: 3 });
  assert.equal(queue.q2.priority, true);
  applyBankAttempt(queue, { ...base, itemId: 'q2', at: at('2026-10-02'), correct: true, confidence: 3 });
  applyBankAttempt(queue, { ...base, itemId: 'q2', at: at('2026-10-05'), correct: true, confidence: 3 });
  assert.equal(queue.q2.status, 'active');
  assert.equal(queue.q2.dueDay, '2026-10-12');
  applyBankAttempt(queue, { ...base, itemId: 'q2', at: at('2026-10-12'), correct: true, confidence: 3 });
  assert.equal(queue.q2.status, 'cleared');

  applyBankAttempt(queue, { ...base, itemId: 'q3', at: at('2026-10-01'), correct: true, confidence: 1 });
  assert.equal(queue.q3.kind, 'guess');
  assert.equal(queue.q3.dueDay, '2026-10-04');
  applyBankAttempt(queue, { ...base, itemId: 'q3', at: at('2026-10-04'), correct: true, confidence: 3 });
  assert.equal(queue.q3.status, 'cleared');

  addSibling(queue, { itemId: 'q4', questionId: 4, conceptId: 'alfa', archetypeId: 'a', dueDay: '2026-10-02', at: at('2026-10-01') });
  assert.deepEqual(dueItems(queue, '2026-10-02').map((i) => i.itemId), ['q4']);
});

test('kavram durumları: kilit, ders, ustalık, tekrar, risk ve yeniden anlatım (spec §3)', () => {
  const events = [
    ev({ kind: 'concept', action: 'start_anyway', conceptId: 'gama', at: at('2026-10-01', 8) }),
    ev({ kind: 'lesson', action: 'open', conceptId: 'alfa', at: at('2026-10-01', 9) }),
    ev({ kind: 'lesson', action: 'section', conceptId: 'alfa', sectionId: 's1', nextSectionId: 's2', ms: 600000, at: at('2026-10-01', 9) }),
  ];
  let s = derive({ events, index, settings, now: noon('2026-10-01') });
  assert.equal(s.concepts.alfa.status, 'learning');
  assert.equal(s.concepts.beta.status, 'locked');
  assert.equal(s.concepts.gama.status, 'available');
  assert.deepEqual(s.concepts.alfa.resume, { sectionId: 's2', blockIndex: 0 });
  assert.deepEqual(lessonProgress(index.byId.alfa, s.concepts.alfa), { session: 1, sessions: 2, remaining: 10, totalLeft: 20, total: 30, done: false });

  events.push(ev({ kind: 'lesson', action: 'complete', conceptId: 'alfa', cards: ['k1', 'k2'], at: at('2026-10-01', 11) }));
  s = derive({ events, index, settings, now: noon('2026-10-01') });
  assert.equal(s.concepts.alfa.status, 'practicing');
  assert.equal(s.newCards.length, 2);

  events.push(...masterySet('2026-10-02', 'alfa', [true, true, true, true, false]));
  s = derive({ events, index, settings, now: noon('2026-10-02') });
  assert.equal(s.concepts.alfa.status, 'mastered');
  assert.equal(s.concepts.alfa.nextDue, '2026-10-03');
  assert.equal(s.concepts.beta.status, 'available');

  s = derive({ events, index, settings, now: noon('2026-10-03') });
  assert.equal(s.concepts.alfa.status, 'review_due');
  events.push(...masterySet('2026-10-03', 'alfa', [true, true, true, true, true, true], 'review'));
  s = derive({ events, index, settings, now: noon('2026-10-03') });
  assert.equal(s.concepts.alfa.ladderStep, 1);
  assert.equal(s.concepts.alfa.nextDue, '2026-10-06');
  assert.equal(s.concepts.alfa.retained, true);

  events.push(...masterySet('2026-10-06', 'alfa', [true, true, true, true, false, false], 'review'));
  s = derive({ events, index, settings, now: noon('2026-10-06') });
  assert.equal(s.concepts.alfa.ladderStep, 1, '60–79: aynı basamak');
  assert.equal(s.concepts.alfa.nextDue, '2026-10-09');

  events.push(...masterySet('2026-10-09', 'alfa', [true, false, false, true, false, false], 'review'));
  s = derive({ events, index, settings, now: noon('2026-10-09') });
  assert.equal(s.concepts.alfa.status, 'at_risk');
  assert.equal(s.concepts.alfa.lapses, 1);
  assert.equal(s.concepts.alfa.ladderStep, 0);
  assert.ok(s.concepts.alfa.reteach.archetypes.length === 1);

  events.push(ev({ kind: 'set', action: 'done', setId: 'rt1', setType: 'reteach', conceptId: 'alfa', at: at('2026-10-09', 15) }));
  s = derive({ events, index, settings, now: new Date('2026-10-09T18:00:00') });
  assert.equal(s.concepts.alfa.status, 'practicing');
  events.push(...masterySet('2026-10-10', 'alfa', [true, true, true, true, true]));
  s = derive({ events, index, settings, now: noon('2026-10-10') });
  assert.equal(s.concepts.alfa.status, 'mastered');
  assert.equal(s.concepts.alfa.lapses, 1);
});

test('ustalık testi başarısızsa zayıf tip için yeniden anlatım', () => {
  const events = [
    ev({ kind: 'lesson', action: 'open', conceptId: 'alfa', at: at('2026-10-01', 9) }),
    ev({ kind: 'lesson', action: 'complete', conceptId: 'alfa', cards: [], at: at('2026-10-01', 10) }),
    ...masterySet('2026-10-02', 'alfa', [true, false, true, false, true]),
  ];
  const s = derive({ events, index, settings, now: noon('2026-10-02') });
  assert.equal(s.concepts.alfa.status, 'learning');
  assert.deepEqual(s.concepts.alfa.reteach.archetypes, ['b']);
  const plan = buildPlan({ state: s, index, summary: null });
  assert.ok(plan.items.some((item) => item.kind === 'reteach' && item.conceptId === 'alfa'));
});

test('günlük plan: öncelik, yeni öğrenme payı ve telafi modu (spec §7)', () => {
  const events = [];
  for (const id of ['alfa', 'beta']) {
    events.push(ev({ kind: 'lesson', action: 'open', conceptId: id, at: at('2026-09-01', 9) }));
    events.push(ev({ kind: 'lesson', action: 'complete', conceptId: id, cards: [], at: at('2026-09-01', 10) }));
    events.push(...masterySet('2026-09-02', id, [true, true, true, true, true]));
  }
  // İki kavramın tekrarı 20+ gün gecikmiş; bütçe küçük → vadeli yük %60'ı aşar.
  const small = { dailyMinutes: 30, tracks: ['TYT', 'AYT'] };
  const today = derive({ events, index, settings: small, now: noon('2026-10-01') });
  const yesterday = derive({ events, index, settings: small, now: noon('2026-09-30') });
  const plan = buildPlan({ state: today, index, summary: null, yesterdayLoad: dueLoad(yesterday, index, null) });
  assert.equal(plan.mode, 'catch_up');
  assert.match(plan.message, /Önce tekrarları toparlayalım/);
  assert.ok(plan.items[0].kind === 'review' && plan.items[0].overdueDays > 20);
  const normal = buildPlan({ state: derive({ events, index, settings, now: noon('2026-10-01') }), index, summary: null, yesterdayLoad: 0 });
  assert.equal(normal.mode, 'normal');
  assert.ok(normal.items.some((item) => item.kind === 'learn' && item.conceptId === 'gama'));
  const learn = normal.items.find((item) => item.kind === 'learn');
  assert.equal(isDone(learn, derive({ events, index, settings, now: noon('2026-10-01') }), '2026-10-01', index), false);
});

test('plan: ilk girişte seviye testi önerisi ve en çok 2 yeni konu', () => {
  const s = derive({ events: [], index, settings, now: noon('2026-10-01') });
  const plan = buildPlan({ state: s, index, summary: null });
  assert.deepEqual(plan.extras.map((e) => e.key), ['placement:TYT', 'placement:AYT']);
  assert.deepEqual(plan.items.filter((i) => i.kind === 'learn').map((i) => i.conceptId), ['alfa']);
});

test('seri ve dondurma hakkı (spec §11)', () => {
  const days = {};
  const active = (day) => { days[day] = { ms: 20 * 60000, questions: 10, cards: 0 }; };
  // Pazartesi 2026-10-05 … Pazar 2026-10-11 her gün aktif → pazar akşamı 1 hak
  for (let d = 5; d <= 12; d += 1) active(`2026-10-${String(d).padStart(2, '0')}`);
  // 13 Ekim boş → hak kullanılır, seri sürer
  active('2026-10-14');
  const s = streakOf(days, '2026-10-14');
  assert.equal(s.count, 9);
  assert.deepEqual(s.usedFreezes, ['2026-10-13']);
  assert.equal(s.freezes, 0);
  const pending = streakOf(days, '2026-10-15');
  assert.equal(pending.count, 9, 'bugün henüz çalışılmadıysa seri dünden sürer');
  const broken = streakOf({ '2026-10-01': { ms: 3600000, questions: 1, cards: 0 }, '2026-10-03': { ms: 3600000, questions: 1, cards: 0 } }, '2026-10-03');
  assert.equal(broken.count, 1);
});

test('soru seçimi: görülmemiş önce, kuyruktaki soru tekrar seçilmez, karışanlar yan yana (spec §6)', () => {
  const bank = expandBank('alfa', [
    { c: 'X1', i: 1, a: 'a', d: 1, x: 'TYT' }, { c: 'X2', i: 2, a: 'a', d: 2, x: 'TYT', k: 1 }, { c: 'X3', i: 3, a: 'a', d: 3, x: 'TYT' },
    { c: 'X4', i: 4, a: 'b', d: 2, x: 'TYT' }, { c: 'X5', i: 5, a: 'b', d: 2, x: 'TYT' }, { c: 'X6', i: 6, a: null, d: 2, x: 'TYT' },
  ]);
  const events = [attempt('2026-10-28', { itemType: 'bank', itemId: 'X3', questionId: 3, conceptId: 'alfa', archetypeId: 'a', difficulty: 3, context: 'practice', correct: false, confidence: 2 })];
  const s = derive({ events, index, settings, now: noon('2026-10-29') });
  const picked = pickMastery({ meta: index.byId.alfa, bank, state: s, seed: 'x' });
  const codes = picked.map((p) => p.question.code ?? p.question.id);
  assert.ok(!codes.includes('X3'), 'kuyruktaki soru ustalık testine girmez');
  assert.ok(codes.includes('X2'), 'çıkmış soru önce');
  assert.equal(picked.length, 5);
  const review = pickReview({ meta: index.byId.alfa, bank, state: s, seed: 'y' });
  assert.ok(review.length <= 6 && review.every((item) => item.question?.code !== 'X3'));
  assert.equal(pickSibling({ bank, archetype: 'a', state: s, seed: 'z' })?.archetype, 'a');
  const ordered = orderConfusedPairs([{ question: { conceptId: 'gama' } }, { question: { conceptId: 'beta' } }, { question: { conceptId: 'alfa' } }], index);
  assert.deepEqual(ordered.map((o) => o.question.conceptId), ['gama', 'alfa', 'beta']);
});

test('seviye testi: iki doğru → geçme adayı, ilk yanlış ünite başlangıç (spec §9)', () => {
  const units = [{ unitId: 'temel', questions: [{ code: 'P1' }, { code: 'P2' }] }];
  const answers = { P1: true };
  assert.equal(nextPlacementQuestion(units, answers, Date.now(), Date.now()).question.code, 'P2');
  const result = placementResult(units, { P1: true, P2: true }, index, 'TYT');
  assert.deepEqual(result.testOut, ['alfa', 'beta']);
  assert.equal(result.level, 'L2');
  const low = placementResult(units, { P1: false }, index, 'TYT');
  assert.equal(low.startUnit, 'temel');
  assert.equal(low.level, 'L1');
  assert.equal(nextPlacementQuestion(units, { P1: false }, Date.now(), Date.now()), null);
});

test('kart puanı ve kalibrasyon (spec §5.4, §12)', () => {
  assert.equal(ratingFor({ correct: false }, 8000), RATING.again);
  assert.equal(ratingFor({ correct: true, confidence: 2 }, 8000), RATING.hard);
  assert.equal(ratingFor({ correct: true, confidence: 3, timeMs: 6000 }, 8000), RATING.good);
  assert.equal(ratingFor({ correct: true, confidence: 3, timeMs: 3000 }, 8000), RATING.easy);
  const events = Array.from({ length: 12 }, (_, i) => attempt('2026-10-20', { itemType: 'lesson_q', itemId: `L${i}`, conceptId: 'alfa', archetypeId: 'a', context: 'quick_check', correct: i < 6, confidence: 3 }));
  const s = derive({ events, index, settings, now: noon('2026-10-21') });
  const c = calibration(s);
  assert.equal(c.rows[2].accuracy, 50);
  assert.match(c.note, /Eminim/);
  const f = forecast(s, index);
  assert.equal(f.length, 2);
  assert.ok(f.every((row) => row.left >= 1));
});

test('ayarlar ve tarih yardımcıları', () => {
  assert.deepEqual(normalizeSettings({ tracks: ['AYT', 'X'], dailyMinutes: 5 }).tracks, ['AYT']);
  assert.equal(normalizeSettings({ dailyMinutes: 5 }).dailyMinutes, 20);
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(daysBetween('2026-10-25', '2026-10-26'), 1);
  assert.equal(dayKey(new Date(2026, 2, 29, 23, 30)), '2026-03-29');
});
