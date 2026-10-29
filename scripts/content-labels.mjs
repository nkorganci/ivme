// Deterministic shared labels for all source types. Source-based proposals never imply teacher approval.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { normalise, matchTopics, canonicalPhysicsSubtopics } from './pdf-review-taxonomy.mjs';
import { aliasTerm, controlledCategory, categoryForTerms, categoriesById as controlledCategories, taxonomy } from './content-taxonomy.mjs';
import { enrichResource, validateResource, attachSourceLocations, attachPdfLocations, attachVideoMetadata } from './learning-resource-contract.mjs';
import { physicsTopics, physicsTargets } from './physics-topics.mjs';
import {canonicalizeUnits,canonicalUnits,suggestUnits} from './canonical-units.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const sha = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const base = read('backend/src/main/resources/content-review-catalog.json');
const pdf = read('backend/src/main/resources/pdf-review-labels.json');
const inventory = read('veri/content-labels/source-inventory.json');
const proposals = new Map(read('ornek-veri/content-ai-question-labels.json').proposals.map(p=>[p.code,p]));
const usedProposals = new Set();
const vocabulary = read('backend/src/main/resources/review-vocabulary.json');
const pdfLocationFile=path.join(root,'veri/content-labels/pdf-locations.json');
const pdfLocations=fs.existsSync(pdfLocationFile)?read('veri/content-labels/pdf-locations.json'):null;
const videoInventoryFile=path.join(root,'veri/content-labels/video-inventory.json');
const videoInventory=fs.existsSync(videoInventoryFile)?read('veri/content-labels/video-inventory.json'):null;
const videoContentFile=path.join(root,'veri/content-labels/video-content-index.json');
const videoContent=fs.existsSync(videoContentFile)?read('veri/content-labels/video-content-index.json'):null;
const categories = new Map([...base.categories, ...pdf.categories].map(c => [c.id, c]));
for (const c of controlledCategories.values()) categories.set(c.id,c);
const originalIds = new Set(categories.keys());
const branchNames = new Map(base.branches.map(b => [b.id, b.name]));
const subjectIds = { 'Türkçe':'turkce', 'Türk Dili ve Edebiyatı':'edebiyat', 'Matematik':'matematik', 'Geometri':'geometri',
  'Fizik':'fizik', 'Kimya':'kimya', 'Biyoloji':'biyoloji', 'Tarih':'tarih', 'Tarih-1':'tarih', 'Tarih-2':'tarih',
  'Coğrafya':'cografya', 'Coğrafya-1':'cografya', 'Coğrafya-2':'cografya', 'Felsefe':'felsefe', 'Felsefe Grubu':'felsefe',
  'Din Kültürü':'din', 'Din Kültürü ve Ahlak Bilgisi':'din', 'Psikoloji':'psikoloji', 'Sosyoloji':'sosyoloji', 'Mantık':'mantik' };
export const alias = value => aliasTerm(value, 'content');
const clean = value => String(value || '').replace(/[\x00-\x1f\x7f-\x9f]/g,' ').replace(/\s+/g,' ').trim();
const unknown = value => !alias(value) || /siniflandir|belirsiz|konu listesi yok|^bilinmiyor$/.test(alias(value));
const index = new Map();
const key = (exam, branch, topic, sub = '') => [exam, branch, alias(topic), alias(sub)].join('|');
for (const c of categories.values()) if (!index.has(key(c.exam,c.subjectId,c.topic,c.subtopic)))
  index.set(key(c.exam,c.subjectId,c.topic,c.subtopic),c);
