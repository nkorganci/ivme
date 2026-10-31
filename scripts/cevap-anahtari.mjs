#!/usr/bin/env node
// TAS-04 sunucu cevap anahtarı: ders içi soruları (.ders) ve kaynaklı not mini alıştırmalarını sunucunun
// puanlayabileceği tek dosyaya yazar. Öğrenciye gönderilmez; backend classpath'inden okunur.
//   node scripts/cevap-anahtari.mjs            → backend/src/main/resources/learn/answer-keys.json (yalnız değiştiyse)
//   node scripts/cevap-anahtari.mjs --kontrol  → dosya güncel değilse 1 ile çıkar, yazmaz
// Her öğenin `version` değeri yalnız puanlamayı etkileyen anahtardan türetilir; metin düzeltmesi sürüm değiştirmez.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLesson } from '../frontend/src/learn/content/parser.js';

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LESSONS = join(APP, 'frontend/src/learn/content/dersler');
const NOTES = join(APP, 'frontend/public/kaynakli-notlar.json');
const OUT = join(APP, 'backend/src/main/resources/learn/answer-keys.json');

const version = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

function itemKey(node) {
  switch (node.type) {
    case 'quick_check': return null;
    case 'fill_blank': return { type: 'fill', answers: node.answers, tolerance: node.tolerance };
    case 'match_pairs': return { type: 'match', rights: node.pairs.map((pair) => pair[1]) };
    case 'drag_order': return { type: 'order', items: node.items };
    case 'categorize': return { type: 'categorize', groups: Object.fromEntries(node.groups.flatMap((g) => g.items.map((item) => [item, g.name]))) };
    default: return null;
  }
}

function choiceKey(question) {
  if (!question.answer) return null;
  return { type: 'choice', answer: question.answer, choices: question.choices.map((c) => c.key) };
}

/** Ders nesnesindeki bütün puanlanabilir öğeler; iç içe bloklar (düzey vb.) da taranır. */
function collect(lesson) {
  const out = new Map();
  const add = (id, key) => {
    if (!id || !key) return;
    const previous = out.get(id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(key)) throw new Error(`${id}: aynı kimlikte iki farklı cevap anahtarı`);
    out.set(id, key);
  };
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== 'object') return;
    if (node.type === 'quick_check' && node.question) add(node.question.id, choiceKey(node.question));
    else if (node.id && typeof node.type === 'string') add(node.id, itemKey(node));
    for (const value of Object.values(node)) if (value && typeof value === 'object') walk(value);
  };
  lesson.pretest.forEach((q) => add(q.id, choiceKey(q)));
  lesson.pool.forEach((q) => add(q.id, choiceKey(q)));
  walk(lesson.sections);
  return out;
}

export function build() {
  const lessonItems = {};
  const concepts = {};
  for (const file of readdirSync(LESSONS).filter((name) => name.endsWith('.ders')).sort()) {
    const lesson = parseLesson(readFileSync(join(LESSONS, file), 'utf8'), file.replace(/\.ders$/, ''));
    concepts[lesson.id] = { categoryIds: [...lesson.categories].sort(), flashcards: lesson.flashcards.map((card) => `${lesson.id}:${card.id}`) };
    for (const [id, key] of [...collect(lesson)].sort(([a], [b]) => a.localeCompare(b))) {
      lessonItems[id] = { conceptId: lesson.id, ...key, version: version(key) };
    }
  }
  const notePractice = {};
  const notes = JSON.parse(readFileSync(NOTES, 'utf8'));
  for (const group of notes.groups) for (const lesson of group.lessons) {
    const practice = lesson.practice;
    if (!practice || !Number.isInteger(practice.answer)) continue;
    const key = { answer: practice.answer, choices: practice.choices.length };
    notePractice[`note:${group.id}:${lesson.id}`] = { ...key, version: version(key) };
  }
  return { schemaVersion: 1, lessonItems, concepts, notePractice };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const text = `${JSON.stringify(build(), null, 1)}\n`;
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (process.argv.includes('--kontrol')) {
    if (current !== text) {
      console.error('Cevap anahtarı güncel değil: node scripts/cevap-anahtari.mjs');
      process.exit(1);
    }
    console.log('Cevap anahtarı güncel.');
  } else if (current !== text) {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, text);
    console.log(`Cevap anahtarı yazıldı: ${Object.keys(JSON.parse(text).lessonItems).length} ders öğesi.`);
  }
}
