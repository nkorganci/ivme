// Birinci Dereceden Denklemler laboratuvarı: terazi adımları ve sistemler bağımsız (tarama/yerine koyma) sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import lab from '../frontend/src/learn/lab/konular/birinci-derece-denklemler.js';

const goal = (id) => lab.goals.find((g) => g.id === id);

test('terazi: iki kefeye işlem çözümü korur, tek kefe bozar; hedef yalnız a=1, b=5, d=2', () => {
  const ex = goal('denge').experiment;
  for (const side of ['iki', 'tek']) for (let a = 0; a <= 3; a++) for (let b = 0; b <= 13; b++) for (let d = 1; d <= 4; d++) {
    const r = ex.compute({ side, a, b, d });
    const lhs = (x) => (3 * x + 5 - a * x - b) / d;
    const rhs = (x) => (side === 'iki' ? (x + 13 - a * x - b) / d : x + 13);
    assert.equal(r.holdsAt4, Math.abs(lhs(4) - rhs(4)) < 1e-9);
    if (side === 'iki') assert.ok(r.holdsAt4, 'iki kefeye işlem her zaman dengeyi korur');
    assert.equal(ex.target.test({ side, a, b, d }, r), side === 'iki' && a === 1 && b === 5 && d === 2);
  }
});

test('denge aktarımları', () => {
  assert.equal(5 * 5 - 7, 2 * 5 + 8);
  const ds = []; for (let d = 0; d <= 10; d++) if (3 * (10 - d) + 7 * d === 46) ds.push(d);
  assert.deepEqual(ds, [4]);
  assert.ok(Math.abs(12 / 3 + 12 / 4 - 7) < 1e-12);
});

test('özel durum: çözüm sayısı taramayla (−50…50 ve kesirli x)', () => {
  const ex = goal('ozel-durum').experiment;
  for (let m = -2; m <= 6; m++) for (let n = -2; n <= 6; n++) {
    let count = 0; for (let i = -500; i <= 500; i++) { const x = i / 10; if (Math.abs((m - 2) * x - (n - 3)) < 1e-9) count++; }
    const r = ex.compute({ m, n });
    const expected = count === 1001 ? 'sonsuz' : count === 0 && m === 2 ? 'yok' : 'tek';
    assert.equal(r.kind, expected, `m=${m} n=${n}`);
    if (r.kind === 'tek') assert.ok(Math.abs((m - 2) * r.x - (n - 3)) < 1e-9);
    assert.equal(ex.target.test({ m, n }, r), m === 2 && n === 3);
  }
});

test('özel durum aktarımları', () => {
  const s = []; for (let a = -10; a <= 10; a++) for (let b = -10; b <= 10; b++) if ([-3, 0, 1, 7].every((x) => (a - 1) * x + 4 === 3 * x + b)) s.push(a + b);
  assert.deepEqual(s, [8]);
  for (let k = -10; k <= 10; k++) { const anyX = [-2, 0, 1, 5].some((x) => 2 * (x + 3) === 2 * x + k); assert.equal(anyX, k === 6); }
  for (const k of [-3, 1, 2, 7]) assert.equal(k * 0 + 2, 5 * 0 + 2);
});

test('sistem: yarım adımlı ızgarada iki denklemi sağlayan tek nokta (4, 3)', () => {
  const ex = goal('sistem').experiment;
  const hits = [];
  for (let i = 0; i <= 16; i++) for (let j = 0; j <= 16; j++) { const a = i / 2, b = j / 2; if (ex.target.test({ a, b }, ex.compute({ a, b }))) hits.push([a, b]); }
  assert.deepEqual(hits, [[4, 3]]);
  let line1 = 0; for (let i = 0; i <= 16; i++) for (let j = 0; j <= 16; j++) if (2 * (i / 2) + j / 2 === 11) line1++;
  assert.ok(line1 > 3, 'tek denklemi sağlayan çok nokta var');
});

