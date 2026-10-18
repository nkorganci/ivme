import fs from 'node:fs';
import assert from 'node:assert/strict';
import { enrichResource, validateResource, reviewIsCurrent, legacyNoteReference, legacyHintReference, attachSourceLocations, attachVideoMetadata } from '../scripts/learning-resource-contract.mjs';
import { displayResourceTitle, timeLabel, locatedResourceUrl } from '../frontend/src/resourceMetadata.js';
const cats=new Map([['c1',{id:'c1',exam:'TYT',subjectId:'fizik',subject:'Fizik',topic:'Hareket',subtopic:''}],
  ['c2',{id:'c2',exam:'TYT',subjectId:'fizik',subject:'Fizik',topic:'Elektrik',subtopic:''}]]);
const fixture=(kind='PDF')=>enrichResource({key:`${kind.toLowerCase()}:one`,kind,title:'Özgün başlık',automaticLabels:{
  assignments:[{categoryId:'c1',relation:'PRIMARY'},{categoryId:'c2',relation:'PRIMARY'}],evidence:[{type:'SOURCE_TITLE',text:'Özgün başlık'}],inputFingerprint:'source-1',reviewReasons:[]}},cats,{title:'Özgün başlık',relativePath:'eski/özgün.pdf',source:'OGM',pageCount:20});
const examples=[];
const pdf=fixture();
assert.deepEqual(validateResource(pdf,cats),[]);
assert.equal(pdf.originalFilename,'özgün.pdf');
assert.ok(pdf.automaticLabels.assignments.every(a=>a.locatorStatus==='MISSING' && a.confidence==='LOW' && a.review.status==='PENDING'));
const [first,second]=pdf.automaticLabels.assignments;
first.locatorStatus='ESTIMATED';first.locators=[{type:'PDF',sourceKey:pdf.key,pdfPageStart:2,pdfPageEnd:4,pageCount:20},
  {type:'PDF',sourceKey:pdf.key,pdfPageStart:9,pdfPageEnd:10,pageCount:20}];
second.locatorStatus='ESTIMATED';second.locators=[{type:'PDF',sourceKey:pdf.key,pdfPageStart:14,pdfPageEnd:18,pageCount:20}];
assert.deepEqual(validateResource(pdf,cats),[]);
examples.push(pdf);
for(const range of [{pdfPageStart:0},{pdfPageStart:5,pdfPageEnd:4},{pdfPageEnd:21}]) {
 const bad=structuredClone(pdf);Object.assign(bad.automaticLabels.assignments[0].locators[0],range);
 assert.ok(validateResource(bad,cats).some(e=>e.includes('Invalid PDF range')));
}
const video=fixture('VIDEO');
for(const [index,a] of video.automaticLabels.assignments.entries()) {
 a.locatorStatus='ESTIMATED';a.locators=[{type:'VIDEO',startSeconds:index*30,endSeconds:index*30+30,durationSeconds:120}];
}
assert.deepEqual(validateResource(video,cats),[]);examples.push(video);
for(const range of [{startSeconds:-1},{startSeconds:30,endSeconds:30},{endSeconds:121},{durationSeconds:NaN}]) {
 const bad=structuredClone(video);Object.assign(bad.automaticLabels.assignments[0].locators[0],range);
 assert.ok(validateResource(bad,cats).some(e=>e.includes('Invalid video range')));
}
assert.equal(timeLabel(3901),'01:05:01');
assert.ok(locatedResourceUrl('https://youtu.be/abc',video.automaticLabels.assignments[1].locators[0]).endsWith('?t=30'));
assert.equal(locatedResourceUrl('/api/learning-resources/pdf/1#page=1',first.locators[0]),'/api/learning-resources/pdf/1#page=2');
const approved=structuredClone(pdf);const a=approved.automaticLabels.assignments[0];
a.review.status='APPROVE';a.review.reviewer='teacher-fixture';a.review.reviewedAt='2026-10-16T12:00:00Z';
assert.deepEqual(validateResource(approved,cats),[]);
approved.sourceVersion='source-2';assert.equal(reviewIsCurrent(a,approved,cats.get('c1')),false);
assert.ok(validateResource(approved,cats).some(e=>e.includes('Stale')));
assert.equal(reviewIsCurrent(first,pdf,{...cats.get('c1'),topic:'Yeni tanım'}),false);
const empty=fixture();empty.automaticLabels.assignments=[];
assert.ok(validateResource(empty,cats).length);
assert.equal(displayResourceTitle(pdf,cats),pdf.displayTitle);
assert.ok(!pdf.displayTitle.includes('||'));
const q=enrichResource({key:'question:q1',questionCode:'q1',kind:'QUESTION',title:'q1',studentVisible:true,
  automaticLabels:{assignments:[{categoryId:'c1',relation:'PRIMARY'}],evidence:[],inputFingerprint:'q-source'}},cats);
