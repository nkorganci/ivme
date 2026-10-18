import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const read=name=>JSON.parse(fs.readFileSync(new URL(`../${name}`,import.meta.url),'utf8'));
const data=read('veri/content-labels/labels.json');
const source=read('veri/content-labels/source-inventory.json');
const pdf=read('backend/src/main/resources/pdf-review-labels.json');
const catalog=read('backend/src/main/resources/content-review-catalog.json');
const proposals=read('ornek-veri/content-ai-question-labels.json');
const items=new Map(data.items.map(i=>[i.key,i]));
const categories=new Map(data.categories.map(c=>[c.id,c]));
assert.equal(items.size,data.items.length);
assert.equal(categories.size,data.categories.length);
assert.equal(data.items.length,source.questions.length+pdf.items.length+catalog.items.length);
for(const s of source.questions)assert.ok(items.has(`question:${s.code}`),s.code);
for(const s of [...pdf.items,...catalog.items])assert.ok(items.has(s.key),s.key);
for(const item of items.values()) {
  const labels=item.automaticLabels;
  assert.ok(labels.assignments.length && labels.assignments.length<=categories.size,item.key);
  assert.ok(labels.assignments.some(a=>a.relation==='PRIMARY'),item.key);
  assert.equal(labels.reviewRequired,true);
  assert.equal(labels.verdict,undefined);
  assert.ok(labels.evidence.length,item.key);
  assert.ok(!labels.reviewReasons.includes('TOPIC_REQUIRES_ANALYSIS'),item.key);
  for(const assignment of labels.assignments)assert.ok(categories.has(assignment.categoryId),item.key);
  assert.ok(['BELIRLENMEDI','UYGULANMAZ'].includes(labels.difficulty));
}
for(const c of categories.values()) {
  assert.ok(!/[\x00-\x1f\x7f-\x9f]/.test(c.topic+c.subtopic),c.id);
  if(c.parentId) assert.ok(categories.has(c.parentId),c.id);
}
const originals=new Map(source.questions.map(q=>[q.code,q]));
for(const p of proposals.proposals) {
  const question=originals.get(p.code);
  const hash=createHash('sha256').update(question.original.text.trim().replace(/\s+/g,' ')).digest('hex');
  assert.equal(hash,p.textSha256,p.code);
  assert.equal(p.teacherApproved,false);
  assert.equal(items.get(`question:${p.code}`).automaticLabels.basis,'AI_SOURCE_ANALYSIS');
}
// The passage mentions ethics/art, but its task measures paragraph inference.
for(const code of ['cd-2021-mini-deneme-3-01-09','mn-test-03-01-01']) {
  const item=items.get(`question:${code}`);
  assert.ok(item.automaticLabels.assignments.every(a=>categories.get(a.categoryId).subjectId==='turkce'),code);
  assert.ok(item.automaticLabels.assignments.some(a=>a.evidence.some(e=>e.type==='QUESTION_TASK_READING' && e.association==='RELATION')),code);
}
const restoredTask=items.get('question:3d-ayt-esit-agirlik-30-27');
assert.equal(restoredTask.automaticLabels.assignments.find(a=>a.relation==='PRIMARY').categoryId,'ayt.matematik.integral-ve-uygulamalari');
assert.ok(restoredTask.automaticLabels.assignments.some(a=>a.relation==='PREREQUISITE' && categories.get(a.categoryId).topic==='Fonksiyonlar'));
assert.equal(restoredTask.availability,originals.get('3d-ayt-esit-agirlik-30-27').renderedSourceRepair?'available':'needs_repair');
for(const item of data.items.filter(i=>i.kind==='NOTE' || i.key.startsWith('note-question:'))) {
  assert.ok(new URL(item.url,'https://ivme.local').searchParams.get('konu'),item.key);
  assert.ok(item.exampleSources.length,item.key);
  assert.ok(item.exampleSources.every(e=>items.has(e.sourceKey)),item.key);
  for(const a of item.automaticLabels.assignments) assert.ok(a.locators.some(l=>l.type==='NOTE'),item.key);
}
// These source subjects are demonstrably wrong: the inspected stems concern magnetism/transformers, not chemistry.
for(const p of proposals.proposals.filter(p=>p.targets[0].subjectId==='fizik' && originals.get(p.code).subject==='Kimya')) {
  assert.ok(items.get(`question:${p.code}`).automaticLabels.assignments.every(a=>categories.get(a.categoryId).subjectId==='fizik'),p.code);
}
for(const branch of ['matematik','geometri'])for(const exam of ['TYT','AYT']) {
  assert.ok(data.items.some(i=>i.kind==='QUESTION'&&i.exam===exam&&i.subjectId===branch),`${exam}/${branch}`);
}
const movement='tyt.fizik.hareket-ve-kuvvet';
for(const kind of ['PDF','QUESTION','VIDEO'])assert.ok(data.items.some(i=>i.kind===kind&&i.automaticLabels.assignments.some(a=>a.categoryId===movement)),kind);
assert.ok(data.items.some(i=>i.kind==='QUESTION'&&!i.studentVisible&&i.availability==='source_only'));
const audit=read('veri/content-labels/audit.json');
const report=read('veri/content-labels/report.json');
assert.equal(audit.runKey,report.runKey,'Audit must describe the published label payload');
assert.deepEqual(audit.failures,[]);
assert.equal(audit.coveredPhysicalPdfs,audit.physicalPdfs,'Every physical PDF is represented');
assert.equal(audit.unaccountedSourceFiles,0);
assert.equal(audit.accountedSourceFiles,audit.sourceFiles);
assert.ok(audit.solutionIndexes>=51);
for(const archive of audit.archives) for(const member of archive.members) {
  assert.ok(items.has(member.coveredBy),member.member);
  assert.ok(member.categoryIds.length,member.member);
}
assert.ok(audit.curriculumReferences>=18);
for(const fragment of audit.duplicateHeaderFragments) {
  assert.ok(items.has(fragment.coveredBy),fragment.key);
  assert.ok(fragment.categoryIds.length,fragment.key);
}
const supplementary=pdf.items.filter(i=>i.sourceScope==='RESOURCES');
assert.ok(supplementary.length>=11,'Includes booklets, guidance references and scanned worksheets');
const worksheet=supplementary.find(i=>i.relativePath==='islenmemis/fonksiyonlar karma.pdf');
assert.equal(worksheet.automaticLabels.contentFormat,'TEST');
assert.deepEqual(worksheet.automaticLabels.pageSegments,[
  {from:1,to:15,contentFormat:'TEST'},{from:16,to:16,contentFormat:'CEVAP_ANAHTARI'},
]);
assert.equal(worksheet.automaticLabels.evidence.filter(e=>e.method==='PAGE_OCR').length,16);
for(const p of proposals.proposals.filter(p=>p.sourceProblem)) {
  const repair=originals.get(p.code).renderedSourceRepair,item=items.get(`question:${p.code}`);
  assert.equal(item.availability,repair?'available':'needs_repair',p.code);
  if(repair) {
    assert.ok(item.automaticLabels.evidence.some(e=>e.type==='SOURCE_PDF_RENDER_REPAIR' && e.renderedImageSha256===repair.renderedImageSha256));
    assert.equal(item.manualReview.code,'LABEL_REVIEW');
    assert.ok(!item.automaticLabels.reviewReasons.includes(p.sourceProblem));
  }
}
console.log(`Verified ${items.size} resources, ${categories.size} controlled categories, ${proposals.proposals.length} source-bound proposals; complete coverage with no invented teacher approvals.`);