test('sistem aktarımları', () => {
  assert.deepEqual([(10 + 4) / 2, (10 - 4) / 2], [7, 3]);
  const kd = []; for (let k = 0; k <= 20; k++) for (let d = 0; d <= 20; d++) if (3 * k + 2 * d === 34 && 2 * k + 3 * d === 36) kd.push(k + d);
  assert.deepEqual(kd, [14]);
  const t = []; for (let a = -10; a <= 10; a++) for (let b = -10; b <= 10; b++) for (let c = -10; c <= 10; c++) if (a + b === 7 && b + c === 9 && a + c === 10) t.push(a + b + c);
  assert.deepEqual(t, [13]);
});

test('istenen ifade: her çözümde 4x+6y=24; hedef k=2; 4x+3y sabit değil', () => {
  const ex = goal('ifade-degeri').experiment;
  for (let k = 1; k <= 4; k++) for (let x = -3; x <= 6; x++) {
    const r = ex.compute({ k, x });
    assert.ok(Math.abs(2 * x + 3 * r.y - 12) < 1e-9); assert.ok(Math.abs(r.target - 24) < 1e-9);
    assert.equal(ex.target.test({ k, x }, r), k === 2);
  }
  const vals = new Set([0, 3, 6].map((x) => 4 * x + 3 * ((12 - 2 * x) / 3))); assert.ok(vals.size > 1);
});

test('ifade aktarımları', () => {
  for (let b = -5; b <= 5; b++) { const a = 5 + 2 * b; assert.equal(3 * a - 6 * b - 4, 11); }
  for (let y = -5; y <= 5; y++) assert.equal((6 - y) - (8 - y), -2);
});

test('gerçek sorular', () => {
  // TYT-0603: 10 cm cetvel 0,8 + 10 + 0,8; 6 cm cetveller 0,2 + 6 + 0,2; hizalanan nokta ikinci cetvelde
  const top = 0.8 + 10 + 0.8, small = 0.2 + 6 + 0.2;
  assert.ok(Math.abs(top - small - 0.2 - 5) < 1e-9);
  // TYT-0624: A −5+4, B +5−4−1+3, C +1−3; son sayılar eşit
  const ord = []; for (let b = 1; b < 30; b++) { const a = b + 4, c = b + 5; if (a - 1 === b + 3 && c - 2 === b + 3) ord.push(b < a && a < c ? 'b<a<c' : '?'); }
  assert.ok(ord.every((o) => o === 'b<a<c'));
  // TYT-0617: 3s+k=9, s+3k=15, 3m+k=12 → s + m + 2k
  const k = (15 * 3 - 9) / 8, su = (9 - k) / 3, m = (12 - k) / 3;
  assert.ok(Math.abs(su + 3 * k - 15) < 1e-9); assert.ok(Math.abs(su + m + 2 * k - 13) < 1e-9);
  // TYT-0626: r + 30 + 3t = 104 (doğru), t + 30 + 3r = 100 (yanlış)
  const ts = []; for (let r = 0; r <= 100; r += 0.5) for (let t = 0; t <= 100; t += 0.5) if (r + 30 + 3 * t === 104 && t + 30 + 3 * r === 100) ts.push(t);
  assert.deepEqual(ts, [19]);
  // TYT-0609: θ + g = 150, 7θ + g = 360 → 1’den 140° saat yönünde
  const th = 35, g = 115; assert.equal(th + g, 150); assert.equal(7 * th + g, 360); assert.equal(1 + 140 / th, 5);
  // TYT-0629: W = 54 + s + 54; 35 + s + d + s + 31 = W; 10 + s + d + s + d + s + q = W ⇒ q = 14 her s için
  for (let s3 = 10; s3 <= 40; s3++) { const W = 108 + s3, d = W - 66 - 2 * s3; assert.equal(W - (10 + 3 * s3 + 2 * d), 14); }
});