attachSourceLocations(q,{original:{file:'bank.pdf',page:12,rawRef:'bank#q1'}},[{key:'pdf:bank',catalogId:7,relativePath:'bank.pdf',pageCount:20}]);
assert.deepEqual(validateResource(q,cats),[]);
assert.equal(q.automaticLabels.assignments[0].locators[1].pdfPageStart,12);
assert.equal(q.automaticLabels.assignments[0].locatorStatus,'ESTIMATED');
const bound=enrichResource({key:'question:bound',kind:'QUESTION',title:'bound',questionCode:'bound',automaticLabels:{
  assignments:[{categoryId:'c1',relation:'PRIMARY'},{categoryId:'c2',relation:'PREREQUISITE'}],
  evidence:[{type:'MIXED_CARD_SOURCE_SEGMENT',text:'Yalnız hareketi ölçen kök.',categoryIds:['c1']}],
  inputFingerprint:'bound-text',reviewReasons:['PREVIOUS_MODEL_LABEL']}},cats);
assert.equal(bound.automaticLabels.assignments[0].evidence[0].association,'RELATION');
assert.equal(bound.automaticLabels.assignments[1].evidence[0].association,'ITEM_ONLY');
assert.ok(bound.automaticLabels.assignments.every(a=>a.confidence==='LOW'));
attachSourceLocations(bound,{image:'original.webp',original:{questionNumbers:[32],image:'raw.webp'}},[]);
assert.deepEqual(bound.automaticLabels.assignments[0].locators[0].questionNumbers,[32]);
assert.equal(bound.sourceImage.originalReference,'raw.webp');
assert.equal(bound.automaticLabels.assignments[0].locators.filter(l=>l.type==='PDF').length,0);
const mini=enrichResource({key:'note-question:tyt-fizik:lesson:pattern-two',kind:'QUESTION',title:'Mini',automaticLabels:{
  assignments:[{categoryId:'c1',relation:'PRIMARY'}],evidence:[],inputFingerprint:'mini'}},cats);
attachSourceLocations(mini,{examples:[{code:'bound',bank:'OGM',answer:'D',explanation:'private'}]},[]);
assert.equal(mini.automaticLabels.assignments[0].locators[0].sourceKey,'note:tyt-fizik:lesson');
assert.equal(mini.automaticLabels.assignments[0].locators[0].patternId,'pattern-two');
assert.equal(mini.exampleSources[0].sourceKey,'question:bound');
assert.ok(!JSON.stringify(mini.exampleSources).includes('private'));
assert.equal(locatedResourceUrl('/kaynakli-ders-notlari/tyt-fizik?konu=lesson',mini.automaticLabels.assignments[0].locators[0]),
  '/kaynakli-ders-notlari/tyt-fizik?konu=lesson&kalip=pattern-two#soru-kaliplari');
const outOfBounds=structuredClone(q);for(const a of outOfBounds.automaticLabels.assignments)a.locators=a.locators.filter(l=>l.type!=='PDF');
attachSourceLocations(outOfBounds,{original:{file:'bank.pdf',page:21}},[{key:'pdf:bank',relativePath:'bank.pdf',pageCount:20}]);
assert.equal(outOfBounds.sourceLocationStatus,'MISSING');
assert.equal(outOfBounds.automaticLabels.assignments[0].locators.filter(l=>l.type==='PDF').length,0);
const chapterVideo=fixture('VIDEO');chapterVideo.url='https://www.youtube.com/watch?v=abcdefghijk';
attachVideoMetadata(chapterVideo,{url:chapterVideo.url},{sources:{'youtube:abcdefghijk':{availability:'OK',durationSeconds:120,
  metadataFingerprint:'public-metadata',chapters:[{title:'Hareket',startSeconds:30,endSeconds:60}]}}},cats);
assert.equal(chapterVideo.automaticLabels.assignments[0].locatorStatus,'ESTIMATED');
assert.equal(chapterVideo.automaticLabels.assignments[1].locatorStatus,'MISSING');
assert.deepEqual(validateResource(chapterVideo,cats),[]);
const limited=fixture('VIDEO');limited.url=chapterVideo.url;
attachVideoMetadata(limited,{url:limited.url},{sources:{'youtube:abcdefghijk':{httpStatus:429,availability:'HTTP_ERROR',chapters:[]}}},cats);
assert.equal(limited.remoteAvailability,'RATE_LIMITED');
assert.ok(limited.automaticLabels.assignments.every(a=>a.locatorStatus==='MISSING'));
for(const name of ['ic-not','kaynakli-ipucu']) {
 const old=JSON.parse(fs.readFileSync(new URL(`../docs/plan/sema/${name}-v1.ornek.json`,import.meta.url),'utf8'));
 const converted=name==='ic-not'?legacyNoteReference(old):legacyHintReference(old);
 assert.ok(converted.sourceKey.startsWith('pdf:'));
 assert.ok(converted.locator.pdfPageStart>0);
}
const out=new URL('../veri/content-labels/contract/',import.meta.url);fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(new URL('examples.json',out),JSON.stringify(examples,null,2)+'\n');
fs.writeFileSync(new URL('report.json',out),JSON.stringify({version:2,tasks:['03.01','03.02','03.03','03.04'],status:'PASS',
  examples:examples.length,checks:['multiple-primary','discontinuous-pages','different-topic-ranges','pdf-bounds','video-bounds','missing-location','stale-source','stale-category','legacy-adapters','stable-name'],fixtureApprovalsOnly:true},null,2)+'\n');
console.log('Shared resource contract checks passed; separate topic ranges, absent data, stale reviews, names and v1 adapters.');
