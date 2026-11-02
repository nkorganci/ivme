// Temel Kavramlar laboratuvarı: model ve alıştırma cevapları bağımsız hesapla (kayan nokta, tam tarama) sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import lab, { OPS, ROOT2_NUMBERS, orderOf, root2 } from '../frontend/src/learn/lab/konular/temel-kavramlar.js';

const goal = (id) => lab.goals.find((g) => g.id === id);
const value = ([p, q]) => p.n / p.d + (q.n / q.d) * Math.SQRT2;
// Küçük paydalı bir kesre 1e-9 yakınlık: bu sayı kümesinde rasyonel sonuçların bağımsız tanığı.
const nearRational = (v) => Array.from({ length: 12 }, (_, i) => i + 1).some((k) => Math.abs(v * k - Math.round(v * k)) < 1e-9);
const float = { '+': (a, b) => a + b, '-': (a, b) => a - b, '*': (a, b) => a * b, '/': (a, b) => a / b };

test('p + q√2 aritmetiği kayan nokta hesabıyla aynı; sıfıra bölme tanımsız', () => {
  for (const [, , x] of ROOT2_NUMBERS) for (const [, , y] of ROOT2_NUMBERS) for (const [op] of OPS) {
    const r = root2(op, x, y);
    if (op === '/' && value(y) === 0) { assert.equal(r, null); continue; }
    assert.ok(Math.abs(value(r) - float[op](value(x), value(y))) < 1e-9, `${op}`);
  }
});

test('bilinen sonuçlar: iki irrasyonelden rasyonel ve irrasyonel sonuç, 0 çarpanı', () => {
  const N = Object.fromEntries(ROOT2_NUMBERS.map(([k, , v]) => [k, v]));
  const q0 = (r) => r[1].n === 0;
  assert.ok(q0(root2('+', N['1pr2'], N['1mr2'])) && value(root2('+', N['1pr2'], N['1mr2'])) === 2);
  assert.ok(q0(root2('*', N.r2, N.r2)) && Math.abs(value(root2('*', N.r2, N.r2)) - 2) < 1e-12);
  assert.ok(q0(root2('*', N['1pr2'], N['1mr2'])), '(1+√2)(1−√2) = −1');
  assert.ok(q0(root2('/', N.r2, N['2r2'])), '√2 / 2√2 = 1/2');
  assert.ok(!q0(root2('+', N.r2, N.r2)), '√2 + √2 = 2√2');
  assert.ok(q0(root2('*', N['0'], N.r2)), '0 · √2 = 0');
  assert.ok(!q0(root2('*', N['3'], N.mr2)), '3 · (−√2) irrasyonel');
  // Rasyonel ± irrasyonel hiçbir seçimde rasyonel olmaz.
  for (const [, , x] of ROOT2_NUMBERS) for (const [, , y] of ROOT2_NUMBERS) {
    if (q0(x) === q0(y)) continue;
    assert.ok(!q0(root2('+', x, y)) && !q0(root2('-', x, y)));
  }
});

test('sayı kümeleri deneyi: hedef ancak iki irrasyonel ve rasyonel sonuçla sağlanır', () => {
  const ex = goal('sayi-kumeleri').experiment;
  let hits = 0;
  for (const [a, , x] of ROOT2_NUMBERS) for (const [b, , y] of ROOT2_NUMBERS) for (const [op] of OPS) {
    const r = ex.compute({ a, op, b });
    const expected = x[1].n !== 0 && y[1].n !== 0 && !(op === '/' && value(y) === 0) && nearRational(float[op](value(x), value(y)));
    assert.equal(ex.target.test({ a, op, b }, r), expected, `${a} ${op} ${b}`);
    if (expected) hits++;
  }
  assert.ok(hits >= 4, 'öğrencinin bulabileceği birden çok hedef durum var');
});

test('sıralama: x, x², x³, 1/x sırası bağımsız karşılaştırmayla; hedef tam olarak −1 < x < 0', () => {
  const ex = goal('isaret').experiment;
  for (let i = -25; i <= 25; i++) {
    const x = i / 10;
    const r = ex.compute({ x });
    if ([-1, 0, 1].includes(x)) { assert.ok(r.invalid); assert.equal(ex.target.test({ x }, r), false); continue; }
    const vals = { x, 'x^2': x * x, 'x^3': x * x * x, '1/x': 1 / x };
    const order = orderOf(x);
    for (let k = 1; k < order.length; k++) assert.ok(vals[order[k - 1]] < vals[order[k]]);
    assert.equal(ex.target.test({ x }, r), x > -1 && x < 0, `x=${x}`);
  }
});

test('işaret aktarımları: aralık taraması ve rastgele işaret örnekleri', () => {
  for (let x = -0.99; x < 0; x += 0.01) assert.ok(1 / x < x && x < x * x);
  for (let x = -3; x <= 3; x += 0.01) if (Math.abs(x) > 1e-9 && Math.abs(x - 1) > 1e-9) assert.equal(x * x < x, x > 0 && x < 1);
  let plusSum = false, minusSum = false;
  for (let a = -9; a < 0; a++) for (let b = a + 1; b < 0; b++) for (let c = 1; c < 10; c++) {
    assert.ok(a * b * c > 0); assert.ok(b * c < 0);
    if (a + c > 0) plusSum = true; if (a + c < 0) minusSum = true;
  }
  assert.ok(plusSum && minusSum, 'a + c kesin değil');
});

