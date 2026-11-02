// EBOB–EKOK laboratuvarı: bölen sayısı, EBOB/EKOK ve döngüler bağımsız tarama ile (bölme denemesi) sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import lab from '../frontend/src/learn/lab/konular/ebob-ekok.js';

const goal = (id) => lab.goals.find((g) => g.id === id);
const divisors = (n) => { let c = 0; for (let d = 1; d <= n; d++) if (n % d === 0) c++; return c; };
const g = (a, b) => { let d = Math.min(a, b); while (a % d || b % d) d--; return d; };
const l = (a, b) => { let m = Math.max(a, b); while (m % a || m % b) m++; return m; };

test('asal çarpan: bölen sayısı deneme bölmesiyle; 12 bölenli en küçük sayı 60', () => {
  const ex = goal('asal-carpan').experiment;
  for (let a = 0; a <= 11; a++) for (let b = 0; b <= 4; b++) for (let c = 0; c <= 3; c++) {
    const r = ex.compute({ a, b, c });
    if (r.n <= 50000) assert.equal(r.count, divisors(r.n));
    assert.equal(ex.target.test({ a, b, c }, r), r.n === 60);
  }
  let first = 1; while (divisors(first) !== 12) first++;
  assert.equal(first, 60);
});

test('asal çarpan aktarımları', () => {
  assert.equal(divisors(360), 24);
  const as = []; for (let a = 0; a < 12; a++) if (divisors(2 ** a * 9) === 12) as.push(a);
  assert.deepEqual(as, [3]);
  let even = 0; for (let d = 1; d <= 72; d++) if (72 % d === 0 && d % 2 === 0) even++;
  assert.equal(even, 9);
});

test('EBOB·EKOK: tarama; EBOB 6, EKOK 72 olan çiftler yalnız (6,72) ve (18,24)', () => {
  const ex = goal('ebob-ekok-hesap').experiment;
  const pairs = [];
  for (let a = 2; a <= 72; a++) for (let b = 2; b <= 72; b++) {
    const r = ex.compute({ a, b });
    assert.equal(r.g, g(a, b)); assert.equal(r.l, l(a, b)); assert.equal(r.g * r.l, a * b);
    if (ex.target.test({ a, b }, r) && a <= b) pairs.push([a, b]);
  }
  assert.deepEqual(pairs, [[6, 72], [18, 24]]);
});

test('EBOB·EKOK aktarımları', () => {
  const bs = []; for (let b = 1; b <= 200; b++) if (g(12, b) === 4 && l(12, b) === 60) bs.push(b);
  assert.deepEqual(bs, [20]);
  for (let a = 1; a <= 90; a++) if (90 % a === 0 && g(a, 90 / a) === 1) assert.equal(l(a, 90 / a), 90);
  const A = 120 + 24, B = 720 - 120; assert.equal(g(A, B), 24);
});

test('EBOB/EKOK seçimi: bölme hedefi yalnız 6 m; kurma işinde en küçük kare 36', () => {
  const ex = goal('problem-secim').experiment;
  const bol = [], kur = [];
  for (let s = 1; s <= 40; s++) {
    if (18 % s === 0 && 12 % s === 0) bol.push(s);
    if (s % 18 === 0 && s % 12 === 0) kur.push(s);
    for (const mode of ['bol', 'kur']) assert.equal(ex.target.test({ mode, s }, ex.compute({ mode, s })), mode === 'bol' && s === 6);
  }
  assert.equal(Math.max(...bol), 6); assert.equal(Math.min(...kur), 36);
  assert.equal(ex.compute({ mode: 'bol', s: 6 }).count, 6); assert.equal(ex.compute({ mode: 'kur', s: 36 }).count, 6);
});

test('seçim aktarımları', () => {
  assert.equal(24 / g(24, 36) + 36 / g(24, 36), 5);
  assert.equal((l(6, 8) / 6) * (l(6, 8) / 8), 12);
  let n = 10; while (!(n % 4 === 1 && n % 6 === 1 && n % 9 === 1)) n++;
  assert.equal(n, 37);
});

test('periyodik: iki zil ilk 24. dakikada; üçüncü zille 120', () => {
  const ex = goal('periyodik').experiment;
  let first2 = null, first3 = null;
  for (let t = 1; t <= 120; t++) {
    if (first2 === null && t % 8 === 0 && t % 12 === 0) first2 = t;
    if (first3 === null && t % 8 === 0 && t % 12 === 0 && t % 10 === 0) first3 = t;
    for (const third of [0, 10]) assert.equal(ex.target.test({ t, third }, ex.compute({ t, third })), third === 0 && t === 24);
  }
  assert.equal(first2, 24); assert.equal(first3, 120);
});

test('periyodik aktarımları', () => {
  const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  assert.equal(days[l(4, 6) % 7], 'Cumartesi');
  assert.equal(days[(1 + 9 * 3) % 7], 'Pazartesi');
  let c = 0; for (let t = 1; t <= 240; t++) if (t % 10 === 0 && t % 15 === 0 && t % 20 === 0) c++;
  assert.equal(c, 4);
});

test('gerçek sorular: bağımsız hesap', () => {
  // AYT-0021
  const f = (n) => (n <= 1 ? 1 : n * f(n - 1));
  assert.equal(l(f(7) + f(6), f(8) - f(7)), 7 * f(8));
  // TYT-0713: 3·AB = 8·BA → bilye sayısı; 54 grup mümkün, diğerleri değil
  const N = []; for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) if (3 * (10 * a + b) === 8 * (10 * b + a)) N.push(3 * (10 * a + b));
  assert.deepEqual(N, [216]);
  assert.deepEqual([40, 48, 54, 56, 60].filter((k) => 216 % k === 0), [54]);
  // AYT-0017: p | 180r, p ≠ r asal ⇒ p ∈ {2,3,5}; kesin bölünen seçenek 30r
  const isPrime = (n) => n > 1 && [...Array(n).keys()].slice(2).every((k) => n % k);
  const ps = []; for (let p = 2; p < 50; p++) if (isPrime(p) && 180 % p === 0) ps.push(p);
  assert.deepEqual([12, 18, 20, 30, 45].filter((k) => ps.every((p) => k % p === 0)), [30]);
  // AYT-0010: a(a+b) = c(c−b) = 143, a,b,c asal
  const s10 = []; for (let a = 2; a < 143; a++) for (let b = 2; b < 143; b++) for (const c of [11, 13, 143]) if ([a, b, c].every(isPrime) && a * (a + b) === 143 && c * (c - b) === 143) s10.push(a + b + c);
  assert.deepEqual(s10, [26]);
  // AYT-0016: 6^a·15^b / (9^b·10^c) tam sayı, a,b,c farklı doğal sayılar ⇒ c < b < a
  const orders = new Set();
  for (let a = 0; a <= 6; a++) for (let b = 0; b <= 6; b++) for (let c = 0; c <= 6; c++) {
    if (new Set([a, b, c]).size < 3) continue;
    const num = 6n ** BigInt(a) * 15n ** BigInt(b), den = 9n ** BigInt(b) * 10n ** BigInt(c);
    if (num % den === 0n) orders.add(c < b && b < a ? 'c<b<a' : 'diğer');
  }
  assert.deepEqual([...orders], ['c<b<a']);
  // AYT-0003: 5 oyuncu, 3'er atlama; 99. sefer
  const names = ['Ali', 'Büşra', 'Cem', 'Deniz', 'Ekin'];
  assert.equal(names[(3 * 1) % 5], 'Deniz'); assert.equal(names[(3 * 2) % 5], 'Büşra'); assert.equal(names[(3 * 99) % 5], 'Cem');
});
