// Oran ve Orantı laboratuvarı çizimleri: eldeki/kullanılan çubuklar, ölçüm noktaları ve model eğrisi, pay şeritleri,
// işçi-gün ızgarası.
import { fmt } from '../sayi.js';
import { POINTS, RECIPE, WORK } from '../konular/oran-oranti.js';

function Recipe({ result }) {
  const u = 18;
  const bar = (y, have, used, label) => <g>
    <text x="8" y={y + 15} className="tl-svg-small">{label}</text>
    <rect x="70" y={y} width={have * u} height="22" className="tl-set" />
    <rect x="70" y={y} width={Math.min(used, 16) * u} height="22" className={used > have ? 'tl-rect tl-rect-bad' : 'tl-bar'} />
    <text x={74 + Math.max(have, Math.min(used, 16)) * u} y={y + 15} className="tl-svg-small">{fmt(used)}/{have}</text>
  </g>;
  return <svg className="tl-svg" viewBox="0 0 360 120" role="img" aria-label={`Şeker ${result.s}, gereken limon ${fmt(result.l)}`}>
    {bar(16, RECIPE.lemon, result.l, 'limon')}{bar(56, RECIPE.sugar, result.s, 'şeker')}
    <text x="8" y="108" className="tl-svg-small">Koyu: kullanılan · çerçeve: eldeki · kesikli kırmızı: yetmiyor</text>
  </svg>;
}

function Proportion({ result, values }) {
  const X = (x) => 30 + x * 40, Y = (y) => 150 - y * 11;
  const f = (x) => (values.mode === 'dogru' ? values.k * x : values.k / x);
  const pts = Array.from({ length: 70 }, (_, i) => 0.5 + i * 0.1).map((x) => `${X(x)},${Math.max(4, Y(f(x)))}`).join(' ');
  return <svg className="tl-svg" viewBox="0 0 360 170" role="img" aria-label={`${values.mode === 'dogru' ? 'Doğru' : 'Ters'} orantı modeli k=${values.k}; ${result.fits.filter(Boolean).length} ölçüm uyuyor`}>
    <line x1="30" x2="350" y1="150" y2="150" className="tl-axis" /><line x1="30" x2="30" y1="6" y2="150" className="tl-axis" />
    <polyline points={pts} className="tl-curve" />
    {POINTS.map(([x, y], i) => <circle key={x} cx={X(x)} cy={Y(y)} r="6" className={result.fits[i] ? 'tl-dot-ok' : 'tl-dot'} />)}
    <text x="346" y="164" textAnchor="end" className="tl-svg-small">musluk</text><text x="34" y="14" className="tl-svg-small">saat</text>
  </svg>;
}

function Shares({ result }) {
  const parts = [2, 3, 5];
  let x = 20;
  return <svg className="tl-svg" viewBox="0 0 360 110" role="img" aria-label={`Paylar ${result.shares.join(', ')}; toplam ${result.total}`}>
    {parts.map((p, i) => { const w = p * 31; const g = <g key={i}>
      {Array.from({ length: p }, (_, j) => <rect key={j} x={x + j * 31} y="20" width="29" height="30" className={i % 2 ? 'tl-bar tl-bar-odd' : 'tl-bar'} />)}
      <text x={x + w / 2} y="70" textAnchor="middle" className="tl-svg-label">{result.shares[i]}</text></g>; x += w + 4; return g; })}
    <text x="20" y="98" className="tl-svg-small">Her kare bir birim = {result.u} TL · toplam {result.total} TL</text>
  </svg>;
}

function WorkGrid({ result }) {
  const cell = 10, cols = WORK.newWorkers;
  return <svg className="tl-svg" viewBox="0 0 360 190" role="img" aria-label={`${WORK.newWorkers} işçi ${result.d} gün = ${result.cells} işçi-gün`}>
    {Array.from({ length: result.cells }, (_, i) => { const wall = Math.floor(i / result.unit); return <rect key={i} x={20 + (i % cols) * cell} y={14 + Math.floor(i / cols) * cell} width={cell - 1} height={cell - 1} className={wall % 2 ? 'tl-bar tl-bar-odd' : 'tl-bar'} />; })}
    <text x="130" y="30" className="tl-svg-label">{WORK.newWorkers} sütun = {WORK.newWorkers} işçi</text>
    <text x="130" y="50" className="tl-svg-label">{result.d} satır = {result.d} gün</text>
    <text x="130" y="76" className="tl-svg-small">Renk değişimi: her {result.unit} kare bir duvar</text>
    <text x="130" y="96" className="tl-svg-small">{fmt(result.done, 2)} duvar</text>
  </svg>;
}

export default { recipe: Recipe, proportion: Proportion, shares: Shares, workgrid: WorkGrid };
