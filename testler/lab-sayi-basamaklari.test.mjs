// Sayı Basamakları laboratuvarı: modeller ve cevaplar bağımsız tam taramayla (rakam uzayı küçük) sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import lab, { swapDigits } from '../frontend/src/learn/lab/konular/sayi-basamaklari.js';

const goal = (id) => lab.goals.find((g) => g.id === id);
const D = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const val = (s) => Number(s);

test('çözümleme deneyi: AB − BA = 27 tam olarak 41, 52, 63, 74, 85, 96', () => {
  const ex = goal('cozumleme').experiment;
  const hits = [];
  for (const a of D.slice(1)) for (const b of D) {
    const ab = val(`${a}${b}`), ba = val(`${b}${a}`);
    const r = ex.compute({ a, b });
    assert.equal(r.ab, ab); assert.equal(r.diff, ab - ba); assert.equal(r.sum, ab + ba);
    if (ex.target.test({ a, b }, r)) hits.push(ab);
  }
  assert.deepEqual(hits, [41, 52, 63, 74, 85, 96]);
  assert.ok(ex.compute({ a: 3, b: 0 }).invalid, '30 − 03 = 27 sayılmaz');
});

test('çözümleme aktarımları', () => {
  const s = []; for (const a of D.slice(1)) for (const b of D.slice(1)) if (val(`${a}${b}`) + val(`${b}${a}`) === 143) s.push(a + b);
  assert.deepEqual([...new Set(s)], [13]);
  const d = []; for (const a of D.slice(1)) for (const b of D) for (const c of D.slice(1)) if (val(`${a}${b}${c}`) - val(`${c}${b}${a}`) === 396) d.push(a - c);
  assert.deepEqual([...new Set(d)], [4]);
  for (const a of D.slice(1)) for (const b of D) for (const c of D) if (a + b + c === 12) assert.equal(val(`${a}${b}${c}`) + val(`${b}${c}${a}`) + val(`${c}${a}${b}`), 1332);
});

test('yer değişimi: fark = basamak değerleri farkı × rakam farkı; hedef 396 yalnız yüzler↔birler ve C − A = 4', () => {
  const ex = goal('yer-degisim').experiment;
  for (const a of D.slice(1)) for (const b of D) for (const c of D) for (const [kind] of [['yb'], ['yo'], ['ob']]) {
    const before = val(`${a}${b}${c}`);
    const s = swapDigits(a, b, c, kind);
    const after = val(s.join(''));
    const r = ex.compute({ a, b, c, kind });
    assert.equal(r.diff, after - before);
    assert.equal(!!r.invalid, s[0] === 0);
    const hit = ex.target.test({ a, b, c, kind }, r);
    assert.equal(hit, s[0] !== 0 && after - before === 396);
    if (hit) assert.ok(kind === 'yb' && c - a === 4);
  }
});

test('yer değişimi aktarımları', () => {
  for (const a of D.slice(1)) for (const b of D) for (const c of D) if (val(`${a}${b}${c}`) - val(`${a}${c}${b}`) === 45) assert.equal(b - c, 5);
  for (const a of D.slice(1)) for (const b of D.slice(1)) if (a + b === 8) { const n = String(val(`${a}${b}`) + 9); assert.equal([...n].reduce((s, x) => s + Number(x), 0), 8); }
  assert.ok(Math.abs((0.74 - 0.47) - 0.27) < 1e-12);
});

test('rakam koşulu: farklı, toplamı 10 üç basamaklı sayılardan en büyüğü 910 ve en küçüğü 109', () => {
  const ex = goal('rakam-kosul').experiment;
  const ok = [];
  for (const a of D) for (const b of D) for (const c of D) {
    const valid = a !== 0 && new Set([a, b, c]).size === 3 && a + b + c === 10;
    const r = ex.compute({ a, b, c });
    assert.equal(r.ok, valid);
    if (valid) ok.push(val(`${a}${b}${c}`));
    assert.equal(ex.target.test({ a, b, c }, r), valid && val(`${a}${b}${c}`) === Math.max(910));
  }
  assert.equal(Math.max(...ok), 910); assert.equal(Math.min(...ok), 109);
});

test('rakam koşulu aktarımları', () => {
  let min = Infinity; for (const a of D.slice(1)) for (const b of D) for (const c of D) if (new Set([a, b, c]).size === 3 && a + b + c === 12) min = Math.min(min, val(`${a}${b}${c}`));
  assert.equal(min, 129);
  let max = 0; for (const a of D.slice(1)) for (const b of D) if (a * b === 12) max = Math.max(max, val(`${a}${b}`));
  assert.equal(max, 62);
  const r = []; for (const a of D) for (const b of D) if (a > b && a + b === 9 && a * b === 18) r.push(val(`${a}${b}`) - val(`${b}${a}`));
  assert.deepEqual(r, [27]);
});

