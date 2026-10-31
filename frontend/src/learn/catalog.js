// Konuyu Öğrenelim'in ders/ünite/konu adları ve sınav kapsamı ortak DB kataloğundan gelir (TAS-03).
// Ders dosyası yalnız katalog kimliğini (`kategori:`) taşır; görünen ad buradan okunur, böylece
// katalogdaki bir ad düzeltmesi aynı kimlikle bütün ekranlara yansır. Saf fonksiyonlar Node testinde de çalışır.

const EXAM_ORDER = ['TYT', 'AYT'];
const byExam = (a, b) => EXAM_ORDER.indexOf(a) - EXAM_ORDER.indexOf(b);

export function catalogById(categories = []) {
  return new Map(categories.map((c) => [c.id, c]));
}

// Seçilemez eski kimlik, katalogdaki `canonicalTopicIds` yönlendirmesiyle güncel konuya bağlanır.
function resolve(id, byId, seen = new Set()) {
  const category = byId.get(id);
  if (!category || seen.has(id)) return [];
  seen.add(id);
  if (category.selectable === false && category.canonicalTopicIds?.length) {
    return category.canonicalTopicIds.flatMap((target) => resolve(target, byId, seen));
  }
  return [category];
}

// Aynı Excel satırı iki sınavda iki kimlikle yayımlanır; konu bir kez, sınavlarıyla birlikte gösterilir.
const rowKey = (category) => category.excelRowId ?? category.id.split('.').pop();

/** Dersin bağlı olduğu katalog konuları: ders, ünite, konu adı ve her konunun kendi sınav kapsamı. */
export function lessonScope(categoryIds, byId) {
  const topics = new Map();
  const missing = [];
  for (const id of categoryIds) {
    const resolved = resolve(id, byId);
    if (!resolved.length) missing.push(id);
    for (const category of resolved) {
      const key = rowKey(category);
      const topic = topics.get(key) ?? {
        key, topic: category.topic, unit: category.unit, unitId: category.unitId,
        subject: category.subject, subjectId: category.subjectId, gradeLabel: category.gradeLabel,
        order: category.order ?? 0, exams: [], ids: [],
      };
      if (category.exam && !topic.exams.includes(category.exam)) topic.exams.push(category.exam);
      topic.ids.push(category.id);
      topic.order = Math.min(topic.order, category.order ?? topic.order);
      topics.set(key, topic);
    }
  }
  const list = [...topics.values()];
  for (const topic of list) topic.exams.sort(byExam);
  const units = [];
  for (const topic of list) {
    if (topic.unitId && !units.some((u) => u.id === topic.unitId)) units.push({ id: topic.unitId, name: topic.unit, subject: topic.subject, order: topic.order });
  }
  return {
    subject: list[0]?.subject ?? null,
    units,
    topics: list,
    exams: [...new Set(list.flatMap((t) => t.exams))].sort(byExam),
    missing,
  };
}

/**
 * Konu haritası: kavramlar katalog ünitesine göre gruplanır (dersin ilk bağlı konusu yerini belirler).
 * Ünite sırası katalogdaki konu sırasıdır; ünite içinde dersler kendi öğretim sırasını (`sira`) korur.
 */
export function catalogUnits(concepts, byId) {
  const groups = new Map();
  const unplaced = [];
  for (const meta of concepts) {
    const scope = lessonScope(meta.categories, byId);
    const primary = scope.topics[0];
    if (!primary?.unitId) { unplaced.push({ meta, scope }); continue; }
    const group = groups.get(primary.unitId) ?? {
      id: primary.unitId, name: primary.unit, subject: primary.subject, order: primary.order, grades: [], exams: [], concepts: [],
    };
    group.order = Math.min(group.order, primary.order);
    for (const topic of scope.topics.filter((t) => t.unitId === primary.unitId)) {
      if (topic.gradeLabel && !group.grades.includes(topic.gradeLabel)) group.grades.push(topic.gradeLabel);
      for (const exam of topic.exams) if (!group.exams.includes(exam)) group.exams.push(exam);
    }
    group.concepts.push({ meta, scope });
    groups.set(primary.unitId, group);
  }
  const units = [...groups.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'tr'));
  for (const unit of units) {
    unit.exams.sort(byExam);
    unit.grades.sort((a, b) => String(a).localeCompare(String(b), 'tr', { numeric: true }));
    unit.concepts.sort((a, b) => a.meta.order - b.meta.order || a.meta.id.localeCompare(b.meta.id));
  }
  return { units, unplaced };
}
