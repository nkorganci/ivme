// Mutlak Değer laboratuvarı çizimleri: uzaklık yayı, parçalı grafik, bant, uzaklıklar toplamı grafiği.
import { fmt } from '../sayi.js';
import { POINTS, sumDist } from '../konular/mutlak-deger.js';

const axis = (X, y, ticks) => <g>
  <line x1="10" x2="350" y1={y} y2={y} className="tl-axis" />
  {ticks.map((t) => <g key={t}><line x1={X(t)} x2={X(t)} y1={y - 5} y2={y + 5} className="tl-axis" /><text x={X(t)} y={y + 19} textAnchor="middle" className="tl-svg-small">{fmt(t)}</text></g>)}
</g>;

function Distance({ result }) {
  const X = (v) => 180 + v * 20;
  return <svg className="tl-svg" viewBox="0 0 360 120" role="img" aria-label={`x = ${result.x}, 2’ye uzaklık ${result.d}`}>
    {axis(X, 80, [-8, -4, -3, 0, 2, 4, 7, 8])}
    <path d={`M${X(2)},74 Q${(X(2) + X(result.x)) / 2},${74 - Math.min(60, 8 + result.d * 8)} ${X(result.x)},74`} className="tl-curve" />
    <circle cx={X(2)} cy="80" r="6" className="tl-dot" /><circle cx={X(result.x)} cy="80" r="7" className="tl-dot-ok" />
    <text x={(X(2) + X(result.x)) / 2} y={Math.max(14, 66 - Math.min(60, 8 + result.d * 8) / 2)} textAnchor="middle" className="tl-svg-label tl-halo">{fmt(result.d, 1)} birim</text>
    {[-3, 7].map((v) => <circle key={v} cx={X(v)} cy="80" r="10" style={{ fill: 'none', stroke: 'var(--line)', strokeDasharray: '3 3' }} />)}
  </svg>;
}

function Pieces({ result }) {
  const X = (x) => 30 + (x + 5) * 28, Y = (y) => 150 - y * 9;
  const f = (x) => Math.abs(x - 3) + Math.abs(x + 1);
  const pts = Array.from({ length: 23 }, (_, i) => -5 + i * 0.5).map((x) => `${X(x)},${Y(f(x))}`).join(' ');
  return <svg className="tl-svg" viewBox="0 0 360 170" role="img" aria-label={`x = ${result.x}; bölge ${result.region}`}>
    <rect x={X(-5)} y="6" width={X(-1) - X(-5)} height="146" style={{ fill: result.a === -2 ? 'var(--tint)' : 'transparent' }} />
    <rect x={X(-1)} y="6" width={X(3) - X(-1)} height="146" style={{ fill: result.a === 0 ? 'var(--tint)' : 'transparent' }} />
    <rect x={X(3)} y="6" width={X(6) - X(3)} height="146" style={{ fill: result.a === 2 ? 'var(--tint)' : 'transparent' }} />
    {[-1, 3].map((c) => <line key={c} x1={X(c)} x2={X(c)} y1="6" y2="152" className="tl-boundary" />)}
    <line x1={X(-5)} x2={X(6)} y1={Y(0)} y2={Y(0)} className="tl-axis" />
    <polyline points={pts} className="tl-curve" />
    <circle cx={X(result.x)} cy={Y(result.v)} r="6" className="tl-dot-ok" />
    <text x={X(-3)} y="20" textAnchor="middle" className="tl-svg-small">−2x+2</text><text x={X(1)} y="20" textAnchor="middle" className="tl-svg-small">4</text><text x={X(4.5)} y="20" textAnchor="middle" className="tl-svg-small">2x−2</text>
    <text x={X(-1)} y="166" textAnchor="middle" className="tl-svg-small">−1</text><text x={X(3)} y="166" textAnchor="middle" className="tl-svg-small">3</text>
  </svg>;
}

function Band({ result }) {
  const X = (v) => 20 + (v + 6) * 18;
  return <svg className="tl-svg" viewBox="0 0 360 120" role="img" aria-label={`Bant ${result.lo} ile ${result.hi} arası; hedef 2 ile 8`}>
    {axis(X, 70, [-6, -2, 2, 5, 8, 12])}
    <rect x={X(2)} y="54" width={X(8) - X(2)} height="32" className="tl-set" style={{ strokeDasharray: '5 3' }} />
    <line x1={X(Math.max(-6, result.lo))} x2={X(Math.min(12, result.hi))} y1="70" y2="70" style={{ stroke: 'var(--navy)', strokeWidth: 8, opacity: 0.45 }} />
    <circle cx={X(result.a)} cy="70" r="6" className="tl-dot" />
    <text x={X(result.a)} y="40" textAnchor="middle" className="tl-svg-small">merkez {result.a}, ± {result.r}</text>
    <text x="10" y="114" className="tl-svg-small">Kesikli kutu: hedef [2, 8]</text>
  </svg>;
}

function SumDist({ result }) {
  const X = (x) => 20 + (x + 6) * 21, Y = (y) => 150 - (y - 8) * 5;
  const pts = Array.from({ length: 31 }, (_, i) => -6 + i * 0.5).map((x) => `${X(x)},${Math.max(6, Y(sumDist(x)))}`).join(' ');
  return <svg className="tl-svg" viewBox="0 0 360 175" role="img" aria-label={`x = ${result.x}; toplam ${result.total}`}>
    <polyline points={pts} className="tl-curve" />
    <line x1="10" x2="350" y1="160" y2="160" className="tl-axis" />
    {POINTS.map((p) => <g key={p}><circle cx={X(p)} cy="160" r="6" className="tl-dot" /><text x={X(p)} y="174" textAnchor="middle" className="tl-svg-small">{p}</text></g>)}
    <line x1={X(result.x)} x2={X(result.x)} y1={Y(result.total)} y2="160" className="tl-mean" />
    <circle cx={X(result.x)} cy={Y(result.total)} r="6" className="tl-dot-ok" />
    <text x={X(result.x) + 8} y={Y(result.total) - 6} className="tl-svg-label tl-halo">{fmt(result.total, 1)}</text>
  </svg>;
}

export default { distance: Distance, pieces: Pieces, band: Band, 'sum-dist': SumDist };
