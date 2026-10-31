// TAS-09 ikinci konu (EBOB–EKOK): kaynaklı dört sorunun sonucu, yazılı çözümden bağımsız kaba kuvvet taramasıyla.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKED_EXAMS } from '../frontend/src/learn/content/worked-exams.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a / gcd(a, b)) * b;
const fact = (n) => (n <= 1n ? 1n : n * fact(n - 1n));
const LETTERS = 'ABCDE';

test('TYT-0713: 3·AB = 8·BA tek çözüm 216; seçeneklerden yalnız 54 böler', () => {
  const totals = [];
  for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) if (3 * (10 * a + b) === 8 * (10 * b + a)) totals.push(3 * (10 * a + b));
  assert.deepEqual(totals, [216]);
  const options = [40, 48, 54, 56, 60];
  const fits = options.map((n, i) => [LETTERS[i], n]).filter(([, n]) => totals[0] % n === 0);
  assert.deepEqual(fits, [['C', 54]]);
  assert.equal(WORKED_EXAMS['TYT-0713'].result, 'C · 54');
});

test('AYT_Sayisal-0021: EKOK(7!+6!, 8!−7!) seçeneklerden yalnız 7·8!', () => {
  const A = fact(7n) + fact(6n);
  const B = fact(8n) - fact(7n);
  const g = (x, y) => (y ? g(y, x % y) : x);
  const value = (A / g(A, B)) * B;
  assert.equal(value, 282240n);
  const options = [6n * fact(7n), 7n * fact(7n), 7n * fact(8n), fact(7n), fact(8n)];
  assert.deepEqual(options.flatMap((n, i) => (n === value ? [LETTERS[i]] : [])), ['C']);
  assert.equal(WORKED_EXAMS['AYT_Sayisal-0021'].answer, 'C');
});

test('AYT_Sayisal-0018: EBOB+EKOK=289 ve m+n≠289 için bütün çiftler 41 verir', () => {
  const sums = new Set();
  for (let m = 1; m <= 289; m++) for (let n = 1; n <= 289; n++) {
    if (gcd(m, n) + lcm(m, n) === 289 && m + n !== 289) sums.add(m + n);
  }
  assert.deepEqual([...sums], [41]);
  assert.equal(WORKED_EXAMS['AYT_Sayisal-0018'].result, 'A · 41');
});

test('AYT_Sayisal-0035: M=6^a·5^b, N=10^c·9^d için tek üs dörtlüsü, toplam 10', () => {
  const g = (x, y) => (y ? g(y, x % y) : x);
  const want = [8n * 9n * 5n, 32n * 27n * 3125n];
  const found = [];
  for (let a = 1n; a <= 8n; a++) for (let b = 1n; b <= 8n; b++) for (let c = 1n; c <= 8n; c++) for (let d = 1n; d <= 8n; d++) {
    const M = 6n ** a * 5n ** b;
    const N = 10n ** c * 9n ** d;
    const e = g(M, N);
    if (e === want[0] && (M / e) * N === want[1]) found.push(Number(a + b + c + d));
  }
  assert.deepEqual(found, [10]);
  assert.equal(WORKED_EXAMS['AYT_Sayisal-0035'].result, 'C · 10');
});
