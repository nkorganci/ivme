// Biçim yardımcıları ve Türkçe etiketler.

/** Kullanıcı adını baş harfi büyük (Türkçe kurallarla: i → İ) gösterir. */
export function displayName(user) {
  const n = user?.username || '';
  return n.charAt(0).toLocaleUpperCase('tr-TR') + n.slice(1);
}

export function formatDuration(seconds, long = false) {
  if (seconds == null || isNaN(seconds)) return '—';
  const s = Math.max(0, Math.round(seconds));
  const dk = long ? 'dakika' : 'dk';
  const sn = long ? 'saniye' : 'sn';
  if (s < 60) return `${s} ${sn}`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m} ${dk} ${rest} ${sn}` : `${m} ${dk}`;
}

/** Geri sayım için: 05:07 veya 1:05:07 */
export function formatClock(seconds) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`;
}

export function formatPercent(p) {
  if (p == null) return '—';
  return '%' + Number(p).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
}

export function formatNet(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatNumber(n) {
  return Number(n ?? 0).toLocaleString('tr-TR');
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('tr-TR');
}

const DIFFICULTY = { KOLAY: 'Kolay', ORTA: 'Orta', ZOR: 'Zor' };
export const difficultyLabel = (d) => DIFFICULTY[d] || '—';
export const DIFFICULTIES = ['KOLAY', 'ORTA', 'ZOR'];

const CATEGORY = { RATING: 'Değerlendirme', QUESTION_ISSUE: 'Soru sorunu', GENERAL: 'Genel görüş' };
export const categoryLabel = (c) => CATEGORY[c] || c;

const STATUS = { CORRECT: 'Doğru', WRONG: 'Yanlış', BLANK: 'Boş' };
export const statusLabel = (s) => STATUS[s] || s;

export const LETTERS = ['A', 'B', 'C', 'D', 'E'];
