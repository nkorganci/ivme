export const DAY_MINUTES = 24 * 60;

export function formatTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function makeRows() {
  return Array.from({ length: 16 }, () => ({ minutes: 60, cells: Array(7).fill('') }));
}

export function rowStart(rows, index) {
  return (rows[0]?.start ?? 0) + rows.slice(0, index).reduce((sum, row) => sum + row.minutes, 0);
}

function parseTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 24 || minute > 59 || (hour === 24 && minute !== 0)) return null;
  return hour * 60 + minute;
}

export function parseTimeRange(value) {
  const parts = value.split(/\s*[-–]\s*/);
  if (parts.length !== 2) return null;
  const start = parseTime(parts[0]);
  let end = parseTime(parts[1]);
  if (start === null || end === null || start === DAY_MINUTES) return null;
  // 09:00-1:00 gibi girişte 1:00, aynı günün 13:00 saati olarak okunur.
  if (end <= start && end < 12 * 60) end += 12 * 60;
  if (end <= start || end > DAY_MINUTES) return null;
  return { start, end };
}

export function parseInterval(value, expectedStart) {
  const range = parseTimeRange(value);
  return range && range.start === expectedStart ? range.end - range.start : null;
}

export function changeDuration(rows, index, minutes) {
  const next = cloneRows(rows);
  next[index].minutes = minutes;
  return validRows(next) ? next : null;
}

export function changeInterval(rows, index, range) {
  if (!range || range.end <= range.start) return null;
  const next = cloneRows(rows);
  if (index === 0) {
    next[0].start = range.start;
  } else {
    const previousStart = rowStart(rows, index - 1);
    if (range.start <= previousStart) return null;
    next[index - 1].minutes = range.start - previousStart;
  }
  next[index].minutes = range.end - range.start;
  let cursor = next[0].start ?? 0;
  const fitted = [];
  for (const row of next) {
    if (cursor >= DAY_MINUTES) break;
    const minutes = Math.min(row.minutes, DAY_MINUTES - cursor);
    fitted.push({ ...row, minutes });
    cursor += minutes;
  }
  return validRows(fitted) ? fitted : null;
}

export function cloneRows(rows, withContent = true) {
  return rows.map((row) => ({ ...row, cells: withContent ? [...row.cells] : Array(7).fill('') }));
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
  if (index === 0 && rows[0].start !== undefined) next[0].start = rows[0].start;
  return next;
}

export function validRows(value) {
  return Array.isArray(value) && value.length > 0 && value.length <= DAY_MINUTES
    && value.every((row) => Number.isInteger(row.minutes) && row.minutes > 0
      && Array.isArray(row.cells) && row.cells.length === 7
      && row.cells.every((cell) => typeof cell === 'string'))
    && Number.isInteger(value[0].start ?? 0) && (value[0].start ?? 0) >= 0
    && value.slice(1).every((row) => row.start === undefined)
    && (value[0].start ?? 0) + value.reduce((sum, row) => sum + row.minutes, 0) <= DAY_MINUTES;
}
