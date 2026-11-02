// Üslü İfadeler laboratuvarı çizimleri: işaret ve büyüklük, ikiye katlama adımları, 3ˣ blokları, ortak üste tabanlar.
import { fmt } from '../sayi.js';

function Sign({ result }) {
  const X = (v) => 180 + Math.sign(v) * Math.min(160, Math.abs(v) * 2.4);
  return <svg className="tl-svg" viewBox="0 0 360 120" role="img" aria-label={`Değer ${result.v}`}>
    <line x1="10" x2="350" y1="70" y2="70" className="tl-axis" />
    {[-64, -16, 0, 16, 64].map((t) => <g key={t}><line x1={X(t)} x2={X(t)} y1="64" y2="76" className="tl-axis" /><text x={X(t)} y="94" textAnchor="middle" className="tl-svg-small">{t}</text></g>)}
    <line x1="180" x2={X(result.v)} y1="70" y2="70" style={{ stroke: result.v < 0 ? 'var(--warn)' : 'var(--navy)', strokeWidth: 6, opacity: 0.6 }} />
    <circle cx={X(result.v)} cy="70" r="7" className={result.v === -16 ? 'tl-dot-ok' : 'tl-dot'} />
    <text x={X(result.v)} y="50" textAnchor="middle" className="tl-svg-label tl-halo">{fmt(result.v)}</text>
    <text x="10" y="18" className="tl-svg-small">{result.w === 'par' ? `(−2) sayısı ${result.n} kez çarpılıyor: ${result.n} eksi işareti` : `2 sayısı ${result.n} kez çarpılıyor, sonra başına eksi`}</text>
  </svg>;
}

function Doubling({ result }) {
  const row = (y, count, label, group) => <g>
    <text x="8" y={y + 13} className="tl-svg-small">{label}</text>
    {Array.from({ length: count }, (_, i) => <rect key={i} x={86 + i * 10} y={y} width="8" height="18" rx="2" className={group && Math.floor(i / group) % 2 ? 'tl-bar tl-bar-odd' : 'tl-bar'} />)}
    <text x="352" y={y + 13} textAnchor="end" className="tl-svg-small">{count} kez ×2</text>
  </g>;
  return <svg className="tl-svg" viewBox="0 0 360 110" role="img" aria-label={`m=${result.m}, n=${result.n}; çarpımda ${result.prod}, üssün üssünde ${result.pow} kez ikiye katlama`}>
    {row(14, result.prod, '2ᵐ·2ⁿ', result.m)}
    {row(58, Math.min(result.pow, 26), '(2ᵐ)ⁿ', result.m)}
    <text x="8" y="104" className="tl-svg-small">Renk değişimi: her {result.m}’li grup bir 2ᵐ</text>
  </svg>;
}

function Stack({ result }) {
  const h = 24;
  return <svg className="tl-svg" viewBox="0 0 360 130" role="img" aria-label={`3 üssü ${result.x} = ${result.base}; dört blok toplam ${result.total}`}>
    {[0, 1, 2].map((i) => <g key={i}><rect x={20 + i * 70} y="30" width="62" height={h * 2} rx="6" className="tl-rect" /><text x={51 + i * 70} y="60" textAnchor="middle" className="tl-svg-label">3^{result.x}</text></g>)}
    <text x="20" y="20" className="tl-svg-small">3^(x+1) = 3 tane 3^x</text>
    <text x="232" y="60" className="tl-svg-label">+</text>
    <rect x="250" y="30" width="62" height={h * 2} rx="6" className="tl-rect tl-rect-bad" /><text x="281" y="60" textAnchor="middle" className="tl-svg-label">3^{result.x}</text>
    <text x="20" y="112" className="tl-svg-label">4 × {result.base} = {result.total} {result.total === 108 ? '✓' : ''}</text>
  </svg>;
}

function Compare({ result }) {
  return <svg className="tl-svg" viewBox="0 0 360 130" role="img" aria-label={`Ortak üs ${result.k}`}>
    {result.rows.map((r, i) => <g key={r.b}>
      <text x="8" y={30 + i * 36} className="tl-svg-label">{r.b}^{r.e}</text>
      {r.ok ? <><rect x="70" y={16 + i * 36} width={Math.min(240, 20 * Math.log2(r.nb + 1))} height="20" className="tl-bar" />
        <text x={76 + Math.min(240, 20 * Math.log2(r.nb + 1))} y={31 + i * 36} className="tl-svg-small">{r.nb > 1e6 ? r.nb.toExponential(1) : r.nb}^{result.k}</text></>
        : <text x="70" y={30 + i * 36} className="tl-svg-small">üs {result.k}’e bölünmüyor</text>}
    </g>)}
    <text x="8" y="124" className="tl-svg-small">Çubuk boyu: ortak üsteki taban (log ölçek)</text>
  </svg>;
}

export default { sign: Sign, doubling: Doubling, stack: Stack, compare: Compare };
