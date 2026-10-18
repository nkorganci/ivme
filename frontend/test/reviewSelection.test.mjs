import test from 'node:test';
import assert from 'node:assert/strict';
import { autoSelectLabels, blankDecision, sourceLabels } from '../src/reviewSelection.js';

const catalog = { categories: [
  { id: 'tyt.fizik.basinc', exam: 'TYT', subjectId: 'fizik', topic: 'Basınç', subtopic: '' },
  { id: 'ayt.fizik.basinc', exam: 'AYT', subjectId: 'fizik', topic: 'Basınç', subtopic: '' },
  { id: 'tyt.kimya.basinc', exam: 'TYT', subjectId: 'kimya', topic: 'Basınç', subtopic: '' },
  { id: 'subtopic:katilar', exam: 'TYT', subjectId: 'fizik', topic: 'Basınç', subtopic: 'Katılarda basınç' },
] };
const question = { kind: 'QUESTION', exam: 'TYT', subjectId: 'fizik', topic: 'BASINÇ', grade: 10 };

test('otomatik seçim yalnız aynı branş/sınav ve açık kaynak eşleşmesini kullanır', () => {
  assert.deepEqual(sourceLabels(question, catalog).assignments, [{ categoryId: 'tyt.fizik.basinc', relation: 'PRIMARY' }]);
  assert.deepEqual(sourceLabels({ ...question, topic: 'Basınç ve kaldırma kuvveti' }, catalog).assignments, []);
  assert.deepEqual(sourceLabels({ ...question, categoryId: 'subtopic:katilar' }, catalog).assignments, [{ categoryId: 'subtopic:katilar', relation: 'PRIMARY' }]);
});
test('otomatik seçim insan kararını, zorluğu ve mevcut çoklu etiketleri korur', () => {
  const decision = { ...blankDecision(question, catalog), difficulty: 'ZOR', assignments: [{ categoryId: 'tyt.kimya.basinc', relation: 'PREREQUISITE' }], grades: [11] };
  const selected = autoSelectLabels(decision, question, catalog);
  assert.equal(selected.difficulty, 'ZOR');
  assert.deepEqual(selected.assignments, [...decision.assignments, { categoryId: 'tyt.fizik.basinc', relation: 'PRIMARY' }]);
  assert.deepEqual(selected.grades, [11, 10]);
  assert.equal(selected.verdict, undefined);
  assert.equal(selected.checks, undefined);
  assert.deepEqual(autoSelectLabels({ ...decision, ...selected }, question, catalog).assignments, selected.assignments);
});
test('yeni kayıtta otomatik öneri doğruluk onayı veya tahmin edilmiş zorluk üretmez', () => {
  const draft = blankDecision(question, catalog);
  assert.deepEqual(draft.assignments, []);
  assert.equal(draft.verdict, '');
  assert.equal(draft.difficulty, 'BELIRLENMEDI');
  assert.ok(Object.values(draft.checks).every(value => value === ''));
  assert.deepEqual(sourceLabels({ ...question, suggestedCategoryIds: ['subtopic:katilar', 'removed', 'subtopic:katilar'] }, catalog).assignments,
    [{ categoryId: 'subtopic:katilar', relation: 'PRIMARY' }]);
});
test('PDF başlığının tam eşleşmesi ve iki sınavı kapsayan kaynak korunur', () => {
  const pdf = { kind: 'PDF', exam: 'TYT-AYT', subjectId: 'fizik', topic: '', title: 'BASINÇ' };
  assert.deepEqual(sourceLabels(pdf, catalog).assignments.map(a => a.categoryId), ['tyt.fizik.basinc', 'ayt.fizik.basinc']);
  assert.deepEqual(sourceLabels({ ...pdf, title: 'Basınç ve diğer konular' }, catalog).assignments, []);
});

test('kalıcı PDF başlık etiketleri ilk açılışta seçilidir ve öğretmen kararı oluşturmaz', () => {
  const pdf = { kind: 'PDF', exam: 'TYT', subjectId: 'fizik', automaticLabels: {
    assignments: [{ categoryId: 'subtopic:katilar', relation: 'PRIMARY' }, { categoryId: 'tyt.fizik.basinc', relation: 'SECONDARY' }],
    difficulty: 'BELIRLENMEDI', contentFormat: 'KONU_OZETI', skills: [], grades: [10], provenance: 'PDF_HEADINGS',
  } };
  const draft = blankDecision(pdf, catalog);
  assert.deepEqual(draft.assignments, pdf.automaticLabels.assignments);
  assert.equal(draft.contentFormat, 'KONU_OZETI');
  assert.equal(draft.verdict, '');
  assert.ok(Object.values(draft.checks).every(value => value === ''));
});
