// Planlama gün düzeyindedir: tarih anahtarı öğrencinin yerel takvimindeki 'YYYY-AA-GG'.
const pad = (value) => String(value).padStart(2, '0');
const parts = (key) => key.split('-').map(Number);

export function dayKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Yaz saati kaymalarından etkilenmemek için yerel öğle saati. */
export function fromDayKey(key) {
  const [year, month, day] = parts(key);
  return new Date(year, month - 1, day, 12);
}

export function addDays(key, count) {
  const date = fromDayKey(key);
  date.setDate(date.getDate() + count);
  return dayKey(date);
}

/** toKey − fromKey (gün). */
export function daysBetween(fromKey, toKey) {
  const [y1, m1, d1] = parts(fromKey);
  const [y2, m2, d2] = parts(toKey);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

/** 0 = Pazar … 6 = Cumartesi. */
export const weekday = (key) => fromDayKey(key).getDay();

/** Haftanın pazartesisi. */
export const weekStart = (key) => addDays(key, -((weekday(key) + 6) % 7));

export const ageDays = (iso, now) => Math.max(0, (now.getTime() - new Date(iso).getTime()) / 86400000);

export const hoursBetween = (fromIso, toDate) => (toDate.getTime() - new Date(fromIso).getTime()) / 3600000;

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
export const WEEKDAY_NAMES = DAYS;

export function formatDay(key, { withDay = false } = {}) {
  if (!key) return '';
  const [year, month, day] = parts(key);
  const text = `${day} ${MONTHS[month - 1]} ${year}`;
  return withDay ? `${text}, ${DAYS[weekday(key)]}` : text;
}

/** "bugün", "yarın", "3 gün sonra", "2 gün önce". */
export function relativeDay(key, today) {
  if (!key) return '';
  const diff = daysBetween(today, key);
  if (diff === 0) return 'bugün';
  if (diff === 1) return 'yarın';
  if (diff === -1) return 'dün';
  return diff > 0 ? `${diff} gün sonra` : `${-diff} gün önce`;
}