const canonical = new Map();
for (const c of base.categories.filter(c => c.origin === 'CURRICULUM' && !c.subtopic)) {
  const k = `${c.exam}|${c.subjectId}`;
  if (!canonical.has(k)) canonical.set(k,new Set());
  canonical.get(k).add(c.topic);
}
function category(exam, branch, topic, subtopic = '') {
  topic = clean(topic); subtopic = clean(subtopic);
  const k = key(exam,branch,topic,subtopic);
  if (index.has(k)) return index.get(k);
  if (branch === 'fizik') {
    const existing = [...controlledCategories.values()].find(c=>c.exam===exam && c.subjectId===branch &&
      [c.topic,...(c.aliases || [])].some(t=>alias(t)===alias(topic)) && alias(c.subtopic)===alias(subtopic));
    const targets=physicsTargets({exam,topic,subtopic});
    const c=existing || (targets.length===1?controlledCategories.get(targets[0]):subtopic?category(exam,branch,topic):
      controlledCategories.get(`system.fizik.${exam.toLowerCase()}.konu-incelemesi`));
    categories.set(c.id,c);index.set(k,c);return c;
  }
  const registered = categoryForTerms(exam,branch,topic,subtopic);
  if (registered) { categories.set(registered.id,registered); index.set(k,registered); return registered; }
  const parent = subtopic ? category(exam,branch,topic) : null;
  const id = subtopic ? `content-subtopic:${parent.id}:${sha(alias(subtopic)).slice(0,20)}`
    : `source:${exam.toLowerCase()}.${branch}.${sha(topic).slice(0,20)}`;
  if(!controlledCategories.has(id)) {
    const ids=suggestUnits([subtopic,topic],exam,branch);
    const c=ids.length===1?controlledCategories.get(ids[0]):parent||controlledCategories.get(`system.${branch}.${exam.toLowerCase()}.konu-incelemesi`)||controlledCategories.get('system.kapsam-incelemesi');
    index.set(k,c);return c;
  }
  const c = controlledCategory({ id, exam, subjectId:branch, subject:branchNames.get(branch) || branch, topic, subtopic,
    origin:'SOURCE', ...(parent ? {parentId:parent.id} : {}) });
  categories.set(id,c); index.set(k,c); return c;
}
const resolveCache = new Map();
function resolve(exam, branch, value) {
  value = clean(value); if (unknown(value)) return [];
  const k = key(exam,branch,value);
  if (resolveCache.has(k)) return resolveCache.get(k);
  const exact = [...(canonical.get(`${exam}|${branch}`) || [])].find(t => alias(t) === alias(value));
  let titles = exact ? [exact] : matchTopics(value,branch,canonical.get(`${exam}|${branch}`));
  // Explicit compound headings can refer to multiple concepts. Never parse the question body this way.
  if (!exact) for (const part of value.split(/\s+ve\s+|[;/]/i)) {
    if (alias(part).length < 5) continue;
    const matched = matchTopics(part,branch,canonical.get(`${exam}|${branch}`));
    titles.push(...matched.filter(t => !titles.includes(t)));
  }
  const found = (titles.length ? titles : [value]).slice(0,4).map(t => category(exam,branch,t));
  resolveCache.set(k,found); return found;
}
function add(labels,c,relation='PRIMARY') {
  if (!labels.some(a => a.categoryId === c.id)) labels.push({categoryId:c.id,relation});
}
function withParents(assignments) {
  const result = [...assignments];
  for (const a of assignments) {
    const c=categories.get(a.categoryId);
    if(c?.parentId) add(result,categories.get(c.parentId),a.relation);
  }
  return result;
}
const items = [];
const unresolved = [];
for (const q of inventory.questions) {
  // KPSS questions carry their own reference topics; content-label-refresh.py re-adds them via scripts/kpss-yayinla.py --katalog.
  if (String(q.exam_type).startsWith('KPSS_')) continue;
  const card=q.card, raw=q.original, archived=q.archive, manual=q.manual;
  const exam=q.exam_type;
  const intake=q.intake;
  let branch=subjectIds[q.subject] || intake?.subjectId;
  if (!branch || !['TYT','AYT'].includes(exam)) throw new Error(`Unsupported source ${q.code}`);
  const reasons=[];
  if(q.sourceQualityIssues?.length)reasons.push(...q.sourceQualityIssues.map(issue=>issue.issueCode));
  if(q.archiveSourceCard) reasons.push(q.archiveSourceCard.reason,'NEW_SOURCE_REQUIRES_REVIEW');
  const evidence=[];
  // Manual source corrections and published source metadata are retained separately from teacher approval.
  const sourceTopic = clean(manual.konu || (unknown(q.topic) ? card.konu : q.topic) || archived.label);
  const archiveRefined = archived.label && !unknown(archived.label)
    && !['source_subject_only','source_question_text_model'].includes(archived.evidence_type)
    && alias(archived.label)!==alias(sourceTopic);
  const topic = archiveRefined ? clean(archived.label) : sourceTopic;
  const alt = clean(manual.alt || card.alt || '');
  if (branch === 'matematik' && /ucgen|dortgen|cokgen|cember|daire|prizma|piramit|kati cisim|analitik geometri|dogrunun analitigi|noktanin analitigi|donusum geometrisi/.test(alias(topic))) branch='geometri';
  if (branch === 'felsefe') {
    if (/psikoloji|psikolojinin|ogrenme bellek|ruh sagligi/.test(alias(topic))) branch='psikoloji';
    else if (/sosyoloji|toplumsal|toplum ve kultur/.test(alias(topic))) branch='sosyoloji';
    else if (/mantik|onerme|kiyas|sembolik/.test(alias(topic))) branch='mantik';
  }
  const assignments=[];
  let targets=intake?[]:resolve(exam,branch,topic);
  for (const c of targets) add(assignments,c);
  if(topic && !unknown(topic)) evidence.push({type:manual.konu?'PRESERVED_SOURCE_CORRECTION':'SOURCE_TOPIC',text:topic,reference:`questions:${q.code}`});
  if(raw.heading && !unknown(raw.heading)) evidence.push({type:'SOURCE_HEADING',text:clean(raw.heading),reference:raw.rawRef,page:raw.page || null});
  if(card.kzn) evidence.push({type:'SOURCE_LEARNING_OUTCOME',text:clean(card.kzn),reference:raw.rawRef || q.code});
  if(archiveRefined) {
    evidence.push({type:archived.evidence_type,text:clean(archived.label),reference:archived.evidence_ref,
      ...(archived.source_page ? {page:Number(archived.source_page)} : {})});
    if(targets.length===1 && alias(topic)!==alias(targets[0].topic)) {
      const physical=branch==='fizik'?canonicalPhysicsSubtopics(targets[0].topic,topic):[];
      for(const name of physical.length?physical:[topic]) add(assignments,category(exam,branch,targets[0].topic,name));
    }
  }
  if(alt && !unknown(alt) && !archiveRefined && !intake) {
    for(const parent of targets) {
      if(alias(alt) === alias(parent.topic)) continue;
      const physical=branch==='fizik' ? canonicalPhysicsSubtopics(parent.topic,alt) : [];
      const names=physical.length?physical:[alt];
      for(const name of names) add(assignments,category(exam,branch,parent.topic,name));
    }
    evidence.push({type:'SOURCE_SUBTOPIC',text:alt,reference:`icerik/data/ogm/q#id=${q.code}`});
  }
  if(intake) {
    for(const a of intake.automaticLabels.assignments) {
      const c=controlledCategories.get(a.categoryId);
      if(!c)throw new Error(`Unknown intake category: ${a.categoryId}`);
      categories.set(c.id,c);add(assignments,c,a.relation);targets.push(c);
    }
    reasons.push('NEW_SOURCE_REQUIRES_REVIEW');
    evidence.push({type:'VALIDATED_INTAKE_SOURCE_METADATA',reference:`intake:${q.code}`,
      text:q.topic || q.subject,categoryIds:assignments.map(a=>a.categoryId)});
  }
  if(intake && proposals.has(q.code)) {
    usedProposals.add(q.code);reasons.push('PREVIOUS_AI_PROPOSAL_SUPERSEDED_BY_INTAKE');
  }
  const proposal=intake?null:proposals.get(q.code);
  if(proposal) {
    if(sha((raw.text || '').trim().replace(/\s+/g,' '))!==proposal.textSha256) throw new Error(`Changed AI source ${q.code}`);
    if(proposal.visualEvidence) {
      const image=path.join(root,'veri/resimler-pilot',proposal.visualEvidence.image);
      if(createHash('sha256').update(fs.readFileSync(image)).digest('hex')!==proposal.visualEvidence.sha256)
        throw new Error(`Changed AI visual source ${q.code}`);
    }
    if(proposal.sourcePdfEvidence) {
      const proof=proposal.sourcePdfEvidence;
      const original=pdf.items.find(p=>p.key===proof.sourceKey);
      if(!original || original.sourceSha256!==proof.sourceSha256 || !Number.isInteger(proof.page) || proof.page<1 || proof.page>original.pageCount)
        throw new Error(`Changed AI original PDF source ${q.code}`);
    }
    assignments.length=0;
    targets=proposal.targets.map(t=>category(t.exam,t.subjectId,t.topic));
    for(const [i,c] of targets.entries()) add(assignments,c,proposal.targets[i].relation);
    branch=proposal.targets[0].subjectId;
    evidence.push(...proposal.evidence.map(({targets: supported, ...e})=>({...e,
      categoryIds:(supported || []).map(t=>category(t.exam,t.subjectId,t.topic).id),
      reference:e.reference || raw.rawRef || q.code})));
    reasons.push('AI_PROPOSAL_REQUIRES_TEACHER_REVIEW');
    if(proposal.targets.some(t=>t.exam!==exam)) reasons.push('CURRICULUM_SCOPE_REVIEW');
    if(proposal.sourceProblem && !q.renderedSourceRepair) reasons.push(proposal.sourceProblem);
    if(q.renderedSourceRepair) {
      reasons.push('SOURCE_IMAGE_REPAIR_PENDING_REVIEW');
      evidence.push({type:'SOURCE_PDF_RENDER_REPAIR',reference:q.renderedSourceRepair.sourcePdf.sourceKey,
        page:q.renderedSourceRepair.sourcePdf.page,sourceSha256:q.renderedSourceRepair.sourcePdf.sourceSha256,
        renderedImageSha256:q.renderedSourceRepair.renderedImageSha256,originalImageSha256:q.renderedSourceRepair.originalSha256});
    }
    usedProposals.add(q.code);
  }
  if(!assignments.length) {
    add(assignments,category(exam,branch,'Dersin genel kapsamı'));
    reasons.push('TOPIC_REQUIRES_ANALYSIS');
    unresolved.push({code:q.code,exam,subject:q.subject,subjectId:branch,text:raw.text || '',heading:raw.heading || '',sourceTopic:q.topic,rawRef:raw.rawRef});
  }
  if(card.yon?.includes('model')) reasons.push('PREVIOUS_MODEL_LABEL');
  if(branch !== subjectIds[q.subject]) reasons.push('SOURCE_BRANCH_MAPPING');
  if(!raw.text?.trim()) reasons.push('VISUAL_QUESTION');
  if(archived.source_subject_conflict==='true') reasons.push('SOURCE_SUBJECT_CONFLICT');
  if(!q.active) reasons.push('SOURCE_ONLY_NOT_IN_STUDENT_BANK');
  const skills=[];
  // These are format cues, not a claim that the full solution was assessed.
  const stem=normalise((raw.text || '').split(/\bA\s*\)/)[0]);
  if(/grafi[kğ]|grafikte|grafikler/.test(stem)) skills.push('YORUMLAMA');
  if(/hesaplay|kac (?:metre|saniye|gram|mol|lira)|sayisal deger/.test(stem)) skills.push('HESAPLAMA');
  const labels={assignments:withParents(assignments),difficulty:'BELIRLENMEDI',contentFormat:'SORU',skills,
    grades:card.sinif>=9 && card.sinif<=12 ? [card.sinif] : [],provenance:proposal ? proposal.method : 'SOURCE_EVIDENCE',
    basis:proposal ? 'AI_SOURCE_ANALYSIS' : manual.konu?'PRESERVED_SOURCE_CORRECTION':targets.length?'SOURCE_TOPIC_AND_SUBTOPIC':'SUBJECT_ONLY',
    reviewRequired:true,reviewReasons:reasons,evidence,inputFingerprint:q.inputFingerprint,
    sourceMethod:card.yon || archived.evidence_type || 'SOURCE_RECORD',...(proposal?{analysisNote:proposal.note}: {})};
  items.push({key:`question:${q.code}`,kind:'QUESTION',exam,subjectId:branch,subject:branchNames.get(branch),
    title:q.code,topic:targets[0]?.topic || 'Dersin genel kapsamı',sourceTopic:q.topic || '',bank:q.bank,
    studentVisible:!!q.active,availability:q.sourceQualityIssues?.length?'needs_repair':!q.active?'source_only':proposal?.sourceProblem && !q.renderedSourceRepair?'needs_repair':'available',
    url:q.active?`/soru/${encodeURIComponent(q.code)}`:'',
    questionCode:q.code,sourceUpdatedAt:q.updated_at,
    ...(q.archiveSourceCard?{archiveSourceCard:q.archiveSourceCard}:{}),
    ...(!q.active ? {text:raw.text || '',source:raw.rawRef || '',choiceCount:0} : {}),automaticLabels:labels});
}
for(const source of base.items) {
  const assignments=[];
  const explicit=(source.suggestedCategoryIds || [source.categoryId || source.topicId]).filter(id=>categories.has(id));
  for(const id of explicit) add(assignments,categories.get(id));
  const topics=source.lesson?.topics || [source.topic];
  // Resolve names onto shared curriculum/PDF IDs instead of copying source archive identities.
  if(source.origin!=='OGM_VIDEO_REFERENCE')
    for(const topic of topics) for(const c of resolve(source.exam,source.subjectId,topic)) add(assignments,c);
  if(!assignments.length) add(assignments,category(source.exam,source.subjectId,'Dersin genel kapsamı'));
  const labels={assignments:withParents(assignments),difficulty:source.kind==='TOPIC'?'UYGULANMAZ':'BELIRLENMEDI',
    contentFormat:source.kind==='TOPIC'?'UYGULANMAZ':source.kind==='QUESTION'?'SORU':'KONU_ANLATIMI',skills:[],grades:[],
    provenance:source.origin==='OGM_VIDEO_REFERENCE'?'LINKED_SOURCE_METADATA':'EXPLICIT_CONTENT_MAPPING',basis:explicit.length?'EXPLICIT_CATEGORY_ID':'SOURCE_TOPIC',reviewRequired:true,
    reviewReasons:source.kind==='VIDEO'?['VIDEO_CONTENT_NOT_FULLY_REVIEWED']:[],
    evidence:source.refs?.length ? source.refs.map(r=>({type:'SOURCE_PAGE',reference:`pdf:${r.catalogId}`,page:r.page,text:r.title || source.title}))
      : [{type:'CURATED_SOURCE_MAPPING',text:source.title,reference:source.key}],inputFingerprint:sha(source)};
  const noteParts=source.key.split(':');
  const noteUrl=`/kaynakli-ders-notlari/${noteParts[1]}?konu=${encodeURIComponent(noteParts[2] || '')}`;
  let url=source.kind==='VIDEO'?source.url:source.kind==='NOTE'?`${noteUrl}#${noteParts[2]}`
    :source.key.startsWith('note-question:')?noteParts[3]==='practice'?`${noteUrl}#kendini-dene`:
      `${noteUrl}&kalip=${encodeURIComponent(noteParts[3])}#soru-kaliplari`:'/dersler-ve-konular';
  items.push({key:source.key,kind:source.kind,exam:source.exam,subjectId:source.subjectId,subject:source.subject,
    title:source.title,topic:source.topic,bank:source.bank || '',studentVisible:source.kind!=='TOPIC',
    availability:'available',url,automaticLabels:labels});
}
for(const source of pdf.items) {
  const sectionAssignments=(pdfLocations?.items?.[source.key]?.assignments || []).map(a=>({categoryId:a.categoryId,relation:a.relation || 'PRIMARY'}));
  const combined=[...source.automaticLabels.assignments];
  for(const a of sectionAssignments) if(!combined.some(old=>old.categoryId===a.categoryId))combined.push(a);
  const labels={...source.automaticLabels,assignments:withParents(combined),reviewRequired:true,
    reviewReasons:[...(source.automaticLabels.reviewReasons || []),...(source.availability==='available'?[]:['SOURCE_UNAVAILABLE']),
      ...(source.automaticLabels.basis==='SOURCE_TITLE_ONLY'?['SOURCE_TITLE_ONLY_REQUIRES_REVIEW']:[])],inputFingerprint:sha(source),
    evidence:source.automaticLabels.evidence.length ? source.automaticLabels.evidence
      : [{type:'SOURCE_TITLE',text:source.title,reference:source.key,sourceSha256:source.sourceSha256 || ''}]};
  items.push({key:source.key,kind:'PDF',exam:source.exam,subjectId:source.subjectId,subject:source.subject,
    title:source.title,topic:source.topic,bank:'',studentVisible:true,availability:source.availability,
    url:`/api/learning-resources/pdf/${source.catalogId}`,catalogId:source.catalogId,automaticLabels:labels});
}
const seen=new Set();
const sourceDetails=new Map([...inventory.questions.map(q=>[`question:${q.code}`,q]),...base.items.map(s=>[s.key,s]),...pdf.items.map(s=>[s.key,s])]);
const pdfByPath=new Map(pdf.items.filter(p=>p.relativePath).map(p=>[p.relativePath,p]));
if(usedProposals.size!==proposals.size) throw new Error('AI proposal refers to a removed source; review the change');
for(const item of items) {
  if(seen.has(item.key)) throw new Error(`Duplicate resource ${item.key}`);seen.add(item.key);
  const a=item.automaticLabels.assignments;
  if(!a.length || !a.some(x=>x.relation==='PRIMARY') || a.length>categories.size) throw new Error(`Invalid labels ${item.key}`);
  for(const x of a) if(!categories.has(x.categoryId)) throw new Error(`Unknown category ${x.categoryId}`);
  if(!vocabulary.contentFormat[item.automaticLabels.contentFormat]) throw new Error(`Unknown format ${item.key}`);
  for(const skill of item.automaticLabels.skills) if(!vocabulary.skills[skill]) throw new Error(`Unknown skill ${skill}`);
  enrichResource(item,categories,sourceDetails.get(item.key));
  attachSourceLocations(item,sourceDetails.get(item.key),pdfByPath);
  attachPdfLocations(item,sourceDetails.get(item.key),pdfLocations);
  attachVideoMetadata(item,sourceDetails.get(item.key),videoInventory,categories,videoContent);
  canonicalizeUnits(item,categories);
  const contractErrors=validateResource(item,categories);
  if(contractErrors.length) throw new Error(contractErrors.join('\n'));
  const effectiveAssignments=item.automaticLabels.assignments;
  item.searchText=normalise([item.title,item.originalTitle,item.topic,item.sourceTopic,...effectiveAssignments.map(x=>{
    const c=categories.get(x.categoryId);return `${c.topic} ${c.subtopic}`;
  })].filter(Boolean).join(' '));
  item.categoryIds=effectiveAssignments.map(x=>x.categoryId);
  item.subjectIds=[...new Set(effectiveAssignments.map(x=>categories.get(x.categoryId).subjectId))];
  item.examIds=[...new Set(effectiveAssignments.map(x=>categories.get(x.categoryId).exam))];
}
for(const c of categories.values()) if(c.parentId && !categories.has(c.parentId)) throw new Error(`Orphan ${c.id}`);
const summary={version:1,method:'SOURCE_EVIDENCE_V1',resources:items.length,questions:inventory.questions.length,
  registeredQuestions:inventory.registeredQuestions,sourceOnlyQuestions:inventory.sourceOnlyQuestions,
  categories:categories.size,unlabelled:0,teacherApproved:0,requiresTopicAnalysis:unresolved.length,
  sourceAnalysisProposals:usedProposals.size,
  physicsTopics:physicsTopics.length,
  canonicalUnits:canonicalUnits.length,
  curriculumReference:taxonomy.unitReference,
  unitSelectionRequired:items.filter(i=>i.automaticLabels.unitReview).length,
  physicsTopicSelectionRequired:items.filter(i=>i.automaticLabels.physicsTopicReview).length,
  sourceProblems:items.filter(i=>i.automaticLabels.reviewReasons?.some(r=>['INCOMPLETE_QUESTION_CROP','NEIGHBOR_QUESTION_IN_CROP'].includes(r))).length,
  byKind:Object.fromEntries([...new Set(items.map(i=>i.kind))].map(k=>[k,items.filter(i=>i.kind===k).length])),
  byQuestionBranch:Object.fromEntries([...new Set(items.filter(i=>i.kind==='QUESTION').map(i=>i.subjectId))].map(k=>[k,items.filter(i=>i.kind==='QUESTION'&&i.subjectId===k).length])),
  unavailable:items.filter(i=>i.availability!=='available').length,
  availabilityCounts:Object.fromEntries([...new Set(items.map(i=>i.availability))].map(k=>[k,items.filter(i=>i.availability===k).length]))};
