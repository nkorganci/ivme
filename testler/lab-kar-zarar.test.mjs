// Kâr–Zarar laboratuvarı: kuruş cinsinden tam sayı hesabı ve sepet simülasyonuyla bağımsız sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import lab from '../frontend/src/learn/lab/konular/kar-zarar.js';

const goal = (id) => lab.goals.find((g) => g.id === id);

test('kâr yüzdesi: maliyete göre %25 yalnız 100 TL', () => {
  const ex = goal('maliyet-tabani').experiment;
  for (let s = 60; s <= 160; s += 5) assert.equal(ex.target.test({ s }, ex.compute({ s })), 4 * (s - 80) === 80);
});

test('kâr aktarımları', () => {
  assert.equal(9600 / 120, 80); assert.equal(6000 / 75, 80); assert.equal((50 - 40) * 100 / 40, 25);
});

test('kampanya: sepet simülasyonu; %25 gerçek indirim', () => {
  const ex = goal('kampanya').experiment;
  const pay = (kind, n) => { let t = 0; for (let i = 1; i <= n; i++) t += kind === 'hepsi30' ? 70 : kind === 'ikinci50' ? (i % 2 === 0 ? 50 : 100) : (i % 3 === 0 ? 0 : 100); return t; };
  for (const kind of ['ikinci50', 'hepsi30', '3al2']) for (let n = 1; n <= 6; n++) {
    const r = ex.compute({ kind, n }); assert.ok(Math.abs(r.pay - pay(kind, n)) < 1e-9);
    assert.equal(ex.target.test({ kind, n }, r), 4 * (100 * n - pay(kind, n)) === 100 * n);
  }
  assert.ok(ex.target.test({ kind: 'ikinci50', n: 2 }, ex.compute({ kind: 'ikinci50', n: 2 })));
});

test('kampanya aktarımları', () => {
  assert.equal(200 * 90 * 80 / 10000, 144);
  assert.equal(12000 / 120, 100);
  assert.ok(1 / 3 > 0.3);
});

test('fark: 30 TL fark yalnız maliyet 120', () => {
  const ex = goal('fark').experiment;
  for (let c = 60; c <= 200; c += 10) assert.equal(ex.target.test({ c }, ex.compute({ c })), (120 * c - 95 * c) === 3000);
});

test('fark aktarımları', () => {
  assert.equal(11000 / 110 * 130 / 100, 130);
  assert.equal((120 + 90) / 2, 105);
  assert.equal(50 + 300 / 20, 65);
});

test('fire: 90 yumurtayla %35 kâr yalnız 3 TL (kuruş)', () => {
  const ex = goal('fire').experiment;
  for (let k = 200; k <= 400; k += 10) { const p = k / 100; assert.equal(ex.target.test({ p }, ex.compute({ p })), 90 * k === 27000); }
});

test('fire aktarımları', () => {
  assert.equal((150 - 100) * 100 / 100, 50); assert.equal(18 * 8 - 120, 24); assert.equal((5 / 4 - 1) * 100, 25);
});

test('gerçek sorular', () => {
  // TYT-0649
  const m2 = 450000 / 3000, sold = m2 * 3200, donum = sold / 20000; assert.equal(donum * 25000 - sold, 120000);
  // TYT-0658
  const p = []; for (let x = 1; x <= 20; x++) if (45 + x >= 50 && 45 + x - 10 === 43) p.push(x); assert.deepEqual(p, [8]);
  // TYT-0672: kırmızı 2 tane 1,5f; mavi 2 tane 1,4f; fark 4,5
  assert.equal(Math.round(4.5 / (1.5 - 1.4)), 45);
  // TYT-0710: A: iki kişi birer çanta + yarım fiyat kalem; B: aynı türden 2 ürüne ikincisi %40
  const A = 2 * (300 + 60), B = 300 + 180 + 120 + 72; assert.equal(A - B, 48);
});
