import { api, qs } from './api.js';
import { categoryTopic } from './categorySelection.js';

// Display groups for the saved TYT/AYT subject names, not new taxonomy identities.
export const EXAM_BRANCHES = [
  { key: 'turkish', label: 'Trk', subjects: ['Türkçe'] },
  { key: 'literature', label: 'Edb', subjects: ['Türk Dili ve Edebiyatı', 'Edebiyat'] },
  { key: 'math', label: 'Mat', subjects: ['Matematik', 'Geometri'] },
  { key: 'physics', label: 'Fzk', subjects: ['Fizik'] },
  { key: 'chemistry', label: 'Kim', subjects: ['Kimya'] },
  { key: 'biology', label: 'Bio', subjects: ['Biyoloji'] },
  { key: 'geography', label: 'Coğ', subjects: ['Coğrafya', 'Coğrafya-1', 'Coğrafya-2'] },
  { key: 'history', label: 'Tar', subjects: ['Tarih', 'Tarih-1', 'Tarih-2'] },
  { key: 'philosophy', label: 'Fel', subjects: ['Felsefe', 'Felsefe Grubu'] },
  { key: 'religion', label: 'Din', subjects: ['Din Kültürü', 'Din Kültürü ve Ahlak Bilgisi'] },
];

export function groupExamBranches(subjects) {
  return Object.fromEntries(EXAM_BRANCHES.map(branch => {
    const rows = subjects.filter(subject => branch.subjects.includes(subject.subject));
    return [branch.key, !rows.length ? null : rows.reduce((total, row) => ({
      total: total.total + row.total, correct: total.correct + row.correct,
      wrong: total.wrong + row.wrong, blank: total.blank + row.blank,
    }), { total: 0, correct: 0, wrong: 0, blank: 0 })];
  }));
}

// Load every API page before applying the grid's search, filters and pagination.
export async function loadStudyHistory(path, get = api.get) {
  const first = await get(path + qs({ page: 0, size: 100 }));
  const rows = [...first.content];
  for (let page = 1; page < first.totalPages; page += 4) {
    const pages = await Promise.all(Array.from({ length: Math.min(4, first.totalPages - page) }, (_, index) =>
      get(path + qs({ page: page + index, size: 100 }))));
    pages.forEach(result => rows.push(...result.content));
  }
  return rows;
}

export function practiceScope(item, categories = []) {
  const byId = new Map(categories.map(category => [category.id, category]));
  const selected = (item.categoryIds || []).map(id => byId.get(id)).filter(Boolean);
  const branch = selected[0] || categories.find(category => category.subjectId === item.subject || category.subject === item.subject);
  const subjects = [...new Set(selected.map(category => category.subject))];
  const topics = [...new Set(selected.map(categoryTopic))];
  return {
    subject: subjects.length > 1 ? 'Karma dersler' : subjects[0] || branch?.subject || item.subject || 'Karma dersler',
    topic: topics.length ? topics.join('; ') : item.categoryIds?.length ? 'Seçilen konu katalogda bulunamadı'
      : item.topic || (item.subject ? 'Tüm konular' : 'Karma konular'),
  };
}

export function localDate(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function practiceDurationSeconds(item) {
  if (item.status !== 'COMPLETED' || !item.startedAt || !item.endedAt) return null;
  const elapsed = Date.parse(item.endedAt) - Date.parse(item.startedAt);
  return Number.isFinite(elapsed) && elapsed >= 0 ? Math.floor(elapsed / 1000) : null;
}

export function filterStudyRows(rows, { from = '', until = '', status = '', mode = '' } = {}) {
  return rows.filter(row => (!from || localDate(row.date) >= from)
    && (!until || localDate(row.date) <= until)
    && (!status || row.status === status) && (!mode || row.selectionMode === mode));
}

export function summarizeStudyRows(rows) {
  const completed = rows.filter(row => row.status === 'COMPLETED');
  const sum = field => completed.reduce((total, row) => total + (row[field] ?? 0), 0);
  const questions = sum('questionCount');
  const correct = sum('correct');
  return {
    sessions: rows.length, completed: completed.length, active: rows.filter(row => row.status === 'IN_PROGRESS').length,
    questions, correct, wrong: sum('wrong'), blank: sum('blank'),
    percent: questions ? correct * 100 / questions : null,
  };
}

export function summarizeExamRows(rows) {
  return ['TYT', 'AYT'].map(examType => ({
    examType, ...summarizeStudyRows(rows.filter(row => row.examType === examType)),
  }));
}

// Number trials chronologically; filtering/sorting must not change their numbers
// or which completed TYT is associated with AYT.
export function prepareExamHistory(items) {
  const chronological = [...items].sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt) || a.id - b.id);
  const numbers = new Map(chronological.map((item, index) => [item.id, index + 1]));
  const latestTyt = chronological.filter(item => item.examType === 'TYT').at(-1);
  return items.map(item => ({
    ...item, number: numbers.get(item.id), date: Date.parse(item.submittedAt), status: 'COMPLETED',
    correct: item.correctCount, wrong: item.wrongCount, blank: item.blankCount,
    bySubject: (item.bySubject ?? []).map(subject => ({ ...subject, net: subject.correct - subject.wrong / 4 })),
    branches: groupExamBranches(item.bySubject ?? []),
    latestTytId: item.examType === 'AYT' ? latestTyt?.id ?? null : null,
    latestTytNumber: item.examType === 'AYT' && latestTyt ? numbers.get(latestTyt.id) : null,
    latestTytNet: item.examType === 'AYT' ? latestTyt?.net ?? null : null,
    latestTytDate: item.examType === 'AYT' ? latestTyt?.submittedAt ?? null : null,
    tytContext: item.examType !== 'AYT' ? '—' : latestTyt ? null : 'TYT eşleştirilemedi: tamamlanmış TYT denemesi yok.',
  }));
}
