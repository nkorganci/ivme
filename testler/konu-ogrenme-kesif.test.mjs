import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { EXPLORATIONS } from '../frontend/src/learn/content/explorations.js';
import { WORKED_EXAMS } from '../frontend/src/learn/content/worked-exams.js';
import { MODEL_CONTROLS, calculateModel, initialValues } from '../frontend/src/learn/lesson/models.js';
import { parseLesson } from '../frontend/src/learn/content/parser.js';
import { mathSegments } from '../frontend/src/learn/content/validate.js';
import { checkMath } from '../frontend/src/learn/content/checks.js';

const dir = new URL('../frontend/src/learn/content/dersler/', import.meta.url);
const lessons = readdirSync(dir).filter((f) => f.endsWith('.ders')).map((f) => parseLesson(readFileSync(new URL(f, dir), 'utf8'), f.slice(0, -5)));
const model = (id, overrides = {}) => calculateModel(id, { ...initialValues(id), ...overrides });

test('her dersin özgün bağlamı, gerekçeli örneği, deneyi ve aktarım sorusu var', () => {
  const ids = lessons.flatMap((l) => l.sections.flatMap((s) => s.blocks.filter((b) => b.type === 'exploration').map((b) => b.conceptId)));
  assert.deepEqual(Object.keys(EXPLORATIONS).sort(), [...new Set(ids)].sort());
  for (const lesson of lessons) {
    const e = EXPLORATIONS[lesson.id];
    assert.equal(lesson.sections[0].blocks[0].conceptId, lesson.id);
    for (const key of ['story', 'experiment', 'example', 'tip', 'trap', 'expert']) assert.ok(e[key]?.trim(), `${lesson.id}/${key}`);
    assert.ok(e.steps.length >= 3 && e.steps.every(([a, b]) => a && b));
    assert.equal(e.transfer.length, 4);
    assert.notEqual(e.transfer[1], e.transfer[2]);
  }
});

test('bütün model kontrol kombinasyonlarında tanımlı, sonlu ve açıklamalı görsel üretir', () => {
  let count = 0;
  for (const id of Object.keys(EXPLORATIONS)) {
    const controls = MODEL_CONTROLS[id];
    const visit = (index, values) => {
      if (index === controls.length) {
        const m = calculateModel(id, values);
        const encoded = JSON.stringify(m);
        assert.ok(m.kind && m.equation && m.observation, id);
        assert.ok(!/NaN|Infinity|undefined/.test(encoded), `${id}: ${encoded}`);
        const finite = (v) => { if (typeof v === 'number') assert.ok(Number.isFinite(v), id); else if (v && typeof v === 'object') Object.values(v).forEach(finite); };
        finite(m); count++; return;
      }
      const c = controls[index];
      const valuesFor = c.options?.map(([v]) => v) ?? Array.from({ length: Math.round((c.max - c.min) / c.step) + 1 }, (_, i) => c.min + i * c.step);
      valuesFor.forEach((v) => visit(index + 1, { ...values, [c.key]: v }));
    };
    visit(0, {});
  }
  assert.ok(count > 1000);
});

test('bölme, alan, hareket, oran ve koşullu olasılık modelleri matematiksel anlamı korur', () => {
  for (let n = 10; n <= 30; n++) for (let d = 2; d <= 6; d++) {
    const m = model('bolme-bolunebilme', { n, d });
    assert.equal(d * m.q + m.r, n); assert.ok(m.r >= 0 && m.r < d);
  }
  for (let a = 1; a <= 8; a++) assert.equal(model('koklu-ifadeler', { a }).result, a * a);
  for (let t = 0; t <= 3; t += .25) {
    const m = model('hareket-problemleri', { t }); assert.equal(m.b - m.a, m.gap); assert.ok(m.gap >= 0);
  }
  assert.equal(model('hareket-problemleri', { t: 3 }).gap, 0);
  for (let k = 1; k <= 5; k++) { const m = model('oran-oranti', { k }); assert.equal(m.values[0] / m.values[1], 2 / 3); }
  const conditional = model('kosullu-olasilik', { s: 1 });
  assert.deepEqual(conditional.available, [2, 4, 6]); assert.deepEqual(conditional.desired, [6]);
  assert.equal(model('merkezi-egilim', { n: 30 }).mean, 10); assert.equal(model('merkezi-egilim', { n: 30 }).median, 4);
});

test('sayma modelleri aynı sonucu yeniden saymaz; doğruluk tabloları dört durumda doğru', () => {
  for (let n = 2; n <= 5; n++) {
    const unordered = new Set();
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (a !== b) unordered.add([a, b].sort().join());
    assert.equal(model('kombinasyon', { n }).result, unordered.size);
  }
  for (let n = 1; n <= 4; n++) {
    const m = model('binom', { n });
    assert.equal(new Set(m.paths).size, 2 ** n);
    assert.equal(m.counts.reduce((a, b) => a + b), 2 ** n);
    assert.deepEqual(m.counts, [...m.counts].reverse());
  }
  const expected = [[0, 0, true], [0, 1, true], [1, 0, false], [1, 1, true]];
  for (const [p, q, result] of expected) assert.equal(model('kosullu-onerme', { p, q }).results[0], result);
});

test('incelenen gerçek örnekler doğru derste ve ustalık testinden hariç', () => {
  for (const [code, guide] of Object.entries(WORKED_EXAMS)) {
    const lesson = lessons.find((l) => l.id === guide.conceptId);
    assert.ok(lesson.practiceIds.includes(code), `${code}: örnek testten hariç olmalı`);
    const bank = JSON.parse(readFileSync(new URL(`../frontend/src/learn/bank/${lesson.id}.json`, import.meta.url), 'utf8'));
    const q = bank.questions.find((q) => q.c === code);
    assert.ok(q, `${code} kendi bankasında yok`); assert.equal(q.a, guide.archetype);
    assert.ok(!Object.hasOwn(q, 'answer'), 'banka cevap anahtarı paketlenmez');
    for (const value of [guide.tip, guide.check, ...guide.steps.flatMap((s) => [s.text, s.why])]) {
      for (const segment of mathSegments(value)) assert.equal(checkMath(segment.tex), null, `${code}: ${segment.tex}`);
    }
  }
});

test('özgün soru çözümlerini bağımsız hesapla: genişlik, uzaklık, yüzde ve hareket', () => {
  const numbers = Array.from({ length: 900 }, (_, i) => i + 100).filter((n) => {
    const digits = [...String(n)].map(Number); return new Set(digits).size === 3 && Math.max(...digits) - Math.min(...digits) === 8;
  });
  assert.equal(numbers.length, 70);
  const pages = Array.from({ length: 100 }, (_, i) => i + 1).filter((n) => {
    const errors = [27, 35, 39].map((v) => Math.abs(v - n));
    return new Set(errors).size === 3 && errors[1] < errors[0] && errors[0] < errors[2];
  });
  assert.deepEqual(pages, [32]);
  assert.equal(30 * 8 / .60 * .65 / 20, 13);
  const distance = 2 / (1 / 60 - 1 / 100);
  assert.ok(Math.abs(distance - 300) < 1e-9);
  assert.ok(Math.abs(distance / (10 - (9 - distance / 100)) - 75) < 1e-9);
  assert.equal(1 / 4 / 3, 1 / 12);
  assert.equal(29 + 78, 107); assert.equal(83 + 12, 95);
});
