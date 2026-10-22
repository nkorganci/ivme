import { normaliseTopic } from './curriculumLinks.js';

const compare = new Intl.Collator('tr', { sensitivity: 'base', numeric: true }).compare;

export const categoryTopic = category => [category.topic, category.subtopic,
  category.detail !== category.topic && category.detail !== category.subtopic ? category.detail : '']
  .filter(Boolean).join(' → ');

export const categoryLabel = category => [category.exam, category.grade && `${category.grade}. sınıf`,category.subject, categoryTopic(category)]
  .filter(Boolean).join(' · ');

export const categoryBranchId = category => category.subjectId || category.subject;

/** Number published units within each exam and subject from the database catalogue order. */
export function topicNumberMap(categories) {
  const groups = new Map();
  for (const category of categories) {
    if (!category.canonicalUnit || category.selectable === false || !category.id) continue;
    const key = `${category.exam}\u0000${categoryBranchId(category)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(category);
  }
  const numbers = new Map();
  for (const group of groups.values()) {
    group.sort((a, b) => Number(a.order) - Number(b.order) || compare(a.id, b.id));
    group.forEach((category, index) => numbers.set(category.id, index + 1));
  }
  return numbers;
}

/** Branches are projections of published categories, not a second vocabulary. */
export function categoryBranches(categories) {
  const branches = new Map();
  for (const category of categories) {
    const id = categoryBranchId(category);
    if (id && !branches.has(id)) branches.set(id, { id, label: category.subject, categories: 0 });
    if (id) branches.get(id).categories++;
  }
  return [...branches.values()].sort((a, b) => compare(a.label, b.label));
}

export function selectedCategoryBranches(categories, categoryIds, branchIds = [], subject = '') {
  const selected = new Set(categoryIds);
  return [...new Set([...branchIds, ...categories.filter(category => selected.has(category.id)
    || subject && (category.subject === subject || category.subjectId === subject)).map(categoryBranchId)])];
}

export function categoriesInBranches(categories, branchIds, search = '') {
  const selected = new Set(branchIds);
  return categoryOptions(categories.filter(category => selected.has(categoryBranchId(category))), { search });
}

/** Presentation only: identities and names always come from the current API catalogue. */
export function categoryOptions(categories, { examType, subject, selectedIds = [], search = '' } = {}) {
  const selected = new Set(selectedIds);
  const terms = normaliseTopic(search).split(' ').filter(Boolean);
  return categories.filter(category => category.exam !== 'UNKNOWN' && category.selectable !== false
    && (!examType || category.exam === examType)
    && (!subject || category.subject === subject || category.subjectId === subject)
    && !selected.has(category.id)
    && terms.every(term => normaliseTopic(categoryLabel(category)).includes(term)))
    .sort((a, b) => compare(a.exam || '', b.exam || '')
      || compare(a.subject || '', b.subject || '')
      || ((a.canonicalUnit && b.canonicalUnit)?(a.order||999)-(b.order||999):0)
      || compare(a.topic || '', b.topic || '')
      || compare(a.subtopic || '', b.subtopic || '')
      || compare(a.detail || '', b.detail || '')
      || compare(a.id, b.id));
}

export function categoryGroups(options) {
  const groups = new Map();
  for (const category of options) {
    const key = JSON.stringify([category.exam, category.subject]);
    if (!groups.has(key)) groups.set(key, { key, label: [category.exam, category.subject].filter(Boolean).join(' · '), options: [] });
    groups.get(key).options.push(category);
  }
  return [...groups.values()];
}
