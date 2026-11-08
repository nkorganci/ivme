// Build isolated-pilot v2 resources through the shared resource contract.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {enrichResource,validateResource} from './learning-resource-contract.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

export function pilotResource(card,decision,tree,version) {
  if(decision.sourceCode!==card.code || decision.productionImportAccepted!==false || decision.teacherApproved!==false)
    throw Error('Bounded source-read pilot decision required');
  if(card.answerOrigin!=='EXPLICIT_PRINTED_SOURCE_KEY' || !/^[A-E]$/.test(card.answer) || card.answer!==decision.answer)
    throw Error('Printed source answer proof required');
  if(!/^[a-f0-9]{64}$/.test(card.keyEvidenceSha256 || '') || !/^[a-f0-9]{64}$/.test(card.sourceKeyDocumentSha256 || '') ||
      !Number.isInteger(card.sourceKeyPage) || card.sourceKeyPage<1 ||
      !['NATIVE_PLUS_INDEPENDENT_QWEN_CROP','NATIVE_PLUS_RENDERED_CROP_TUR_OCR','NATIVE_PLUS_PREVIOUS_INDEPENDENT_QWEN_CROP'].includes(card.answerReadingMethods))
    throw Error('Two actual printed-source readings and their key location required');
  if(decision.independentContentCheck?.status!=='INDEPENDENT_TOPIC_SUPPORTED' ||
      !card.text.includes(decision.sourceReading.questionQuote) || !['A','B','C','D','E'].every(k=>card.optionCounts[k]===1))
    throw Error('Complete source options and independent topic evidence required');
  if(card.containsGraphics || card.reviewConcerns.length || card.imageSha256!==decision.sourceImageSha256 || card.textSha256!==decision.sourceTextSha256)
    throw Error('Source crop/version differs from actual pilot reading');
  const categories=new Map(tree.categoryDefinitions.map(c=>[c.id,c]));
  const c=categories.get(decision.categoryId);
  if(!c || c.exam!==card.exam || c.subjectId!==card.subjectId)throw Error('Unknown or wrong-scope controlled category');
  const fingerprint=hash({sourceSha256:card.sourceSha256,page:card.pdfPage,bbox:card.bboxPt,image:card.imageSha256,
    text:card.textSha256,answer:card.answer,key:card.keyEvidenceSha256});
  const item={key:`question:${card.code}`,questionCode:card.code,kind:'QUESTION',exam:card.exam,
    subjectId:card.subjectId,subject:card.subject,title:`MEBİ AYT Tarama 8 — ${card.printedNumber}. soru`,
    topic:c.subtopic || c.topic,bank:'OGM',studentVisible:true,availability:'available',resourceRole:'ACTIVE_QUESTION',
    url:`/soru/${card.code}`,categoryIds:[c.id],subjectIds:[card.subjectId],examIds:[card.exam],
    automaticLabels:{assignments:[{categoryId:c.id,relation:'PRIMARY'}],inputFingerprint:fingerprint,
      reviewRequired:true,reviewReasons:['AI_PROPOSAL_REQUIRES_TEACHER_REVIEW'],
      provenance:'YKS_BOUNDED_SOURCE_READ_PILOT',basis:'SOURCE_QUESTION_AND_TOPIC_PDF_CONTENT',
      difficulty:'BELIRLENMEDI',contentFormat:'SORU',skills:[],grades:[],
      evidence:[{type:'SOURCE_CONTENT_READING',categoryId:c.id,reference:`pdf:${card.sourceSha256}#page=${card.pdfPage}`,
        method:'ACTUAL_SOURCE_CROP_AND_TWO_LOCAL_TOPIC_READINGS',text:decision.sourceReading.questionQuote}]} };
  enrichResource(item,categories,{title:item.title,source:'MEBİ',pageCount:5});
  item.taxonomyVersion=version;
  item.sourceImage={reference:`ogm/mebi-yks/${card.sourceSha256.slice(0,16)}/${card.code}.webp`,
    originalReference:card.image,status:'PRESERVED_REFERENCE',sha256:card.imageSha256};
  const assignment=item.automaticLabels.assignments[0];
  assignment.locators.push({type:'PDF',sourceKey:`pdf:${card.sourceSha256}`,pdfPageStart:card.pdfPage,pdfPageEnd:card.pdfPage,pageCount:5});
  assignment.evidence.push({association:'RELATION',reference:`pdf:${decision.topicPdfSha256}`,sourceVersion:decision.topicPdfSha256,
    method:'ACTUAL_MEBI_TOPIC_PDF_CONTENT',readability:'NOT_MEASURED',text:decision.sourceReading.topicQuote});
  const errors=validateResource(item,categories);
  if(errors.length)throw Error(errors.join('; '));
  return item;
}

function main() {
  if(process.argv.length!==5)throw Error('Expected input, candidate tree and output paths');
  const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  const tree=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
  const taxonomyVersion=`yks-pilot-candidate-${hash(tree.categoryDefinitions).slice(0,24)}`;
  const decisions=new Map(input.selection.newPilotQuestions.map(d=>[d.sourceCode,d]));
  if(decisions.size!==3 || input.cards.length!==3)throw Error('Exactly three bounded new pilot questions required');
  const resources=input.cards.map(c=>pilotResource(c,decisions.get(c.code),tree,taxonomyVersion));
  const result={status:'PASS',scope:'UNPUBLISHED_ISOLATED_PILOT_ONLY',taxonomyVersion,resources,
    questionBankWrites:0,catalogPublished:false,teacherApproved:false};
  fs.writeFileSync(process.argv[4],JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',resources:resources.length,questionBankWrites:0,teacherApproved:false}));
}
if(process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1])main();
