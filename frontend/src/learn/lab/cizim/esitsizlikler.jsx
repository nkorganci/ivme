// Eşitsizlikler laboratuvarı çizimleri: aralık ve tam sayılar, eşleme okları (yön), izinli dikdörtgen, tam sayı ızgarası.
import { fmt } from '../sayi.js';

const line = (X, lo, hi, y, ticks) => <g>
  <line x1="12" x2="348" y1={y} y2={y} className="tl-axis" />
  {ticks.map((t) => <g key={t}><line x1={X(t)} x2={X(t)} y1={y - 5} y2={y + 5} className="tl-axis" /><text x={X(t)} y={y + 20} textAnchor="middle" className="tl-svg-small">{fmt(t)}</text></g>)}
</g>;

function Interval({ result }) {
  const X = (v) => 30 + (v + 5) * 30;
  const ticks = Array.from({ length: 11 }, (_, i) => i - 5);
  return <svg className="tl-svg" viewBox="0 0 360 120" role="img" aria-label={`Aralık ${result.a} ile ${result.b}; tam sayılar ${result.ints.join(', ') || 'yok'}`}>
    {line(X, -5, 5, 60, ticks)}
    {!result.invalid && <line x1={X(result.a)} x2={X(result.b)} y1="60" y2="60" style={{ stroke: 'var(--navy)', strokeWidth: 6, opacity: 0.35 }} />}
    {result.ints.map((n) => <circle key={n} cx={X(n)} cy="60" r="4" className="tl-dot-ok" />)}
    {[[result.a, result.oa], [result.b, result.ob]].map(([v, open], i) => <circle key={i} cx={X(v)} cy="60" r="8" style={{ fill: open ? 'var(--surface)' : 'var(--navy)', stroke: 'var(--navy)', strokeWidth: 2.5 }} />)}
    <text x="12" y="22" className="tl-svg-label">{result.ints.length} tam sayı · uzunluk {fmt(result.len, 1)}</text>
    <text x="12" y="112" className="tl-svg-small">Dolu daire: uç dahil · boş daire: uç hariç</text>
  </svg>;
}

function Flip({ result, values }) {
  const X = (v) => 180 + v * 14;
  const pts = [2, 3, 4, 5];
  return <svg className="tl-svg" viewBox="0 0 360 150" role="img" aria-label={`x 2 ile 5 arasında; kx + c ${result.lo} ile ${result.hi} arasında${result.flips ? ', uçlar ters döndü' : ''}`}>
    <text x="8" y="22" className="tl-svg-small">x</text><text x="8" y="122" className="tl-svg-small">{values.k}x{values.c >= 0 ? '+' : ''}{values.c}</text>
    {line(X, -12, 12, 30, [-10, -5, 0, 5, 10])}
    {line(X, -12, 12, 110, [-10, -5, 0, 5, 10])}
    <line x1={X(2)} x2={X(5)} y1="30" y2="30" style={{ stroke: 'var(--navy)', strokeWidth: 6, opacity: 0.4 }} />
    <line x1={X(result.lo)} x2={X(result.hi)} y1="110" y2="110" style={{ stroke: 'var(--warn)', strokeWidth: 6, opacity: 0.5 }} />
    {pts.map((p) => { const q = values.k * p + values.c; return <line key={p} x1={X(p)} x2={X(Math.max(-12, Math.min(12, q)))} y1="34" y2="106" className="tl-axis" style={{ opacity: p === 2 || p === 5 ? 0.9 : 0.25 }} />; })}
    <text x={X(2)} y="14" textAnchor="middle" className="tl-svg-small">2</text><text x={X(5)} y="14" textAnchor="middle" className="tl-svg-small">5</text>
  </svg>;
}

function Box({ result }) {
  const X = (x) => 60 + (x + 3) * 40, Y = (y) => 150 - y * 30;
  return <svg className="tl-svg" viewBox="0 0 360 170" role="img" aria-label={`Nokta x=${result.x}, y=${result.y}; x eksi y ${result.d}`}>
    <rect x={X(-2)} y={Y(4)} width={X(3) - X(-2)} height={Y(1) - Y(4)} className="tl-set tl-set-q" />
    {[-6, -4, -2, 0, 2].map((c) => <line key={c} x1={X(Math.max(-3, c + 0.5))} x2={X(Math.min(4, c + 4.5))} y1={Y(Math.max(-3, c + 0.5) - c)} y2={Y(Math.min(4, c + 4.5) - c)} className="tl-mean" style={{ opacity: 0.35 }} />)}
    <circle cx={X(result.x)} cy={Y(result.y)} r="7" className={result.d === -6 ? 'tl-dot-ok' : 'tl-dot'} />
    <text x={X(-2)} y="164" textAnchor="middle" className="tl-svg-small">x = −2</text><text x={X(3)} y="164" textAnchor="middle" className="tl-svg-small">x = 3</text>
    <text x="8" y={Y(4) + 4} className="tl-svg-small">y = 4</text><text x="8" y={Y(1) + 4} className="tl-svg-small">y = 1</text>
    <text x="352" y="20" textAnchor="end" className="tl-svg-small">Kesikli çizgiler: x − y sabit</text>
  </svg>;
}

function Grid({ result }) {
  const X = (x) => 40 + x * 44, Y = (y) => 150 - y * 22;
  const pts = [];
  for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) pts.push([x, y, x > y && x + y < 7]);
  return <svg className="tl-svg" viewBox="0 0 360 170" role="img" aria-label={`Nokta (${result.x}, ${result.y}); ${result.ok1 && result.ok2 ? 'izinli' : 'izinsiz'}; çarpım ${result.p}`}>
    <line x1={X(0)} x2={X(7)} y1={Y(0)} y2={Y(0)} className="tl-axis" /><line x1={X(0)} x2={X(0)} y1={Y(7)} y2={Y(0)} className="tl-axis" />
    <line x1={X(0.5)} x2={X(6.5)} y1={Y(6.5)} y2={Y(0.5)} className="tl-mean" style={{ opacity: 0.5 }} />
    <line x1={X(0.5)} x2={X(6.5)} y1={Y(0.5)} y2={Y(6.5)} className="tl-boundary" style={{ opacity: 0.6 }} />
    {pts.map(([x, y, ok]) => <circle key={`${x}-${y}`} cx={X(x)} cy={Y(y)} r={ok ? 5 : 3} className={ok ? 'tl-dot-ok' : 'tl-set'} />)}
    <circle cx={X(result.x)} cy={Y(result.y)} r="10" style={{ fill: 'none', stroke: 'var(--warn)', strokeWidth: 3 }} />
    <text x="352" y="16" textAnchor="end" className="tl-svg-small">x + y = 7 (kesikli) · x = y (kırmızı)</text>
    <text x={X(result.x) + 12} y={Y(result.y) - 8} className="tl-svg-label tl-halo">{result.p}</text>
  </svg>;
}

export default { interval: Interval, flip: Flip, box: Box, grid: Grid };
