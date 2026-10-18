export const MASTERY = [['NOT_STARTED', 'Başlanmadı'], ['LEARNING', 'Öğreniliyor'], ['ASSESSED', 'İlk test yapıldı'],
  ['REVIEW_NEEDED', 'Tekrar gerekiyor'], ['PRACTICING', 'Pekiştiriliyor'], ['MASTERED', 'Hâkim'], ['VERIFIED', 'Denemelerde doğrulandı']];
export const ERROR_TYPES = [['KNOWLEDGE', 'Konu eksiği'], ['CALCULATION', 'İşlem hatası'], ['READING', 'Soruyu yanlış anlama'],
  ['ATTENTION', 'Dikkatsizlik'], ['TIME', 'Süre yetersizliği'], ['METHOD', 'Yöntem seçimi']];

export const blankLearning = () => ({ examType: 'TYT', branch: 'MATHEMATICS',categoryId:null, subtopic: '', goal: '',
  beforeTest: null, afterTest: null, assignment: null, errorTypes: [], mastery: 'NOT_STARTED',
  reviewDate: null, reviewTest: null, reviewDone: false, nextStep: '', teacherEvaluation: '' });

const count = (value) => {
  if (value == null || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 10000) throw new Error('Soru sayıları 0 ile 10000 arasında tam sayı olmalı.');
  return number;
};
const scoreFields = (score) => {
  const result = Object.fromEntries(['correct', 'wrong', 'blank'].map((key) => [key, count(score?.[key])]));
  const filled = Object.values(result).filter((value) => value !== null).length;
  if (!filled) return null;
  if (filled !== 3) throw new Error('Test ve ödev sonuçlarında doğru, yanlış ve boş sayılarını birlikte girin.');
  return result;
};

export function learningFields(value) {
  const learning = { ...blankLearning(), ...value };
  const assignment = learning.assignment;
  const results = scoreFields(assignment);
  const given = count(assignment?.given);
  if (results && (given === null || results.correct + results.wrong + results.blank > given))
    throw new Error('Ödev sonuçları verilen soru sayısını aşamaz; verilen sayısını da girin.');
  if (assignment?.assignedDate && assignment?.dueDate && assignment.dueDate < assignment.assignedDate)
    throw new Error('Ödev teslim tarihi verilme tarihinden önce olamaz.');
  return { ...learning, ...Object.fromEntries(['subtopic', 'goal', 'nextStep', 'teacherEvaluation'].map((key) => [key, (learning[key] ?? '').trim()])),
    beforeTest: scoreFields(learning.beforeTest), afterTest: scoreFields(learning.afterTest),
    reviewTest: scoreFields(learning.reviewTest), reviewDate: learning.reviewDate || null,
    assignment: assignment ? { given, correct: null, wrong: null, blank: null, ...results,
      assignedDate: assignment.assignedDate || null, dueDate: assignment.dueDate || null, source: (assignment.source ?? '').trim() } : null };
}

export function scoreSummary(score) {
  if (!score || ['correct', 'wrong', 'blank'].some((key) => score[key] == null || score[key] === '')) return null;
  const total = Number(score.correct) + Number(score.wrong) + Number(score.blank);
  return total ? { total, correct: Number(score.correct), success: Math.round(Number(score.correct) * 100 / total) } : null;
}

export function assignmentSummary(assignment) {
  if (!assignment || assignment.given == null || assignment.given === '' || Number(assignment.given) === 0) return null;
  const solved = Number(assignment.correct || 0) + Number(assignment.wrong || 0);
  return { given: Number(assignment.given), solved, completion: Math.round(solved * 100 / Number(assignment.given)) };
}

export function learningSummary(lessons, today) {
  const active = lessons.filter((row) => row.status !== 'CANCELLED');
  const assignments = active.map((row) => assignmentSummary(row.learning?.assignment)).filter(Boolean);
  const given = assignments.reduce((sum, item) => sum + item.given, 0);
  const solved = assignments.reduce((sum, item) => sum + item.solved, 0);
  const tests = active.map((row) => scoreSummary(row.learning?.afterTest)).filter(Boolean);
  const questions = tests.reduce((sum, item) => sum + item.total, 0);
  return { completed: active.filter((row) => row.status === 'COMPLETED').length, total: active.length,
    homeworkCompletion: given ? Math.round(solved * 100 / given) : null,
    testSuccess: questions ? Math.round(tests.reduce((sum, item) => sum + item.correct, 0) * 100 / questions) : null,
    reviews: active.filter((row) => row.learning?.reviewDate && row.learning.reviewDate <= today && !row.learning.reviewDone),
    overdue: active.filter((row) => row.learning?.assignment?.dueDate && row.learning.assignment.dueDate < today
      && (assignmentSummary(row.learning.assignment)?.completion ?? 0) < 100),
  };
}
