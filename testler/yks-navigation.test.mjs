import test from 'node:test';
import assert from 'node:assert/strict';
import { publicCurriculumNavigation, preferredCurriculumCategories, applyCurriculumMetadata } from '../frontend/src/curriculumNavigation.js';
import { curriculumFromCategories } from '../frontend/src/curriculum.js';
import { topicMapCatalog, selectTopicMap, referenceMapUnits } from '../frontend/src/learn/mapNavigation.js';
import { PHYSICS_PILOT, pilotForTopic } from '../frontend/src/learn/physics/registry.js';

const definitions = () => [
  { id: 'old-wide', exam: 'TYT', subjectId: 'matematik', subject: 'Matematik', topic: 'Geniş eski kapsam', unit: 'Önceki ders grubu', unitId: 'old-unit', canonicalUnit: true, selectable: true },
  { id: 'old-fine', exam: 'TYT', subjectId: 'matematik', subject: 'Matematik', topic: 'Eski ayrıntılı ad', canonicalTopicIds: ['old-wide'], selectable: false },
  { id: 'kpss-kept', exam: 'KPSS_OO_GY', subjectId: 'kpss-mat', subject: 'Matematik', topic: 'Korunan konu', canonicalUnit: true, selectable: true },
];
const courses = () => [{ id: 'course', exam: 'TYT', subjectId: 'matematik', title: 'Matematik', originalPath: 'D:/private/file', units: [
  { id: 'provider-unit', title: 'Sayı Kümeleri', topics: [{ categoryId: 'old-fine', sourceExam: 'TYT', subjectId: 'matematik',
    title: 'Tek ve Çift Sayılar', order: 1, contentKey: 'same-content', examScopes: ['TYT'], examCategoryIds: { TYT: ['old-fine'] },
    assets: [{ originalPath: 'D:/private/source.pdf' }] }] },
]}];

test('preferred tree preserves original definitions and separate historical broad scope', () => {
  const raw = definitions().map(Object.freeze), before = JSON.stringify(raw);
  const navigation = publicCurriculumNavigation(courses());
  const preferred = preferredCurriculumCategories(navigation, raw);
  const result = applyCurriculumMetadata({ categories: raw, curriculumNavigation: navigation, curriculumCategories: preferred });
  assert.equal(JSON.stringify(raw), before);
  assert.equal(result.categories.find(c => c.id === 'old-fine').topic, 'Tek ve Çift Sayılar');
  assert.equal(result.categories.find(c => c.id === 'old-fine').unitId, 'provider-unit');
  assert.equal(result.categories.find(c => c.id === 'old-fine').canonicalTopicIds, undefined);
  assert.equal(result.categories.find(c => c.id === 'old-wide').selectable, false);
  assert.equal(result.categories.find(c => c.id === 'old-wide').topic, 'Geniş eski kapsam');
  assert.strictEqual(result.categories.find(c => c.id === 'kpss-kept'), raw[2]);
  assert.strictEqual(result.categoryDefinitions, raw);
});

test('published navigation strips source paths and extraction assets', () => {
  const text = JSON.stringify(publicCurriculumNavigation(courses()));
  assert.ok(!text.includes('D:/private')); assert.ok(!text.includes('originalPath')); assert.ok(!text.includes('assets'));
});

test('absent navigation keeps existing metadata object unchanged', () => {
  const data = { categories: definitions() }; assert.strictEqual(applyCurriculumMetadata(data), data);
});

test('unknown ID or changed exam never silently redirects an old category', () => {
  const nav = publicCurriculumNavigation(courses());
  assert.throws(() => preferredCurriculumCategories(nav, []));
  const raw = definitions();raw[1].exam = 'AYT';
  assert.throws(() => preferredCurriculumCategories(nav, raw));
});

test('MEBI unit grouping keeps stored topic IDs and old lessons accessible', () => {
  const raw = definitions(), navigation = publicCurriculumNavigation(courses());
  const curriculum = curriculumFromCategories(raw, navigation);
  assert.equal(curriculum.TYT[0].units[0].id, 'provider-unit');
  assert.deepEqual(curriculum.TYT[0].units[0].topics, ['Tek ve Çift Sayılar']);
  assert.equal(curriculum.TYT[0].topicIds['Tek ve Çift Sayılar'], 'old-fine');
  const metadata = applyCurriculumMetadata({ categories: raw, curriculumNavigation: navigation,
    curriculumCategories: preferredCurriculumCategories(navigation, raw) });
  const concepts = [{ id: 'saved-old-lesson', categories: ['old-wide'], title: 'Çalışılmış ders', exams: ['TYT'] }];
  const catalog = topicMapCatalog(concepts, new Map(metadata.categories.map(c => [c.id, c])));
  const selection = selectTopicMap(catalog, concepts, { concepts: {} }, { subject: 'matematik' });
  assert.equal(selection.concepts[0].id, 'saved-old-lesson');
  assert.equal(selection.topics.length, 1);
  assert.ok(selection.units.some(unit => unit.id === 'old-unit'));
  assert.equal(selectTopicMap(catalog, concepts, { concepts: {} }, { subject: 'matematik', unit: 'old-unit' }).concepts.length, 1);
});

test('existing physics pilot stays linked once at its source unit', () => {
  const raw = [
    { id: PHYSICS_PILOT.categoryId, exam: 'TYT', subjectId: 'fizik', subject: 'Fizik', topic: 'Hareket ve Kuvvet', canonicalUnit: true, selectable: true },
    { id: 'new-physics-leaf', exam: 'TYT', subjectId: 'fizik', subject: 'Fizik', topic: 'Hareket', selectable: true },
  ];
  const groups = [{ id: 'physics', exam: 'TYT', subjectId: 'fizik', title: 'Fizik', units: [
    { id: 'motion-unit', title: 'Hareket ve Kuvvet', legacyScopeIds: [PHYSICS_PILOT.categoryId], topics: [
      { categoryId: 'new-physics-leaf', sourceExam: 'TYT', title: 'Hareket Kavramı', order: 1, contentKey: 'physics-motion', examCategoryIds: { TYT: ['new-physics-leaf'] } },
    ] },
  ] }];
  const navigation = publicCurriculumNavigation(groups);
  const metadata = applyCurriculumMetadata({ categories: raw, curriculumNavigation: navigation, curriculumCategories: preferredCurriculumCategories(navigation, raw) });
  const map = topicMapCatalog([], new Map(metadata.categories.map(c => [c.id, c])));
  const units = referenceMapUnits(map.topics);
  assert.equal(units.length, 1);
  assert.equal(pilotForTopic({ ids: units[0].legacyScopeIds }).path, PHYSICS_PILOT.path);
  assert.equal(pilotForTopic(units[0].topics[0]), null);
});
