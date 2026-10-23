import fs from 'node:fs';
import assert from 'node:assert/strict';
import { normalise, cleanHeading } from '../scripts/pdf-review-taxonomy.mjs';
const base = JSON.parse(fs.readFileSync(new URL('../backend/src/main/resources/content-review-catalog.json', import.meta.url)));
const pdf = JSON.parse(fs.readFileSync(new URL('../backend/src/main/resources/pdf-review-labels.json', import.meta.url)));
const taxonomy = JSON.parse(fs.readFileSync(new URL('../backend/src/main/resources/content-taxonomy.json', import.meta.url)));
const categories = new Map([...taxonomy.categories, ...base.categories, ...pdf.categories].map(c => [c.id, c]));
assert.equal(new Set(pdf.items.map(i => i.key)).size, pdf.items.length);
assert.equal(pdf.items.filter(i => i.kind !== 'PDF').length, 0);
for (const item of pdf.items) {
  const labels = item.automaticLabels;
  assert.ok(labels.assignments.length > 0 && labels.assignments.length <= 50, item.key);
  assert.ok(labels.assignments.some(a => a.relation === 'PRIMARY'), item.key);
  assert.equal(labels.difficulty, 'BELIRLENMEDI');
  assert.equal(labels.verdict, undefined);
  for (const assignment of labels.assignments) {
    const c = categories.get(assignment.categoryId);
    assert.ok(c, `${item.key}: unknown ${assignment.categoryId}`);
    assert.ok(!/[\x00-\x1f\x7f-\x9f]/.test(c.topic + c.subtopic), item.key);
    if (c.parentId) assert.ok(categories.has(c.parentId), c.id);
  }
}
assert.equal(cleanHeading('BASİT OLAYLARIN OLASILIĞI'), 'BASİT OLAYLARIN OLASILIĞI');
assert.equal(cleanHeading('HAREKET VE KUVVET - II'), 'HAREKET VE KUVVET');
const movement = pdf.items.filter(i => i.subjectId === 'fizik' && i.exam === 'TYT'
  && /duzgun dogrusal hareket|newton|surtunme kuvveti/.test(normalise(i.title)));
assert.ok(movement.length >= 5);
for (const item of movement) assert.equal(item.topic, 'Hareket ve kuvvet', item.title);
const mainIds = new Set(movement.flatMap(i => i.automaticLabels.assignments.map(a => categories.get(a.categoryId)))
  .filter(c => !c.subtopic).map(c => c.id));
assert.deepEqual([...mainIds], ['tyt.fizik.hareket-ve-kuvvet']);
const actual = new Set(pdf.items.filter(i => i.availability === 'available').map(i => i.relativePath.toLowerCase()));
console.log(`Validated ${pdf.items.length} PDF records (${actual.size} distinct existing PDFs), no unlabelled PDFs; shared movement reference preserved.`);
