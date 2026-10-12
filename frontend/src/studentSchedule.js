export const DAY_MINUTES = 24 * 60;

export function formatTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function makeRows() {
  return Array.from({ length: 16 }, () => ({ minutes: 60, cells: Array(7).fill('') }));
}

export function rowStart(rows, index) {
  return rows.slice(0, index).reduce((sum, row) => sum + row.minutes, 0);
}

function parseTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 24 || minute > 59 || (hour === 24 && minute !== 0)) return null;
  return hour * 60 + minute;
}

export function parseInterval(value, expectedStart) {
  const parts = value.split(/\s*[-–]\s*/);
  if (parts.length !== 2) return null;
  const start = parseTime(parts[0]);
  let end = parseTime(parts[1]);
  if (start === null || end === null || start !== expectedStart) return null;
  // 09:00-1:00 gibi girişte 1:00, aynı günün 13:00 saati olarak okunur.
  if (end <= start && end < 12 * 60) end += 12 * 60;
  if (end <= start || end > DAY_MINUTES) return null;
  return end - start;
}

export function changeDuration(rows, index, minutes) {
  const next = cloneRows(rows);
  next[index].minutes = minutes;
  return validRows(next) ? next : null;
}

export function cloneRows(rows, withContent = true) {
  return rows.map((row) => ({ minutes: row.minutes, cells: withContent ? [...row.cells] : Array(7).fill('') }));
}

export function addRow(rows, index) {
  const next = cloneRows(rows);
  next.splice(index + 1, 0, { minutes: 60, cells: Array(7).fill('') });
  return validRows(next) ? next : null;
}

export function removeRow(rows, index) {
  if (rows.length <= 1) return null;
  const next = cloneRows(rows);
  next.splice(index, 1);
  return next;
}

export function validRows(value) {
  return Array.isArray(value) && value.length > 0 && value.length <= DAY_MINUTES
    && value.every((row) => Number.isInteger(row.minutes) && row.minutes > 0
      && Array.isArray(row.cells) && row.cells.length === 7
      && row.cells.every((cell) => typeof cell === 'string'))
    && value.reduce((sum, row) => sum + row.minutes, 0) <= DAY_MINUTES;
}
