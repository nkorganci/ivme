// TAS-04: sunucu cevap anahtarı güncel mi, bütün ders soruları kapsanıyor mu ve boşluk puanlaması iki tarafta aynı mı?
//   node --test testler/cevap-anahtari.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lessonQuestions, parseLesson } from '../frontend/src/learn/content/parser.js';
import { fillCorrect } from '../frontend/src/learn/lesson/scoring.js';
import { build } from '../scripts/cevap-anahtari.mjs';

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LESSONS = join(APP, 'frontend/src/learn/content/dersler');
const committed = JSON.parse(readFileSync(join(APP, 'backend/src/main/resources/learn/answer-keys.json'), 'utf8'));
const CHECK_TYPES = new Set(['fill_blank', 'match_pairs', 'drag_order', 'categorize']);

test('depodaki anahtar kaynaklardan yeniden üretilenle aynı', () => {
  assert.deepEqual(committed, build(), 'node scripts/cevap-anahtari.mjs çalıştır');
});

test('ders ekranının gönderebileceği her puanlı öğe anahtarda', () => {
  for (const file of readdirSync(LESSONS).filter((name) => name.endsWith('.ders'))) {
    const lesson = parseLesson(readFileSync(join(LESSONS, file), 'utf8'), file.replace(/\.ders$/, ''));
    for (const question of lessonQuestions(lesson)) {
      if (!question.answer) continue;
      assert.equal(committed.lessonItems[question.id]?.answer, question.answer, question.id);
    }
    const walk = (node) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      if (CHECK_TYPES.has(node.type)) assert.ok(committed.lessonItems[node.id], node.id);
      Object.values(node).forEach(walk);
    };
    walk(lesson.sections);
    assert.deepEqual(committed.concepts[lesson.id].categoryIds, [...lesson.categories].sort(), lesson.id);
  }
});

test('boşluk puanlaması ortak örneklerde sunucuyla aynı', () => {
  const cases = JSON.parse(readFileSync(join(APP, 'backend/src/test/resources/learn/fill-cases.json'), 'utf8'));
  for (const item of cases) assert.equal(fillCorrect(item.answers, item.tolerance, item.text), item.expected, JSON.stringify(item));
});
