import fs from 'node:fs';
import assert from 'node:assert/strict';
import { taxonomy, taxonomyVersion, categoriesById, normaliseTerm, validateTaxonomy } from './content-taxonomy.mjs';
const read = name => JSON.parse(fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'));
const check = process.argv.includes('--check');
const scopeKey = (exam, subjectId, title) => `${exam.toLowerCase()}.${subjectId}.${normaliseTerm(title).replaceAll(' ','-')}`;
const identities = {};
const titles = {};
for (const c of taxonomy.categories.filter(c => c.origin === 'CURRICULUM' && !c.subtopic)) {
  titles[c.id] = c.topic;
  for (const term of [c.topic, ...(c.aliases || [])]) {
    const key = scopeKey(c.exam, c.subjectId, term);
    // Legacy extraction lookups keep their original identity. Runtime selections
    // use the published Excel category ID, never a title-derived lookup.
    if(c.curriculumSource==='EXCEL_FIRST_SHEET' && identities[key])continue;
    if (identities[key] && identities[key] !== c.id) throw new Error(`Ambiguous curriculum alias ${key}`);
    identities[key] = c.id;
  }
  // The originally published slug remains a valid lookup after a title rename.
  identities[c.id] = c.id;
}
const physicsTopics = taxonomy.categories.filter(c=>c.canonicalTopic && c.subjectId==='fizik').sort((a,b)=>a.order-b.order)
  .map(({id,exam,topic,grade,order})=>({id,exam,topic,grade,order}));
const canonicalUnits=taxonomy.categories.filter(c=>c.canonicalUnit).sort((a,b)=>a.order-b.order)
  .map(({id,exam,subjectId,subject,topic,grade,order,unit,unitId,gradeLabel,selectable})=>({id,exam,subjectId,subject,topic,grade,order,unit,unitId,gradeLabel,selectable,canonicalUnit:true}));
const unitTargets=Object.fromEntries(taxonomy.categories.filter(c=>c.canonicalTopicIds).map(c=>[c.id,c.canonicalTopicIds]));
const projection = {version:1,taxonomyVersion,identities,titles,physicsTopics,canonicalUnits,unitTargets};
const output = JSON.stringify(projection, null, 2) + '\n';
const destination = new URL('../frontend/src/data/curriculumIdentities.json', import.meta.url);
if (check) assert.equal(fs.readFileSync(destination,'utf8'),output,'Regenerate curriculum identity projection');
else fs.writeFileSync(destination,output);
if (process.argv.includes('--project')) { console.log(`Curriculum identities: ${Object.keys(titles).length}, ${taxonomyVersion}`); process.exit(0); }
const legacy = [];
for (const file of ['content-review-catalog.json','pdf-review-labels.json','content-label-categories.json']) {
  const definitions = read(`backend/src/main/resources/${file}`).categories;
  for (const c of definitions) {
    const target = categoriesById.get(c.id);
    assert.ok(target, `Unmapped old identity ${c.id}`);
    assert.deepEqual(target,c,`Definition drift ${c.id}`);
  }
  legacy.push({source:file,identities:definitions.length,policy:'PRESERVED_ID'});
}
const labels = read('veri/content-labels/labels.json');
assert.ok(categoriesById.has('system.kapsam-incelemesi'));
const suspiciousArchiveCategories = taxonomy.categories.filter(c => c.origin === 'SOURCE' && c.id.startsWith('archive:') &&
  /kimyasal|tepkime hızı|gazlar|manyet|elektrik/i.test(c.topic) && ['biyoloji','tarih','turkce'].includes(c.subjectId)).map(c => ({id:c.id,topic:c.topic,reason:'LEGACY_BRANCH_HEADING_REQUIRES_REVIEW'}));
const report = {version:1,tasks:['02.01','02.02','02.03'],taxonomyVersion,status:'PASS',
  categories:taxonomy.categories.length,preservedPublished:labels.categories.length,
  unmappedPublished:labels.categories.filter(c=>!categoriesById.has(c.id)).map(c=>c.id),
  graphErrors:validateTaxonomy(),legacy,suspiciousArchiveCategories,
  taxonomyNodes:taxonomy.legacySources.taxonomy_nodes,
  equivalences:taxonomy.equivalences.length,
  mergesApplied:0,teacherApprovalInferred:false};
const state = new URL('../veri/content-labels/taxonomy/',import.meta.url);
fs.mkdirSync(state,{recursive:true});
fs.writeFileSync(new URL(`${taxonomyVersion}.json`,state),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,taxonomyVersion,categories:report.categories,preservedPublished:report.preservedPublished,graphErrors:report.graphErrors.length,flaggedArchiveCategories:suspiciousArchiveCategories.length}));
