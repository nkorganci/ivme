// TYT tamamlama işinde (MAT-TYT) eklenen gerçek soruların ve benzer soruların bağımsız taraması.
// Her soru: görseli okunmuş kaydın cevabı, ders bankası bağı ve bütün olasılıkların taranması.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseLesson } from '../frontend/src/learn/content/parser.js';
import { WORKED_EXAMS } from '../frontend/src/learn/content/worked-exams.js';

const load = (id) => parseLesson(readFileSync(new URL(`../frontend/src/learn/content/dersler/${id}.ders`, import.meta.url), 'utf8'), id);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const INDEPENDENT = ['bolme-bolunebilme', 'ebob-ekok'].flatMap((id) => JSON.parse(readFileSync(new URL(`../frontend/src/learn/content/kanit/${id}.json`, import.meta.url), 'utf8')).independentCodes);
const linked = (code, answer) => {
  assert.ok(!INDEPENDENT.includes(code), code + ' bağımsız aktarım sorusu; derste çözülemez');
  const record = WORKED_EXAMS[code];
  assert.equal(record.answer, answer, code);
  assert.ok(load(record.conceptId).practiceIds.includes(code), code + ' ders bankasında örnek olarak işaretli değil');
};

test('bölme dersi: rakam zinciri örneği (bağımsız TYT-0597 ile aynı kalıp, 4 kuralı)', () => {
  const chain = (top, mid, low) => top !== mid && mid !== low && top !== low && mid !== 0 && low !== 0 && top % mid === 0 && mid % low === 0;
  const exam = [];
  for (const a of range(1, 9)) for (const b of range(0, 9)) for (const c of range(0, 9)) if (chain(a, b, c)) exam.push(100 * a + 10 * b + c);
  assert.deepEqual(exam.filter((n) => n % 3 === 0), [621]);
  const similar = [];
  for (const a of range(1, 9)) for (const b of range(1, 9)) for (const c of range(1, 9)) if (chain(c, b, a)) similar.push(100 * a + 10 * b + c);
  assert.deepEqual(similar.sort((x, y) => x - y), [124, 126, 128, 136, 139, 148, 248]);
  assert.deepEqual(similar.filter((n) => n % 4 === 0), [124, 128, 136, 148, 248]);
  // Sıfır serbest bırakılırsa C=0 da B'nin katıdır; ders bu yüzden “sıfırdan farklı” der.
  const withZero = [];
  for (const a of range(1, 9)) for (const b of range(1, 9)) if (a !== b && b % a === 0) withZero.push(100 * a + 10 * b);
  assert.ok(withZero.some((n) => n % 4 === 0));
});

test('EBOB dersi: iki gruplama örneği (bağımsız TYT-0713 ile aynı kalıp, 270)', () => {
  const pairs = (m, n) => { const out = []; for (const a of range(1, 9)) for (const b of range(1, 9)) if (m * (10 * a + b) === n * (10 * b + a)) out.push(10 * a + b); return out; };
  assert.deepEqual(pairs(3, 8), [72]);
  const total = 3 * 72;
  assert.equal(total, 216);
  assert.deepEqual([40, 48, 54, 56, 60].filter((g) => total % g === 0), [54]);
  assert.deepEqual(pairs(5, 6), [54]);
  assert.equal(5 * 54, 6 * 45);
  assert.deepEqual([36, 40, 45, 50, 60].filter((g) => 270 % g === 0), [45]);
});

test('TYT-0641 ve TYT-0643: A√B yazılışları ve kök bölümü; benzer sorular', () => {
  const sums = (n) => range(1, 40).filter((a) => n % (a * a) === 0).map((a) => a + n / (a * a));
  assert.deepEqual(sums(720), [721, 182, 83, 49, 26, 17]);
  assert.deepEqual([26, 49, 83, 127, 182].filter((x) => !sums(720).includes(x)), [127]);
  linked('TYT-0641', 'D');
  assert.deepEqual(sums(432), [433, 110, 51, 31, 18, 15]);
  assert.deepEqual([15, 18, 31, 52, 110].filter((x) => !sums(432).includes(x)), [52]);
  // a/b tam sayı ⇔ (a/b)² = 720/b² tam kare ve bölüm tam sayı.
  const intRatio = (a2, b2) => { const q = a2 / b2; return Number.isInteger(Math.sqrt(q)) && Number.isInteger(q); };
  assert.deepEqual([5, 20, 45, 60, 80].filter((b2) => !intRatio(720, b2)), [60]);
  linked('TYT-0643', 'D');
  assert.deepEqual([2, 8, 24, 98, 392].filter((b2) => !intRatio(392, b2)), [24]);
  assert.equal(intRatio(392, 18), false);
});

test('TYT-0594 ve TYT-0599: ters sayılar ve iki kalan; benzer sorular', () => {
  const sums = (k) => [...new Set(range(1, 9).flatMap((a) => range(1, 9).filter((b) => ((10 * a + b) * (10 * b + a)) % k === 0).map((b) => a + b)))].sort((x, y) => x - y);
  assert.deepEqual(sums(30), [9]);
  linked('TYT-0594', 'B');
  assert.deepEqual(sums(45), [6, 9, 12]);
  const digitsA = (mid, m) => [...new Set(range(1, 9).filter((a) => range(0, 9).some((b) => { const n = 1000 * a + mid + b; return n % 5 === n % m; })))];
  assert.deepEqual(digitsA(340, 9), [2, 6]);
  linked('TYT-0599', 'A');
  const similar = digitsA(150, 3);
  assert.deepEqual(similar, [1, 3, 4, 6, 7, 9]);
  assert.equal(similar.reduce((x, y) => x + y, 0), 30);
});

test('TYT-0701 ve TYT-0723: gruptan gruba geçiş ve adet × birim oranı; benzer sorular', () => {
  const k701 = range(1, 200).filter((k) => 3 * (k + 12) === 2 * (2 * k - 12));
  assert.deepEqual(k701, [60]); assert.equal(3 * k701[0], 180);
  linked('TYT-0701', 'D');
  const kSim = range(1, 100).filter((k) => 2 * k + 6 === 5 * k - 6);
  assert.deepEqual(kSim, [4]); assert.equal(7 * kSim[0], 28);
  // 2k·c / (3k·p) = 8/5 → p/c = 5/12
  assert.equal((2 * 12) / (3 * 5), 8 / 5);
  linked('TYT-0723', 'A');
  assert.equal((3 * 6) / (4 * 1), 9 / 2);
});
