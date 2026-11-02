// Rasyonel Sayılar laboratuvarı: kesir aritmetiği BigInt-free tam sayı çapraz çarpımıyla, ölçek ve devirli sayılar
// kayan nokta ve uzun bölmeyle bağımsız sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import lab from '../frontend/src/learn/lab/konular/rasyonel-sayilar.js';

const goal = (id) => lab.goals.find((g) => g.id === id);
const eq = (a, b, c, d) => a * d === b * c;

test('ortak bölme: 1/3 ve 1/4 aynı parçalarla yalnız n 12’nin katıyken; en küçük 12', () => {
  const ex = goal('kesir-islem').experiment;
  for (let n = 2; n <= 24; n++) {
    const r = ex.compute({ n });
    assert.equal(r.fit3 && r.fit4, n % 12 === 0);
    assert.equal(ex.target.test({ n }, r), n === 12);
  }
  assert.ok(eq(4 + 3, 12, 7, 12) && Math.abs(1 / 3 + 1 / 4 - 7 / 12) < 1e-12);
});

test('kesir aktarımları', () => {
  assert.ok(Math.abs(2 / 5 + 1 / 3 - 11 / 15) < 1e-12);
  assert.ok(Math.abs(1 - 1 / 4 - (3 / 4) * (1 / 3) - 1 / 2) < 1e-12);
  let s = 0; for (let n = 1; n <= 9; n++) s += 1 / (n * (n + 1)); assert.ok(Math.abs(s - 0.9) < 1e-12);
});

test('ölçek: 27,5 yalnız 6. çizgi; okuma doğrusal', () => {
  const ex = goal('olcek').experiment;
  for (let k = 0; k <= 8; k++) {
    const r = ex.compute({ k });
    assert.ok(Math.abs(r.value - (20 + (10 * k) / 8)) < 1e-12);
    assert.equal(ex.target.test({ k }, r), k === 6);
  }
});

test('ölçek aktarımları', () => {
  assert.equal(3 * (1 / 4), 0.75);
  assert.equal(Math.round(3.6 / 0.45), 8); assert.ok(Math.abs(0.45 * 8 - 3.6) < 1e-12);
  assert.ok(Math.abs(-1 + 2 * (2 / 5) - -0.2) < 1e-12);
});

test('devirli: uzun bölme ile 0,abab… = ab/99; hedef yalnız 36', () => {
  const ex = goal('devirli').experiment;
  for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) {
    const r = ex.compute({ a, b });
    const num = 10 * a + b;
    // Uzun bölme: num/99’un ilk 12 ondalık basamağı “ab” tekrarı olmalı (99 hariç: 0,99… = 1)
    if (num < 99) { let rem = num, digits = ''; for (let i = 0; i < 12; i++) { rem *= 10; digits += Math.floor(rem / 99); rem %= 99; } assert.equal(digits, `${a}${b}`.repeat(6)); }
    assert.ok(eq(r.f.n, r.f.d, num, 99));
    assert.equal(ex.target.test({ a, b }, r), eq(num, 99, 4, 11));
  }
  assert.ok(ex.target.test({ a: 3, b: 6 }, ex.compute({ a: 3, b: 6 })));
});

test('devirli aktarımları', () => {
  assert.ok(Math.abs(7 / 9 - 0.7777777777) < 1e-9);
  assert.ok(Math.abs(23 / 90 - 0.2555555555) < 1e-9);
  assert.ok(eq(3 + 6, 9, 1, 1));
});

test('sıralama: paydası ≤ 15 olup 5/6 ile 6/7 arasında olan tek indirgenmiş kesir 11/13', () => {
  const ex = goal('siralama').experiment;
  const found = new Set();
  for (let q = 2; q <= 15; q++) for (let p = 1; p <= 15; p++) {
    const inside = 5 / 6 < p / q && p / q < 6 / 7;
    assert.equal(ex.target.test({ p, q }, ex.compute({ p, q })), inside);
    if (inside) found.add(`${p}/${q}`);
  }
  assert.deepEqual([...found], ['11/13']);
  assert.ok(5 / 6 < 21 / 25 && 21 / 25 < 6 / 7, 'öngörü metnindeki örnek');
});

test('sıralama aktarımları', () => {
  assert.ok(4 / 5 > 3 / 4 && 3 / 4 > 2 / 3);
  assert.ok(-2 / 3 > -3 / 4);
  for (let b = 2; b < 40; b++) for (let a = 1; a < b; a++) assert.ok((a + 1) / (b + 1) > a / b);
});

test('gerçek sorular', () => {
  // TYT-0568: nota dizisi ♩ ♪ ♩ 16’lık 𝅗𝅥 ♩ ♪ 16’lık
  assert.ok(eq([4, 2, 4, 1, 8, 4, 2, 1].reduce((s, x) => s + x, 0), 16, 13, 8));
  // TYT-0580: 3·4 = 12 bölmenin 2/3’ü 8 simge; 5·6 = 30 bölmede 8/30
  assert.ok(eq((12 * 2) / 3, 30, 4, 15));
  // TYT-0587: en kısa 16,8; kesilenler toplamı
  assert.ok(Math.abs((17.9 - 16.8) + (19.2 - 16.8) + (20 - 16.8) - 6.7) < 1e-9);
  // TYT-0569: 1,2 m; sol 5 raf (4 aralık) 4. raf, sağ 6 raf (5 aralık) 3. raf
  assert.ok(Math.abs(3 * (1.2 / 4) + 2 * (1.2 / 5) - 1.38) < 1e-9);
  // TYT-0586: 5/6’dan büyük basit kesir
  const opts = [[2, 3], [3, 4], [11, 12], [12, 12], [13, 12]];
  assert.deepEqual(opts.filter(([p, q]) => p < q && p / q > 5 / 6), [[11, 12]]);
  // TYT-0564: üç eşikten tam ikisini geçen seçenek
  const s = [1, 5, 7, 11, 13].filter((p) => [1 / 2, 1 / 3, 1 / 4].filter((t) => p / 24 > t).length === 2);
  assert.deepEqual(s, [11]);
});
