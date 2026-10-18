import { Field } from './Field.jsx';
import { formatNumber } from '../format.js';
import { countQuestionRows } from '../questionFilters.js';

const TYPES = ['TYT', 'AYT'];

const matches = (r, { examType, subject, topic }) =>
  (!examType || r.examType === examType) && (!subject || r.subject === subject) && (!topic || r.topic === topic);

/** Filtreye uyan aktif soru sayısı. */
export const countMatching = countQuestionRows;

function group(rows, key) {
  const map = new Map();
  rows.forEach((r) => r[key] && map.set(r[key], (map.get(r[key]) || 0) + r.count));
  return [...map].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value, 'tr'));
}

/**
 * Basamaklı filtre: sınav türü → ders → konu.
 * value = {examType, subject, topic}; onChange(yeniDeğer) çağrılır. leading ve children ızgaranın başına/sonuna eklenir.
 */
export default function FilterSelects({ rows, value, onChange, leading, children, showExamType = true, showSubject = true, showTopic = true }) {
  const subjects = group(rows.filter((r) => matches(r, { examType: value.examType })), 'subject');
  const topics = value.subject ? group(rows.filter((r) => matches(r, { examType: value.examType, subject: value.subject })), 'topic') : [];
  const set = (patch) => onChange({ ...value, ...patch });

  const changeType = (examType) => {
    const keep = !value.subject || rows.some((r) => matches(r, { examType, subject: value.subject }));
    const keepTopic = keep && (!value.topic || rows.some(r => matches(r, { examType, subject: value.subject, topic: value.topic })));
    set({ examType, subject: keep ? value.subject : '', topic: keepTopic ? value.topic : '' });
  };

  return (
    <div className="filters">
      {leading}
      {showExamType && <Field as="select" label="Sınav türü" value={value.examType || ''} onChange={(e) => changeType(e.target.value)}>
        <option value="">Hepsi ({formatNumber(countMatching(rows, {}))})</option>
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {t} ({formatNumber(countMatching(rows, { examType: t }))})
          </option>
        ))}
      </Field>}
      {showSubject && <Field as="select" label="Ders" value={value.subject || ''} onChange={(e) => set({ subject: e.target.value, topic: '' })}>
        <option value="">Tüm dersler</option>
        {subjects.map((s) => (
          <option key={s.value} value={s.value}>
            {s.value} ({formatNumber(countMatching(rows, { examType: value.examType, subject: s.value }))})
          </option>
        ))}
      </Field>}
      {showTopic && <Field as="select" label="Konu" value={value.topic || ''} disabled={!value.subject} onChange={(e) => set({ topic: e.target.value })}>
        <option value="">{value.subject ? 'Tüm konular' : 'Önce ders seç'}</option>
        {topics.map((t) => (
          <option key={t.value} value={t.value}>
            {t.value} ({formatNumber(countMatching(rows, { examType: value.examType, subject: value.subject, topic: t.value }))})
          </option>
        ))}
      </Field>}
      {children}
    </div>
  );
}
