import catalogue from './data/physicsVideos.json' with { type: 'json' };
import { topicId } from './curriculum.js';
import identities from './data/curriculumIdentities.json' with {type:'json'};

export const videoTeachers = catalogue.teachers;
export const videoCheckedOn = catalogue.checkedOn;
export const physicsVideoTopics = catalogue.topics;
const originalByTopic = new Map(catalogue.topics.map((entry) => [
  topicId(entry.exam, entry.subject, entry.topic), entry.lessons,
]));
const byTopic=new Map();
for(const [oldId,lessons] of originalByTopic) {
  const entry=catalogue.topics.find(e=>topicId(e.exam,e.subject,e.topic)===oldId);
  for(const lesson of lessons) {
    const childId=`subtopic:${oldId}:${topicId(entry.exam,entry.subject,lesson.title)}`;
    const targets=identities.unitTargets?.[childId]||identities.unitTargets?.[oldId]||[];
    if(targets.length!==1)continue;
    const list=byTopic.get(targets[0])||[];
    if(!list.some(l=>l.title===lesson.title))list.push(lesson);
    byTopic.set(targets[0],list);
  }
}

// Keep saved progress and question/PDF mappings on their original parent ids.
export const videoLessons = (id) => byTopic.get(id) ?? originalByTopic.get(id) ?? [];
export const videoUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
export const videoTopicTitle = (title) => ({
  'Optik: gölge ve yansıma': 'Optik: aydınlanma, gölge ve aynalar',
  'Optik: kırılma ve mercekler': 'Optik: kırılma, mercekler, prizmalar ve renkler',
  'Atom modelleri': 'Atom fiziği: modeller, uyarılma ve evren',
  'Modern fiziğe giriş': 'Modern fizik: görelilik, kuantum ve fotoelektrik',
}[title] ?? title);

export function withVideoRows(rows, expanded, { categories = [], exam, subjectId } = {}) {
  const byCategory = new Map(categories.map(category => [category.id, category]));
  const preferredTitle = (id, fallback) => {
    const category = byCategory.get(id);
    return category?.subtopic || category?.topic || fallback;
  };
  return rows.flatMap((row) => {
    const lessons = row.source ? [] : videoLessons(row.id);
    const parent = { ...row, categoryId: row.id,
      displayTitle: row.source ? row.title : preferredTitle(row.id, lessons.length ? videoTopicTitle(row.title) : row.title), lessons };
    if (!expanded[row.id] || byCategory.get(row.id)?.canonicalUnit) return [parent];
    return [parent, ...lessons.map((lesson, index) => {
      const categoryId = exam && subjectId ? `subtopic:${row.id}:${topicId(exam, subjectId, lesson.title)}` : undefined;
      return {
      id: `${row.id}.video-${index + 1}`, parentId: row.id,
      categoryId, number: `${row.number}.${index + 1}`, title: lesson.title,
      displayTitle: preferredTitle(categoryId, lesson.title),
      parentTitle: parent.displayTitle, videoChild: true, done: row.done,
      pdfs: [], questions: [], cikmis: [], lessons: [], videos: lesson.videos,
      };
    })];
  });
}
