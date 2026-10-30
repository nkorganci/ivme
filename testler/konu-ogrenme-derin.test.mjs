// Pilot derinliğine getirilen derslerin denetimi. Her ders dönüştürüldükçe DERIN listesine eklenir.
// Yapı: en az 8 bölüm, 20 gerekçeli çözümlü örnek, 3 adım tamamlama, 4 etkileşimli keşif, 2 görseli okunmuş gerçek soru.
// Matematik: bölüm keşfi modellerinin değişmezleri ve gerçek soruların bütün olasılıkları tarayan bağımsız çözümü.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseLesson } from '../frontend/src/learn/content/parser.js';
import { WORKED_EXAMS } from '../frontend/src/learn/content/worked-exams.js';
import { calculateModel, initialValues } from '../frontend/src/learn/lesson/models.js';

export const DERIN = ['bolme-bolunebilme', 'temel-kavramlar', 'sayi-basamaklari', 'ebob-ekok', 'rasyonel-sayilar'];

const load = (id) => parseLesson(readFileSync(new URL(`../frontend/src/learn/content/dersler/${id}.ders`, import.meta.url), 'utf8'), id);
const model = (id, v = {}) => calculateModel(id, { ...initialValues(id), ...v });
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const even = (n) => n % 2 === 0;

for (const id of DERIN) {
  test(`${id}: pilot derinliği (bölüm, örnek, tamamlama, keşif, gerçek soru)`, () => {
    const lesson = load(id);
    const blocks = lesson.sections.flatMap((s) => s.blocks);
    assert.ok(lesson.sections.length >= 8, `${id}: ${lesson.sections.length} bölüm`);
    assert.ok(blocks.filter((b) => b.type === 'worked').length >= 20, `${id}: çözümlü örnek az`);
    assert.ok(blocks.filter((b) => b.type === 'faded').length >= 3, `${id}: adım tamamlama az`);
    assert.ok(new Set(blocks.filter((b) => b.type === 'exploration').map((b) => b.conceptId)).size >= 4, `${id}: keşif az`);
    const exams = blocks.filter((b) => b.type === 'past_question' && WORKED_EXAMS[b.code]);
    assert.ok(exams.length >= 2, `${id}: görseli incelenmiş gerçek soru az`);
    for (const e of exams) assert.equal(WORKED_EXAMS[e.code].conceptId, id);
  });
}

test('temel-kavramlar: keşif modelleri sayılarla aynı şeyi söyler', () => {
  for (const a of range(1, 9)) for (const b of range(1, 9)) for (const op of [0, 1, 2]) {
    const m = model('temel-tekcift', { a, b, op });
    const r = [a + b, a - b, a * b][op];
    assert.equal(m.result, r); assert.equal(m.even, even(r));
  }
  for (const base of [-3, -2, -1, 0, 2]) for (const n of range(1, 6)) {
    const m = model('temel-isaret', { base, n });
    assert.equal(m.value, base ** n);
    if (base < 0) assert.equal(m.value > 0, even(n));
  }
  for (const a of range(1, 10)) for (const r of range(1, 5)) for (const n of range(2, 10)) {
    const m = model('temel-ardisik', { a, r, n });
    assert.equal(m.sum, m.terms.reduce((s, t) => s + t, 0));
    assert.equal((m.last - a) / r + 1, n);
  }
  for (const x of range(1, 11)) {
    const m = model('temel-ucdeger', { x });
    assert.equal(m.area, 36 - (x - 6) ** 2); assert.ok(m.area <= 36);
  }
});

