import { learningFields } from './mathLearning.js';

export function formatLessonRange(row) {
  return `${row.start?.slice(0, 5) || ''}-${row.end?.slice(0, 5) || ''}`;
}

const MONTH = new Intl.DateTimeFormat('tr-TR', { month: 'long' });
const WEEKDAY = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' });

export function formatLessonDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return 'Tarih seçin';
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) return 'Tarih seçin';
  const capitalize = (text) => text.charAt(0).toLocaleUpperCase('tr-TR') + text.slice(1);
  return `${capitalize(MONTH.format(date))} ${day}, ${capitalize(WEEKDAY.format(date))}`;
}

export function parseLessonRange(value) {
  const match = /^(\d{2}):(\d{2})\s*[-–]\s*(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const startHour = Number(match[1]);
  const startMinute = Number(match[2]);
  const endHour = Number(match[3]);
  const endMinute = Number(match[4]);
  if (startHour > 23 || endHour > 23 || startMinute > 59 || endMinute > 59) return null;
  if (endHour * 60 + endMinute <= startHour * 60 + startMinute) return null;
  return { start: `${match[1]}:${match[2]}`, end: `${match[3]}:${match[4]}` };
}

export function lessonFields(row) {
  const range = parseLessonRange(row.timeRange ?? formatLessonRange(row));
  if (!range) throw new Error('Saat aralığını 00:00-01:00 biçiminde girin. Bitiş saati başlangıçtan sonra olmalı.');
  return { date: row.date, ...range, topic: (row.topic ?? '').trim(), homework: (row.homework ?? '').trim(), status: row.status, note: (row.note ?? '').trim(),
    ...(row.learning ? { learning: learningFields(row.learning) } : {}) };
}

export function lessonChanges(lessons, drafts, newRow, includeNew = false) {
  const changes = lessons.flatMap((lesson, index) => drafts[lesson.id]
    ? [{ id: lesson.id, row: { ...lesson, ...drafts[lesson.id] }, label: `${index + 1}. ders` }] : []);
  if (includeNew) changes.push({ id: 'new', row: newRow, label: 'Yeni ders' });
  return changes.map((change) => {
    try { return { ...change, fields: lessonFields(change.row) }; }
    catch (error) { throw new Error(`${change.label}: ${error.message}`); }
  });
}

export function formatSummaryDateRange({ start, end }) {
  const display = (value) => `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}`;
  return `${display(start)} – ${display(end)}`;
}

export function parseSummaryDateRange(value) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})\s*[-–]\s*(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const start = `${match[3]}-${match[2]}-${match[1]}`;
  const end = `${match[6]}-${match[5]}-${match[4]}`;
  if (formatLessonDate(start) === 'Tarih seçin' || formatLessonDate(end) === 'Tarih seçin' || start > end) return null;
  return { start, end };
}

export function sortLessons(rows) {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date)
    || a.start.localeCompare(b.start) || a.id - b.id);
}

export function lessonDateBounds(rows, fallback) {
  const dates = rows.map((row) => row.date).filter(Boolean).sort();
  return { start: dates[0] ?? fallback, end: dates.at(-1) ?? fallback };
}

export function summarizeLessons(rows, dateRange = null) {
  const totals = { planned: 0, completed: 0, cancelled: 0, total: 0 };
  const names = { PLANNED: 'planned', COMPLETED: 'completed', CANCELLED: 'cancelled' };
  for (const row of rows) {
    if (dateRange && (row.date < dateRange.start || row.date > dateRange.end)) continue;
    const range = parseLessonRange(formatLessonRange(row));
    if (!range) continue;
    const minutes = (Number(range.end.slice(0, 2)) * 60 + Number(range.end.slice(3)))
      - (Number(range.start.slice(0, 2)) * 60 + Number(range.start.slice(3)));
    totals.total += minutes;
    if (names[row.status]) totals[names[row.status]] += minutes;
  }
  return totals;
}

export function formatLessonDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
}
