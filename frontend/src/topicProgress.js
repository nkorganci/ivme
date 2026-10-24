import { categoryBranchId, categoryOptions, categoryTopic } from './categorySelection.js';

// Keep published identities, including topics without any student history.
export const progressCategories = categories => categories.filter(category => category.id && category.selectable !== false
  && !category.id.startsWith('system.') && category.exam !== 'UNKNOWN'
  && !['SKILL', 'QUESTION_TYPE'].includes(category.nodeKind));

export function topicProgressRows(categories, statistics, subjectId) {
  const byId = new Map(statistics.map(row => [row.categoryId, row]));
  const options=categoryOptions(categories.filter(category => categoryBranchId(category) === subjectId));
  options.sort((a,b)=>(a.order || 999)-(b.order || 999));
  return options.map(category => {
    const count = byId.get(category.id);
    const correct = count?.correct ?? 0;
    const wrong = count?.wrong ?? 0;
    return {
      categoryId: category.id, subject: category.subject, exam: category.exam, grade: category.grade,
      topicLabel: categoryTopic(category), correct, wrong,
      unit: category.unit || '—', unitId: category.unitId || '',
      gradeLabel: category.gradeLabel ? `${category.gradeLabel}. sınıf` : category.grade?`${category.grade}. sınıf`:(category.estimatedGrades||[]).length?`${category.estimatedGrades.join('–')}. sınıf (tahmini)`:'—',
      solved: correct + wrong, net: correct - wrong / 4,
    };
  });
}