test('temel-kavramlar: gerçek soruların bağımsız taraması', () => {
  // TYT-0554: üç ifadeden ikisi tek, biri çift → II ve III her zaman çift, I her zaman tek.
  const ok554 = [];
  for (const a of range(-12, 12)) for (const b of range(-12, 12)) {
    const odd = [a + 5 * b, 2 * a + 3 * b, 3 * a + b].filter((v) => !even(v)).length;
    if (odd === 2) ok554.push([a, b]);
  }
  assert.ok(ok554.length > 50);
  assert.ok(ok554.every(([a, b]) => !even(a + b) && even(2 * a + b) && even(a * b)));
  // TYT-0582: (a+b)/c çift tam sayı, (a+c)/b tek tam sayı → I ve III her zaman çift; II değil.
  const ok582 = [];
  for (const a of range(1, 40)) for (const b of range(1, 40)) for (const c of range(1, 40)) {
    if ((a + b) % c === 0 && even((a + b) / c) && (a + c) % b === 0 && !even((a + c) / b)) ok582.push([a, b, c]);
  }
  assert.ok(ok582.every(([a, b, c]) => even(a + b + c) && even(a * b * c)));
  assert.ok(ok582.some(([a, b, c]) => !even(a * (b + c))));
  // AYT_Sayisal-0012: a−b<0<c<c−b → I ve III her zaman; II bazen.
  const ok12 = [];
  for (const a of range(-8, 8)) for (const b of range(-8, 8)) for (const c of range(-8, 8)) if (a - b < 0 && 0 < c && c < c - b) ok12.push([a, b, c]);
  assert.ok(ok12.every(([a, b, c]) => a * b * c > 0 && b - a + c > 0));
  assert.ok(ok12.some(([a, b, c]) => (a + c) * b > 0) && ok12.some(([a, b, c]) => (a + c) * b < 0));
  // TYT-0588: A÷B = A−B = 3 → A·B − (A+B) = 3/4.
  const B = 3 / 2, A = 3 * B;
  assert.equal(A / B, 3); assert.equal(A - B, 3); assert.equal(A * B - (A + B), 0.75);
  for (const [code, answer] of [['TYT-0554', 'E'], ['TYT-0582', 'D'], ['AYT_Sayisal-0012', 'D'], ['TYT-0588', 'E']]) assert.equal(WORKED_EXAMS[code].answer, answer);
});

test('sayi-basamaklari: keşif modelleri ve gerçek soruların bağımsız taraması', () => {
  for (const A of range(1, 9)) for (const B of range(1, 9)) {
    const m = model('basamak-ters', { A, B });
    assert.equal(m.diff, 9 * (A - B)); assert.equal(m.sum, 11 * (A + B));
  }
  for (const x of range(10, 99)) for (const d of range(0, 9)) {
    assert.equal(model('basamak-ekle', { x, d, side: 0 }).result, Number(`${x}${d}`));
    assert.equal(model('basamak-ekle', { x, d, side: 1 }).result, Number(`${d}${x}`));
  }
  for (const S of range(1, 27)) for (const distinct of [0, 1]) {
    const ok = range(100, 999).filter((n) => { const ds = String(n).split('').map(Number); return ds[0] + ds[1] + ds[2] === S && (!distinct || new Set(ds).size === 3); });
    const m = model('basamak-rakam', { S, distinct });
    assert.equal(m.count, ok.length);
    if (ok.length) { assert.equal(m.smallest, ok[0]); assert.equal(m.largest, ok.at(-1)); }
  }
  for (const a of range(0, 9)) for (const b of range(0, 9)) {
    const n = 2 ** a * 5 ** b, m = model('basamak-sifir', { a, b });
    assert.equal(m.number, n); assert.equal(m.digits, String(n).length);
    assert.equal(String(n).length - String(n).replace(/0+$/, '').length, Math.min(a, b));
  }
  for (const base of range(2, 9)) for (const n of range(1, 12)) assert.equal(model('basamak-sonrakam', { base, n }).last, Number(BigInt(base) ** BigInt(n) % 10n));
  const rows = [];
  for (const A of range(0, 9)) for (const B of range(0, 9)) if (11 + 42 + 23 + 10 * A + 2 === 10 * B + 4 + 30 + B + 10 + A + 51) rows.push([A, B]);
  assert.deepEqual(rows, [[8, 5]]); assert.equal(85 + 58, 143);
  const abc = [];
  for (const A of range(1, 9)) for (const B of range(1, 9)) for (const C of range(1, 9)) if (new Set([A, B, C]).size === 3 && 10 * A + B + 10 * B + C === 10 * C + A - 1) abc.push(100 * A + 10 * B + C);
  assert.deepEqual(abc, [146, 247, 348]);
  let s = '123';
  const seen = [];
  for (let step = 1; step <= 75; step++) { s = step % 2 ? s[1] + s[0] + s[2] : s[0] + s[2] + s[1]; seen.push(s); }
  assert.equal(seen[5], '123'); assert.equal(s, '321');
  for (const [code, answer] of [['TYT-0578', 'E'], ['TYT-0573', 'C'], ['AYT_Sayisal-0006', 'A']]) assert.equal(WORKED_EXAMS[code].answer, answer);
});

