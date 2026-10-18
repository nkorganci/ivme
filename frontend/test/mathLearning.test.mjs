import test from 'node:test';
import assert from 'node:assert/strict';
import { assignmentSummary, blankLearning, learningFields, learningSummary, scoreSummary } from '../src/mathLearning.js';

test('boş sonuç ile sıfır başarı ayrılır ve soru sayıları doğrulanır', () => {
  assert.equal(scoreSummary(null), null);
  assert.equal(scoreSummary({ correct: 0, wrong: 3, blank: 2 }).success, 0);
  assert.equal(learningFields(blankLearning()).afterTest, null);
  assert.throws(() => learningFields({ afterTest: { correct: '3', wrong: '', blank: '0' } }));
  assert.throws(() => learningFields({ afterTest: { correct: '1.5', wrong: '0', blank: '0' } }));
  assert.throws(() => learningFields({ afterTest: { correct: '-1', wrong: '0', blank: '0' } }));
  assert.deepEqual(learningFields({ afterTest: { correct: '3', wrong: '0', blank: '1' } }).afterTest,
    { correct: 3, wrong: 0, blank: 1 });
});

test('ödevde boşlar çözülen sayılmaz, teslim ve sonuç sınırları korunur', () => {
  assert.deepEqual(assignmentSummary({ given: 20, correct: 10, wrong: 5, blank: 5 }), { given: 20, solved: 15, completion: 75 });
  assert.throws(() => learningFields({ assignment: { given: '5', correct: '4', wrong: '2', blank: '0' } }));
  assert.throws(() => learningFields({ assignment: { assignedDate: '2026-10-15', dueDate: '2026-10-14' } }));
  assert.equal(learningFields({ assignment: { given: '20', dueDate: '' } }).assignment.dueDate, null);
});

test('özet soru sayısıyla ağırlıklandırılır; iptaller, biten tekrarlar ve tamamlanan ödevler uyarıya girmez', () => {
  const first = { id: 1, status: 'COMPLETED', learning: { afterTest: { correct: 9, wrong: 0, blank: 1 },
    assignment: { given: 20, correct: 10, wrong: 0, blank: 10, dueDate: '2026-10-14' }, reviewDate: '2026-10-15' } };
  const second = { id: 2, status: 'PLANNED', learning: { afterTest: { correct: 1, wrong: 0, blank: 1 },
    assignment: { given: 10, correct: 9, wrong: 1, blank: 0, dueDate: '2026-10-14' }, reviewDate: '2026-10-14', reviewDone: true } };
  const summary = learningSummary([first, second, { ...first, id: 3, status: 'CANCELLED' }], '2026-10-15');
  assert.equal(summary.testSuccess, 83);
  assert.equal(summary.homeworkCompletion, 67);
  assert.deepEqual(summary.reviews.map((row) => row.id), [1]);
  assert.deepEqual(summary.overdue.map((row) => row.id), [1]);
  assert.equal(summary.completed, 1);
  assert.equal(summary.total, 2);
  assert.equal(learningSummary([], '2026-10-15').testSuccess, null);
});
