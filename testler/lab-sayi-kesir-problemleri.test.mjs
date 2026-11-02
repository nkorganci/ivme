// Sayı ve Kesir Problemleri laboratuvarı: sıra, kesir, adet–tutar ve ters işlem simülasyon/taramayla sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import lab, { runChain } from '../frontend/src/learn/lab/konular/sayi-kesir-problemleri.js';

const goal = (id) => lab.goals.find((g) => g.id === id);

test('kuyruk: dizi kurarak Ali’nin sondan sırası; hedef 18 kişi', () => {
  const ex = goal('denklem-kurma').experiment;
  for (let n = 10; n <= 25; n++) {
    const q = Array.from({ length: n }, (_, i) => (i === 6 ? 'Ali' : '-'));
    const fromBack = q.slice().reverse().indexOf('Ali') + 1;
    assert.equal(ex.compute({ n }).fromBack, fromBack);
    assert.equal(ex.target.test({ n }, ex.compute({ n })), fromBack === 12);
  }
});

test('sıra aktarımları', () => {
  assert.equal(20 - 8 + 1, 13);
  const s = []; for (let r = 3; r <= 40; r++) if (4 * r + 3 === 5 * (r - 2)) s.push(4 * r + 3); assert.deepEqual(s, [55]);
  const k = []; for (let x = 0; x <= 40; x++) if (x + 3 * x === 40) k.push(x); assert.deepEqual(k, [10]);
});

test('kalanın kesri: kalan 900 yalnız maaş 1800', () => {
  const ex = goal('kalanin-kesri').experiment;
  for (let m = 600; m <= 3000; m += 60) {
    let money = m; money -= m / 3; money -= money / 4;
    assert.ok(Math.abs(ex.compute({ m }).left - money) < 1e-9);
    assert.equal(ex.target.test({ m }, ex.compute({ m })), Math.abs(money - 900) < 1e-9);
  }
  assert.ok(ex.target.test({ m: 1800 }, ex.compute({ m: 1800 })));
});

test('kalanın kesri aktarımları', () => {
  const b = []; for (let n = 10; n <= 500; n += 5) { let r = n; r -= (2 / 5) * n; r -= r / 3; if (Math.abs(r - 80) < 1e-9) b.push(n); } assert.deepEqual(b, [200]);
  let h = 54; for (let i = 0; i < 3; i++) h *= 2 / 3; assert.ok(Math.abs(h - 16) < 1e-9);
  assert.ok(Math.abs(72 * (2 / 3 - 1 / 4) - 30) < 1e-9);
});

test('adet–tutar: 380 TL yalnız 8 tam bilet', () => {
  const ex = goal('adet-tutar').experiment;
  for (let t = 0; t <= 20; t++) assert.equal(ex.target.test({ t }, ex.compute({ t })), 25 * t + 15 * (20 - t) === 380 && t === 8);
});

test('adet–tutar aktarımları', () => {
  const r = []; for (let t = 0; t <= 30; t++) if (4 * t + 2 * (30 - t) === 84) r.push(t); assert.deepEqual(r, [12]);
  const d = []; for (let c = 0; c <= 25; c++) if (4 * c - (25 - c) === 70) d.push(c); assert.deepEqual(d, [19]);
  const p = []; for (let x = 0; x <= 18; x++) if (10 * x + 5 * (18 - x) === 120) p.push(x); assert.deepEqual(p, [6]);
});

test('sondan başa: zincir sonucu 21 yalnız x = 10', () => {
  const ex = goal('ters-islem').experiment;
  for (let x = -5; x <= 20; x++) { assert.equal(ex.compute({ x }).out, 2 * (x + 3) - 5); assert.equal(runChain(x), 2 * (x + 3) - 5); assert.equal(ex.target.test({ x }, ex.compute({ x })), x === 10); }
});

test('sondan başa aktarımları', () => {
  assert.equal(12 / 2 + 4, 10);
  const a = []; for (let m = 0; m <= 200; m++) { let v = m / 2; v += 10; v /= 2; if (v === 25) a.push(m); } assert.deepEqual(a, [80]);
  assert.equal(3 * 2 ** 5, 96);
});

test('gerçek sorular', () => {
  // TYT-0737
  const s37 = []; for (let r = 1; r <= 120; r++) if (120 % r === 0) { const c = 120 / r; if ((r - 2) * (c - 1) === (r - 1) * (c - 3)) s37.push((r - 2) * (c - 1)); } assert.deepEqual(s37, [84]);
  // TYT-0676
  const s76 = []; for (let y = 0; y <= 100; y++) if (2 * (100 - y) + 3 * y === 3 * 83) s76.push(y); assert.deepEqual(s76, [49]);
  // TYT-0694
  const s94 = []; for (let k = 0; k <= 11; k++) if (40 + 2 * k - 25 + 3 * (11 - k) === 40) s94.push(40 + 2 * k - 25); assert.deepEqual(s94, [31]);
  // TYT-0682: 5 klasör × n alt × p test × 12 soru, bir alt klasör silindi
  for (const [n, p] of [[3, 4], [7, 2]]) assert.equal(5 * n * p * 12 - p * 12, 12 * p * (5 * n - 1));
  // TYT-0712: sergi 1 x, sonraki sergiler önceki kalanın iki katı; 3. sergide satılan 96
  const s12 = []; for (let x = 5; x <= 1000; x += 5) { let shown = x; for (let i = 1; i < 3; i++) shown = 2 * (shown - (3 / 5) * shown); if (Math.abs((3 / 5) * shown - 96) < 1e-9) s12.push(x); } assert.deepEqual(s12, [250]);
  // TYT-0677
  const s77 = []; for (let L = 120; L <= 3000; L += 60) { const x = (9 * L) / 20; if (Math.abs(x + 240 - (7 * L) / 12) < 1e-9) s77.push(L); } assert.deepEqual(s77, [1800]);
  // TYT-0674: x sebze→et (+20), 10−x et→sebze (−20), net +80
  const s74 = []; for (let x = 0; x <= 10; x++) if (20 * x - 20 * (10 - x) === 80) s74.push(x); assert.deepEqual(s74, [7]);
});
