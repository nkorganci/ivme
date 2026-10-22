import test from 'node:test';
import assert from 'node:assert/strict';
import { progressCategories, topicProgressRows } from '../src/topicProgress.js';
import { categoryBranches } from '../src/categorySelection.js';

const categories = [
  { id: 'tyt-a', subjectId: 'matematik', subject: 'Matematik', exam: 'TYT', topic: 'Sayılar', topicNumber: 1 },
  { id: 'tyt-sub', subjectId: 'matematik', subject: 'Matematik', exam: 'TYT', topic: 'Sayılar', subtopic: 'Tam sayılar', parentId: 'tyt-a' },
  { id: 'ayt-a', subjectId: 'matematik', subject: 'Matematik', exam: 'AYT', topic: 'Sayılar' },
  { id: 'physics', subjectId: 'fizik', subject: 'Fizik', exam: 'TYT', topic: 'Sayılar' },
  { id: 'system.review', subjectId: 'system', exam: 'UNKNOWN', topic: 'İnceleme' },
  { id: 'taxonomy:1', subjectId: 'matematik', exam: 'TYT', nodeKind: 'QUESTION_TYPE' },
  { id: 'taxonomy:2', subjectId: 'matematik', exam: 'TYT', nodeKind: 'SKILL' },
];

test('shows every published topic for exactly one subject, including unsolved children', () => {
  const available = progressCategories(categories);
  assert.deepEqual(categoryBranches(available).map(branch => branch.id), ['fizik', 'matematik']);
  const rows = topicProgressRows(available, [], 'matematik');
  assert.equal(rows.length, 3);
  assert.ok(rows.every(row => row.subject === 'Matematik' && row.solved === 0 && row.net === 0));
  assert.equal(rows.find(row => row.categoryId === 'tyt-a').topicLabel, '1. Sayılar');
  assert.equal(rows.find(row => row.categoryId === 'tyt-sub').topicLabel, 'Sayılar → Tam sayılar');
  assert.equal(topicProgressRows(available, [], 'fizik').length, 1);
  assert.equal(topicProgressRows(available, [], '').length, 0);
});

test('matches counts by category identity across exams and calculates solved/net without blanks', () => {
  const rows = topicProgressRows(progressCategories(categories), [
    { categoryId: 'tyt-a', correct: 3, wrong: 5, blank: 2, total: 10, repeatAttempts: 8 },
    { categoryId: 'ayt-a', correct: 0, wrong: 1, total: 1 },
    { categoryId: 'physics', correct: 99, wrong: 0 },
  ], 'matematik');
  assert.equal(rows.find(row => row.categoryId === 'tyt-a').solved, 8);
  assert.equal(rows.find(row => row.categoryId === 'tyt-a').net, 1.75);
  assert.equal(rows.find(row => row.categoryId === 'ayt-a').net, -0.25);
  assert.equal(rows.find(row => row.categoryId === 'tyt-sub').solved, 0);
});
