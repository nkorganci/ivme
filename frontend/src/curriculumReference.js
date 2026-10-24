// All screens project the same published category records. No local subject list.
export const referenceTopics = categories => categories.filter(c => c.canonicalUnit && c.selectable !== false);
export function referenceUnits(categories) {
  return [...new Map(categories.filter(c => c.unitId).sort((a,b) => a.order-b.order)
    .map(c => [c.unitId, { id: c.unitId, label: c.unit }])).values()];
}
export function distributionRows(categories) {
  const rows = new Map();
  for (const category of referenceTopics(categories)) {
    if (!category.excelRowId || rows.has(category.excelRowId)) continue;
    rows.set(category.excelRowId, { ...category.distribution, id: category.excelRowId,
      subject: category.subject, subjectId: category.subjectId, unitId: category.unitId });
  }
  return [...rows.values()].sort((a,b) => a.row-b.row);
}
