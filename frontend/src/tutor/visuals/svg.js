// Görsellerin ortak yardımcıları: renkler yalnız theme.css değişkenlerinden gelir.

const TONE = {
  navy: ['var(--navy)', 'var(--tint)'],
  ok: ['var(--ok)', 'var(--ok-soft)'],
  bad: ['var(--bad)', 'var(--bad-soft)'],
  warn: ['var(--warn)', 'var(--warn-soft)'],
  ink: ['var(--ink)', 'var(--tint)'],
  focus: ['var(--focus)', 'var(--tint)'],
  line: ['var(--line)', 'var(--tint)'],
};

export const stroke = (tone = 'navy') => (TONE[tone] ?? TONE.navy)[0];
export const fill = (tone = 'navy') => (TONE[tone] ?? TONE.navy)[1];

/** Doğrusal ölçek: [d0,d1] → [r0,r1]. */
export function scale(d0, d1, r0, r1) {
  const k = (r1 - r0) / (d1 - d0);
  return (value) => r0 + (value - d0) * k;
}

/** Okunur adım: aralığı yaklaşık count parçaya böler (1, 2, 5 × 10^n). */
export function niceStep(span, count = 8) {
  const raw = Math.abs(span) / count;
  const power = 10 ** Math.floor(Math.log10(raw || 1));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
}

export function ticks(min, max, step) {
  const out = [];
  const first = Math.ceil(min / step) * step;
  for (let value = first; value <= max + step * 1e-9; value += step) out.push(Number(value.toFixed(10)));
  return out;
}

/** Türkçe sayı biçimi: virgüllü ondalık, eksi işareti. */
export function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return '';
  const rounded = Number(value.toFixed(digits));
  return String(rounded).replace('-', '−').replace('.', ',');
}

/** SVG metnini yaklaşık karakter sayısına göre satırlara böler. */
export function wrapText(text, max = 22) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > max && line) { lines.push(line); line = word; }
    else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

export function visible(state, id) {
  return !state?.show || state.show.has(id);
}

export function focused(state, id) {
  return !!state?.focus?.has(id);
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
