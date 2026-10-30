import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseLesson, lessonQuestions } from '../frontend/src/learn/content/parser.js';
import { DIVISION_EXPLORATIONS } from '../frontend/src/learn/content/division-explorations.js';
import { divisionModel } from '../frontend/src/learn/lesson/division-models.js';
import { WORKED_EXAMS } from '../frontend/src/learn/content/worked-exams.js';
import { mathSegments } from '../frontend/src/learn/content/validate.js';
import { checkMath } from '../frontend/src/learn/content/checks.js';

const lesson = parseLesson(readFileSync(new URL('../frontend/src/learn/content/dersler/bolme-bolunebilme.ders', import.meta.url), 'utf8'));
const digits = Array.from({ length: 10 }, (_, i) => i);
const pairs = digits.flatMap((a) => digits.map((b) => ({ a, b })));

test('pilot: sekiz kısa bölüm, gerekçeli örnekler, korunmuş soru kimlikleri ve kaynaklar', () => {
  assert.deepEqual(lesson.sections.map((s) => s.id), ['s1', 's1b', 's2', 's2b', 's3', 's3b', 's4', 's4b']);
  const blocks = lesson.sections.flatMap((s) => s.blocks);
  assert.equal(blocks.filter((b) => b.type === 'worked').length, 24);
  assert.equal(blocks.filter((b) => b.type === 'exploration').length, 4);
  assert.equal(blocks.filter((b) => b.type === 'faded').length, 3);
  for (const b of blocks.filter((b) => ['worked', 'faded'].includes(b.type))) {
    assert.ok(b.steps.every((s) => s.why), b.title);
    assert.ok(b.answer, b.title);
  }
  const ids = new Set(lessonQuestions(lesson).map((q) => q.localId));
  for (const id of ['o1','o2','o3','c1','c2','c3','c4','h1','h2','h3','h4']) assert.ok(ids.has(id), id);
  for (const e of Object.values(DIVISION_EXPLORATIONS)) {
    assert.equal(e.lessonId, lesson.id);
    assert.ok(e.steps.length >= 3 && e.steps.every((s) => s.length === 2));
    for (const text of [e.story, e.expert, e.tip, ...e.steps.flat(), ...e.transfer]) {
      for (const m of mathSegments(text)) assert.equal(checkMath(m.tex), null, m.tex);
    }
  }
});

test('yeni görseller: bütün girişlerde metinle aynı gerçek kalan ve çarpım koşulu', () => {
  for (const d of [4, 9]) for (const a of digits) {
    const m = divisionModel('bolme-basamak', { a, d });
    assert.equal(m.r, Number('2' + a + '16') % d);
    assert.equal(m.sum, [...String(m.n)].reduce((s, v) => s + Number(v), 0));
  }
  for (let pair = 0; pair < 3; pair++) for (let n = 1; n <= 36; n++) {
    const m = divisionModel('bolme-bilesik', { n, pair });
    assert.deepEqual(m.results, [n / m.a, n / m.b, n / m.product].map(Number.isInteger));
    if (pair !== 1) assert.equal(m.results[0] && m.results[1], m.results[2]);
  }
  assert.deepEqual(divisionModel('bolme-bilesik', { n: 6, pair: 1 }).results, [true, true, false]);
  for (let n = 1; n <= 24; n++) {
    const m = divisionModel('bolme-dongu', { n });
    assert.equal(m.r, Number(3n ** BigInt(n) % 5n));
    assert.equal(m.cycle[m.index], m.r);
  }
});

test('rakam örneklerini bütün adayları tarayarak doğrula', () => {
  assert.deepEqual(pairs.filter(({ a, b }) => a > 0 && 101*a+10*b === (10*a+2)*11+10 && 10 < 10*a+2), [{ a: 2, b: 5 }]);
  assert.deepEqual(digits.filter((a) => (502+10*a)%9 === 0), [2]);
  assert.deepEqual(digits.filter((a) => (6035+100*a)%3 === 1), [2, 5, 8]);
  const both = pairs.filter(({ a, b }) => (5040+100*a+b)%36 === 0);
  assert.equal(Math.max(...both.map(({ a, b }) => a+b)), 9);
  assert.equal(Math.max(...pairs.map(({ a, b }) => 2050+100*a+b).filter((n) => n%45 === 0)), 2655);
  const distinct = pairs.filter(({ a, b }) => new Set([4,5,a,b]).size === 4 && (4500+10*a+b)%15 === 0);
  assert.equal(Math.max(...distinct.map(({ a,b }) => a+b)), 9);
  assert.deepEqual(pairs.map(({ a,b }) => 3020+100*a+b).filter((n) => n%36 === 0), [3024,3420,3528,3924]);
  assert.deepEqual(pairs.filter(({ a,b }) => (41070+100*a+b)%36 === 15), [{ a:2,b:1 },{ a:3,b:9 },{ a:7,b:5 }]);
});

