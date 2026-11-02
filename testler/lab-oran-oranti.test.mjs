// Oran ve Orantı laboratuvarı: karışım, orantı türü, paylaştırma ve bileşik orantı bağımsız tarama/simülasyonla sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import lab from '../frontend/src/learn/lab/konular/oran-oranti.js';

const goal = (id) => lab.goals.find((g) => g.id === id);

test('oranı koruma: 3:2 karışımda 12 limon ve 10 şekerle en çok 8 şeker kullanılır', () => {
  const ex = goal('oran-koru').experiment;
  let best = -1;
  for (let s = 0; s <= 10; s++) { const l = 1.5 * s; if (l <= 12) best = Math.max(best, s); assert.equal(ex.target.test({ s }, ex.compute({ s })), s === 8); }
  assert.equal(best, 8);
  // Bağımsız: tek tek bardak ekleyerek simülasyon
  let L = 0, S = 0; while (L + 3 <= 12 && S + 2 <= 10) { L += 3; S += 2; } assert.deepEqual([L, S, 10 - S], [12, 8, 2]);
});

test('oran aktarımları', () => {
  const bs = []; for (let a = 0; a <= 32; a++) { const b = 32 - a; if (5 * a === 3 * b) bs.push(b); } assert.deepEqual(bs, [20]);
  for (let y = 1; y <= 60; y++) { const x = (2 * y) / 3, z = (5 * y) / 4; if (Number.isInteger(x) && Number.isInteger(z)) assert.ok(Math.abs(x / z - 8 / 15) < 1e-12); }
  const k = 36 / 12; assert.equal(4 * k, 12);
});

test('doğru/ters: üç ölçüme yalnız y = 12/x uyar', () => {
  const ex = goal('dogru-ters').experiment;
  for (const mode of ['dogru', 'ters']) for (let k = 1; k <= 15; k++) assert.equal(ex.target.test({ mode, k }, ex.compute({ mode, k })), mode === 'ters' && k === 12);
  const prods = [[2, 6], [3, 4], [6, 2]].map(([x, y]) => x * y); assert.deepEqual([...new Set(prods)], [12]);
});

test('doğru/ters aktarımları', () => {
  assert.equal((8 * 15) / 12, 10); assert.equal((60 * 5) / 75, 4);
  const fare = (km) => 20 + 10 * km; assert.equal(fare(2), 40); assert.equal(fare(4), 60); assert.notEqual(fare(4), 2 * fare(2));
});

test('paylaştırma: 2:3:5 ve toplam 120 yalnız birim 12', () => {
  const ex = goal('paylastirma').experiment;
  for (let u = 1; u <= 20; u++) assert.equal(ex.target.test({ u }, ex.compute({ u })), u === 12);
  assert.deepEqual(ex.compute({ u: 12 }).shares, [24, 36, 60]);
});

test('paylaştırma aktarımları', () => {
  const s = []; for (let u = 1; u <= 20; u++) if (4 * u - 2 * u === 10) s.push(9 * u); assert.deepEqual(s, [45]);
  // ters orantı: pay × yaş sabit, toplam 60
  const t = []; for (let k = 1; k <= 200; k++) { const p = [k / 2, k / 3, k / 6]; if (p.every(Number.isInteger) && p[0] + p[1] + p[2] === 60) t.push(p); } assert.deepEqual(t, [[30, 20, 10]]);
  const c = []; for (let k = 1; k <= 20; k++) if (3 * k + 6 === 4 * k) c.push(7 * k); assert.deepEqual(c, [42]);
});

test('bileşik: 9 işçi 6 duvarı 8 günde (gün gün simülasyon)', () => {
  const ex = goal('bilesik').experiment;
  const perWorkerDay = 4 / (6 * 8);
  let walls = 0, d = 0; while (walls < 6 - 1e-9) { walls += 9 * perWorkerDay; d++; } assert.equal(d, 8);
  for (let day = 1; day <= 16; day++) assert.equal(ex.target.test({ d: day }, ex.compute({ d: day })), day === 8);
});

test('bileşik aktarımları', () => {
  assert.equal((300 / (5 * 6)) * 8 * 4, 320);
  let filled = 0, h = 0; while (filled < 1 - 1e-9) { filled += (h < 4 ? 3 : 4) / 36; h++; } assert.equal(h, 10);
  assert.equal((20 * 15) / 12, 25);
});

test('gerçek sorular', () => {
  // TYT-0702: ilk imalathanede fındık 42, şeker 21−9 = 12 → 7:2; 16 şeker → 56 fındık; 64 − 56
  assert.equal(64 - (16 * 42) / 12, 8);
  // TYT-0726: sarı sütun 4, mavi 6 fayans (eş fayanslar); alan oranı 3/4; sütunlar sarıyla başlayıp sarıyla biter
  const t = []; for (let ny = 1; ny <= 30; ny++) for (const nb of [ny - 1, ny]) if (nb > 0 && 4 * ny * 4 === 3 * 6 * nb) t.push(4 * ny + 6 * nb); assert.deepEqual(t, [84]);
  // TYT-0652: (B, A) = (7, 34), (13, 46) doğrusal; B = 11,5
  assert.equal(34 + ((46 - 34) / (13 - 7)) * (11.5 - 7), 43);
  // TYT-0715: uçak u, otobüs 108 = 6u; tren t·300 = u·750
  const u = 108 / 6, tr = (u * 750) / 300; assert.equal(u + 108 + tr, 171);
  // TYT-0707: 4k, 5k, 91 − 9k hepsi [20,35]
  const third = []; for (let k = 1; k <= 20; k++) { const v = [4 * k, 5 * k, 91 - 9 * k]; if (v.every((x) => x >= 20 && x <= 35)) third.push(v[2]); } assert.deepEqual(third, [28]);
});
