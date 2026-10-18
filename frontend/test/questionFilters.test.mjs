import test from 'node:test';
import assert from 'node:assert/strict';
import { countQuestionRows } from '../src/questionFilters.js';

test('multi-topic and multi-subject label references do not inflate exam or overall totals', () => {
  const rows = [
    { examType: 'TYT', subject: 'Fizik', topic: 'Hareket', count: 2, totalCount: 3, examCount: 3, subjectCount: 2, subjectTotalCount: 2, topicTotalCount: 2 },
    { examType: 'TYT', subject: 'Kimya', topic: 'Atom', count: 2, totalCount: 3, examCount: 3, subjectCount: 2, subjectTotalCount: 2, topicTotalCount: 2 },
  ];
  assert.equal(countQuestionRows(rows), 3);
  assert.equal(countQuestionRows(rows, { examType: 'TYT' }), 3);
  assert.equal(countQuestionRows(rows, { examType: 'TYT', subject: 'Kimya' }), 2);
  assert.equal(countQuestionRows(rows, { subject: 'Fizik' }), 2);
  assert.equal(countQuestionRows(rows, { subject: 'Kimya', topic: 'Atom' }), 2);
  assert.equal(countQuestionRows(rows, { examType: 'AYT' }), 0);
});

test('legacy filter rows still work without catalogue facets', () => {
  assert.equal(countQuestionRows([{ examType: 'TYT', subject: 'Fizik', topic: 'A', count: 2 },
    { examType: 'TYT', subject: 'Fizik', topic: 'B', count: 3 }], { examType: 'TYT' }), 5);
});
