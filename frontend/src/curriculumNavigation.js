// A published navigation is presentation metadata; saved/reviewed definitions stay intact.
const YKS = new Set(['TYT', 'AYT']);
const pick = (value, keys) => Object.fromEntries(keys.filter(key => value[key] != null).map(key => [key, value[key]]));

export function publicCurriculumNavigation(courses) {
  return { version: 1, authority: 'MEBI_PROVIDER', courses: courses.map(course => ({
    ...pick(course, ['id', 'exam', 'subjectId', 'title', 'order']),
    units: course.units.map(unit => ({ ...pick(unit, ['id', 'title', 'order', 'legacyScopeIds']),
      topics: unit.topics.map(topic => pick(topic, ['categoryId', 'sourceExam', 'subjectId', 'unitId', 'title',
        'order', 'orderInUnit', 'contentKey', 'examScopes', 'examCategoryIds'])) })),
  })) };
}

export function preferredCurriculumCategories(navigation, definitions) {
  if (!navigation || !Object.keys(navigation).length)
    return definitions.filter(category => category.canonicalUnit && category.selectable !== false);
  if (navigation.version !== 1 || navigation.authority !== 'MEBI_PROVIDER')
    throw Error('Bilinmeyen müfredat gezinme sürümü.');
  const byId = new Map(definitions.map(category => [category.id, category]));
  const selected = new Map();
  for (const course of navigation.courses) for (const unit of course.units) for (const topic of unit.topics) {
    const ids = Object.fromEntries(Object.entries(topic.examCategoryIds || {}).filter(([, values]) => values.length === 1));
    ids[topic.sourceExam] = [topic.categoryId];
    for (const [exam, values] of Object.entries(ids)) for (const id of values) {
      const definition = byId.get(id);
      if (!definition || definition.exam !== exam || definition.subjectId !== course.subjectId)
        throw Error('Müfredat konu kimliği veya kapsamı uyuşmuyor.');
      if (selected.get(id)?.navigationSourceExam === definition.exam) continue;
      const row = { ...definition, topic: topic.title, unit: unit.title, unitId: unit.id, order: topic.order || 0,
        canonicalUnit: true, canonicalTopic: true, selectable: true, navigationSelected: true,
        navigationSourceExam: topic.sourceExam, contentKey: topic.contentKey };
      row.navigationUnitLegacyScopeIds = unit.legacyScopeIds || [];
      delete row.canonicalTopicIds;
      selected.set(id, row);
    }
  }
  const result = [...selected.values()].sort((a, b) => a.exam.localeCompare(b.exam)
    || a.subjectId.localeCompare(b.subjectId) || a.order - b.order);
  const numbers = new Map();
  for (const row of result) {
    const key = `${row.exam}:${row.subjectId}`;
    row.topicNumber = (numbers.get(key) || 0) + 1; numbers.set(key, row.topicNumber);
  }
  return [...result, ...definitions.filter(category => !YKS.has(category.exam)
    && category.canonicalUnit && category.selectable !== false)];
}

/** Keep every old identity available for saved history, with one preferred picker tree. */
export function applyCurriculumMetadata(data) {
  if (!Array.isArray(data?.categories) || !Array.isArray(data?.curriculumCategories) || !data?.curriculumNavigation?.courses)
    return data;
  const preferred = new Map(data.curriculumCategories.filter(category => YKS.has(category.exam)).map(category => [category.id, category]));
  const known = new Set(data.categories.map(category => category.id));
  for (const id of preferred.keys()) if (!known.has(id)) throw Error('Yayımlanmış konu tanımı eksik.');
  return { ...data, categoryDefinitions: data.categories, categories: data.categories.map(category => {
    if (preferred.has(category.id)) return { ...preferred.get(category.id) };
    if (YKS.has(category.exam)) return { ...category, selectable: false, canonicalUnit: false, legacyCompatibility: true };
    return category;
  }) };
}
