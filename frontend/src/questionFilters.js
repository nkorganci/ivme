const matches = (row, filter) => ['examType', 'subject', 'topic']
  .every(key => !filter[key] || row[key] === filter[key]);

// Published labels can place one question in several subjects/exams. Facet
// totals count identities once; summing all topic rows would count it twice.
export function countQuestionRows(rows, filter = {}) {
  const matching = rows.filter(row => matches(row, filter));
  const first = matching[0];
  if (!first) return 0;
  if (!filter.topic) {
    const field = filter.subject ? (filter.examType ? 'subjectCount' : 'subjectTotalCount')
      : filter.examType ? 'examCount' : 'totalCount';
    if (first[field] != null) return first[field];
  } else if (filter.subject && !filter.examType && first.topicTotalCount != null) return first.topicTotalCount;
  return matching.reduce((total, row) => total + row.count, 0);
}