test('basamak sayısı: sondaki sıfır = min(a, b), hedef taraması', () => {
  const ex = goal('basamak-sayisi').experiment;
  let hits = 0;
  for (let a = 0; a <= 8; a++) for (let b = 0; b <= 8; b++) for (let c = 0; c <= 4; c++) {
    const n = 2 ** a * 5 ** b * 3 ** c;
    const s = String(n);
    const zeros = s.length - s.replace(/0+$/, '').length;
    const r = ex.compute({ a, b, c });
    assert.equal(r.text, s); assert.equal(r.zeros, zeros); assert.equal(zeros, Math.min(a, b)); assert.equal(r.digits, s.length);
    const hit = ex.target.test({ a, b, c }, r);
    assert.equal(hit, zeros === 3 && s.length === 5);
    if (hit) hits++;
  }
  assert.ok(hits >= 3);
});

test('basamak sayısı aktarımları', () => {
  assert.equal(String(2 ** 10 * 5 ** 8).length, 9);
  const s = (BigInt(4) ** 5n * 25n ** 3n).toString(); assert.equal(s.length - s.replace(/0+$/, '').length, 6);
  let f = 1n; for (let i = 1n; i <= 20n; i++) f *= i; const t = f.toString(); assert.equal(t.length - t.replace(/0+$/, '').length, 4);
  assert.equal(2 ** 6 * 5 ** 3, 8000);
});

test('gerçek sorular: bağımsız tarama', () => {
  // TYT-0555: 1BA − 1AB = 36, 1CA − 1BA = 40, rakamlar sıfırdan farklı
  const s55 = []; for (const a of D.slice(1)) for (const b of D.slice(1)) for (const c of D.slice(1))
    if (val(`1${b}${a}`) - val(`1${a}${b}`) === 36 && val(`1${c}${a}`) - val(`1${b}${a}`) === 40) s55.push(a + b + c);
  assert.deepEqual(s55, [15]);
  // TYT-0590: 11·AB'nin rakamları toplamı 15
  const s90 = []; for (const a of D.slice(1)) for (const b of D) if ([...String(11 * val(`${a}${b}`))].reduce((s, x) => s + +x, 0) === 15) s90.push(a + b);
  assert.deepEqual([...new Set(s90)], [12]);
  // AYT-0038: 52A + B43 rakamları birbirinden farklı tek sayılar
  const s38 = []; for (const a of D) for (const b of D.slice(1)) { const t = String(val(`52${a}`) + val(`${b}43`)); if (new Set(t).size === t.length && [...t].every((x) => +x % 2 === 1)) s38.push(a + b); }
  assert.deepEqual([...new Set(s38)], [12]);
  // TYT-0567: A7B ve 3BC sıralı sayılar (rakamlar farklı, sıralanınca ardışık)
  const sirali = (ds) => new Set(ds).size === 3 && Math.max(...ds) - Math.min(...ds) === 2;
  const s67 = []; for (const a of D.slice(1)) for (const b of D) for (const c of D) if (sirali([a, 7, b]) && sirali([3, b, c])) s67.push(a + b + c);
  assert.deepEqual([...new Set(s67)], [15]);
  // TYT-0579: bitişik sayı — onlar rakamının karesi, birler ve yüzler rakamlarının (iki sırada) yan yana yazılışı
  const bitisik = (h, t, u) => t * t === 10 * h + u || t * t === 10 * u + h;
  const s79 = []; for (const a of D.slice(1)) for (const b of D.slice(1)) for (const c of D) if (bitisik(a, b, 1) && bitisik(b, c, 4)) s79.push(a + b + c);
  assert.deepEqual([...new Set(s79)], [24]);
  // AYT-0028: asalsı sayılar
  const prime = (n) => n > 1 && [...Array(n).keys()].slice(2).every((k) => n % k);
  const as = []; for (const a of D.slice(1)) for (const b of D.slice(1)) for (const c of D.slice(1)) if (new Set([a, b, c]).size === 3 && prime(val(`${a}${b}`)) && prime(val(`${b}${c}`))) as.push(val(`${a}${b}${c}`));
  assert.equal(Math.min(...as) + Math.max(...as), 1110);
  // TYT-0581: 13/20 = 0,65 → 0,56 = 14/25
  assert.ok(Math.abs(0.56 - 14 / 25) < 1e-12 && 13 / 20 === 0.65);
});
