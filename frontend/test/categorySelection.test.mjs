import assert from 'node:assert/strict';
import test from 'node:test';
import { categoriesInBranches, categoryBranches, categoryGroups, categoryLabel, categoryOptions, selectedCategoryBranches } from '../src/categorySelection.js';

const categories = [
  { id: 'tyt-fizik-isi', exam: 'TYT', subject: 'Fizik', topic: 'Isı ve Sıcaklık', subtopic: 'Genleşme', origin: 'CURRICULUM' },
  { id: 'ayt-mat-integral', exam: 'AYT', subject: 'Matematik', topic: 'İntegral', origin: 'CURRICULUM' },
  { id: 'ayt-fizik-hareket', exam: 'AYT', subject: 'Fizik', topic: 'Hareket', origin: 'SOURCE' },
  { id: 'tyt-biyoloji', exam: 'TYT', subject: 'Biyoloji', topic: 'Hücre' },
  { id: 'ayt-fizik-dalga', exam: 'AYT', subject: 'Fizik', topic: 'Dalga Mekaniği', origin: 'SOURCE' },
];

test('exam and lesson groups stay together even when topics and source origins are mixed', () => {
  const options = categoryOptions(categories);
  assert.deepEqual(options.map(category => category.id), [
    'ayt-fizik-dalga', 'ayt-fizik-hareket', 'ayt-mat-integral', 'tyt-biyoloji', 'tyt-fizik-isi',
  ]);
  assert.deepEqual(categoryGroups(options).map(group => group.label), ['AYT · Fizik', 'AYT · Matematik', 'TYT · Biyoloji', 'TYT · Fizik']);
});

test('ASCII and Turkish search find words across lesson, topic and subtopic', () => {
  assert.deepEqual(categoryOptions(categories, { search: 'FIZIK isi genlesme' }).map(category => category.id), ['tyt-fizik-isi']);
  assert.deepEqual(categoryOptions(categories, { search: 'İNTEGRAL' }).map(category => category.id), ['ayt-mat-integral']);
  assert.equal(categoryOptions(categories, { search: 'fizik integral' }).length, 0);
});

test('selected identities and current exam filter are respected without mutating the catalogue', () => {
  const before = structuredClone(categories);
  assert.deepEqual(categoryOptions(categories, { examType: 'AYT', subject: 'Fizik', selectedIds: ['ayt-fizik-dalga'] }).map(category => category.id), ['ayt-fizik-hareket']);
  assert.deepEqual(categories, before);
});

test('the dropdown keeps entries beyond the previous 150-item cut-off', () => {
  const catalogue = Array.from({ length: 201 }, (_, n) => ({ id: 'category-' + n, exam: n < 200 ? 'AYT' : 'TYT', subject: 'Fizik', topic: 'Konu ' + n }));
  assert.equal(categoryOptions(catalogue).length, 201);
  assert.equal(categoryOptions(catalogue).at(-1).id, 'category-200');
});

test('a renamed catalogue entry keeps its identity and uses the latest name in search and labels', () => {
  const renamed = { ...categories[0], topic: 'Güncel Isı Konusu' };
  assert.equal(categoryOptions([renamed], { search: 'guncel isi' })[0].id, categories[0].id);
  assert.equal(categoryLabel(renamed), 'TYT · Fizik · Güncel Isı Konusu → Genleşme');
});

test('branch selection groups both exams and returns only the chosen branches and their existing IDs', () => {
  const catalogue = categories.map(category => ({ ...category, subjectId: category.subject.toLocaleLowerCase('tr') }));
  assert.deepEqual(categoryBranches(catalogue).map(branch => branch.label), ['Biyoloji', 'Fizik', 'Matematik']);
  assert.deepEqual(categoriesInBranches(catalogue, ['fizik', 'matematik']).map(category => category.id), [
    'ayt-fizik-dalga', 'ayt-fizik-hareket', 'ayt-mat-integral', 'tyt-fizik-isi',
  ]);
  assert.equal(categoriesInBranches(catalogue, []).length, 0);
  assert.deepEqual(categoriesInBranches(catalogue, ['fizik'], 'genlesme').map(category => category.id), ['tyt-fizik-isi']);
});

test('saved category links restore their branches alongside pending branch selections', () => {
  const catalogue = categories.map(category => ({ ...category, subjectId: category.subject.toLocaleLowerCase('tr') }));
  assert.deepEqual(selectedCategoryBranches(catalogue, ['ayt-mat-integral'], ['fizik']), ['fizik', 'matematik']);
  assert.deepEqual(selectedCategoryBranches(catalogue, [], [], 'Fizik'), ['fizik']);
});
