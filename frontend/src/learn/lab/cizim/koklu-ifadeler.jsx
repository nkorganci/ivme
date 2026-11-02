// Köklü İfadeler laboratuvarı çizimleri: kare ızgara (k² tane √m kenarlı kare), kök sayı doğrusu, eşlenik çarpımı,
// y = √(x+6) ile y = x grafiği.
import { fmt } from '../sayi.js';

function SquareGrid({ result }) {
  const k = Math.min(result.k, 10), size = 120 / k;
  return <svg className="tl-svg" viewBox="0 0 360 150" role="img" aria-label={`${result.n} = ${result.k} kare × ${result.m}; kenar ${result.k} kök ${result.m}`}>
    {Array.from({ length: k * k }, (_, i) => <rect key={i} x={14 + (i % k) * size} y={14 + Math.floor(i / k) * size} width={size - 2} height={size - 2} className="tl-rect" />)}
    <text x="150" y="40" className="tl-svg-label">{result.k} × {result.k} küçük kare</text>
    <text x="150" y="62" className="tl-svg-small">her birinin alanı {result.m}, kenarı √{result.m}</text>
    <text x="150" y="92" className="tl-svg-label">kenar = {result.k === 1 ? '' : result.k}√{result.m}{result.m === 1 ? ` = ${result.k}` : ''}</text>
    <text x="150" y="114" className="tl-svg-small">≈ {fmt(Math.sqrt(result.n), 2)}</text>
  </svg>;
}

function RootLine({ result }) {
  const X = (v) => 20 + v * 42;
  return <svg className="tl-svg" viewBox="0 0 360 120" role="img" aria-label={`kök ${result.n} yaklaşık ${fmt(result.s, 2)}`}>
    <line x1="10" x2="350" y1="70" y2="70" className="tl-axis" />
    {[0, 1, 2, 3, 4, 5, 6, 7].map((t) => <g key={t}><line x1={X(t)} x2={X(t)} y1="64" y2="76" className="tl-axis" />
      <text x={X(t)} y="92" textAnchor="middle" className="tl-svg-small">{t}</text><text x={X(t)} y="108" textAnchor="middle" className="tl-svg-small" style={{ opacity: 0.6 }}>√{t * t}</text></g>)}
    <rect x={X(5)} y="62" width={X(6) - X(5)} height="16" className="tl-set tl-set-q" />
    <circle cx={X(result.s)} cy="70" r="7" className={result.n === 35 ? 'tl-dot-ok' : 'tl-dot'} />
    <text x={X(result.s)} y="48" textAnchor="middle" className="tl-svg-label tl-halo">√{result.n}</text>
  </svg>;
}

function Conjugate({ result, values }) {
  const label = { p: '√3 + 1', m: '√3 − 1', r: '√3' }[values.c];
  return <svg className="tl-svg" viewBox="0 0 360 130" role="img" aria-label={`(√3 + 1)(${label}) = ${result.den[0]} + ${result.den[1]}√3`}>
    <text x="20" y="34" className="tl-svg-label" style={{ fontSize: 18 }}>(√3 + 1) · ({label})</text>
    <text x="20" y="70" className="tl-svg-label" style={{ fontSize: 18 }}>= {result.den[0]}{result.den[1] ? ` + ${result.den[1]}√3` : ''}</text>
    <text x="20" y="104" className="tl-svg-small">{result.rational ? 'Çapraz terimler (+√3 ve −√3) birbirini götürdü.' : 'Kök terimi kaldı: payda hâlâ irrasyonel.'}</text>
  </svg>;
}

function RootEq({ result }) {
  const X = (x) => 30 + (x + 6) * 25, Y = (y) => 140 - y * 14;
  const curve = Array.from({ length: 49 }, (_, i) => -6 + i * 0.25).map((x) => `${X(x)},${Y(Math.sqrt(x + 6))}`).join(' ');
  return <svg className="tl-svg" viewBox="0 0 360 170" role="img" aria-label={`x = ${result.x}; sol ${fmt(result.lhs, 2)}, sağ ${result.rhs}`}>
    <line x1="20" x2="350" y1={Y(0)} y2={Y(0)} className="tl-axis" style={{ opacity: 0.5 }} /><line x1={X(0)} x2={X(0)} y1="8" y2="165" className="tl-axis" style={{ opacity: 0.5 }} />
    <polyline points={curve} className="tl-curve" />
    <line x1={X(-2)} x2={X(6)} y1={Y(-2)} y2={Y(6)} className="tl-curve" style={{ stroke: 'var(--warn)', strokeDasharray: '6 4' }} />
    <circle cx={X(result.x)} cy={Y(result.lhs)} r="6" className="tl-dot-ok" />
    <circle cx={X(result.x)} cy={Y(result.rhs)} r="6" className="tl-dot" />
    <text x={X(-5.5)} y={Y(2.4)} className="tl-svg-small tl-halo">y = √(x+6)</text><text x={X(4)} y={Y(5.8)} className="tl-svg-small tl-halo">y = x</text>
  </svg>;
}

export default { 'square-grid': SquareGrid, 'root-line': RootLine, conjugate: Conjugate, 'root-eq': RootEq };
