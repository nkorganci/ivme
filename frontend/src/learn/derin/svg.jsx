// Bölüm keşfi çizimleri için küçük yardımcılar. Renkler tema sınıflarından gelir (learning-experience.css).
export const T = ({ x, y, children, size, anchor = 'middle', className = '', ...rest }) =>
  <text x={x} y={y} textAnchor={anchor} className={[size === 'large' ? 'lm-large' : '', className].filter(Boolean).join(' ') || undefined} {...rest}>{children}</text>;
export const R = ({ x, y, w, h, tone = 'soft', rx = 8, ...rest }) => <rect x={x} y={y} width={w} height={h} rx={rx} className={`lm-${tone}`} {...rest} />;
export const L = ({ x1, y1, x2, y2, tone = 'line', ...rest }) => <line x1={x1} y1={y1} x2={x2} y2={y2} className={`lm-${tone}`} {...rest} />;
export const C = ({ x, y, r = 10, tone = 'primary', ...rest }) => <circle cx={x} cy={y} r={r} className={`lm-${tone}`} {...rest} />;
export const times = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
