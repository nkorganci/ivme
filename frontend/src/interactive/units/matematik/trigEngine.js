// Trigonometri çekirdeği (saf işlevler): açı indirgeme ve özel açılarda tam değerler.
import { fmt } from '../../kit/num.js';

const EXACT = {
  0: { sin: '0', cos: '1', tan: '0' }, 30: { sin: '1/2', cos: '√3/2', tan: '√3/3' }, 45: { sin: '√2/2', cos: '√2/2', tan: '1' },
  60: { sin: '√3/2', cos: '1/2', tan: '√3' }, 90: { sin: '1', cos: '0', tan: 'tanımsız' },
};

/** Açıyı [0, 360) aralığına indirger; bölge ve dar referans açıyı verir. */
export function reduce(angle) {
  const a = ((angle % 360) + 360) % 360;
  const quadrant = a < 90 ? 1 : a < 180 ? 2 : a < 270 ? 3 : 4;
  const ref = quadrant === 1 ? a : quadrant === 2 ? 180 - a : quadrant === 3 ? a - 180 : 360 - a;
  return { a, quadrant, ref: Number(ref.toFixed(6)) };
}

/** Özel açılarda (30°, 45°, 60° katları) tam değer; değilse ondalık. */
export function exactValue(fn, angle) {
  const { a, ref } = reduce(angle);
  const rad = (a * Math.PI) / 180;
  const value = fn === 'sin' ? Math.sin(rad) : fn === 'cos' ? Math.cos(rad) : fn === 'tan' ? Math.tan(rad) : 1 / Math.tan(rad);
  const base = Math.round(ref);
  if (Math.abs(ref - base) < 1e-6 && EXACT[base]) {
    if (fn === 'cot') {
      const inverse = { 0: 'tanımsız', 30: '√3', 45: '1', 60: '√3/3', 90: '0' }[base];
      if (inverse === 'tanımsız' || inverse === '0') return { text: inverse, value };
      return { text: `${value < 0 ? '−' : ''}${inverse}`, value };
    }
    const text = EXACT[base][fn];
    if (text === 'tanımsız' || text === '0') return { text, value };
    return { text: `${value < -1e-12 ? '−' : ''}${text}`, value };
  }
  return { text: Math.abs(value) > 1e6 ? 'tanımsız' : fmt(value, 4), value };
}
