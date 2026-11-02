// Mutlak Değer laboratuvarı: tanım, parçalı açılım, bant ve uzaklık toplamı sık örnekleme/tarama ile bağımsız sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import lab, { opened } from '../frontend/src/learn/lab/konular/mutlak-deger.js';

const goal = (id) => lab.goals.find((g) => g.id === id);

test('uzaklık: |x−2| = 5 çözümleri −3 ve 7; hedef yalnız −3', () => {
  const ex = goal('uzaklik').experiment;
  const sols = [];
  for (let i = -16; i <= 16; i++) { const x = i / 2; if (Math.abs(x - 2) === 5) sols.push(x); assert.equal(ex.target.test({ x }, ex.compute({ x })), x === -3); }
  assert.deepEqual(sols, [-3, 7]);
});

test('uzaklık aktarımları', () => {
  const s = []; for (let i = -100; i <= 100; i++) { const x = i / 2; if (Math.abs(2 * x - 1) === 7) s.push(x); } assert.equal(s.reduce((a, b) => a + b, 0), 1);
  const c = new Set(); for (const p of [2, -2]) for (const q of [5, -5]) c.add(10 + p + q); assert.ok(!c.has(15) && c.has(13) && c.has(7));
  for (let x = -20; x <= 20; x += 0.5) assert.notEqual(Math.abs(x + 4), -2);
});

test('işarete göre açma: üç bölgenin biçimi her x’te doğrudan hesaba eşit; hedef x ≥ 3', () => {
  const ex = goal('tanim-acma').experiment;
  for (let i = -10; i <= 12; i++) {
    const x = i / 2; const o = opened(x);
    assert.ok(Math.abs(o.a * x + o.b - (Math.abs(x - 3) + Math.abs(x + 1))) < 1e-12);
    assert.equal(ex.target.test({ x }, ex.compute({ x })), x >= 3);
  }
});

test('açma aktarımları', () => {
  for (let a = -5; a < 0; a++) for (let b = 1; b <= 5; b++) assert.equal(Math.abs(a) + Math.abs(b - a) - Math.abs(b), -2 * a);
  for (let x = -5; x < 2; x += 0.5) assert.equal(Math.abs(x - 2) + Math.abs(2 - x) + x, 4 - x);
  for (let a = -5; a <= 5; a++) for (let b = -5; b <= 5; b++) assert.equal(Math.abs(a - b) === b - a, b >= a);
});

test('bant: |x−a| ≤ r örnekleme ile [a−r, a+r]; hedef yalnız a=5, r=3', () => {
  const ex = goal('bant').experiment;
  for (let a = -5; a <= 10; a++) for (let r = 0; r <= 8; r++) {
    const ins = []; for (let x = -15; x <= 20; x++) if (Math.abs(x - a) <= r) ins.push(x);
    const res = ex.compute({ a, r });
    assert.equal(ins[0], res.lo); assert.equal(ins[ins.length - 1], res.hi);
    assert.equal(ex.target.test({ a, r }, res), a === 5 && r === 3);
  }
});

test('bant aktarımları', () => {
  let n = 0; for (let x = -10; x <= 10; x++) if (Math.abs(x + 1) < 4) n++; assert.equal(n, 7);
  for (let t = 10; t <= 30; t += 0.5) assert.equal(Math.abs(t - 22) <= 4, t >= 18 && t <= 26);
  for (let x = -5; x <= 10; x += 0.25) assert.equal(Math.abs(2 * x - 6) <= 4, x >= 1 && x <= 5);
});

test('uzaklıklar toplamı: en küçük 9, yalnız ortanca x=0; ortalama (1) daha büyük', () => {
  const ex = goal('minimum').experiment;
  let best = Infinity; const at = [];
  for (let i = -12; i <= 18; i++) {
    const x = i / 2; const t = Math.abs(x + 3) + Math.abs(x) + Math.abs(x - 6);
    if (t < best) { best = t; at.length = 0; } if (t === best) at.push(x);
    assert.equal(ex.target.test({ x }, ex.compute({ x })), t === 9);
  }
  assert.equal(best, 9); assert.deepEqual(at, [0]);
  assert.equal(Math.abs(1 + 3) + 1 + Math.abs(1 - 6), 10);
});

test('toplam aktarımları', () => {
  let m = Infinity; for (let x = -10; x <= 10; x += 0.5) m = Math.min(m, Math.abs(x - 1) + Math.abs(x - 5)); assert.equal(m, 4);
  let c = 0; for (let x = -20; x <= 20; x++) if (Math.abs(x + 2) + Math.abs(x - 4) === 6) c++; assert.equal(c, 7);
  const t = (x) => Math.abs(x - 2) + Math.abs(x - 5) + Math.abs(x - 9);
  assert.ok(t(5) < t(16 / 3) && t(5) < t(2) && t(5) < t(9));
});

test('gerçek sorular', () => {
  // TYT-0628: kapanan çizgi hangi sayının sağında
  const nums = [-3, 4, -5, 6, -7];
  const ok = []; for (let k = 1; k <= 5; k++) { const inside = nums.slice(0, k).reduce((a, b) => a + b, 0); const rest = nums.slice(k).reduce((a, b) => a + b, 0); if (Math.abs(inside) + rest === 3) ok.push(Math.abs(nums[k - 1])); }
  assert.deepEqual(ok, [5]);
  // AYT-0040: a,b,c ≠ 0; |abc| = ab, |a−c| = |c|, |c−b| = −b → a+b+c
  const s40 = new Set(); for (let i = -40; i <= 40; i++) for (let j = -40; j <= 40; j++) for (let k = -40; k <= 40; k++) {
    const a = i / 4, b = j / 4, c = k / 4; if (!a || !b || !c) continue;
    if (Math.abs(a * b * c) === a * b && Math.abs(a - c) === Math.abs(c) && Math.abs(c - b) === -b) s40.add(a + b + c);
  }
  assert.deepEqual([...s40], [-3.5]);
  // AYT-0034: x, A, y, B eşit aralıklı; |1−y| = 3, |x| = y+2 → A + B
  const s34 = []; for (const y of [4, -2]) for (const x of [y + 2, -(y + 2)]) if (Math.abs(x) === y + 2 && y + 2 >= 0 && x < y) { const A = (x + y) / 2; s34.push(A + (2 * y - A)); }
  assert.deepEqual(s34, [8]);
  // AYT-0013: x, y tam sayı, |x−3| + |2x+y| + |2x+y−1| = 1 → y değerleri toplamı
  const ys = new Set(); for (let x = -20; x <= 20; x++) for (let y = -60; y <= 60; y++) if (Math.abs(x - 3) + Math.abs(2 * x + y) + Math.abs(2 * x + y - 1) === 1) ys.add(y);
  assert.equal([...ys].reduce((a, b) => a + b, 0), -11);
  // TYT-0615: 800 m’den 400–500 m sonra açılış → 300–400 m
  for (let h = 250; h <= 450; h += 5) assert.equal(Math.abs(h - 350) <= 50, h >= 300 && h <= 400);
});
