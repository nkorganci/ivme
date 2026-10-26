// Sayı biçimi ve ayrıştırma (Türkçe ondalık virgül, gerçek eksi işareti).
export { fmt } from '../motion/model.js';

/** "2,5" / "−3" / "1/2" → sayı; geçersizse NaN. */
export function parseNumber(text) {
  const clean = String(text ?? '').trim().replace(/[−–]/g, '-').replace(',', '.');
  if (/^-?\d+(\.\d+)?\/-?\d+(\.\d+)?$/.test(clean)) { const [p, q] = clean.split('/').map(Number); return q ? p / q : NaN; }
  return clean === '' ? NaN : Number(clean);
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const round = (value, digits = 6) => Number(Number(value).toFixed(digits));
export const deg = (rad) => (rad * 180) / Math.PI;
export const rad = (degrees) => (degrees * Math.PI) / 180;