test('ardışık: toplamı 36 olan ardışık çift diziler yalnız 3, 4 ve 9 terimli (kontrol aralığında tam tarama)', () => {
  const ex = goal('ardisik').experiment;
  const found = [];
  for (let start = -10; start <= 20; start++) for (const step of [1, 2]) for (let n = 3; n <= 9; n++) {
    const terms = Array.from({ length: n }, (_, i) => start + i * step);
    const ok = step === 2 && Math.abs(start % 2) === 0 && terms.reduce((s, t) => s + t, 0) === 36;
    const r = ex.compute({ start, step, n });
    assert.equal(r.sum, terms.reduce((s, t) => s + t, 0));
    assert.equal(ex.target.test({ start, step, n }, r), ok);
    if (ok) found.push([start, n]);
  }
  assert.deepEqual(found.sort((a, b) => a[1] - b[1]), [[10, 3], [6, 4], [-4, 9]]);
});

test('ardışık aktarımları: kaba tarama', () => {
  const sols7 = []; for (let a = -20; a <= 20; a++) if ([...Array(7)].reduce((s, _, i) => s + a + i, 0) === 0) sols7.push(a + 6);
  assert.deepEqual(sols7, [3]);
  const odd4 = []; for (let a = -41; a <= 41; a += 2) if (a + (a + 2) + (a + 4) + (a + 6) === 56) odd4.push(a);
  assert.deepEqual(odd4, [11]);
  const bs = []; for (let a = -20; a <= 20; a++) if (a * (a + 2) < 0) bs.push(a + 1);
  assert.deepEqual(bs, [0]);
});

test('uç değer: x + y = 12, x ≠ y tam sayılarda en büyük çarpım 35; aşağı yönde sınır yok', () => {
  const ex = goal('uc-deger').experiment;
  let best = -Infinity;
  for (let x = -4; x <= 16; x++) {
    const r = ex.compute({ x });
    assert.equal(r.product, x * (12 - x));
    assert.equal(!!r.invalid, x === 6);
    if (x !== 6) best = Math.max(best, x * (12 - x));
    assert.equal(ex.target.test({ x }, r), x === 5 || x === 7);
  }
  assert.equal(best, 35);
  assert.ok(1000 * (12 - 1000) < -900000);
});

test('uç değer aktarımları: kaba tarama', () => {
  let best = 0; for (let a = 1; a < 20; a++) if (a !== 10) best = Math.max(best, a * (20 - a));
  assert.equal(best, 99);
  let diff = Infinity; for (let a = 0; a <= 9; a++) for (let b = 0; b < a; b++) if (a * b === 12) diff = Math.min(diff, a - b);
  assert.equal(diff, 1);
  let min = Infinity; for (let x = -1000; x <= 1000; x++) min = Math.min(min, x * (10 - x));
  assert.ok(min < -25 * 100, 'x·(10−x) −25’in çok altına iner');
});

test('gerçek sorular: cevaplar bağımsız tarama ile', () => {
  // AYT-0024: farklı rakamlar, ab < 8, ac > 10, bc = 12 → a + b + c
  const s24 = []; for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) for (let c = 0; c <= 9; c++)
    if (new Set([a, b, c]).size === 3 && a * b < 8 && a * c > 10 && b * c === 12) s24.push(a + b + c);
  assert.deepEqual([...new Set(s24)], [11]);
  // AYT-0033: ab < 45 < bc < 50 < ac
  const s33 = []; for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) for (let c = 0; c <= 9; c++)
    if (new Set([a, b, c]).size === 3 && a * b < 45 && 45 < b * c && b * c < 50 && 50 < a * c) s33.push(a + b + c);
  assert.deepEqual([...new Set(s33)], [21]);
  // AYT-0020: a<b<c<d ardışık, ac > 0, abd = 0
  const s20 = []; for (let a = -10; a <= 10; a++) if (a * (a + 2) > 0 && a * (a + 1) * (a + 3) === 0) s20.push(4 * a + 6);
  assert.deepEqual(s20, [-6]);
  // AYT-0037: x ∉ {−1,0,1}; hangi eleman hiçbir zaman ortada (3. sırada) değil
  const middle = new Set();
  for (let x = -3; x <= 3; x += 0.01) {
    if ([-1, 0, 1].some((b) => Math.abs(x - b) < 1e-6)) continue;
    const els = [['x3', x ** 3], ['x2', x * x], ['x', x], ['-x', -x], ['-1/x', -1 / x]].sort((p, q) => p[1] - q[1]);
    middle.add(els[2][0]);
  }
  assert.ok(!middle.has('-x') && ['x3', 'x2', 'x', '-1/x'].every((k) => middle.has(k)));
  // TYT-0542: I: −2 ? 2, II: 2 ? −2, III: −2 ? −2 — seçenek C (−, ×, +) üçünü de −4 yapar
  assert.deepEqual([-2 - 2, 2 * -2, -2 + -2], [-4, -4, -4]);
  // TYT-0545: a(b+c) tek → yalnız III (c^a + b) her zaman tek
  const always = [true, true, true];
  for (let a = 1; a <= 7; a++) for (let b = 1; b <= 7; b++) for (let c = 1; c <= 7; c++) {
    if (a * (b + c) % 2 !== 1) continue;
    [a ** b + c, b ** c + a, c ** a + b].forEach((v, i) => { if (v % 2 !== 1) always[i] = false; });
  }
  assert.deepEqual(always, [false, false, true]);
});
