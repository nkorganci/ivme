// Pilot derinliğine getirilen derslerin denetimi. Her ders dönüştürüldükçe DERIN listesine eklenir.
// Yapı: en az 8 bölüm, 20 gerekçeli çözümlü örnek, 3 adım tamamlama, 4 etkileşimli keşif, 2 görseli okunmuş gerçek soru.
// Matematik: bölüm keşfi modellerinin değişmezleri ve gerçek soruların bütün olasılıkları tarayan bağımsız çözümü.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseLesson } from '../frontend/src/learn/content/parser.js';
import { WORKED_EXAMS } from '../frontend/src/learn/content/worked-exams.js';
import { calculateModel, initialValues } from '../frontend/src/learn/lesson/models.js';

export const DERIN = ['bolme-bolunebilme', 'temel-kavramlar', 'sayi-basamaklari'];

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
