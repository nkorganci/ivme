// Yaş, İşçi ve Havuz laboratuvarı: yıl yıl ve saat saat simülasyonla bağımsız sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import lab from '../frontend/src/learn/lab/konular/yas-isci-problemleri.js';

const goal = (id) => lab.goals.find((g) => g.id === id);

test('yaş farkı: yıl yıl ilerletince fark sabit; oran 2 yalnız 14 yıl sonra', () => {
  const ex = goal('yas-fark').experiment;
  for (let t = -10; t <= 30; t++) {
    let m = 34, c = 10; for (let i = 0; i < Math.abs(t); i++) { m += Math.sign(t); c += Math.sign(t); }
    assert.equal(m - c, 24);
    assert.equal(ex.target.test({ t }, ex.compute({ t })), c > 0 && m === 2 * c);
  }
  assert.ok(ex.target.test({ t: 14 }, ex.compute({ t: 14 })));
});

test('yaş farkı aktarımları', () => {
  const s = []; for (let t = 0; t <= 12; t++) if (40 - t === 5 * (12 - t)) s.push(t); assert.deepEqual(s, [5]);
  assert.equal((2025 - 1990) + (2025 - 1996), 64);
  const c = []; for (let x = 1; x <= 40; x++) if (3 * x + 10 === 2 * (x + 10)) c.push(x); assert.deepEqual(c, [10]);
});

test('yaş toplamı: 4 yılda toplam 100 yalnız 5 kişi', () => {
  const ex = goal('grup-toplam').experiment;
  for (let k = 2; k <= 8; k++) { const ages = Array.from({ length: k }, () => 80 / k).map((a) => a + 4); const sum = ages.reduce((a, b) => a + b, 0); assert.ok(Math.abs(ex.compute({ k }).later - sum) < 1e-9); assert.equal(ex.target.test({ k }, ex.compute({ k })), Math.abs(sum - 100) < 1e-9); }
});

test('yaş toplamı aktarımları', () => {
  assert.equal(30 + 3 * 4, 42); assert.equal(21 * 16 - 20 * 15, 36);
  const s = []; for (let t = 0; t <= 60; t++) if (70 + 2 * t === 2 * (14 + 2 * t)) s.push(t); assert.deepEqual(s, [21]);
});

test('birlikte çalışma: saat saat doldurma; tam dolu yalnız 4 saat', () => {
  const ex = goal('is-hiz').experiment;
  let filled = 0, h = 0; while (filled < 1 - 1e-12) { filled += 1 / 6 + 1 / 12; h++; } assert.equal(h, 4);
  for (let i = 1; i <= 24; i++) { const t = i / 2; assert.equal(ex.target.test({ t }, ex.compute({ t })), t === 4); }
});

test('çalışma aktarımları', () => {
  let f = 0, h = 0; while (f < 1 - 1e-12) { f += 1 / 4 - 1 / 12; h++; } assert.equal(h, 6);
  assert.ok(Math.abs(1 / (1 / 6 - 1 / 10) - 15) < 1e-9);
  assert.ok(Math.abs((1 - 2 / 8) * 12 - 9) < 1e-12);
});

test('farklı verim: 4 saatte yalnız 4 çırak', () => {
  const ex = goal('verim').experiment;
  for (let k = 0; k <= 8; k++) { let work = 0, hr = 0; while (work < 24 - 1e-9) { work += 2 + k; hr++; } const exact = 24 % (2 + k) === 0 ? 24 / (2 + k) : null; assert.equal(ex.target.test({ k }, ex.compute({ k })), exact === 4); if (exact) assert.equal(hr, exact); }
});

test('verim aktarımları', () => {
  assert.equal(((2 * 2 + 3) * 6) / 3, 14); assert.equal(4 * 6, 24); assert.equal(20 / 1.25, 16);
});

test('gerçek sorular', () => {
  // TYT-0714: dede 1949’da 11 → 1938; torun 1949+40 = 1989; 2022
  assert.equal((2022 - 1938) + (2022 - 1989), 117);
  // TYT-0699: 1990−Y = a, 2000−Y = e, 2020−Y = a+e
  const ys = []; for (let Y = 1900; Y <= 1990; Y++) { const a = 1990 - Y, e = 2000 - Y; if (2020 - Y === a + e) ys.push(Y); } assert.deepEqual(ys, [1970]);
});
