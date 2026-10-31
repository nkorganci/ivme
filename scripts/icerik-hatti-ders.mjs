#!/usr/bin/env node
// TAS-09 içerik hattının ders okuyucusu: tarayıcıyla aynı ayrıştırıcıyla `.ders` ve WORKED_EXAMS gerçeklerini JSON verir.
//   node scripts/icerik-hatti-ders.mjs <kavram> <ders-yolu>
// Yazma yapmaz. Çözüm metni, TAS-08 kanıtındaki solutionSha256 ile aynı biçimde (JSON.stringify) döner.
import { readFileSync } from 'node:fs';
import { parseLesson } from '../frontend/src/learn/content/parser.js';
import { WORKED_EXAMS } from '../frontend/src/learn/content/worked-exams.js';

const [conceptId, lessonPath] = process.argv.slice(2);
const lesson = parseLesson(readFileSync(lessonPath, 'utf8'));
const count = (blocks, type) => blocks.filter((b) => b.type === type).length;
const sections = lesson.sections.map((s) => ({
  id: s.id, title: s.title, exams: s.exams.length ? s.exams : lesson.exams,
  leveled: s.blocks.filter((b) => b.type === 'leveled').map((b) => ['L1', 'L2', 'L3'].filter((k) => String(b.levels[k] ?? '').trim()).length),
  inquiries: count(s.blocks, 'inquiry'),
  worked: s.blocks.filter((b) => b.type === 'worked').map((b) => b.steps.length && b.steps.every((step) => step.why?.trim())),
  pastCodes: s.blocks.filter((b) => b.type === 'past_question').map((b) => b.code),
}));
const worked = Object.fromEntries(Object.entries(WORKED_EXAMS).filter(([, q]) => q.conceptId === conceptId)
  .map(([code, q]) => [code, JSON.stringify(q)]));
console.log(JSON.stringify({ id: lesson.id, exams: lesson.exams, sources: lesson.sources ?? '', sections, practiceIds: lesson.practiceIds, worked }));
