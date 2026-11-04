// Read-only topic-map projections of published metadata; no new curriculum identities.
import { normaliseTopic } from '../curriculumLinks.js';
import { lessonScope } from './catalog.js';

const EXAMS = ['TYT', 'AYT'];
const compare = new Intl.Collator('tr', { sensitivity: 'base', numeric: true }).compare;
const matches = (text, query) => normaliseTopic(query).split(' ').filter(Boolean)
  .every(term => normaliseTopic(text).includes(term));

export function topicMapCatalog(concepts, byId) {
  const subjects = new Map();
  const topics = new Map();
  for (const category of byId.values()) {
    if (!category.canonicalUnit || category.selectable === false || !EXAMS.includes(category.exam)) continue;
    const subject = subjects.get(category.subjectId) ?? { id: category.subjectId, name: category.subject, topics: 0, lessons: 0 };
    subjects.set(subject.id, subject);
    const key = `${subject.id}:${category.excelRowId ?? category.id.split('.').pop()}`;
    const topic = topics.get(key) ?? { key, name: category.topic, subjectId: subject.id, subject: subject.name,
      unitId: category.unitId ?? `missing:${subject.id}`, unit: category.unit || 'Ünite bilgisi eksik',
      order: category.order ?? 0, exams: [], ids: [], grades: [] };
    if (!topic.ids.includes(category.id)) topic.ids.push(category.id);
    if (!topic.exams.includes(category.exam)) topic.exams.push(category.exam);
    if (category.gradeLabel && !topic.grades.includes(category.gradeLabel)) topic.grades.push(category.gradeLabel);
    topics.set(key, topic);
  }
  const scopes = new Map(concepts.map(meta => [meta.id, lessonScope(meta.categories, byId)]));
  for (const subject of subjects.values()) {
    subject.topics = [...topics.values()].filter(topic => topic.subjectId === subject.id).length;
    subject.lessons = concepts.filter(meta => scopes.get(meta.id).topics.some(topic => topic.subjectId === subject.id)).length;
  }
  for (const topic of topics.values()) topic.exams.sort((a, b) => EXAMS.indexOf(a) - EXAMS.indexOf(b));
  return { subjects: [...subjects.values()].sort((a, b) => (a.id === 'matematik' ? -1 : b.id === 'matematik' ? 1 : compare(a.name, b.name))),
    topics: [...topics.values()].sort((a, b) => a.order - b.order || compare(a.name, b.name)), scopes };
}

export function selectTopicMap(catalog, concepts, state, filters = {}) {
  const subject = catalog.subjects.find(item => item.id === filters.subject) ?? catalog.subjects[0] ?? null;
  if (!subject) return { subject: null, concepts: [], topics: [], units: [], lessonCount: 0 };
  const exam = EXAMS.includes(filters.exam) ? filters.exam : '';
  const subjectLessons = concepts.filter(meta => catalog.scopes.get(meta.id).topics.some(topic => topic.subjectId === subject.id));
  const inScope = catalog.topics.filter(topic => topic.subjectId === subject.id && (!exam || topic.exams.includes(exam)));
  const unitMap = new Map(inScope.map(topic => [topic.unitId, { id: topic.unitId, name: topic.unit }]));
  const unit = unitMap.has(filters.unit) ? filters.unit : '';
  const readyIds = new Set(subjectLessons.flatMap(meta => catalog.scopes.get(meta.id).topics.flatMap(topic => topic.ids)));
  const selectedConcepts = subjectLessons.filter(meta => {
    const scope = catalog.scopes.get(meta.id);
    return (!exam || meta.exams.includes(exam)) && filters.status !== 'preparing'
      && (!filters.status || state.concepts[meta.id]?.status === filters.status)
      && (!unit || scope.topics.some(topic => topic.subjectId === subject.id && topic.unitId === unit))
      && matches([meta.title, ...scope.topics.filter(topic => topic.subjectId === subject.id).flatMap(topic => [topic.unit, topic.topic])].join(' '), filters.search || '');
  });
  const pendingTopics = inScope.filter(topic => !topic.ids.some(id => readyIds.has(id))
    && (!filters.status || filters.status === 'preparing') && (!unit || topic.unitId === unit)
    && matches(`${topic.name} ${topic.unit}`, filters.search || ''));
  return { subject, concepts: selectedConcepts, topics: pendingTopics, units: [...unitMap.values()], lessonCount: subjectLessons.length };
}

export function topicMapParams(current, changes) {
  const next = new URLSearchParams(current);
  if (changes.ders !== undefined && changes.ders !== current.get('ders')) {
    ['unite', 'ara', 'durum'].forEach(key => next.delete(key));
  }
  for (const [key, value] of Object.entries(changes)) value ? next.set(key, value) : next.delete(key);
  return next;
}

export function referenceMapUnits(topics) {
  const units = new Map();
  for (const topic of topics) {
    const unit = units.get(topic.unitId) ?? { id: topic.unitId, name: topic.unit, topics: [] };
    unit.topics.push(topic); units.set(unit.id, unit);
  }
  return [...units.values()];
}

export function topicSourcesPath(topic) {
  const query = new URLSearchParams();
  topic.ids.forEach(id => query.append('categoryId', id));
  return '/konular-ve-kaynaklar?' + query;
}
