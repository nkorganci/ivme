import { Field } from './Field.jsx';
import { formatNumber } from '../format.js';

const TYPES = ['TYT', 'AYT'];

const matches = (r, { examType, subject, topic }) =>
  (!examType || r.examType === examType) && (!subject || r.subject === subject) && (!topic || r.topic === topic);

/** Filtreye uyan aktif soru sayısı. */
export function countMatching(rows, f) {
  return rows.filter((r) => matches(r, f)).reduce((t, r) => t + r.count, 0);
}

function group(rows, key) {
  const map = new Map();
  rows.forEach((r) => r[key] && map.set(r[key], (map.get(r[key]) || 0) + r.count));
  return [...map].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value, 'tr'));
}

/**
 * Basamaklı filtre: sınav türü → ders → konu.
 * value = {examType, subject, topic}; onChange(yeniDeğer) çağrılır. children (örn. "Temizle" düğmesi) ızgaranın sonuna eklenir.
 */
export default function FilterSelects({ rows, value, onChange, children }) {
  const subjects = group(rows.filter((r) => matches(r, { examType: value.examType })), 'subject');
  const topics = value.subject ? group(rows.filter((r) => matches(r, { examType: value.examType, subject: value.subject })), 'topic') : [];
  const set = (patch) => onChange({ ...value, ...patch });

  const changeType = (examType) => {
    const keep = !value.subject || rows.some((r) => matches(r, { examType, subject: value.subject }));
    set({ examType, subject: keep ? value.subject : '', topic: keep ? value.topic : '' });
  };

  return (
    <div className="filters">
      <Field as="select" label="Sınav türü" value={value.examType || ''} onChange={(e) => changeType(e.target.value)}>
        <option value="">Hepsi ({formatNumber(countMatching(rows, {}))})</option>
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {t} ({formatNumber(countMatching(rows, { examType: t }))})
          </option>
        ))}
      </Field>
      <Field as="select" label="Ders" value={value.subject || ''} onChange={(e) => set({ subject: e.target.value, topic: '' })}>
        <option value="">Tüm dersler</option>
        {subjects.map((s) => (
          <option key={s.value} value={s.value}>
            {s.value} ({formatNumber(s.count)})
          </option>
        ))}
      </Field>
      <Field as="select" label="Konu" value={value.topic || ''} disabled={!value.subject} onChange={(e) => set({ topic: e.target.value })}>
        <option value="">{value.subject ? 'Tüm konular' : 'Önce ders seç'}</option>
        {topics.map((t) => (
          <option key={t.value} value={t.value}>
            {t.value} ({formatNumber(t.count)})
          </option>
        ))}
      </Field>
      {children}
    </div>
  );
}
