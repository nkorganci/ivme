// Small intake adapter: same controlled registry, naming and v2 validator as publication.
// No OCR, external requests, answers, learner writes or publication occur here.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { taxonomy, taxonomyVersion, aliasTerm, categoriesById } from './content-taxonomy.mjs';
import { enrichResource, validateResource } from './learning-resource-contract.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function resourceDraft(input) {
  if(!['QUESTION','PDF','VIDEO'].includes(input.kind) || !['TYT','AYT'].includes(input.exam))throw Error('Unknown intake kind/exam');
  if(input.kind==='QUESTION' && !input.code)throw Error('Question code required');
  const branch=taxonomy.categories.find(c=>c.subjectId===input.subject || aliasTerm(c.subject)===aliasTerm(input.subject))?.subjectId;
  const scope=taxonomy.categories.filter(c=>c.exam===input.exam && c.subjectId===branch);
  const exact=scope.find(c=>!c.subtopic && c.origin==='CURRICULUM' && aliasTerm(c.topic)===aliasTerm(input.topic))
    || scope.find(c=>!c.subtopic && [c.topic,...(c.aliases || [])].some(t=>aliasTerm(t)===aliasTerm(input.topic)));
  const fallback=scope.find(c=>c.topic==='Dersin genel kapsamı' && !c.subtopic) || categoriesById.get('system.kapsam-incelemesi');
  const selected=input.categoryIds?.length?input.categoryIds.map(id=>{
    const c=categoriesById.get(id);if(!c || c.exam!==input.exam)throw Error('Unknown or wrong-scope category');return c;
  }):[exact || fallback];
  if(selected.some(c=>!c))throw Error('Controlled fallback missing');
  const key=input.kind==='QUESTION'?`question:${input.code}`:input.key;
  if(!key || !key.startsWith(input.kind.toLowerCase()+':'))throw Error('Stable resource key required');
  const fingerprint=hash(input);
  if(input.kind!=='QUESTION' && (typeof input.url!=='string' || !/^https?:\/\//.test(input.url) && !/^\/api\/learning-resources\/pdf\/\d+$/.test(input.url)))throw Error('Safe source URL required');
  const item={key,kind:input.kind,exam:input.exam,subjectId:branch || 'unknown',subject:input.subject,
    title:input.title || input.code || key,topic:selected[0].topic,bank:input.bank || '',
    questionCode:input.kind==='QUESTION'?input.code:undefined,
    studentVisible:input.active!==false,availability:input.kind==='QUESTION'?(input.available===false?'needs_repair':input.available===true?'available':'unverified'):'unverified',
    url:input.kind==='QUESTION'?`/soru/${encodeURIComponent(input.code)}`:input.url,
    automaticLabels:{assignments:selected.map(c=>({categoryId:c.id,relation:'PRIMARY'})),
      inputFingerprint:fingerprint,reviewRequired:true,reviewReasons:['NEW_SOURCE_REQUIRES_REVIEW',...(!exact?['UNMAPPED_SOURCE_TOPIC']:[])],
      provenance:'VALIDATED_INTAKE',basis:exact?'CONTROLLED_SOURCE_TOPIC':'CONTROLLED_BROAD_SCOPE',difficulty:'BELIRLENMEDI',
      contentFormat:input.kind==='QUESTION'?'SORU':'KONU_ANLATIMI',skills:[],grades:[],
      evidence:[{type:'INTAKE_SOURCE_METADATA',reference:key,text:input.topic || input.title || key}]}};
  enrichResource(item,categoriesById,{title:item.title,source:input.source || input.bank || '',pageCount:input.pageCount});
  item.sourceRecordRef=`intake:${key}`;
  if(input.kind==='VIDEO') {
    const u=new URL(input.url),id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v');
    item.canonicalAssetId=['youtu.be','youtube.com','www.youtube.com'].includes(u.hostname) && /^[a-zA-Z0-9_-]{11}$/.test(id || '')?`youtube:${id}`:`url:${input.url}`;
  }
  if(input.image)item.sourceImage={reference:input.image,status:'PRESERVED_REFERENCE'};
  if(input.kind==='QUESTION' && !item.manualReview)item.manualReview={status:'NEEDS_MANUAL_REVIEW',code:'LABEL_REVIEW',
    label:'Yeni soru — manuel inceleme',reason:'Kontrollü konu önerisi doğrulandı; içerik onayı ayrı.',pages:[]};
  for(const assignment of item.automaticLabels.assignments) {
    const supplied=input.locations?.[assignment.categoryId];
    if(supplied?.length) {
      assignment.locators=supplied;assignment.locatorStatus='ESTIMATED';assignment.locatorReason='İçe alımda sağlanan konum; içerik doğrulaması ayrı.';
    }
  }
  if(input.kind==='PDF' || input.kind==='VIDEO')item.manualReview={status:'NEEDS_MANUAL_REVIEW',
    code:input.kind==='PDF'?'LOCATION_REVIEW':'TIME_REVIEW',label:'Kaynak aralığı — manuel inceleme',
    reason:'Yeni kaynağın konu ve konumu bağımsız inceleme bekliyor.',pages:[]};
  const errors=validateResource(item,categoriesById);
  if(errors.length)throw Error(errors.join('; '));
  item.categoryIds=item.automaticLabels.assignments.map(a=>a.categoryId);
  item.subjectIds=[...new Set(item.categoryIds.map(id=>categoriesById.get(id).subjectId))];
  item.examIds=[...new Set(item.categoryIds.map(id=>categoriesById.get(id).exam))];
  if(input.kind==='QUESTION')item.resourceRole=item.studentVisible?'ACTIVE_QUESTION':'ARCHIVE_QUESTION';
  return item;
}
if(process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) {
  try {
    const inputs=JSON.parse(fs.readFileSync(0,'utf8'));
    if(!Array.isArray(inputs) || inputs.length>100000)throw Error('Bounded intake array required');
    process.stdout.write(JSON.stringify({taxonomyVersion,resources:inputs.map(resourceDraft)}));
  } catch { process.stderr.write('Shared resource intake validation failed.');process.exitCode=1; }
}
