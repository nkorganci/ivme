import {createHash} from 'node:crypto';
import {taxonomy,normaliseTerm} from './content-taxonomy.mjs';
import {displayResourceTitle} from '../frontend/src/resourceMetadata.js';
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export const canonicalUnits=taxonomy.categories.filter(c=>c.canonicalUnit).sort((a,b)=>a.order-b.order);
export function unitTargets(category) {
  return category.canonicalTopicIds || [];
}
export function suggestUnits(texts,exam,subjectId) {
  const candidates=canonicalUnits.filter(c=>c.exam===exam&&c.subjectId===subjectId);
  if(candidates.length===1)return [candidates[0].id];
  const scores=candidates.map(c=>({id:c.id,score:texts.reduce((sum,text,index)=>{
    const value=normaliseTerm(text);if(!value)return sum;
    const exact=[c.topic,...(c.aliases||[])].some(t=>normaliseTerm(t)===value);
    const lengths=c.matchingPatterns.flatMap(p=>[...value.matchAll(new RegExp(p,'g'))].map(m=>m[0].length));
    return sum+(exact?100:Math.max(0,...lengths))*(index===0?3:1);
  },0)})).filter(s=>s.score>=6).sort((a,b)=>b.score-a.score);
  return scores.filter(s=>s.score===scores[0]?.score).slice(0,3).map(s=>s.id);
}
const distinct=values=>[...new Map(values.map(v=>[JSON.stringify(v),v])).values()];