test('özgün TYT/AYT çözümleri: tüm rakam olasılıkları, seçenek ve ustalık dışlama', () => {
  const ayt = pairs.filter(({ a,b }) => a > 0 && Math.floor((101*a+10*b)/(10*a+1)) === 13 && (101*a+10*b)%(10*a+1) === 19);
  assert.deepEqual(ayt, [{ a:2,b:9 }]);
  const tyt = pairs.filter(({ a,b }) => {
    const aab = 110*a+b, aba=101*a+10*b;
    return a > 0 && aab%9===0 && aba%9===0 && ((aab%5===0 && aba%12===0)||(aba%5===0 && aab%12===0));
  });
  assert.deepEqual(tyt, [{ a:2,b:5 }]);
  for (const [code, answer, result] of [['AYT_Sayisal-0014','D',11],['TYT-0593','A',7]]) {
    assert.equal(WORKED_EXAMS[code].answer, answer);
    assert.equal(WORKED_EXAMS[code].result, answer+' · '+result);
    assert.ok(lesson.practiceIds.includes(code));
  }
});

test('kalan örnekleri: 11 işareti, iki koşul, döngü sınırı ve bölme karşı örneği', () => {
  assert.equal(2030%11, 6);
  assert.equal(3527%11, 7);
  assert.equal(3124%8, 4);
  assert.deepEqual(Array.from({ length:12 },(_,i)=>i).filter((n)=>n%3===2 && n%4===1), [5]);
  assert.equal(Number(3n**24n%5n),1);
  assert.equal(4%6,10%6);
  assert.notEqual((4/2)%6,(10/2)%6);
  for (let q=0;q<100;q++) {
    const a=7*q+5;
    assert.equal((a*a+3*a)%7,5);
    assert.equal((3*(8*q+7)-2)%8,3);
  }
});

test('anlatım seçimi her bölümde bir şey değiştirir; her bölümde günlük hayattan sorgulama var', () => {
  for (const section of lesson.sections) {
    const leveled = section.blocks.filter((b) => b.type === 'leveled');
    assert.ok(leveled.length >= 1, `${section.id}: düzeyli anlatım yok`);
    for (const b of leveled) for (const level of ['L1', 'L2', 'L3']) assert.ok(b.levels[level]?.length > 80, `${section.id}: ${level} kısa veya eksik`);
    const inquiries = section.blocks.filter((b) => b.type === 'inquiry');
    assert.ok(inquiries.length >= 1, `${section.id}: günlük hayattan sorgula yok`);
    for (const q of inquiries) {
      assert.ok(q.situation && q.prompt && q.why && q.exam && q.reflect && q.reflectAnswer, q.id);
      assert.equal(q.choices.filter((c) => c.correct).length, 1, q.id);
      assert.ok(q.choices.every((c) => c.feedback), q.id);
      for (const text of [q.situation, q.prompt, q.why, q.exam, q.reflect, q.reflectAnswer, ...q.choices.flatMap((c) => [c.text, c.feedback])]) {
        for (const m of mathSegments(text)) assert.equal(checkMath(m.tex), null, m.tex);
      }
    }
  }
});

test('günlük hayat senaryolarının sayıları bağımsız hesapla tutar', () => {
  const correct = (id) => lesson.sections.flatMap((s) => s.blocks).find((b) => b.id === id).choices.find((c) => c.correct).text;
  assert.equal(Math.ceil(50 / 12), 5); assert.ok(correct('s1-gezi').startsWith('5'));
  assert.equal(Math.ceil(26 / 4), 7);
  assert.equal((30 * 7 + 18) % 12, 0); assert.equal(correct('s1b-koli'), '0'); assert.equal((30 * 7 + 18) % 6, 0);
  assert.equal(2034 % 4, 2); assert.equal(2036 % 4, 0); assert.equal(2016 % 4, 0);
  assert.equal(1247 % 9, 5); assert.equal(1251 / 9, 139);
  for (let a = 1; a <= 9; a++) for (let b = 0; b <= 9; b++) assert.equal((1001 * a + 110 * b) % 11, 0);
  assert.equal(3443, 11 * 313); assert.equal(12321 % 11, 1);
  const both = Array.from({ length: 100 }, (_, i) => i + 1).filter((n) => n % 6 === 0 && n % 8 === 0);
  assert.deepEqual(both, [24, 48, 72, 96]);
  assert.equal(Array.from({ length: 200 }, (_, i) => i + 1).filter((n) => n % 4 === 0 && n % 9 === 0)[0], 36);
  assert.equal((22 + 4 * 8) % 24, 6); assert.equal(correct('s4-firin'), '06.00'); assert.equal((22 + 9 * 8) % 24, 22);
  const duty = ['Ada', 'Bora', 'Cem', 'Deniz'];
  assert.equal(duty[(50 - 1) % 4], 'Bora'); assert.equal(correct('s4b-nobet'), 'Bora'); assert.equal(duty[(100 - 1) % 4], 'Deniz');
  assert.equal(Number(7n ** 50n % 10n), 9);
  assert.deepEqual([1, 2, 3, 4, 5].map((n) => Number(2n ** BigInt(n) % 12n)), [2, 4, 8, 4, 8]);
  assert.equal(918 % 11, 5); assert.equal(10000 % 16, 0);
});
