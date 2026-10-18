// Existing curriculum/video definitions remain the source; this is a generated API projection.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { SOURCE_CURRICULUM as CURRICULUM, topicId } from '../frontend/src/curriculum.js';
import { controlledCategory, normaliseTerm, taxonomy, aliasTerm } from './content-taxonomy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const videos = JSON.parse(fs.readFileSync(path.join(root, 'frontend/src/data/physicsVideos.json'), 'utf8'));
const items = [];
const branches = new Map();
const categories = [];
const normalise = normaliseTerm;
for (const [exam, subjects] of Object.entries(CURRICULUM)) {
  for (const subject of subjects) {
    branches.set(subject.id, { id: subject.id, name: subject.name });
  for (const unit of subject.units) {
    for (const title of unit.topics) {
      const id = topicId(exam, subject.id, title);
      items.push({ key: `topic:${id}`, kind: 'TOPIC', exam, subject: subject.name, subjectId: subject.id, topic: title,
        subtopic: '', title, source: unit.name, topicId: id });
      categories.push(controlledCategory({ id, exam, subjectId: subject.id, subject: subject.name, topic: title, subtopic: '', origin: 'CURRICULUM' }));
    }
  }
  }
}
for (const topic of videos.topics) {
  const parent = topicId(topic.exam, 'fizik', topic.topic);
  if (!items.some(i => i.topicId === parent)) throw new Error(`Unknown physics topic: ${parent}`);
  for (const lesson of topic.lessons) {
    const lessonKey = `${parent}:${topicId(topic.exam, 'fizik', lesson.title)}`;
    categories.push(controlledCategory({ id: `subtopic:${lessonKey}`, parentId: parent, exam: topic.exam, subjectId: 'fizik', subject: 'Fizik', topic: topic.topic, subtopic: lesson.title, origin: 'CURRICULUM' }));
    items.push({ key: `subtopic:${lessonKey}`, kind: 'TOPIC', exam: topic.exam, subject: 'Fizik',
      subjectId: 'fizik', topic: topic.topic, subtopic: lesson.title, title: lesson.title, source: 'Video alt konu ağacı', topicId: parent, categoryId: `subtopic:${lessonKey}` });
    for (const video of lesson.videos) {
      items.push({ key: `video:${lessonKey}:${video.id}`, kind: 'VIDEO', exam: topic.exam,
        subject: 'Fizik', subjectId: 'fizik', topic: topic.topic, subtopic: lesson.title, title: video.title, categoryId: `subtopic:${lessonKey}`,
        source: videos.teachers.find(t => t.id === video.teacher).name, url: video.url, topicId: parent,
        checkedOn: videos.checkedOn });
    }
  }
}
// OGM's linked videos are independent assets, including those attached to PDFs.
// Preserve old physics item keys; collect additional topic references per provider.
const ogmCatalog=path.join(root,'../veri-hatti/ogm-indirme/katalog.json');
const providerId=url=>{const u=new URL(url);if(!['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(u.hostname))return null;
  const id=u.hostname==='youtu.be'?u.pathname.slice(1).split('/')[0]:u.searchParams.get('v');
  return id?`youtube:${id}`:u.searchParams.get('list')?`youtube-playlist:${u.searchParams.get('list')}`:null;};
const byProvider=new Map(items.filter(i=>i.kind==='VIDEO').map(i=>[providerId(i.url),i]));
if(fs.existsSync(ogmCatalog)) for(const source of JSON.parse(fs.readFileSync(ogmCatalog,'utf8')).filter(s=>s.video)) {
  const id=providerId(source.video);
  if(!id || !/^(?:youtube:[a-zA-Z0-9_-]{11}|youtube-playlist:[a-zA-Z0-9_-]+)$/.test(id)) throw new Error(`Unsupported OGM video reference ${source.id}`);
  const exams=['TYT','AYT'].includes(source.sinav)?[source.sinav]:['TYT','AYT'];
  const targets=[];
  const scopeBranches=source.ders==='genel'?[...branches.keys()].filter(b=>!['psikoloji','sosyoloji','mantik','edebiyat'].includes(b)): [source.ders];
  for(const exam of exams) for(const branch of scopeBranches) {
    const exact=taxonomy.categories.find(c=>c.exam===exam && c.subjectId===branch && !c.subtopic && aliasTerm(c.topic)===aliasTerm(source.baslik));
    const c=exact || taxonomy.categories.find(c=>c.exam===exam && c.subjectId===branch && c.topic==='Dersin genel kapsamı' && !c.subtopic);
    if(!c) throw new Error(`Missing controlled video scope: ${source.id}/${exam}/${branch}`);
    if(!categories.some(current=>current.id===c.id)) categories.push(c);
    targets.push(c.id);
  }
  let item=byProvider.get(id);
  if(!item) {
    const playlist=id.startsWith('youtube-playlist:');
    item={key:`video:${id}`,kind:'VIDEO',exam:exams.join('-'),subject:source.ders_ad,subjectId:source.ders,
      topic:taxonomy.categories.find(c=>c.id===targets[0]).topic,subtopic:'',title:source.baslik,
      source:source.kaynak,url:playlist?`https://www.youtube.com/playlist?list=${id.split(':')[1]}`:`https://www.youtube.com/watch?v=${id.split(':')[1]}`,
      mediaType:playlist?'PLAYLIST':'VIDEO',origin:'OGM_VIDEO_REFERENCE',
      suggestedCategoryIds:[],sourceReferences:[]};
    items.push(item);byProvider.set(id,item);
  }
  item.suggestedCategoryIds=[...new Set([...(item.suggestedCategoryIds || [item.categoryId].filter(Boolean)),...targets])];
  item.sourceReferences=[...(item.sourceReferences || []),{catalogId:source.id,originalUrl:source.video,originalTitle:source.baslik}];
}
else if(fs.existsSync(path.join(root,'backend/src/main/resources/content-review-catalog.json'))) {
  const preserved=JSON.parse(fs.readFileSync(path.join(root,'backend/src/main/resources/content-review-catalog.json'),'utf8'));
  for(const item of preserved.items.filter(i=>i.origin==='OGM_VIDEO_REFERENCE')) {
    items.push(item);
    for(const id of item.suggestedCategoryIds || [])if(!categories.some(c=>c.id===id))categories.push(controlledCategory(taxonomy.categories.find(c=>c.id===id)));
  }
}
const contentIndex=path.join(root,'veri/content-labels/video-content-index.json');
if(fs.existsSync(contentIndex)) for(const [identity,proof] of Object.entries(JSON.parse(fs.readFileSync(contentIndex,'utf8')).sources || {})) {
  const parent=byProvider.get(identity);
  if(!parent || !identity.startsWith('youtube-playlist:'))continue;
  for(const entry of proof.entries || []) {
    if(!/^youtube:[a-zA-Z0-9_-]{11}$/.test(entry.providerId))throw new Error('Invalid playlist child identity');
    let child=byProvider.get(entry.providerId);
    if(!child) {
      child={key:`video:${entry.providerId}`,kind:'VIDEO',exam:parent.exam,subject:parent.subject,subjectId:parent.subjectId,
        topic:parent.topic,subtopic:'',title:entry.title || entry.providerId,source:parent.source,url:entry.url,
        mediaType:'VIDEO',origin:'OGM_VIDEO_REFERENCE',suggestedCategoryIds:[],sourceReferences:[]};
      items.push(child);byProvider.set(entry.providerId,child);
    }
    child.suggestedCategoryIds=[...new Set([...(child.suggestedCategoryIds || [child.categoryId].filter(Boolean)),...(parent.suggestedCategoryIds || [])])];
    child.sourceReferences=[...(child.sourceReferences || []),{playlistProviderId:identity,originalUrl:parent.url,
      coverage:proof.coverage,observedFeedOrder:entry.feedPosition || entry.position}];
  }
}
const notes = JSON.parse(fs.readFileSync(path.join(root, 'frontend/public/kaynakli-notlar.json'), 'utf8'));
const archiveDir = path.join(root, 'frontend/public/kaynakli-etiketler');
for (const file of fs.readdirSync(archiveDir).filter(f => f !== 'manifest.json' && f.endsWith('.json'))) {
  const exam = file.slice(0,3).toUpperCase();
  const rawBranch = file.slice(4,-5);
  const subjectId = ({'din-kulturu':'din','turk-dili-ve-edebiyati':'edebiyat','tarih-1':'tarih','tarih-2':'tarih','cografya-1':'cografya','cografya-2':'cografya','felsefe-grubu':'felsefe'})[rawBranch] || rawBranch;
  const subject = branches.get(subjectId)?.name;
  if (!subject) throw new Error(`Unknown archive branch ${file}`);
  const records = JSON.parse(fs.readFileSync(path.join(archiveDir,file),'utf8'));
  for (const topic of new Set(records.flatMap(r => [r.label,r.source_topic]).filter(Boolean))) {
    if (categories.some(c => c.exam === exam && c.subjectId === subjectId && !c.subtopic &&
      [c.topic,...(c.aliases || [])].some(title=>normalise(title)===normalise(topic)))) continue;
    categories.push(controlledCategory({ id: `archive:${exam.toLowerCase()}.${subjectId}.${createHash('sha256').update(topic).digest('hex').slice(0,20)}`,
      exam, subjectId, subject, topic, subtopic: '', origin: 'SOURCE' }));
  }
}
for (const group of notes.groups) {
  const subjectId = group.id.slice(4);
  for (const lesson of group.lessons) {
    const suggestedCategoryIds = categories.filter(c => c.exam === group.exam && c.subjectId === subjectId && lesson.topics.includes(c.topic)).map(c => c.id);
    const common = { exam: group.exam, subject: group.subject, subjectId, topic: lesson.topics[0] || lesson.title,
      subtopic: '', source: 'Kaynaklı ders notları · öğretmen incelemesi bekliyor', suggestedCategoryIds };
    const refs = lesson.sources.map(ref => ({ ...ref, title: notes.sources[ref.catalogId]?.title,
      url: `/api/operator/content-review/pdf/${ref.catalogId}#page=${ref.page}` }));
    items.push({ ...common, key: `note:${group.id}:${lesson.id}`, kind: 'NOTE', title: lesson.title, lesson, refs });
    const practice = lesson.practice;
    if (practice) items.push({ ...common, key: `note-question:${group.id}:${lesson.id}:practice`, kind: 'QUESTION',
      title: `${lesson.title} · Kendini dene`, text: practice.question, choices: practice.choices,
      correctAnswer: 'ABCDE'[practice.answer], choiceCount: practice.choices.length, explanation: practice.explanation,
      bank: 'NOTE', refs, examples: lesson.examples });
    for (const pattern of lesson.patterns) if (pattern.mini) items.push({ ...common,
      key: `note-question:${group.id}:${lesson.id}:${pattern.id}`, kind: 'QUESTION',
      title: `${lesson.title} · ${pattern.title}`, text: pattern.mini.question, correctAnswer: pattern.mini.answer,
      choiceCount: 0, explanation: pattern.logic, bank: 'NOTE', refs, examples: lesson.examples });
  }
}
for (const c of taxonomy.categories.filter(c=>c.canonicalTopic || c.origin==='CURRICULUM' && !c.subtopic)) {
  if (!categories.some(x=>x.id===c.id)) categories.push(c);
  if (!items.some(x=>x.key===`topic:${c.id}`)) items.push({key:`topic:${c.id}`,kind:'TOPIC',exam:c.exam,
    subject:c.subject,subjectId:c.subjectId,topic:c.topic,subtopic:'',title:c.topic,source:c.grade?`${c.grade}. Sınıf`:'Ortak ünite referansı',topicId:c.id});
}
if (new Set(items.map(i => i.key)).size !== items.length) throw new Error('Duplicate review identity');
if (new Set(categories.map(c => c.id)).size !== categories.length) throw new Error('Duplicate category identity');
const destination = path.join(root, 'backend/src/main/resources/content-review-catalog.json');
const output = JSON.stringify({ version: 2, branches: [...branches.values()], categories, items }, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (fs.readFileSync(destination, 'utf8') !== output) throw new Error('Run node scripts/content-review-catalog.mjs');
} else fs.writeFileSync(destination, output);
console.log(`Teacher review catalogue: ${branches.size} branches, ${categories.length} categories, ${items.length} structure/video records.`);
