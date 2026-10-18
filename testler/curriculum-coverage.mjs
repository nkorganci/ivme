/** Yerel çıkmış soru CSV'siyle müfredat bağlantı denetimi. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCikmisCoverage, invalidCikmisAliases } from '../frontend/src/curriculumQuestionCoverage.js';
import { allTopics } from '../frontend/src/curriculum.js';
import {taxonomy} from '../scripts/content-taxonomy.mjs';

function parseLine(line) {
  const fields = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      fields.push(value);
      value = '';
    } else value += char;
  }
  fields.push(value);
  assert.equal(quoted, false, 'Kapanmamış CSV alanı');
  return fields;
}

const csv = readFileSync(new URL('../veri/sorular-tum.csv', import.meta.url), 'utf8').trim();
const [header, ...lines] = csv.split(/\r?\n/);
const keys = parseLine(header);
const groups = new Map();
const overrides = JSON.parse(readFileSync(new URL('../ornek-veri/konu-duzeltmeleri.json', import.meta.url), 'utf8'));
const seenOverrides = new Set();
for (const line of lines) {
  const fields = parseLine(line);
  assert.equal(fields.length, keys.length, 'CSV sütun sayısı');
  const question = Object.fromEntries(keys.map((key, index) => [key, fields[index]]));
  if (Object.hasOwn(overrides, question.code)) {
    assert.equal(question.topic, overrides[question.code], `${question.code} görselden doğrulanan konu`);
    seenOverrides.add(question.code);
  }
  if (question.active !== 'true') continue;
  const key = JSON.stringify([question.exam_type, question.subject, question.topic]);
  const row = groups.get(key) ?? {
    bank: 'CIKMIS', examType: question.exam_type,
    subject: question.subject, topic: question.topic, count: 0,
  };
  row.count++;
  groups.set(key, row);
}

const coverage = buildCikmisCoverage([...groups.values()],null,taxonomy.categories);
assert.equal(seenOverrides.size, Object.keys(overrides).length, 'Düzeltme listesindeki bütün kodlar CSV içinde olmalı');
assert.deepEqual(invalidCikmisAliases(taxonomy.categories), [], 'Eş anlamlı kaynak etiketlerinin hedef konusu bulunmalı');
const placed = [...coverage.byTopic.values()].flat().concat(
  [...coverage.extraBySubject.values()].flatMap((group) => [...group.values()].flatMap((row) => row.links)));
assert.equal(placed.length + coverage.totals.unsupported, groups.size,
  'Her kaynak etiketi tam bir kez yerleştirilmeli');
assert.equal(placed.reduce((sum, row) => sum + row.count, 0) + coverage.totals.unsupported,
  coverage.totals.total, 'Her etkin soru tam bir kez sayılmalı');
assert.equal(coverage.totals.total, coverage.byExam.TYT.total + coverage.byExam.AYT.total);
assert.equal(coverage.totals.unsupported, 0, 'Tanımlanmayan sınav/ders bulunmamalı');
assert.equal(coverage.totals.unclassified, 4, 'Korunan eski CSV’deki dört belirsiz kayıt inceleme satırında kalmalı; güncel DB etiketleri ayrı denetlenir');
for (const row of placed) {
  const params = new URL(row.to, 'http://localhost').searchParams;
  assert.equal(params.get('examType'), row.examType);
  if(!params.has('categoryId')) {
    assert.equal(params.get('subject'), row.subject);
    assert.equal(params.get('topic'), row.topic);
  } else assert.ok(taxonomy.categories.some(c=>c.canonicalUnit&&c.id===params.get('categoryId')));
}

for (const exam of ['TYT', 'AYT']) {
  const topics = allTopics.filter((topic) => topic.exam === exam);
  const linked = topics.filter((topic) => coverage.byTopic.has(topic.id));
  const stats = coverage.byExam[exam];
  console.log(`${exam}: ${stats.total} etkin soru; ${stats.curriculum} müfredat konusuna bağlı; `
    + `${stats.sourceOnly} ayrı kaynak etiketi; ${stats.unclassified} sınıflandırılmamış; `
    + `${stats.unsupported} ders/sınavı tanımsız; ${linked.length}/${topics.length} müfredat konusunda doğrudan bağlantı`);
}
console.log(`Toplam: ${coverage.totals.total} soru; ${groups.size} kaynak etiketi; `
  + `${coverage.totals.curriculum} müfredat, ${coverage.totals.sourceOnly} ayrı kaynak etiketi, `
  + `${coverage.totals.unclassified} sınıflandırılmamış, ${coverage.totals.unsupported} desteklenmeyen`);
if (process.argv.includes('--unmatched')) {
  for (const [key, extras] of coverage.extraBySubject) {
    const rows = [...extras.values()].filter((row) => !row.unclassified)
      .sort((a, b) => b.links.reduce((n, item) => n + item.count, 0)
        - a.links.reduce((n, item) => n + item.count, 0));
    if (rows.length) console.log(`\n${key}\n${rows.map((row) =>
      `  ${row.links.reduce((n, item) => n + item.count, 0)} ${row.title}`).join('\n')}`);
  }
}
