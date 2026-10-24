// Reclassify the published source snapshot without re-extracting PDFs or touching student records.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { taxonomy, taxonomyVersion } from './content-taxonomy.mjs';
import { canonicalizeUnits } from './canonical-units.mjs';
import { normaliseTerm } from './content-taxonomy.mjs';
const state = new URL('../veri/content-labels/', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, state), 'utf8'));
const payload = read('labels.json'), prior = read('report.json');
if (taxonomy.unitReference?.type !== 'EXCEL_FIRST_SHEET') throw Error('Import the first Excel worksheet first');
const categories = new Map(payload.categories.map(c => [c.id,c]));
for (const c of taxonomy.categories) categories.set(c.id,c);
const counts = { matched: 0, unresolved: 0, multipleCandidates: 0 };
for (const item of payload.items) {
  const labels = item.automaticLabels;
  // Recover the detailed source labels from before the former broad-unit mapping.
  const needsMapping = process.argv.includes('--force') || item.unitMigration?.reference!==taxonomy.unitReference.sha256 || item.taxonomyVersion!==taxonomyVersion;
  if (needsMapping && labels.legacyUnitAssignments?.length) {
    labels.assignments = labels.legacyUnitAssignments.filter(a=>categories.has(a.categoryId))
      .map(a=>({ ...structuredClone(labels.assignments.find(old=>old.categoryId===a.categoryId)||labels.assignments[0]), ...a }));
  }
  if(needsMapping) canonicalizeUnits(item, categories);
  item.taxonomyVersion = taxonomyVersion;
  item.categoryIds = labels.assignments.map(a=>a.categoryId);
  const selected = item.categoryIds.map(id=>categories.get(id));
  item.subjectIds = [...new Set(selected.map(c=>c.subjectId))];
  item.examIds = [...new Set(selected.map(c=>c.exam))];
  item.searchText = normaliseTerm([item.title,item.originalTitle,item.sourceTopic,...selected.flatMap(c=>[c.subject,c.unit,c.topic])].filter(Boolean).join(' '));
  if (item.kind === 'QUESTION' && item.bank !== 'NOTE') {
    counts[selected.some(c=>c.excelRowId)?'matched':'unresolved']++;
    if (selected.filter(c=>c.excelRowId).length>1) counts.multipleCandidates++;
  }
}
payload.categories = [...categories.values()].sort((a,b)=>a.id.localeCompare(b.id,'en'));
const output = JSON.stringify(payload)+'\n';
const runKey = 'labels-v1-'+createHash('sha256').update(output).digest('hex').slice(0,24);
const summary = { ...prior, runKey, categories: categories.size, canonicalUnits: taxonomy.unitReference.examTopics,
  curriculumReference: taxonomy.unitReference, excelClassification: counts,
  unitSelectionRequired: payload.items.filter(i=>i.automaticLabels.unitReview).length };
const backup = new URL(`../yedek/labels-before-excel-${prior.runKey}-${payload.items.length}.json`, state);
fs.mkdirSync(new URL('.',backup), { recursive:true });
if (!fs.existsSync(backup)) fs.copyFileSync(new URL('labels.json',state),backup);
fs.writeFileSync(new URL('labels.tmp',state),output);
fs.renameSync(new URL('labels.tmp',state),new URL('labels.json',state));
fs.writeFileSync(new URL('report.json',state),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({runKey,resources:payload.items.length,...counts,reference:taxonomy.unitReference}));
