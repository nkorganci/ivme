import fs from 'node:fs';
import assert from 'node:assert/strict';
import { taxonomy, taxonomyVersion, categoriesById, normaliseTerm, validateTaxonomy } from './content-taxonomy.mjs';
import {curriculumProjection} from './curriculum-projection.mjs';
const read = name => JSON.parse(fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'));
const check = process.argv.includes('--check');
const projection=curriculumProjection(taxonomy);
const {titles}=projection;
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
