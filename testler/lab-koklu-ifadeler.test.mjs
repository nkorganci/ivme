// Köklü İfadeler laboratuvarı: kare çarpan ayrıştırma, kök yerleştirme, eşlenik ve sahte kök bağımsız (kayan nokta,
// tam tarama) sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import lab, { rationalize, squarePart } from '../frontend/src/learn/lab/konular/koklu-ifadeler.js';

const goal = (id) => lab.goals.find((g) => g.id === id);
const squarefree = (m) => { for (let d = 2; d * d <= m; d++) if (m % (d * d) === 0) return false; return true; };

test('kök dışı: n = k²m, m karesiz, k√m = √n; hedef yalnız 72', () => {
  const ex = goal('kok-disi').experiment;
  for (let n = 2; n <= 200; n++) {
    const { k, m } = squarePart(n);
    assert.equal(k * k * m, n); assert.ok(squarefree(m)); assert.ok(Math.abs(k * Math.sqrt(m) - Math.sqrt(n)) < 1e-9);
    assert.equal(ex.target.test({ n }, ex.compute({ n })), n === 72);
  }
});

test('kök dışı aktarımları', () => {
  assert.ok(Math.abs(Math.sqrt(50) + Math.sqrt(18) - 8 * Math.SQRT2) < 1e-9);
  assert.ok(Math.abs(Math.sqrt(12) * Math.sqrt(27) - 18) < 1e-9);
  for (let x = -5; x < 0; x += 0.5) assert.equal(Math.sqrt(x * x) + Math.abs(x), -2 * x);
});

test('kök yerleştirme: 5 < √n < 6 olan en büyük n = 35', () => {
  const ex = goal('tahmin').experiment;
  const ok = []; for (let n = 1; n <= 50; n++) { if (Math.sqrt(n) > 5 && Math.sqrt(n) < 6) ok.push(n); assert.equal(ex.target.test({ n }, ex.compute({ n })), n === 35); }
  assert.equal(Math.max(...ok), 35); assert.equal(ok.length, 10);
});

test('yerleştirme aktarımları', () => {
  assert.ok(5 < 3 * Math.sqrt(3) && 3 * Math.sqrt(3) < 2 * Math.sqrt(7));
  assert.deepEqual([8, 10, 13].filter((n) => Math.sqrt(n) > 3 && Math.sqrt(n) < 3.5), [10]);
  let c = 0; for (let n = 11; n < 50; n++) if (Number.isInteger(Math.sqrt(n))) c++; assert.equal(c, 4);
});

test('eşlenik: payda çarpımı kayan noktayla; yalnız √3 − 1 rasyonel yapar; sonuç √3 − 1', () => {
  const ex = goal('eslenik').experiment;
  const val = { p: Math.sqrt(3) + 1, m: Math.sqrt(3) - 1, r: Math.sqrt(3) };
  for (const c of ['p', 'm', 'r']) {
    const r = rationalize(c);
    assert.ok(Math.abs((Math.sqrt(3) + 1) * val[c] - (r.den[0] + r.den[1] * Math.sqrt(3))) < 1e-9);
    assert.equal(ex.target.test({ c }, ex.compute({ c })), c === 'm');
  }
  assert.ok(Math.abs(2 / (Math.sqrt(3) + 1) - (Math.sqrt(3) - 1)) < 1e-12);
});

test('eşlenik aktarımları', () => {
  assert.ok(Math.abs(1 / (Math.sqrt(5) - 2) - (Math.sqrt(5) + 2)) < 1e-9);
  assert.ok(Math.abs(1 / (Math.SQRT2 + 1) + 1 / (Math.sqrt(3) + Math.SQRT2) + 1 / (2 + Math.sqrt(3)) - 1) < 1e-12);
  assert.ok(Math.abs((2 * Math.sqrt(3) - 1) * (2 * Math.sqrt(3) + 1) - 11) < 1e-9);
});

test('köklü denklem: x+6 = x² adayları −2 ve 3; yalnız 3 kök', () => {
  const ex = goal('denklem').experiment;
  const cand = [], roots = [];
  for (let x = -6; x <= 6; x++) {
    if (x + 6 === x * x) cand.push(x);
    if (Math.abs(Math.sqrt(x + 6) - x) < 1e-12) roots.push(x);
    assert.equal(ex.target.test({ x }, ex.compute({ x })), x === 3);
  }
  assert.deepEqual(cand, [-2, 3]); assert.deepEqual(roots, [3]);
});

test('köklü denklem aktarımları', () => {
  assert.equal(Math.sqrt(2 * 4 + 1), 3);
  for (let x = -5; x <= 5; x += 0.5) { const l = Math.sqrt(x - 2) + Math.sqrt(2 - x); if (!Number.isNaN(l)) assert.notEqual(l, x + 1); }
  const s = []; for (let x = -1; x <= 10; x++) if (Math.abs(Math.sqrt(x + 1) - (x - 1)) < 1e-12) s.push(x); assert.deepEqual(s, [3]);
});

test('gerçek sorular', () => {
  // TYT-0635: üç çift çarpımı tam sayı
  const nums = [5, 8, 12, 18, 20, 27];
  const pairs = []; for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) if (Number.isInteger(Math.sqrt(nums[i] * nums[j]))) pairs.push(Math.sqrt(nums[i] * nums[j]));
  assert.equal(pairs.reduce((a, b) => a + b, 0), 40);
  // TYT-0639: A√B = C√D, {2,3,4,6,8}’den dört farklı sayı
  const unused = new Set();
  const S = [2, 3, 4, 6, 8];
  for (const A of S) for (const B of S) for (const C of S) for (const D of S) if (new Set([A, B, C, D]).size === 4 && A * A * B === C * C * D) unused.add(S.find((s) => ![A, B, C, D].includes(s)));
  assert.deepEqual([...unused], [4]);
  // TYT-0645: a=2; (a√b+√b) − (a√b−√b) = 12 → b = 36; (a√b·√b)/(a√b/√b) = 36
  const b = 36; assert.equal(3 * Math.sqrt(b) - Math.sqrt(b), 12); assert.equal((2 * b) / 2, 36);
  // TYT-0631: 1,5 ile 2 arasında
  assert.deepEqual([2, 3, 5, 6, 7].filter((n) => Math.sqrt(n) > 1.5 && Math.sqrt(n) < 2), [3]);
  // TYT-0647: 2+3+4+6+7 = 22; hangisi 0 olunca tam kare
  assert.deepEqual([[4, 2], [9, 3], [16, 4], [36, 6], [49, 7]].filter(([, r]) => Number.isInteger(Math.sqrt(22 - r))).map(([n]) => n), [36]);
});