test('ebob-ekok: keşif modelleri ve gerçek soruların bağımsız taraması', () => {
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const lcm = (a, b) => (a * b) / gcd(a, b);
  for (const n of [12, 16, 18, 24, 30, 36, 48, 60, 64, 100]) {
    const m = model('ebob-bolen', { n });
    assert.equal(m.count, range(1, n).filter((d) => n % d === 0).length);
    assert.equal(m.square, Number.isInteger(Math.sqrt(n))); assert.equal(m.count % 2 === 1, m.square);
  }
  for (const a of [12, 18, 24, 36, 40, 45, 60, 72, 90]) for (const b of [12, 18, 24, 35, 36, 40, 45, 60, 90]) {
    const m = model('ebob-venn', { a, b });
    assert.equal(m.ebob, gcd(a, b)); assert.equal(m.ekok, lcm(a, b)); assert.equal(m.ebob * m.ekok, a * b);
  }
  for (const shape of [0, 1, 2]) for (const s of range(1, 10)) {
    const m = model('ebob-kare', { shape, s });
    assert.equal(m.fits, m.w % s === 0 && m.h % s === 0);
    if (m.fits) assert.equal(m.tiles * s * s, m.w * m.h);
    assert.equal(m.g, gcd(m.w, m.h));
  }
  for (const a of range(2, 9)) for (const b of range(2, 9)) {
    const m = model('ekok-zil', { a, b });
    assert.equal(m.l, lcm(a, b));
    assert.deepEqual(m.together, range(0, m.T).filter((t) => t % a === 0 && t % b === 0));
  }
  for (const start of range(0, 6)) for (const n of range(0, 100)) assert.equal(model('ebob-takvim', { start, n }).end, (start + n) % 7);
  // AYT_Sayisal-0018: EBOB + EKOK = 289 ve m + n ≠ 289 → m + n = 41.
  const sums = new Set();
  for (const m of range(1, 289)) for (const n of range(1, 289)) if (gcd(m, n) + lcm(m, n) === 289 && m + n !== 289) sums.add(m + n);
  assert.deepEqual([...sums], [41]);
  // AYT_Sayisal-0035: M = 6^a·5^b, N = 10^c·9^d; EBOB = 2³·3²·5, EKOK = 2⁵·3³·5⁵ → a+b+c+d = 10.
  const g = (x, y) => (y ? g(y, x % y) : x);
  const totals = new Set();
  for (const a of range(1, 8)) for (const b of range(1, 8)) for (const c of range(1, 8)) for (const d of range(1, 8)) {
    const M = 6n ** BigInt(a) * 5n ** BigInt(b), N = 10n ** BigInt(c) * 9n ** BigInt(d), e = g(M, N);
    if (e === 360n && (M * N) / e === 2700000n) totals.add(a + b + c + d);
  }
  assert.deepEqual([...totals], [10]);
  for (const [code, answer] of [['AYT_Sayisal-0018', 'A'], ['AYT_Sayisal-0035', 'C']]) assert.equal(WORKED_EXAMS[code].answer, answer);
});

