// Eşitsizlikler laboratuvarı: aralık sayımı, yön ve ifade aralıkları sık örnekleme/tam taramayla bağımsız sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import lab, { integersIn } from '../frontend/src/learn/lab/konular/esitsizlikler.js';

const goal = (id) => lab.goals.find((g) => g.id === id);
const inside = (n, a, b, oa, ob) => (oa ? n > a : n >= a) && (ob ? n < b : n <= b);

test('aralık: tam sayı sayımı doğrudan kontrol; hedef uzunluk 4 ve 3 tam sayı', () => {
  const ex = goal('aralik').experiment;
  for (let i = -10; i <= 10; i++) for (let j = i; j <= 10; j++) for (const oa of [false, true]) for (const ob of [false, true]) {
    const a = i / 2, b = j / 2;
    const expected = []; for (let n = -6; n <= 6; n++) if (inside(n, a, b, oa, ob)) expected.push(n);
    assert.deepEqual(integersIn(a, b, oa, ob), expected);
    assert.equal(ex.target.test({ a, b, oa, ob }, ex.compute({ a, b, oa, ob })), b - a === 4 && expected.length === 3);
  }
  assert.equal(ex.compute({ a: 0, b: 4, oa: false, ob: false }).ints.length, 5);
});

test('aralık aktarımları', () => {
  assert.equal(integersIn(-3, 2, true, false).length, 5);
  assert.deepEqual(integersIn(2, 7, true, true).filter((n) => n % 2 === 0), [4, 6]);
  assert.equal(integersIn(-3.5, 3.5, true, true).length, 7);
});

test('yön: k·x + c aralığı örnekleme ile; hedef yalnız k=−2, c=3', () => {
  const ex = goal('yon').experiment;
  for (const k of [2, 1, -1, -2]) for (let c = -5; c <= 5; c++) {
    const vals = []; for (let x = 2; x <= 5.0001; x += 0.01) vals.push(k * x + c);
    const r = ex.compute({ k, c });
    assert.ok(Math.abs(r.lo - Math.min(...vals)) < 1e-6 && Math.abs(r.hi - Math.max(...vals)) < 1e-6);
    assert.equal(ex.target.test({ k, c }, r), k === -2 && c === 3);
  }
});

test('yön aktarımları', () => {
  for (let x = -10; x <= 10; x += 0.25) {
    assert.equal(-3 * x + 1 > 7, x < -2);
    assert.equal(1 <= 3 - 2 * x && 3 - 2 * x < 7, x > -2 && x <= 1);
    for (const a of [-3, -0.5]) assert.equal(a * x > 5 * a, x < 5);
  }
});

test('ifade aralığı: x − y en küçük −6 (yalnız x=−2, y=4); x² aralığı [0,9]', () => {
  const ex = goal('aralik-ifade').experiment;
  let min = Infinity, sqMin = Infinity, sqMax = -Infinity;
  for (let i = -4; i <= 6; i++) for (let j = 2; j <= 8; j++) {
    const x = i / 2, y = j / 2; const r = ex.compute({ x, y });
    min = Math.min(min, x - y); sqMin = Math.min(sqMin, x * x); sqMax = Math.max(sqMax, x * x);
    assert.equal(ex.target.test({ x, y }, r), x === -2 && y === 4);
  }
  assert.equal(min, -6); assert.equal(sqMin, 0); assert.equal(sqMax, 9);
});

test('ifade aktarımları', () => {
  let lo = Infinity, hi = -Infinity, q = [Infinity, -Infinity], s = -Infinity;
  for (let a = 1.01; a < 3; a += 0.01) for (let b = -1.99; b < 5; b += 0.01) { lo = Math.min(lo, a + b); hi = Math.max(hi, a + b); }
  assert.ok(lo > -1 && lo < -0.95 && hi < 8 && hi > 7.95);
  for (let x = -3; x <= 2; x += 0.5) s = Math.max(s, x * x + 1); assert.equal(s, 10);
  for (let a = 2.01; a < 6; a += 0.02) for (let b = 1.01; b < 3; b += 0.02) { q[0] = Math.min(q[0], a / b); q[1] = Math.max(q[1], a / b); }
  assert.ok(q[0] > 2 / 3 && q[0] < 0.69 && q[1] < 6 && q[1] > 5.8);
});

test('bölge: izinli tam sayı noktalarında en büyük çarpım 8, yalnız (4,2)', () => {
  const ex = goal('bolge').experiment;
  let best = 0; const at = [];
  for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) {
    if (x > y && x + y < 7) { if (x * y > best) { best = x * y; at.length = 0; } if (x * y === best) at.push([x, y]); }
    assert.equal(ex.target.test({ x, y }, ex.compute({ x, y })), x === 4 && y === 2);
  }
  assert.equal(best, 8); assert.deepEqual(at, [[4, 2]]);
  assert.ok(3.5 * 3.4 > 8 && 3.5 > 3.4 && 3.5 + 3.4 < 7, 'gerçek sayılarda daha büyük çarpım');
});

test('bölge aktarımları', () => {
  let m = Infinity; for (let b = 0; b <= 5; b++) { const a = 10 - 2 * b; if (a >= 0 && a > b) m = Math.min(m, a + b); } assert.equal(m, 7);
  const xs = []; for (let x = 1; x <= 10; x++) { const y = 11 - 2 * x; if (y > 0 && y < x) xs.push(x); } assert.deepEqual(xs, [4, 5]);
  const t = []; for (let x = -10; x <= 10; x++) if (-3 < 2 * x + 1 && 2 * x + 1 < 6) t.push(x); assert.deepEqual(t, [-1, 0, 1, 2]);
});

test('gerçek sorular', () => {
  // TYT-0625: |x−4|<3; ilk devre A 2, B 1; A’nın toplamı B’ninkine eşit → A toplamı 3 olamaz
  const A = new Set();
  for (let p = 0; p <= 10; p++) { const q = p + 1; const x = Math.abs(3 - (p + q)); if (Math.abs(x - 4) < 3) A.add(2 + p); }
  assert.deepEqual([2, 3, 4, 5, 6].filter((v) => !A.has(v)), [3]);
  // AYT-0007: x+1 ≤ a; x=0 sağlar, x=4 sağlamaz → 1 ≤ a < 5
  for (let a = -2; a <= 7; a += 0.5) assert.equal(0 + 1 <= a && !(4 + 1 <= a), a >= 1 && a < 5);
  // TYT-0622: maliyet 40 bin + b; 2b+30 > 40+b ve 3b−20 < 40+b → 10 < b < 30 (bin) → |b−20| < 10
  for (let b = 0; b <= 40; b += 0.5) assert.equal(2 * b + 30 > 40 + b && 3 * b - 20 < 40 + b, Math.abs(b - 20) < 10);
  // AYT-0042: farklı asallar, 20 < p(p+2q) < 25, 45 < r(p+q) < 50 → pqr = 70
  const pr = [2, 3, 5, 7, 11, 13, 17, 19, 23]; const out = new Set();
  for (const p of pr) for (const q of pr) for (const r of pr) if (new Set([p, q, r]).size === 3 && p * (p + 2 * q) > 20 && p * (p + 2 * q) < 25 && r * (p + q) > 45 && r * (p + q) < 50) out.add(p * q * r);
  assert.deepEqual([...out], [70]);
});
