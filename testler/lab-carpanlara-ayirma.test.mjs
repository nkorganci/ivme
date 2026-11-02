// Çarpanlara Ayırma laboratuvarı: açılımlar ve özdeşlikler çok noktada sayısal değerlendirmeyle, sayılar taramayla sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import lab, { original, simplified } from '../frontend/src/learn/lab/konular/carpanlara-ayirma.js';

const goal = (id) => lab.goals.find((g) => g.id === id);
const pts = [-3.5, -1, 0, 0.5, 2, 7];

test('gruplama: (x+p)(y+q) = xy+3x+2y+6 yalnız p=2, q=3 (noktasal değerlendirme)', () => {
  const ex = goal('gruplama').experiment;
  for (let p = 0; p <= 6; p++) for (let q = 0; q <= 6; q++) {
    const same = pts.every((x) => pts.every((y) => Math.abs((x + p) * (y + q) - (x * y + 3 * x + 2 * y + 6)) < 1e-9));
    assert.equal(ex.target.test({ p, q }, ex.compute({ p, q })), same);
    assert.equal(same, p === 2 && q === 3);
  }
});

test('gruplama aktarımları', () => {
  for (const a of pts) for (const b of pts) assert.ok(Math.abs(a * b - 2 * a + 3 * b - 6 - (a + 3) * (b - 2)) < 1e-9);
  assert.equal(37 * 43 + 37 * 57, 3700);
  const as = []; for (let a = -10; a <= 10; a++) for (let b = -10; b <= 10; b++) if (a * a + a * b === 30 && a + b === 5) as.push(a); assert.deepEqual(as, [6]);
});

test('iki kare farkı: a² − b² = 39 (b < a ≤ 12) yalnız (8,5)', () => {
  const ex = goal('iki-kare').experiment;
  const hits = [];
  for (let a = 2; a <= 12; a++) for (let b = 1; b <= 11; b++) {
    const r = ex.compute({ a, b });
    if (b < a) assert.equal(r.diff, (a - b) * (a + b));
    if (ex.target.test({ a, b }, r)) hits.push([a, b]);
  }
  assert.deepEqual(hits, [[8, 5]]);
  assert.equal(51 * 51 - 49 * 49, 200);
});

test('iki kare aktarımları', () => {
  const s = []; for (let x = -20; x <= 20; x++) for (let y = -20; y <= 20; y++) if (x * x - y * y === 24 && x + y === 6) s.push(x - y); assert.deepEqual([...new Set(s)], [4]);
  let n = 2 ** 16 - 1; const primes = new Set(); for (let d = 2; n > 1; d++) while (n % d === 0) { primes.add(d); n /= d; }
  assert.deepEqual([...primes], [3, 5, 17, 257]);
  for (const x of pts) assert.ok(Math.abs((x + 3) ** 2 - (x - 3) ** 2 - 12 * x) < 1e-9);
});

test('üç terimli: p+q=7, pq=12 yalnız {3,4}', () => {
  const ex = goal('uc-terimli').experiment;
  for (let p = -6; p <= 6; p++) for (let q = -6; q <= 6; q++) {
    const same = pts.every((x) => Math.abs((x + p) * (x + q) - (x * x + 7 * x + 12)) < 1e-9);
    assert.equal(ex.target.test({ p, q }, ex.compute({ p, q })), same);
    if (same) assert.deepEqual([p, q].sort(), [3, 4]);
  }
});

test('üç terimli aktarımları', () => {
  for (const x of pts) {
    assert.ok(Math.abs(x * x - 5 * x + 6 - (x - 2) * (x - 3)) < 1e-9);
    assert.ok(Math.abs(2 * x * x + 7 * x + 3 - (2 * x + 1) * (x + 3)) < 1e-9);
    assert.ok(Math.abs(x * x - x - 12 - (x - 4) * (x + 3)) < 1e-9);
  }
  const r = []; for (let x = -20; x <= 20; x++) if (x * x + 2 * x - 15 === 0) r.push(x); assert.deepEqual(r, [-5, 3]);
});

test('sadeleştirme: asıl ifade −3 ve 2’de tanımsız, sade ifade yalnız 2’de; hedef −3', () => {
  const ex = goal('sadelestirme').experiment;
  for (let x = -5; x <= 5; x++) {
    const den = x * x + x - 6;
    assert.equal(original(x) === null, den === 0);
    if (den !== 0) assert.ok(Math.abs(original(x) - simplified(x)) < 1e-12);
    assert.equal(ex.target.test({ x }, ex.compute({ x })), x === -3);
  }
  assert.ok(Math.abs(simplified(-3) - 6 / 5) < 1e-12);
});

test('sadeleştirme aktarımları', () => {
  for (const x of pts) if (x !== 2) assert.ok(Math.abs((x * x - 4) / (x - 2) - (x + 2)) < 1e-9);
  for (const a of [3, 5, -4]) for (const b of [1, 2]) assert.ok(Math.abs((a * a - b * b) / (a + b) / (a - b) - 1) < 1e-12);
  assert.equal((98 * 98 + 5 * 98 + 6) / (98 + 2), 101);
});

test('gerçek sorular', () => {
  // TYT-0793: R(x) = P(P(x)), P(x) = x² − 1; −1, 0, 1’den kökler
  const P = (x) => x * x - 1;
  assert.deepEqual([-1, 0, 1].filter((x) => P(P(x)) === 0), [0]);
  // AYT-0086: P çift, baş katsayı 1, 4. derece, P(2) = P(3) = 0 → P(1)
  const Q = (x) => (x * x - 4) * (x * x - 9); assert.equal(Q(2) + 0, 0); assert.equal(Q(-3) + 0, 0); assert.equal(Q(1), 24);
  // AYT-0094: x³ + ax² + bx − 2, P(1) = 0 (b = 1 − a), yalnız bir gerçek kök → a’nın en küçük değeri.
  // Kökler ızgarada tam sıfır ya da işaret değişimiyle sayılır (x = i/1000, kayan nokta birikimi yok).
  const rootCount = (a, b) => { const f = (x) => x ** 3 + a * x * x + b * x - 2; const r = new Set(); let prev = f(-50);
    for (let i = -50000; i <= 50000; i++) { const x = i / 1000, v = f(x); if (v === 0 || Math.sign(v) * Math.sign(prev) < 0) r.add(Math.round(x * 10) / 10); prev = v; }
    return r.size; };
  const as = []; for (let a = -10; a <= 10; a++) if (rootCount(a, 1 - a) === 1) as.push(a);
  assert.equal(Math.min(...as), -3);
});