test('rasyonel-sayilar: keşif modelleri ve gerçek soruların bağımsız taraması', () => {
  for (const f of range(0, 9)) for (const g of range(0, 9)) for (const op of [0, 1]) {
    const m = model('rasyonel-ortakpayda', { f, g, op });
    const exact = op ? Math.abs(m.a * m.d - m.c * m.b) : m.a * m.d + m.c * m.b;
    assert.equal(m.R * m.b * m.d, exact * m.l);
    assert.equal(m.l % m.b, 0); assert.equal(m.l % m.d, 0);
  }
  for (const f of range(0, 4)) for (const g of range(0, 5)) {
    const m = model('rasyonel-bolme', { f, g });
    assert.equal(m.whole * m.den + m.rest, m.a * m.d); assert.equal(m.den, m.b * m.c);
    assert.ok(m.rest >= 0 && m.rest < m.den);
  }
  for (const x of range(0, 4)) for (const k of range(-3, 3)) {
    const m = model('rasyonel-virgul', { x, k });
    const num = (t) => Number(t.replace(',', '.'));
    assert.ok(Math.abs(num(m.to) - num(m.from) * 10 ** k) < 1e-9 * Math.max(1, num(m.to)));
  }
  const twoFive = (n) => { while (n % 2 === 0) n /= 2; while (n % 5 === 0) n /= 5; return n === 1; };
  for (const a of range(1, 12)) for (const n of range(0, 11)) {
    const m = model('rasyonel-devirli', { a, n });
    assert.equal(m.finite, twoFive(m.q));
    const head = m.finite ? m.digits : m.digits.slice(0, m.start), cyc = m.finite ? [] : m.digits.slice(m.start);
    let value = m.whole + head.reduce((s, d, i) => s + d / 10 ** (i + 1), 0);
    if (cyc.length) value += Number(cyc.join('')) / (10 ** head.length * (10 ** cyc.length - 1));
    assert.ok(Math.abs(value - m.p / m.q) < 1e-12, `${a}/${m.q}`);
    if (!m.finite) assert.ok(cyc.length <= m.q - 1);
  }
  for (const a of range(1, 15)) for (const b of range(2, 15)) for (const [c, d] of [[3, 4], [5, 7], [11, 14], [1, 2]]) {
    const m = model('rasyonel-sayidogrusu', { a, b, c, d });
    assert.equal(m.cmp, a / b > c / d + 1e-12 ? '>' : a / b < c / d - 1e-12 ? '<' : '=');
    assert.ok(m.mid >= Math.min(m.x, m.y) - 1e-12 && m.mid <= Math.max(m.x, m.y) + 1e-12);
  }
  // TYT-0574: toplamı 1 olan iki ikili kurulunca dışarıda kalan sayı.
  const list = [[1, 3], [1, 6], [6, 8], [8, 12], [9, 36]];
  const one = ([p, q], [r, s]) => p * s + r * q === q * s;
  const left = list.filter((x, i) => { const rest = list.filter((_, j) => j !== i); return one(rest[0], rest[1]) && one(rest[2], rest[3]) || one(rest[0], rest[2]) && one(rest[1], rest[3]) || one(rest[0], rest[3]) && one(rest[1], rest[2]); });
  assert.deepEqual(left, [[1, 6]]);
  // TYT-0557: kuruşla hesap; para üstü 20 kuruş.
  assert.equal(1000 - (5 * 99 + 110 + 3 * 125), 20);
  // TYT-0566: A, B, C delikleri 1., 3. ve 6. delik; milimetreyle.
  const gap = (781 - 743) / 2;
  assert.equal(743 + 5 * gap, 838);
  // TYT-0562: leke 1,2 m ile 4/3 m arasında; seçeneklerden yalnız 1,3.
  assert.deepEqual([11, 13, 14, 16, 17].filter((t) => t > 12 && 3 * t < 40), [13]);
  for (const [code, answer] of [['TYT-0574', 'A'], ['TYT-0557', 'A'], ['TYT-0566', 'B'], ['TYT-0562', 'B']]) assert.equal(WORKED_EXAMS[code].answer, answer);
});
