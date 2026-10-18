import { normaliseTopic } from './curriculumLinks.js';

export const checksFor = kind => kind === 'QUESTION' ? ['branch', 'topic', 'answer', 'image']
  : kind === 'TOPIC' ? ['branch', 'topic', 'structure'] : ['branch', 'topic', 'content', 'coverage'];

// Only explicit identities or exact normalized source topics are suggested. Difficulty is never guessed.
export function sourceLabels(item, catalog) {
  const allowed = new Set(catalog.categories.map(c => c.id));
  if (item.automaticLabels) return {
    assignments: item.automaticLabels.assignments.filter(a => allowed.has(a.categoryId)),
    difficulty: item.automaticLabels.difficulty, contentFormat: item.automaticLabels.contentFormat,
    skills: item.automaticLabels.skills, grades: item.automaticLabels.grades,
  };
  const explicit = (item.suggestedCategoryIds || [item.categoryId || item.topicId]).filter(id => allowed.has(id));
  const sourceTopic = item.topic || (['PDF', 'NOTE'].includes(item.kind) ? item.title : '');
  const exams = item.exam === 'TYT-AYT' ? ['TYT', 'AYT'] : [item.exam];
  const exact = sourceTopic ? catalog.categories.filter(c => exams.includes(c.exam) && c.subjectId === item.subjectId
    && normaliseTopic(c.topic) === normaliseTopic(sourceTopic) && !c.subtopic) : [];
  const ids = [...new Set(explicit.length ? explicit : exact.map(c => c.id))];
  return {
    assignments: ids.map(categoryId => ({ categoryId, relation: 'PRIMARY' })),
    difficulty: item.kind === 'TOPIC' ? 'UYGULANMAZ' : 'BELIRLENMEDI',
    contentFormat: item.kind === 'TOPIC' ? 'UYGULANMAZ' : item.kind === 'QUESTION' ? 'SORU'
      : item.source === 'topic_summary' ? 'KONU_OZETI' : 'KONU_ANLATIMI',
    skills: [], grades: [9, 10, 11, 12].includes(item.grade) ? [item.grade] : [],
  };
}

export function blankDecision(item, catalog) {
  const labels = sourceLabels(item, catalog);
  return { ...labels, assignments: item.automaticLabels ? labels.assignments : [], verdict: '', checks: Object.fromEntries(checksFor(item.kind).map(k => [k, ''])), note: '',
    proposedExam: '', proposedSubject: '', proposedTopic: '', proposedSubtopic: '', proposedAnswer: '', proposedUrl: '' };
}

export function autoSelectLabels(decision, item, catalog) {
  const suggestion = sourceLabels(item, catalog);
  const selected = new Set(decision.assignments.map(a => a.categoryId));
  return {
    assignments: [...decision.assignments, ...suggestion.assignments.filter(a => !selected.has(a.categoryId))].slice(0, 50),
    contentFormat: decision.contentFormat || suggestion.contentFormat,
    difficulty: decision.difficulty || suggestion.difficulty,
    grades: [...new Set([...decision.grades, ...suggestion.grades])],
  };
}

export const categoryLabel = c => [c.exam, c.subject, c.topic, c.subtopic, c.detail && c.detail !== c.subtopic ? c.detail : ''].filter(Boolean).join(' → ');