const sortedCategories=[...categories.values()].sort((a,b)=>a.id.localeCompare(b.id,'en'));
items.sort((a,b)=>a.key.localeCompare(b.key,'en'));
const payload={version:1,method:summary.method,categories:sortedCategories,items};
const output=JSON.stringify(payload)+'\n';
summary.runKey='labels-v1-'+sha(output).slice(0,24);
const outDir=path.join(root,'veri/content-labels');
fs.mkdirSync(outDir,{recursive:true});
if(process.argv.includes('--check')) {
  if(fs.readFileSync(path.join(outDir,'labels.json'),'utf8')!==output) throw new Error('Shared labels changed; regenerate');
} else {
  fs.writeFileSync(path.join(outDir,'labels.tmp'),output);
  fs.renameSync(path.join(outDir,'labels.tmp'),path.join(outDir,'labels.json'));
  fs.writeFileSync(path.join(outDir,'review-queue.json'),JSON.stringify(unresolved,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'report.json'),JSON.stringify(summary,null,2)+'\n');
  // Only additional controlled identities are packaged; large question evidence stays in the versioned DB archive.
  fs.writeFileSync(path.join(root,'backend/src/main/resources/content-label-categories.json'),
    JSON.stringify({version:1,categories:sortedCategories.filter(c=>!originalIds.has(c.id))},null,2)+'\n');
}
console.log(JSON.stringify(summary,null,2));
