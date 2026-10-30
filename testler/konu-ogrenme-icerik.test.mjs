// Konuyu Öğrenelim dersleri: biçim, pedagojik zorunlu parçalar, formüller (KaTeX), grafik ifadeleri,
// katalog kategorileri ve banka bağları. node --test testler/konu-ogrenme-icerik.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex, lessonQuestions, parseLesson } from '../frontend/src/learn/content/parser.js';
import { validateLessons } from '../frontend/src/learn/content/validate.js';
import { checkExpr, checkMath, evaluate, numericChoice } from '../frontend/src/learn/content/checks.js';
import { UNITS } from '../frontend/src/learn/content/units.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'frontend/src/learn/content/dersler');
const BANK = join(ROOT, 'frontend/src/learn/bank');
const files = readdirSync(DIR).filter((name) => name.endsWith('.ders')).sort();
const lessons = files.map((name) => parseLesson(readFileSync(join(DIR, name), 'utf8'), name.replace(/\.ders$/, '')));
const identities = JSON.parse(readFileSync(join(ROOT, 'frontend/src/data/curriculumIdentities.json'), 'utf8'));
const categories = new Set(identities.canonicalUnits.filter((u) => u.subject === 'Matematik').map((u) => u.id));
const bankCodes = new Set();
if (existsSync(BANK)) {
  for (const name of readdirSync(BANK).filter((n) => n.endsWith('.json') && n !== '_ozet.json')) {
    for (const q of JSON.parse(readFileSync(join(BANK, name), 'utf8')).questions) bankCodes.add(q.c);
  }
}

test('her ders ayrıştırılır ve doğrulanır', () => {
  assert.ok(lessons.length > 0, 'ders yok');
  const fileIds = Object.fromEntries(files.map((name, i) => [lessons[i].id, name.replace(/\.ders$/, '')]));
  const { errors, warnings } = validateLessons(lessons, { units: UNITS, categories, checkMath, checkExpr, fileIds, bankCodes: bankCodes.size ? bankCodes : null });
  if (warnings.length) console.log(`Uyarılar (${warnings.length}):\n  ${warnings.slice(0, 40).join('\n  ')}`);
  assert.deepEqual(errors, []);
});

test('kavram dizini: ünite sırası, önkoşullar sıradan önce gelir', () => {
  const index = buildIndex(lessons, UNITS);
  for (const concept of index.concepts) {
    for (const id of concept.prereq) assert.ok(index.byId[id].order < concept.order, `${concept.id}: önkoşul ${id} daha sonra sıralı`);
  }
  assert.ok(index.units.length >= 1);
});

test('soru cevapları dengeli: doğru şık hep aynı harf değil', () => {
  const answers = lessons.flatMap((lesson) => lessonQuestions(lesson).map((q) => q.answer));
  const counts = Object.fromEntries('ABCDE'.split('').map((key) => [key, answers.filter((a) => a === key).length]));
  const max = Math.max(...Object.values(counts));
  assert.ok(answers.length < 10 || max / answers.length < 0.45, `doğru şık dağılımı: ${JSON.stringify(counts)}`);
});

// Çözümlü örneğin hemen ardından aynı soruyu sormak ezber ölçer; kontrol, ön test ve havuz soruları
// örneklerin ve birbirlerinin sayıları değiştirilmiş kopyası değil, yakın transfer olmalı.
test('sorular çözümlü örneklerin ve birbirinin kopyası değil', () => {
  const numbers = (text) => (text.replace(/\{,\}/g, ',').match(/\d+(?:,\d+)?/g) ?? []).sort().join(' ');
  const words = (text) => new Set(text.toLocaleLowerCase('tr').replace(/\$[^$]*\$/g, ' ').replace(/[^a-zçğıöşü ]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
  const mainMath = (text) => (text.match(/\$[^$]*\$/g) ?? []).sort((a, b) => b.length - a.length)[0] ?? '';
  const overlap = (a, b) => [...a].filter((w) => b.has(w)).length / Math.max(1, new Set([...a, ...b]).size);
  const problems = [];
  for (const lesson of lessons) {
    const items = [
      ...lesson.sections.flatMap((s) => s.blocks.filter((b) => b.type === 'worked' || b.type === 'faded').map((b) => ({ where: `${s.id} örnek "${b.title}"`, text: b.problem, example: true }))),
      ...lessonQuestions(lesson).map((q) => ({ where: `${q.sectionId}/${q.localId}`, text: q.stem, example: false })),
    ].map((item) => ({ ...item, nums: numbers(item.text), words: words(item.text), math: mainMath(item.text) }));
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const [a, b] = [items[i], items[j]];
        // Aynı veriyle farklı koşulu gösteren iki örnek bilinçli bir karşılaştırmadır; yalnız sorular denetlenir.
        if (a.example && b.example) continue;
        if (!a.nums || a.nums !== b.nums || a.math !== b.math) continue;
        const similarity = overlap(a.words, b.words);
        if (similarity >= (a.nums.includes(' ') ? 0.5 : 0.8)) problems.push(`${lesson.id}: ${a.where} ≈ ${b.where}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('kontrol: ifadesi doğru şıkla aynı sayıyı verir; başka şık aynı değeri taşımaz', () => {
  const problems = [];
  let checked = 0;
  for (const lesson of lessons) {
    for (const q of lessonQuestions(lesson)) {
      const where = `${lesson.id}/${q.localId}`;
      const values = q.choices.map((c) => numericChoice(c.text));
      const correctIndex = q.choices.findIndex((c) => c.correct);
      if (values.filter((v) => v != null).length >= 2) {
        const seen = new Map();
        values.forEach((v, i) => {
          if (v == null) return;
          const key = v.toFixed(9);
          if (seen.has(key)) problems.push(`${where}: ${q.choices[seen.get(key)].key} ve ${q.choices[i].key} aynı değer (${v})`);
          seen.set(key, i);
        });
      }
      if (!q.check) continue;
      const expected = evaluate(q.check);
      if (expected == null) { problems.push(`${where}: kontrol ifadesi hesaplanamadı (${q.check})`); continue; }
      const actual = values[correctIndex];
      if (actual == null) { problems.push(`${where}: doğru şık sayısal okunamadı (${q.choices[correctIndex]?.text})`); continue; }
      checked += 1;
      if (Math.abs(actual - expected) > 1e-9 * Math.max(1, Math.abs(expected))) problems.push(`${where}: kontrol ${q.check} = ${expected}, doğru şık ${actual}`);
    }
  }
  console.log(`kontrol edilen sayısal soru: ${checked}`);
  assert.deepEqual(problems, []);
});
