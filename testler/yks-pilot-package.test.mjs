import test from 'node:test';
import assert from 'node:assert/strict';
import {pilotResource} from '../scripts/yks-pilot-package.mjs';

const category={id:'new-leaf',exam:'AYT',subjectId:'din',subject:'Din Kültürü ve Ahlak Bilgisi',
  topic:'Tasavvufi Düşüncenin Ahlaki Boyutu',origin:'CURRICULUM',subtopic:''};
const card={code:'source-q1',exam:'AYT',subjectId:'din',subject:category.subject,sourceSha256:'a'.repeat(64),
  printedNumber:1,pdfPage:1,bboxPt:[1,2,3,4],image:'source.webp',imageSha256:'b'.repeat(64),textSha256:'c'.repeat(64),
  text:'Tasavvuf insanı kötü huylardan arındırmayı hedefler.',answer:'A',answerOrigin:'EXPLICIT_PRINTED_SOURCE_KEY',
  keyEvidenceSha256:'d'.repeat(64),sourceKeyDocumentSha256:'a'.repeat(64),sourceKeyPage:2,
  answerReadingMethods:'NATIVE_PLUS_INDEPENDENT_QWEN_CROP',optionCounts:{A:1,B:1,C:1,D:1,E:1},containsGraphics:false,reviewConcerns:[]};
const decision={sourceCode:card.code,sourceImageSha256:card.imageSha256,sourceTextSha256:card.textSha256,
  categoryId:category.id,answer:'A',productionImportAccepted:false,teacherApproved:false,
  sourceReading:{questionQuote:card.text,topicQuote:'Tasavvufun amacı ahlaki olgunluktur.'},topicPdfSha256:'e'.repeat(64),
  independentContentCheck:{status:'INDEPENDENT_TOPIC_SUPPORTED'}};
const build=(c=card,d=decision,categories=[category])=>pilotResource(c,d,{categoryDefinitions:categories},'candidate-v1');

test('source evidence uses exact controlled leaf while review stays pending',()=>{
  const item=build();
  assert.deepEqual(item.categoryIds,['new-leaf']);
  assert.equal(item.automaticLabels.assignments[0].review.status,'PENDING');
  assert.equal(item.automaticLabels.assignments[0].review.reviewer,null);
  assert.equal(item.automaticLabels.assignments[0].scopeStatus,'CANDIDATE');
  assert.equal(item.automaticLabels.assignments[0].confidence,'LOW');
  assert.equal(item.automaticLabels.assignments[0].locators[1].pdfPageStart,1);
  assert.equal(item.correctAnswer,undefined);
});
test('missing key, invented answer, incomplete options and source crop replacement are refused',()=>{
  for(const change of [{keyEvidenceSha256:null},{answer:'F'},{answerOrigin:'AI_SOLUTION'},
      {imageSha256:'other'},{optionCounts:{A:1,B:1,C:1,D:1}}])assert.throws(()=>build({...card,...change}));
});
test('wrong exam/branch and unsupported topic cannot enter the package',()=>{
  for(const change of [{exam:'TYT'},{subjectId:'tarih'}])assert.throws(()=>build(card,decision,[{...category,...change}]));
  assert.throws(()=>build(card,{...decision,independentContentCheck:{status:'INDEPENDENT_TOPIC_INSUFFICIENT'}}));
  assert.throws(()=>build(card,{...decision,categoryId:'invented'}));
});
test('machine package cannot fabricate teacher or production acceptance',()=>{
  assert.throws(()=>build(card,{...decision,teacherApproved:true}));
  assert.throws(()=>build(card,{...decision,productionImportAccepted:true}));
});
