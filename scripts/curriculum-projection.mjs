import {createHash} from 'node:crypto';
import {preferredCurriculumCategories} from '../frontend/src/curriculumNavigation.js';

const normalise = value => String(value || '').toLocaleLowerCase('tr-TR').replaceAll('ı','i')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const scopeKey = (exam,subjectId,title) => `${exam.toLowerCase()}.${subjectId}.${normalise(title).replaceAll(' ','-')}`;

/** The published definitions are immutable; navigation provides a separate display projection. */
export function curriculumProjection(taxonomy) {
  const taxonomyVersion='taxonomy-v1-'+createHash('sha256').update(JSON.stringify(taxonomy)).digest('hex').slice(0,24);
  const identities={},titles={};
  for(const c of taxonomy.categories.filter(c=>c.origin==='CURRICULUM'&&!c.subtopic)) {
    titles[c.id]=c.topic;
    for(const term of [c.topic,...(c.aliases||[])]) {
      const key=scopeKey(c.exam,c.subjectId,term);
      if(['EXCEL_FIRST_SHEET','MEBI_PROVIDER'].includes(c.curriculumSource)&&identities[key])continue;
      if(identities[key]&&identities[key]!==c.id) {
        // Title lookups are legacy compatibility only once the provider tree is active.
        // Selectable rows below replace these lookups using explicit provider IDs.
        if(taxonomy.curriculumAuthority==='MEBI_PROVIDER')continue;
        throw Error(`Ambiguous curriculum alias ${key}`);
      }
      identities[key]=c.id;
    }
    identities[c.id]=c.id;
  }
  const physicsTopics=taxonomy.categories.filter(c=>c.canonicalTopic&&c.subjectId==='fizik').sort((a,b)=>a.order-b.order)
    .map(({id,exam,topic,grade,order})=>({id,exam,topic,grade,order}));
  const preferred=taxonomy.curriculumNavigation?preferredCurriculumCategories(taxonomy.curriculumNavigation,taxonomy.categories):null;
  for(const c of preferred||[]) {
    identities[scopeKey(c.exam,c.subjectId,c.topic)]=c.id;titles[c.id]=c.topic;
  }
  const canonicalUnits=(preferred||taxonomy.categories.filter(c=>c.canonicalUnit)).sort((a,b)=>a.order-b.order)
    .map(({id,exam,subjectId,subject,topic,grade,order,unit,unitId,gradeLabel,selectable,contentKey,navigationSelected,navigationUnitLegacyScopeIds})=>
      ({id,exam,subjectId,subject,topic,grade,order,unit,unitId,gradeLabel,selectable,canonicalUnit:true,
        ...(navigationSelected?{contentKey,navigationSelected,navigationUnitLegacyScopeIds}:{})}));
  const unitTargets=Object.fromEntries(taxonomy.categories.filter(c=>c.canonicalTopicIds).map(c=>[c.id,c.canonicalTopicIds]));
  for(const c of preferred||[])if(c.navigationSelected)unitTargets[c.id]=[c.id];
  return {version:1,taxonomyVersion,identities,titles,physicsTopics,canonicalUnits,unitTargets,
    ...(taxonomy.curriculumNavigation?{curriculumNavigation:taxonomy.curriculumNavigation}:{})};
}
