// Yüzde ve Karışım laboratuvarı: tam sayı (kuruş/gram) hesabı ve taramayla bağımsız sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import lab from '../frontend/src/learn/lab/konular/yuzde-karisim.js';

const goal = (id) => lab.goals.find((g) => g.id === id);

test('ardışık yüzde: 10 000 kuruşla tam hesap; 96 TL yalnız (+20,−20) ve (−20,+20)', () => {
  const ex = goal('taban').experiment;
  const hits = [];
  for (let p = -50; p <= 50; p += 10) for (let q = -50; q <= 50; q += 10) {
    const kurus = (10000 * (100 + p) * (100 + q)) / 10000; // 100 TL = 10000 kuruş
    const ok = kurus === 9600;
    assert.equal(ex.target.test({ p, q }, ex.compute({ p, q })), ok);
    if (ok) hits.push([p, q]);
  }
  assert.deepEqual(hits, [[-20, 20], [20, -20]]);
});

test('yüzde aktarımları', () => {
  assert.equal(110 * 110, 12100);
  assert.equal(8000 * 25 / 100, 2000);
  assert.equal(78 * 10 / 13, 60);
});

test('bütün değişince: %50 yalnız 6 oy', () => {
  const ex = goal('parca-butun').experiment;
  for (let x = 0; x <= 12; x++) assert.equal(ex.target.test({ x }, ex.compute({ x })), 2 * (7 + x) === 20 + x);
});

test('bütün aktarımları', () => {
  assert.equal((10 + 10) * 100 / 50, 40);
  const w = []; for (let e = 0; e <= 30; e++) if (2 * (30 - e) === 20 + (30 - e)) w.push(e); assert.deepEqual(w, [10]);
  const n = []; for (let k = 10; k <= 100; k += 10) if (4 * k + 60 === 5 * (k + 6)) n.push(k); assert.deepEqual(n, [30]);
});

test('karışım: gram hesabıyla %20 yalnız 10 kg', () => {
  const ex = goal('karisim').experiment;
  for (let x = 0; x <= 40; x += 5) { const salt = 2000 + 400 * x, total = 1000 * (20 + x); assert.equal(ex.target.test({ x }, ex.compute({ x })), 5 * salt === total); }
});

test('karışım aktarımları', () => {
  assert.equal(12 * 100 / 60, 20);
  const b = []; for (let e = 0; e <= 30; e++) if (15 * 100 === 30 * (60 - e)) b.push(e); assert.deepEqual(b, [10]);
  assert.equal((20 / 2) * 100 / 100, 10);
});

test('ağırlıklı ortalama: 72 yalnız n = 30', () => {
  const ex = goal('ortalama').experiment;
  for (let n = 5; n <= 50; n += 5) assert.equal(ex.target.test({ n }, ex.compute({ n })), 1200 + 80 * n === 72 * (20 + n));
});

test('ortalama aktarımları', () => {
  assert.equal(3 * 70 + 7 * 80, 770);
  assert.equal(74 * 5 - 70 * 4, 90);
  assert.equal(600 * 100 / (100 - 40 - 25 - 15), 3000);
});

test('gerçek sorular', () => {
  // TYT-0654
  const fresh = 720 * 100 * 100 / (80 * 90); assert.equal(fresh, 1000); assert.equal(fresh * 70 * 90 / 10000, 630);
  // TYT-0686: 9 TL = %15
  assert.equal(9 * 100 / 15 - 9, 51);
  // TYT-0697: sayfa q soru; q + 3 = 6q·0,2
  const q = []; for (let k = 1; k <= 50; k++) if (5 * (k + 3) === 6 * k) q.push(k); assert.deepEqual(q, [15]); assert.equal((4 * 15 + 3) * 100 / 90, 70);
  // TYT-0709: Adana 3, Diyarbakır 2 = %25 → 20 oy; Edirne %35 = 7; +4 Edirne +1 İstanbul
  assert.equal((7 + 4) * 100 / 25, 44);
  // TYT-0719: dün T1 = 2 + a + b, a = 0,4T1, b = 0,2T1 (Annem 1, Babam 1, Kerem 2 → 4 + a + b)
  const t1 = []; for (let T = 1; T <= 60; T++) if (T === 4 + 0.4 * T + 0.2 * T) t1.push(T); assert.deepEqual(t1, [10]);
  const c = []; for (let x = 0; x <= 20; x++) if (Math.abs(4 + x - 0.24 * (10 + 13 + x)) < 1e-9) c.push(x); assert.deepEqual(c, [2]);
  // TYT-0675: a + b = 95, 2a + 3b = 240; 15 yıkılan (p iki katlı, q üç katlı), 274 = 240 − 2p − 3q + 75
  const b3 = 240 - 2 * 95; const q3 = []; for (let qq = 0; qq <= 15; qq++) if (240 - 2 * (15 - qq) - 3 * qq + 75 === 274) q3.push(qq); assert.deepEqual(q3, [11]); assert.equal(11 * 100 / b3, 22);
  // TYT-0728
  const n = []; for (let k = 1; k <= 200; k++) if (Math.abs(0.64 * k - 0.12 * k - 39) < 1e-9) n.push(k); assert.deepEqual(n, [75]);
  // TYT-0688: kesişim = soğuk + sıcak − (100 − hiç)
  let lo = Infinity, hi = -Infinity; for (let s = 52; s <= 60; s++) for (let h = 67; h <= 72; h++) for (let z = 0; z <= 4; z++) { const both = s + h - (100 - z); lo = Math.min(lo, both); hi = Math.max(hi, both); }
  assert.deepEqual([lo, hi], [19, 36]);
  // TYT-0739: 0,8 · 0,84 = 0,96 p
  assert.ok(Math.abs(0.8 * 0.84 / 0.96 - 0.7) < 1e-12);
  // TYT-0716
  assert.ok(Math.abs(100 - (15.6 + 8.2 + 12.8 + 43.4) - 20) < 1e-9);
});
