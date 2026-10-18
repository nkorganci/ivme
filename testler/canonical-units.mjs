import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {taxonomy,taxonomyVersion} from '../scripts/content-taxonomy.mjs';
import {canonicalUnits,canonicalizeUnits} from '../scripts/canonical-units.mjs';
import {progressCategories,topicProgressRows} from '../frontend/src/topicProgress.js';
import {CURRICULUM,curriculumFromCategories} from '../frontend/src/curriculum.js';
const cats=new Map(taxonomy.categories.map(c=>[c.id,c]));
assert.equal(canonicalUnits.length,237);
assert.equal(canonicalUnits.filter(c=>c.exam==='TYT').length,106);
assert.equal(canonicalUnits.filter(c=>c.exam==='AYT').length,131);
const referencePath=new URL('../veri/content-labels/integration/units-20261017/reference-topics.json',import.meta.url);
const referenceBytes=fs.readFileSync(referencePath);
assert.equal(createHash('sha256').update(referenceBytes).digest('hex'),taxonomy.unitReference.sha256);
const reference=JSON.parse(referenceBytes);
for(const group of reference)for(const [index,title] of group.topics.entries()) {
  const subject=group.id==='ayt-felsefe_grubu'?['felsefe','psikoloji','sosyoloji','mantik'][index]:group.id.replace(/^(tyt|ayt)-/,'').replace('_birlesik','').replace('din_kulturu','din');
  assert.equal(canonicalUnits.filter(c=>c.exam===group.exam&&c.subjectId===subject&&c.topic===title).length,1,title);
}
assert.equal(progressCategories(taxonomy.categories).length,237);
for(const branch of new Set(canonicalUnits.map(c=>c.subjectId))) {
  const rows=topicProgressRows(progressCategories(taxonomy.categories),[],branch);
  assert.equal(rows.length,canonicalUnits.filter(c=>c.subjectId===branch).length);
  assert.ok(rows.every(r=>!r.topicLabel.includes('→')&&r.solved===0));
}
assert.equal(Object.values(CURRICULUM).flatMap(s=>s.flatMap(s=>s.units.flatMap(u=>u.topics))).length,237);
assert.equal(curriculumFromCategories(taxonomy.categories).TYT.find(s=>s.id==='biyoloji').units[0].topics.length,8);
const kalitim=canonicalUnits.find(c=>c.exam==='TYT'&&c.subjectId==='biyoloji'&&c.topic==='Kalıtım');
const old=taxonomy.categories.filter(c=>c.exam==='TYT'&&c.subjectId==='biyoloji'&&c.topic.toLocaleLowerCase('tr').includes('kalıtımın genel'));
assert.ok(old.length>2);assert.ok(old.every(c=>c.canonicalTopicIds.includes(kalitim.id)));
const resource={key:'test:inheritance',kind:'QUESTION',exam:'TYT',subjectId:'biyoloji',title:'Kalıtım sorusu',automaticLabels:{assignments:old.slice(0,3).map(c=>({categoryId:c.id,relation:'PRIMARY',confidence:'LOW',scopeStatus:'CANDIDATE',evidence:[],locators:[]})),evidence:[]}};
canonicalizeUnits(resource,cats);
assert.deepEqual(resource.automaticLabels.assignments.map(a=>a.categoryId),[kalitim.id]);
assert.deepEqual(resource.automaticLabels.grades,[9,10]);
const labels=JSON.parse(fs.readFileSync(new URL('../veri/content-labels/labels.json',import.meta.url),'utf8'));
const runKey=JSON.parse(fs.readFileSync(new URL('../veri/content-labels/report.json',import.meta.url),'utf8')).runKey;
const report={status:'PASS',runKey,taxonomyVersion,units:237,byKind:{},unlabelled:0,withoutGrade:0,unknownIds:0,visibleSubtopics:0};
for(const i of labels.items) {
  const l=i.automaticLabels;assert.ok(l.assignments.some(a=>a.relation==='PRIMARY'),i.key);
  assert.ok(l.grades.length,i.key);assert.ok(l.grades.every(g=>[9,10,11,12].includes(g)),i.key);
  assert.equal(l.gradeStatus,'ESTIMATED',i.key);
  for(const a of l.assignments){const c=cats.get(a.categoryId);assert.ok(c,i.key);assert.ok(c.canonicalUnit||c.id.startsWith('system.'),i.key);}
  const k=report.byKind[i.kind]??={total:0,unitMapped:0,broadEstimate:0};k.total++;
  k[l.assignments.some(a=>a.categoryId.startsWith('system.'))?'broadEstimate':'unitMapped']++;
}
fs.writeFileSync(new URL('../veri/content-labels/unit-check.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
