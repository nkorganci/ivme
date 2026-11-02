// Laboratuvarlarda ortak sayı gösterimi ve kesin kesir hesabı (ondalık yuvarlama hatası olmadan karşılaştırma için).
export const fmt = (n, digits = 2) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '−∞';
  const rounded = Math.round(n * 10 ** digits) / 10 ** digits;
  return String(rounded).replace('-', '−').replace('.', ',');
};

export const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };

/** Sadeleşmiş kesir {n, d}; d > 0. */
export function frac(n, d = 1) {
  if (d === 0) throw new Error('Payda sıfır olamaz');
  const g = gcd(n, d) * Math.sign(d);
  return { n: n / g, d: d / g };
}
export const add = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a, b) => frac(a.n * b.n, a.d * b.d);
export const div = (a, b) => frac(a.n * b.d, a.d * b.n);
export const isZero = (a) => a.n === 0;
export const fracText = (a) => (a.d === 1 ? fmt(a.n) : `${a.n < 0 ? '−' : ''}${Math.abs(a.n)}/${a.d}`);
