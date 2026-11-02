// Bölme ve Bölünebilme laboratuvarı: kurallar gerçek bölmeyle (% işleci), cevaplar tam taramayla sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import lab, { RULES, label } from '../frontend/src/learn/lab/konular/bolme-bolunebilme.js';

const goal = (id) => lab.goals.find((g) => g.id === id);
const D = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

test('kurallar 1–99999 arasında gerçek bölmeyle aynı sonucu verir', () => {
  for (let n = 1; n < 100000; n += 7) for (const d of [3, 4, 9, 11]) assert.equal(RULES[d].check(n), n % d === 0, `${n} ÷ ${d}`);
});

test('bölme algoritması: bölüm = kalan olan en büyük sayı 48; geçersiz kalan işaretlenir', () => {
  const ex = goal('bolme-algoritmasi').experiment;
  let best = 0;
  for (let n = 0; n < 200; n++) if (Math.floor(n / 7) === n % 7) best = n;
  assert.equal(best, 48);
  for (let q = 0; q <= 9; q++) for (let r = 0; r <= 9; r++) {
    const res = ex.compute({ q, r });
    assert.equal(res.n, 7 * q + r); assert.equal(!!res.invalid, r >= 7);
    assert.equal(ex.target.test({ q, r }, res), q === 6 && r === 6);
  }
});

test('bölme algoritması aktarımları', () => {
  assert.equal(9 * 5 + 4, 49);
  for (let a = 0; a < 300; a++) if (a % 6 === 4) assert.equal((3 * a + 1) % 6, 1);
  const x = 8 * 3 + 5; assert.deepEqual([Math.floor(x / 5), x % 5], [5, 4]);
});

test('kural deneyi: 4A65 için 3’te dört, 9’da tek aday', () => {
  const ex = goal('kural').experiment;
  const three = D.filter((a) => (4065 + 100 * a) % 3 === 0);
  const nine = D.filter((a) => (4065 + 100 * a) % 9 === 0);
  assert.deepEqual(three, [0, 3, 6, 9]); assert.deepEqual(nine, [3]);
  for (const d of [3, 4, 9, 11]) for (const a of D) assert.equal(ex.target.test({ d, a }, ex.compute({ d, a })), d === 9 && a === 3);
});

test('kural aktarımları', () => {
  assert.deepEqual(D.filter((a) => (502 + 10 * a) % 4 === 0), [1, 3, 5, 7, 9]);
  assert.deepEqual(D.filter((a) => (3806 + 10 * a) % 11 === 0), [0]);
  for (let n = 100; n < 1000; n++) if (n % 5 === 0 && n % 10 !== 0) assert.equal((n + 3) % 5, 3);
});

test('bileşik kural: 3A4B için 12’ye bölünen en büyük 3948; 2·6 ayrışımı karşı örnek üretir', () => {
  const ex = goal('bilesik').experiment;
  let best = 0, misleading = 0;
  for (const a of D) for (const b of D) {
    const n = 3040 + 100 * a + b;
    if (n % 12 === 0) best = Math.max(best, n);
    if (n % 2 === 0 && n % 6 === 0 && n % 12 !== 0) misleading++;
    for (const pair of ['3x4', '2x6']) {
      const r = ex.compute({ pair, a, b });
      assert.equal(r.real, n % 12 === 0);
      if (pair === '3x4') assert.equal(r.okP && r.okQ, r.real, '3 ve 4 birlikte 12’ye denk');
      assert.equal(ex.target.test({ pair, a, b }, r), pair === '3x4' && n === 3948);
    }
  }
  assert.equal(best, 3948); assert.ok(misleading > 0);
  assert.equal(ex.compute({ pair: '2x6', a: 9, b: 2 }).real, false, 'başlangıç: 3942 hem 2 hem 6 ile bölünür, 12 ile bölünmez');
  assert.ok(3942 % 6 === 0);
});

test('bileşik kural aktarımları', () => {
  assert.equal(D.filter((a) => D.some((b) => b !== 0 && (5030 + 100 * a + b) % 15 === 0)).length, 3);
  for (let n = 1; n < 2000; n++) if (n % 6 === 0 && n % 9 === 0) assert.equal(n % 18, 0);
  assert.ok(18 % 54 !== 0 && 18 % 27 !== 0);
  let best = -1; for (const a of D) for (const b of D) if ((2070 + 100 * a + b) % 36 === 0) best = Math.max(best, a + b);
  assert.equal(best, 9);
});

