import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createExcelMatcher, excelBranch, splitExcelSubject } from './excel-curriculum.mjs';

const source = JSON.parse(fs.readFileSync(0, 'utf8'));
const file = process.argv.find(arg=>arg.startsWith('--taxonomy='))?.slice('--taxonomy='.length)
  || new URL('../backend/src/main/resources/content-taxonomy.json', import.meta.url);
const taxonomy = JSON.parse(fs.readFileSync(file, 'utf8'));
const branches = { 'Türkçe / Edebiyat': 'turkce', 'Matematik + Geometri': 'matematik', Fizik: 'fizik', Kimya: 'kimya',
  Biyoloji: 'biyoloji', Tarih: 'tarih', Coğrafya: 'cografya', Felsefe: 'felsefe', Psikoloji: 'psikoloji',
  Sosyoloji: 'sosyoloji', Mantık: 'mantik', 'Din Kültürü (DKAB)': 'din' };
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 20);
const categories = [], numbers = new Map(), units = new Map();
const previous = taxonomy.categories.filter(c=>c.curriculumSource==='EXCEL_FIRST_SHEET');
const sourceSubject = row => row.sourceSubject || row.distribution?.subject || row.subject;
const keyFor = row=>JSON.stringify([sourceSubject(row),row.unit,row.topic]);
const newKeys = new Set(source.rows.map(keyFor));
const newUnitKeys = new Set(source.rows.map(row=>JSON.stringify([row.subject,row.unit])));
const usedRows = new Set();
for (const row of source.rows) {
  const { subjectId, subject } = splitExcelSubject(row) || { subjectId: branches[row.subject], subject: row.subject };
  assert.ok(subjectId, `Unknown workbook subject ${row.subject}`);
  const exact = previous.find(c=>keyFor(c)===keyFor(row));
  const renamed = exact || previous.find(c=>c.sourceRow===row.row && sourceSubject(c)===row.subject
    && (c.unit===row.unit || c.topic===row.topic) && !newKeys.has(keyFor(c)) && !usedRows.has(c.excelRowId));
  const rowId = renamed?.excelRowId || hash(keyFor(row));
  usedRows.add(rowId);
  const oldUnit = previous.find(c=>sourceSubject(c)===row.subject && c.unit===row.unit);
  const unitRenamed = renamed?.topic===row.topic && !newUnitKeys.has(JSON.stringify([sourceSubject(renamed),renamed.unit]));
  const unitId = oldUnit?.unitId || (unitRenamed ? renamed.unitId : null) || hash(JSON.stringify([row.subject, row.unit]));
  for (const exam of ['TYT', 'AYT']) {
    const flag = row[exam.toLowerCase()];
    if (!flag) continue;
    const scope = `${exam}:${subjectId}`;
    if (!units.has(scope)) units.set(scope, new Map());
    if (!units.get(scope).has(unitId)) units.get(scope).set(unitId, units.get(scope).size + 1);
    numbers.set(scope, (numbers.get(scope) || 0) + 1);
    const grade = /^\d+$/.test(row.gradeLabel) ? Number(row.gradeLabel) : null;
    const previousIdentity = previous.find(c => c.excelRowId === rowId && c.exam === exam);
    categories.push({ id: previousIdentity?.id || `excel.${exam.toLowerCase()}.${subjectId}.${rowId}`, exam, subjectId, subject,
      sourceSubject: row.subject,
      unit: row.unit, unitId, unitNumber: units.get(scope).get(unitId), topic: row.topic, subtopic: '',
      origin: 'CURRICULUM', curriculumSource: 'EXCEL_FIRST_SHEET', selectable: true, canonicalUnit: true,
      canonicalTopic: true, order: row.row, topicNumber: numbers.get(scope), grade, gradeLabel: row.gradeLabel,
      estimatedGrades: [], aliases: [...new Set([...(renamed?.aliases||[]),...(renamed && renamed.topic!==row.topic ? [renamed.topic] : [])])], matchingPatterns: [], excelRowId: rowId, sourceRow: row.row,
      curriculumReference: { file: source.file, sheet: source.sheet, sheetIndex: 0, sha256: source.sha256 },
      distribution: { ...row, years: source.years } });
  }
}
assert.equal(new Set(categories.map(c=>c.id)).size, categories.length, 'Duplicate source identity');
const match = createExcelMatcher(categories);
const currentIds=new Set(categories.map(c=>c.id));
const prior = taxonomy.categories.filter(c => !currentIds.has(c.id));
for(const category of prior) if(category.curriculumSource==='EXCEL_FIRST_SHEET')category.curriculumSource='LEGACY_EXCEL_FIRST_SHEET';
for(const category of categories) {
  const id=`system.${category.subjectId}.${category.exam.toLowerCase()}.konu-incelemesi`;
  let pending=prior.find(c=>c.id===id);
  if(!pending) {
    pending={id,exam:category.exam,subjectId:category.subjectId,topic:'Konu eşleşmesi bekliyor',subtopic:'',origin:'SYSTEM',excludeFromAchievement:true};
    prior.push(pending);
  }
  pending.subject=category.subject;
}
// Old IDs remain available to saved links, snapshots and teacher decisions.
for (const category of prior) {
  category.selectable = false;
  category.canonicalUnit = false;
  category.canonicalTopic = false;
  const targets = match([category.subtopic || category.topic, category.detail, ...(category.aliases || []), category.topic],
    category.exam, excelBranch(category.subjectId), { broad: true });
  category.canonicalTopicIds = targets;
}
taxonomy.categories = [...prior, ...categories];
taxonomy.unitReference = { type: 'EXCEL_FIRST_SHEET', file: source.file, sheet: source.sheet, sheetIndex: 0,
  sha256: source.sha256, sourceRows: source.rows.length, subjects: new Set(categories.map(c=>c.subjectId)).size,
  sourceSubjects: new Set(source.rows.map(r=>r.subject)).size, subjectClassification: 'FIRST_SHEET_UNITS_V1',
  units: new Set(source.rows.map(r=>JSON.stringify([r.subject,r.unit]))).size,
  examTopics: categories.length, years: source.years };
const output = JSON.stringify(taxonomy, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(fs.readFileSync(file, 'utf8'), output, 'Reimport the first Excel worksheet');
else fs.writeFileSync(file, output);
console.log(JSON.stringify(taxonomy.unitReference));
