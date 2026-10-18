import {qs} from './api.js';
import {normaliseTopic} from './curriculumLinks.js';

const SUBJECTS={'Türkçe':'turkce','Türk Dili ve Edebiyatı':'edebiyat','Geometri':'geometri',
  'Tarih':'tarih','Tarih-1':'tarih','Tarih-2':'tarih','Coğrafya':'cografya','Coğrafya-1':'cografya','Coğrafya-2':'cografya',
  'Felsefe':'felsefe','Psikoloji':'psikoloji','Sosyoloji':'sosyoloji','Mantık':'mantik',
  'Din Kültürü':'din','Din Kültürü ve Ahlak Bilgisi':'din','Fizik':'fizik','Kimya':'kimya','Biyoloji':'biyoloji'};
export function sourceSubject(row) {
  if(row.subject==='Matematik')return /ucgen|dortgen|cokgen|cember|daire|kati cisim|uzay geometri|analitik geometri|donusum|vektor/.test(normaliseTopic(row.topic))?'geometri':'matematik';
  if(row.subject==='Felsefe Grubu') {
    const name=row.topic?.match(/^\s*(Felsefe|Psikoloji|Sosyoloji|Mantık)\s*[–-]\s*/iu)?.[1];
    return SUBJECTS[name]||null;
  }
  return SUBJECTS[row.subject]||null;
}
const sourceTitle=row=>row.subject==='Felsefe Grubu'?row.topic?.replace(/^\s*(Felsefe|Psikoloji|Sosyoloji|Mantık)\s*[–-]\s*/iu,''):row.topic;
const blankStats=()=>({total:0,curriculum:0,sourceOnly:0,unclassified:0,unsupported:0});

// The caller supplies published metadata. There is no second alias/topic dictionary.
export function invalidCikmisAliases(categories=[]) {
  const ids=new Set(categories.map(c=>c.id));
  return categories.flatMap(c=>(c.canonicalTopicIds||[]).filter(id=>!ids.has(id)).map(id=>[c.id,id]));
}
export function buildCikmisCoverage(filterRows=[],exam=null,categories=[]) {
  const byTopic=new Map(),extraBySubject=new Map(),totals=blankStats(),byExam={TYT:blankStats(),AYT:blankStats()};
  const byId=new Map(categories.map(c=>[c.id,c]));
  for(const row of filterRows) {
    if(row.bank!=='CIKMIS'||!Number.isInteger(row.count)||row.count<=0||(exam&&exam!==row.examType))continue;
    const stats=byExam[row.examType],subject=sourceSubject(row),title=sourceTitle(row)?.trim()||'';
    totals.total+=row.count;if(stats)stats.total+=row.count;
    if(!stats||!subject){totals.unsupported+=row.count;if(stats)stats.unsupported+=row.count;continue;}
    const unclassified=!title||/siniflandirilm/.test(normaliseTopic(title));
    const term=normaliseTopic(title);
    const scoped=categories.filter(c=>c.exam===row.examType&&c.subjectId===subject);
    const exact=scoped.filter(c=>c.canonicalUnit&&normaliseTopic(c.topic)===term);
    const definitions=exact.length?exact:scoped.filter(c=>[c.topic,...(c.aliases||[])].some(t=>normaliseTopic(t)===term));
    const targets=[...new Set(definitions.flatMap(c=>c.canonicalTopicIds||[]))].filter(id=>byId.get(id)?.canonicalUnit);
    const matched=!unclassified&&targets.length===1?byId.get(targets[0]):null;
    const link={...row,to:`/cikmis-sorular${qs(matched?{examType:row.examType,categoryId:[matched.id]}:{examType:row.examType,subject:row.subject,topic:row.topic})}`};
    if(matched) {
      const links=byTopic.get(matched.id)||[];links.push(link);byTopic.set(matched.id,links);
      totals.curriculum+=row.count;stats.curriculum+=row.count;
    } else {
      const key=`${row.examType}|${subject}`,extras=extraBySubject.get(key)||new Map(),extraKey=unclassified?'__unclassified__':term;
      const extra=extras.get(extraKey)||{id:`source-row:${key}:${extraKey}`,title:unclassified?'Ünite tahmini bekliyor':title,unclassified,links:[]};
      extra.links.push(link);extras.set(extraKey,extra);extraBySubject.set(key,extras);
      const type=unclassified?'unclassified':'sourceOnly';totals[type]+=row.count;stats[type]+=row.count;
    }
  }
  return {byTopic,extraBySubject,totals,byExam};
}