test('döngü: iki makinenin birlikte başa döndüğü ilk karton 13; 175. karton DAR · S', () => {
  const ex = goal('kalan-islem').experiment;
  const sameTags = []; for (let n = 2; n <= 40; n++) if (label(n).join() === label(1).join()) sameTags.push(n);
  assert.deepEqual(sameTags, [10, 13, 22, 25, 34, 37], 'NORMAL döngüde iki kez: aynı etiket ≠ aynı sıra');
  const bothStart = []; for (let n = 2; n <= 40; n++) if ((n - 1) % 4 === 0 && (n - 1) % 3 === 0) bothStart.push(n);
  assert.deepEqual(bothStart, [13, 25, 37]);
  for (let n = 2; n <= 40; n++) assert.equal(ex.target.test({ n }, ex.compute({ n })), n === 13);
  assert.deepEqual(label(175), ['DAR', 'S']);
  // Bağımsız: döngüleri elle üret.
  const seqA = [], seqB = []; for (let i = 0; i < 175; i++) { seqA.push(['NORMAL', 'NORMAL', 'DAR', 'DAR'][i % 4]); seqB.push(['S', 'M', 'L'][i % 3]); }
  assert.deepEqual([seqA[174], seqB[174]], ['DAR', 'S']);
});

test('döngü aktarımları', () => {
  const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  assert.equal(days[(1 + 100) % 7], 'Perşembe');
  for (let a = 0; a < 60; a++) for (let b = 0; b < 60; b++) if (a % 5 === 3 && b % 5 === 2) assert.equal((a * b + a) % 5, 4);
  assert.equal((7n ** 50n) % 10n, 9n);
});

test('gerçek sorular: bağımsız tarama', () => {
  // TYT-0600: m ve 49, 9-değişmeli
  const m = []; for (let x = 0; x < 200; x++) if (x !== 49 && Math.floor(x / 9) === 49 % 9 && x % 9 === Math.floor(49 / 9)) m.push(x);
  assert.deepEqual(m, [41]);
  // TYT-0548: ⌊AB/6⌋ = ⌊19/4⌋ = ⌊AB/5⌋
  const s48 = []; for (let n = 10; n < 100; n++) if (Math.floor(n / 6) === 4 && Math.floor(n / 5) === 4) s48.push(Math.floor(n / 10) + n % 10);
  assert.deepEqual(s48, [6]);
  // TYT-0601: gensayı (n−1)k + 1 = 100; seçenekler üçgen, kare, beşgen, altıgen, sekizgen
  const ok = [3, 4, 5, 6, 8].filter((n) => 99 % (n - 1) === 0);
  assert.deepEqual(ok, [4]);
  assert.equal(6 * 3 + 1, 19, 'örnek: üç yedigen');
  // AYT-0030: 25! = 600·23! ⇒ 25! mod (23! − a) = 600a (600a < 23! − a) = 3600 ⇒ a = 6
  let f23 = 1n; for (let i = 1n; i <= 23n; i++) f23 *= i;
  const f25 = f23 * 24n * 25n;
  assert.equal(f25 % (f23 - 6n), 3600n);
  // TYT-0597
  const s97 = []; for (const a of D.slice(1)) for (const b of D.slice(1)) for (const c of D.slice(1)) if (new Set([a, b, c]).size === 3 && a % b === 0 && b % c === 0 && (100 * a + 10 * b + c) % 3 === 0) s97.push(a * b * c);
  assert.deepEqual([...new Set(s97)], [12]);
  // AYT-0005
  const s05 = []; for (const a of D.slice(1)) for (const b of D.slice(1)) for (const c of D.slice(1)) {
    const n = (x, y, z) => 100 * x + 10 * y + z;
    if (new Set([a, b, c]).size === 3 && n(a, b, c) % 4 === 0 && n(c, a, b) % 5 === 0 && n(b, c, a) % 9 === 0) s05.push(a * b * c);
  }
  assert.deepEqual([...new Set(s05)], [210]);
  // TYT-0595: ABB ve BAB'den biri 11, diğeri 12 ile bölünür
  const s95 = []; for (const a of D.slice(1)) for (const b of D.slice(1)) { const x = 100 * a + 11 * b, y = 101 * b + 10 * a;
    if ((x % 11 === 0 && y % 12 === 0) || (x % 12 === 0 && y % 11 === 0)) s95.push(a + b); }
  assert.deepEqual([...new Set(s95)], [13]);
  // AYT-0027
  const s27 = []; for (const a of D.slice(1)) for (const b of D) for (const c of D.slice(1)) for (const d of D)
    if ((1000 * a + 100 * b + 10 * c + d) % 20 === 0 && (100 * a + 10 * d + b) % 18 === 0 && (100 * c + 10 * d + a) % 15 === 0) s27.push(a + b + c + d);
  assert.deepEqual([...new Set(s27)], [13]);
  // AYT-0041
  const s41 = []; for (let n = 100; n < 1000; n++) { const ds = [...String(n)].map(Number); const p = ds[0] * ds[1] * ds[2], s = ds[0] + ds[1] + ds[2];
    if (n % 11 === 0 && p % 12 === 0 && p > 0 && s % 13 === 0) s41.push(p); }
  assert.deepEqual([...new Set(s41)], [36]);
});
