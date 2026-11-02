// Üslü İfadeler laboratuvarı: kurallar tekrarlanan çarpmayla (döngü), büyük sayılar BigInt ile bağımsız sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import lab from '../frontend/src/learn/lab/konular/uslu-ifadeler.js';

const goal = (id) => lab.goals.find((g) => g.id === id);
const pow = (b, n) => { let r = 1; for (let i = 0; i < n; i++) r *= b; return r; };

test('negatif taban: döngüyle çarpım; hedef yalnız −2⁴', () => {
  const ex = goal('negatif-taban').experiment;
  for (const w of ['par', 'yok']) for (let n = 1; n <= 6; n++) {
    const r = ex.compute({ w, n });
    assert.equal(r.v, w === 'par' ? pow(-2, n) : -pow(2, n));
    assert.equal(ex.target.test({ w, n }, r), w === 'yok' && n === 4);
  }
});

test('negatif taban aktarımları', () => {
  assert.equal(pow(-1, 25) + pow(-1, 24) - pow(1, 23), -1);
  assert.equal(pow(-5, 0) - pow(5, 0) + pow(0, 3), 0);
  assert.equal(1 / pow(2, 3), 0.125);
});

test('kurallar: m+n=7 ve mn=12 yalnız (3,4),(4,3); kurallar döngüyle', () => {
  const ex = goal('kurallar').experiment;
  for (let m = 1; m <= 6; m++) for (let n = 1; n <= 6; n++) {
    assert.equal(pow(2, m) * pow(2, n), pow(2, m + n));
    assert.equal(pow(pow(2, m), n), pow(2, m * n));
    assert.equal(ex.target.test({ m, n }, ex.compute({ m, n })), (m === 3 && n === 4) || (m === 4 && n === 3));
  }
  assert.equal(pow(2, 3) + pow(2, 3), pow(2, 4));
});

test('kural aktarımları', () => {
  assert.equal(pow(8, 4) / pow(4, 5), 4);
  assert.equal(pow(6, 8), pow(2, 8) * pow(3, 8));
  assert.equal(pow(4, 7), 16 * pow(2, 10)); assert.notEqual(pow(4, 7), pow(2, 10) + 16);
});

test('ortak paranteze: 3ˣ⁺¹ + 3ˣ = 108 yalnız x = 3', () => {
  const ex = goal('ortak-paranteze').experiment;
  for (let x = 0; x <= 6; x++) {
    const r = ex.compute({ x }); assert.equal(r.total, pow(3, x + 1) + pow(3, x)); assert.equal(r.total, 4 * pow(3, x));
    assert.equal(ex.target.test({ x }, r), x === 3);
  }
});

test('ortak paranteze aktarımları', () => {
  const xs = []; for (let x = 0; x <= 10; x++) if (pow(2, x + 3) - pow(2, x) === 56) xs.push(x); assert.deepEqual(xs, [3]);
  assert.equal(5n * 5n ** 20n, 5n ** 21n);
  let s = 0; for (let i = 0; i <= 5; i++) s += pow(3, i); assert.equal(s, 364);
});

test('sıralama: ortak üs 10 ile 5¹⁰ < 2³⁰ < 3²⁰ (BigInt)', () => {
  const ex = goal('siralama').experiment;
  assert.ok(5n ** 10n < 2n ** 30n && 2n ** 30n < 3n ** 20n);
  for (const k of [1, 2, 3, 5, 10]) {
    const r = ex.compute({ k });
    assert.equal(r.all, [30, 20, 10].every((e) => e % k === 0));
    if (r.all) r.rows.forEach((row) => assert.equal(BigInt(row.nb) ** BigInt(k), BigInt(row.b) ** BigInt(row.e)));
    assert.equal(ex.target.test({ k }, r), k === 10);
  }
});

test('sıralama aktarımları', () => {
  const a = 2n ** 40n, b = 3n ** 30n, c = 5n ** 20n; assert.ok(a < c && c < b);
  const x = 0.5; assert.ok(x ** 3 < x ** 2 && x ** 2 < x);
  assert.equal(4n ** 15n, 8n ** 10n);
});

test('gerçek sorular', () => {
  // TYT-0640: 810000·(11/10)^4·(12/11)^4 = 6^8
  assert.equal(810000 * (12 ** 4) / (10 ** 4), 6 ** 8);
  // TYT-0636: 12,5·10⁻³ · 4 · 40 = 2
  assert.ok(Math.abs(12.5e-3 * 4 * 40 - 2) < 1e-12);
  // TYT-0638: taban ya da üssü 3 olarak yazılamayan sayı
  const yazilir = (n) => { for (let b = 2; b <= n; b++) for (let e = 2; pow(b, e) <= n; e++) if (pow(b, e) === n && (b === 3 || e === 3)) return true; return false; };
  assert.deepEqual([8, 9, 36, 64, 81].filter((n) => !yazilir(n)), [36]);
  // TYT-0642: her adımda eklenen 2^(k−1); toplam 2^n − 1
  const toplam = (n) => { let s = 0; for (let k = 1; k <= n; k++) s += pow(2, k - 1); return s; };
  assert.equal(toplam(3), 7); assert.equal(toplam(12) - toplam(10), 3 * pow(2, 10));
  // TYT-0646: 10^8 · r² = 4·10^12 → 1. nesil 10^8 / r
  const r = Math.sqrt(4e12 / 1e8); assert.equal(1e8 / r, 5e5);
});
