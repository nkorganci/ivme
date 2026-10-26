// Atış hesapları (saf işlevler): sınav açıları için tam değerler, bileşenler, süre, tepe, menzil.
/** Sınav kuralı: 37° ve 53° için 0,6 / 0,8; 30°, 45°, 60° tam değerler. */
export function trig(angle) {
  const special = { 0: [0, 1], 30: [0.5, Math.sqrt(3) / 2], 37: [0.6, 0.8], 45: [Math.SQRT1_2, Math.SQRT1_2], 53: [0.8, 0.6], 60: [Math.sqrt(3) / 2, 0.5], 90: [1, 0], [-37]: [-0.6, 0.8], [-53]: [-0.8, 0.6], [-30]: [-0.5, Math.sqrt(3) / 2], [-45]: [-Math.SQRT1_2, Math.SQRT1_2], [-90]: [-1, 0] };
  if (special[angle]) return { sin: special[angle][0], cos: special[angle][1] };
  const r = (angle * Math.PI) / 180;
  return { sin: Math.sin(r), cos: Math.cos(r) };
}

/** Bir atışın bütün büyüklükleri. */
export function projectile({ mode, v0, angle, vx: vxIn, vy: vyIn, h0, g }) {
  const { sin, cos } = trig(angle);
  const vx = mode === 'components' ? vxIn : v0 * cos;
  const vy = mode === 'components' ? vyIn : v0 * sin;
  const T = (vy + Math.sqrt(vy * vy + 2 * g * h0)) / g;
  const tTop = vy > 0 ? vy / g : 0;
  const hMax = h0 + (vy > 0 ? (vy * vy) / (2 * g) : 0);
  return { vx, vy, T, tTop, hMax, range: vx * T, speed0: Math.hypot(vx, vy), at: (t) => ({ x: vx * t, y: h0 + vy * t - 0.5 * g * t * t, vxt: vx, vyt: vy - g * t }) };
}