/** Collapse old source relationships after locators have been attached to their original identities. */
export function canonicalizeUnits(item,categories) {
  if(!canonicalUnits.length)return item;
  const labels=item.automaticLabels;
  const original=labels.assignments;
  const leaves=original.filter(a=>!original.some(b=>categories.get(b.categoryId)?.parentId===a.categoryId));
  const resolved=new Map(),pending=[];
  for(const assignment of leaves) {
    const old=categories.get(assignment.categoryId);
    const ids=unitTargets(old).filter(id=>item.kind!=='QUESTION'||categories.get(id)?.exam===item.exam);
    if(ids.length!==1){pending.push({categoryId:old.id,exam:old.exam,subjectId:old.subjectId,topic:old.topic,subtopic:old.subtopic||'',candidateIds:ids});continue;}
    const id=ids[0];
    const previous=resolved.get(id);
    if(previous) {
      previous.locators=distinct([...(previous.locators||[]),...(assignment.locators||[])]);
      previous.evidence=distinct([...(previous.evidence||[]),...(assignment.evidence||[])]);
      if(assignment.relation==='PRIMARY')previous.relation='PRIMARY';
      if(assignment.confidence==='LOW')previous.confidence='LOW';
      previous.locatorStatus=previous.locators.length?([previous.locatorStatus,assignment.locatorStatus].includes('ESTIMATED')?'ESTIMATED':'VERIFIED'):'MISSING';
    } else resolved.set(id,{...structuredClone(assignment),categoryId:id});
  }
  if(item.kind==='QUESTION'&&resolved.size>1) {
    // A contradictory question label is a suggestion for review, not a confirmed multi-unit question.
    pending.push({exam:item.exam,subjectId:item.subjectId,topic:item.sourceTopic||item.topic,
      candidateIds:[...resolved.keys()],reason:'QUESTION_UNIT_CONFLICT'});
    for(const a of resolved.values()) {
      a.scopeStatus='CANDIDATE';a.confidence='LOW';
      a.confidenceReason='Eski konu ilişkileri birden fazla ünite öneriyor; tahmini eşleşme öğretmen kontrolünü bekliyor.';
    }
  }
  const remaining=pending.filter(p=>p.reason==='QUESTION_UNIT_CONFLICT'||!resolved.size||!(/siniflandir|belirsiz|genel kapsam|dersin genel|konu secimi|eslesmesi bekliyor/.test(normaliseTerm(p.topic))
    || p.candidateIds.some(id=>resolved.has(id))));
  if(!resolved.size&&!remaining.length)remaining.push({exam:item.exam,subjectId:item.subjectId,topic:item.topic,candidateIds:[]});
  for(const p of remaining) {
    const suggestions=p.candidateIds.length?p.candidateIds:suggestUnits([p.subtopic||p.topic,item.sourceTopic||item.title,
      ...(labels.evidence||[]).map(e=>e.text||'')],item.kind==='QUESTION'?item.exam:p.exam,p.subjectId);
    if(suggestions.length) {
      p.candidateIds=suggestions;
      for(const id of suggestions)if(!resolved.has(id))resolved.set(id,{...structuredClone(leaves.find(a=>a.categoryId===p.categoryId)||leaves[0]||original[0]),categoryId:id,
        relation:resolved.size?'SECONDARY':'PRIMARY',scopeStatus:'CANDIDATE',confidence:'LOW',
        confidenceReason:'Kaynak başlığı ve mevcut kanıtlardan tahmini ünite; öğretmen kontrolü bekliyor.',
        locators:[],locatorStatus:'MISSING',locatorReason:'Tahmini ünitenin konuya özel konumu doğrulanmadı.'});
      continue;
    }
    const id=`system.${p.subjectId}.${String(p.exam).toLowerCase()}.konu-incelemesi`;
    const fallback=categories.has(id)?id:'system.kapsam-incelemesi';
    if(!resolved.has(fallback))resolved.set(fallback,{...structuredClone(leaves[0]||original[0]),categoryId:fallback,
      relation:resolved.size?'SECONDARY':'PRIMARY',scopeStatus:'CANDIDATE',confidence:'LOW',
      confidenceReason:'Kaynak başlığı referans ünitesine tekil eşleşmedi; kaynak incelemesi gerekli.',
      locators:[],locatorStatus:'MISSING',locatorReason:'Kesin ünite seçilmeden konuya özel aralık aktarılmaz.'});
  }
  labels.assignments=[...resolved.values()];
  if(!labels.assignments.some(a=>a.relation==='PRIMARY')&&labels.assignments.length)labels.assignments[0].relation='PRIMARY';
  // Full original evidence stays in the preceding published run and the migration backup.
  labels.legacyUnitAssignments=original.map(({categoryId,relation})=>({categoryId,relation}));
  const namedGrades=[...new Set([...String(item.originalTitle||item.title).matchAll(/\b(9|10|11|12)[.\s_-]*s[ıi]n[ıi]f/gi)].map(m=>Number(m[1])))];
  const topicGrades=labels.assignments.map(a=>categories.get(a.categoryId)?.grade).filter(Number.isInteger);
  const exams=[...new Set(labels.assignments.map(a=>categories.get(a.categoryId)?.exam))];
  labels.grades=[...new Set(namedGrades.length?namedGrades:topicGrades.length?topicGrades:exams.flatMap(exam=>exam==='TYT'?[9,10]:exam==='AYT'?[11,12]:[9,10,11,12]))].sort((a,b)=>a-b);
  labels.gradeStatus='ESTIMATED';
  labels.gradeReason=namedGrades.length?'Kaynak adındaki sınıf; içerik kapsamı öğretmen kontrolünü bekliyor.':
    topicGrades.length?'Mevcut ünite sınıfı temel alınan tahmin; öğretmen kontrolünü bekliyor.':'Sınav kapsamına göre olası sınıflar; tek bir sınıf doğrulanmadı.';
  labels.evidence=[...(labels.evidence||[]),{type:'CANONICAL_UNIT_MAPPING',reference:'content-taxonomy.json#unitReference',text:'Ortak referans üniteleri; tahmini etiketler öğretmen onayı değildir.'}];
  if(remaining.length) {
    labels.unitReview={status:'NEEDS_SELECTION',legacyLabels:remaining,suggestedCategoryIds:[...new Set(remaining.flatMap(p=>p.candidateIds))],
      reason:'Kaynağın referans üniteyle eşleşmesi inceleme bekliyor.'};
    labels.reviewReasons=[...new Set([...(labels.reviewReasons||[]),'UNIT_SELECTION_REQUIRED'])];
  }
  // Previous physics-only migration metadata is superseded by the shared unit migration.
  delete labels.physicsTopicReview;delete labels.legacyPhysicsAssignments;delete item.physicsTopicMigration;
  for(const a of labels.assignments) {
    a.categoryFingerprint=hash(categories.get(a.categoryId));
    a.relationKey='relation:'+hash(`${item.key}|${a.categoryId}`).slice(0,24);
    a.review={...a.review,categoryFingerprint:a.categoryFingerprint};
  }
  const names=[...new Set(labels.assignments.filter(a=>a.relation!=='PREREQUISITE')
    .map(a=>categories.get(a.categoryId)).filter(c=>c?.canonicalUnit).map(c=>c.topic))];
  item.topic=names.length?(names.length>3?'Karma konular':names.join('; ')):'Ünite eşleşmesi bekliyor';
  item.displayTitle=displayResourceTitle(item,categories);
  item.unitMigration={version:1,status:remaining.length?'NEEDS_SELECTION':'MAPPED',originalCategoryIds:original.map(a=>a.categoryId)};
  return item;
}
