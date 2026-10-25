// Laboratuvar çizimlerinin ortak yardımcıları. Renkler yalnız theme.css değişkenlerinden gelir.
import { niceStep, ticks } from '../../tutor/visuals/svg.js';

export { niceStep, ticks };

export const TONES = { red: 'var(--pen-red)', blue: 'var(--pen-blue)', green: 'var(--pen-green)', black: 'var(--pen-black)' };
export const toneOf = (body) => TONES[body.tone] ?? TONES.black;

/** Ters çevrilebilir doğrusal ölçek. */
export function linear(d0, d1, r0, r1) {
  const span = d1 - d0 || 1;
  const map = (value) => r0 + ((value - d0) * (r1 - r0)) / span;
  map.invert = (pixel) => d0 + ((pixel - r0) * span) / (r1 - r0);
  return map;
}

/** Değer aralığını okunur sınırlara genişletir; istenirse sıfırı içerir. */
export function niceRange([min, max], { pad = 0.08, zero = true, count = 5 } = {}) {
  let low = zero ? Math.min(0, min) : min;
  let high = zero ? Math.max(0, max) : max;
  if (high - low < 1e-9) { low -= 1; high += 1; }
  const extra = (high - low) * pad;
  if (low < 0 || !zero) low -= extra;
  if (high > 0 || !zero) high += extra;
  const step = niceStep(high - low, count);
  return { min: Math.floor(low / step - 1e-9) * step, max: Math.ceil(high / step + 1e-9) * step, step };
}

/** Ekran noktasını SVG koordinatına çevirir. */
export function svgPoint(svg, event) {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

export function polyline(points) {
  return points.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join('');
}

/** Ok: (x1,y1) → (x2,y2), uçta üçgen başlık. Çok kısa oklar çizilmez. */
export function arrowPath(x1, y1, x2, y2, head = 8) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 3) return '';
  const ux = dx / len;
  const uy = dy / len;
  const size = Math.min(head, len * 0.6);
  const bx = x2 - ux * size;
  const by = y2 - uy * size;
  return `M${x1.toFixed(1)},${y1.toFixed(1)}L${bx.toFixed(1)},${by.toFixed(1)}M${x2.toFixed(1)},${y2.toFixed(1)}L${(bx - uy * size * 0.55).toFixed(1)},${(by + ux * size * 0.55).toFixed(1)}L${(bx + uy * size * 0.55).toFixed(1)},${(by - ux * size * 0.55).toFixed(1)}Z`;
}
