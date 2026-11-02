// Kâr–Zarar laboratuvarı çizimleri: maliyet/kâr çubuğu, kampanya sepeti, iki satış fiyatı, yumurta firesi.
import { fmt } from '../sayi.js';
import { COST, EGGS } from '../konular/kar-zarar.js';

function Margin({ result }) {
  const s = 1.9;
  return <svg className="tl-svg" viewBox="0 0 360 110" role="img" aria-label={`Maliyet ${COST}, satış ${result.s}`}>
    <text x="8" y="34" className="tl-svg-small">maliyet</text><rect x="70" y="20" width={COST * s} height="22" className="tl-bar" />
    <text x="8" y="74" className="tl-svg-small">satış</text><rect x="70" y="60" width={result.s * s} height="22" className={result.gain >= 0 ? 'tl-bar tl-bar-odd' : 'tl-rect tl-rect-bad'} />
    <line x1={70 + COST * s} x2={70 + COST * s} y1="14" y2="90" className="tl-mean" />
    <text x={74 + Math.max(COST, result.s) * s} y="76" className="tl-svg-label">{result.gain >= 0 ? '+' : ''}{result.gain}</text>
    <text x="8" y="104" className="tl-svg-small">Kâr yüzdesi = kâr ÷ maliyet (kesikli çizgiye kadar olan çubuk)</text>
  </svg>;
}

function Campaign({ result }) {
  return <svg className="tl-svg" viewBox="0 0 360 110" role="img" aria-label={`${result.n} ürün, ödenen ${fmt(result.pay)}`}>
    {Array.from({ length: result.n }, (_, i) => { const unit = result.kind === 'hepsi30' ? 70 : result.kind === 'ikinci50' ? (i % 2 ? 50 : 100) : ((i + 1) % 3 === 0 ? 0 : 100);
      return <g key={i}><rect x={16 + i * 54} y="20" width="46" height="50" className="tl-set" /><rect x={16 + i * 54} y={70 - unit / 2} width="46" height={unit / 2} className="tl-bar" />
        <text x={39 + i * 54} y="86" textAnchor="middle" className="tl-svg-small">{unit}</text></g>; })}
    <text x="16" y="104" className="tl-svg-small">Koyu: ödenen · çerçeve: etiket (100 TL) · gerçek indirim %{fmt(result.pct, 1)}</text>
  </svg>;
}

function Gap({ result }) {
  const X = (v) => 40 + ((v - 0.9 * result.c) / (0.35 * result.c)) * 280;
  return <svg className="tl-svg" viewBox="0 0 360 110" role="img" aria-label={`Maliyet ${result.c}, fark ${fmt(result.gap, 1)}`}>
    <line x1="10" x2="350" y1="60" y2="60" className="tl-axis" />
    {[[result.lo, '%5 zarar'], [result.c, 'maliyet'], [result.hi, '%20 kâr']].map(([v, l], i) => <g key={i}><circle cx={X(v)} cy="60" r="6" className={i === 1 ? 'tl-dot' : 'tl-dot-ok'} />
      <text x={X(v)} y={i === 1 ? 84 : 40} textAnchor="middle" className="tl-svg-small">{l} {fmt(v, 1)}</text></g>)}
    <text x="10" y="104" className="tl-svg-label">fark = {fmt(result.gap, 1)} TL</text>
  </svg>;
}

function Eggs({ result }) {
  return <svg className="tl-svg" viewBox="0 0 360 120" role="img" aria-label={`90 yumurta satılır, 10 kırık; gelir ${fmt(result.revenue, 1)}`}>
    {Array.from({ length: EGGS.bought }, (_, i) => <circle key={i} cx={16 + (i % 25) * 13} cy={16 + Math.floor(i / 25) * 14} r="5" className={i >= EGGS.bought - EGGS.broken ? 'tl-dot' : 'tl-dot-ok'} />)}
    <text x="16" y="84" className="tl-svg-small">Turuncu: kırık (satılamaz ama parası ödendi)</text>
    <text x="16" y="106" className="tl-svg-label">90 × {fmt(result.p, 1)} = {fmt(result.revenue, 1)} TL · %{fmt(result.pct, 1)}</text>
  </svg>;
}

export default { margin: Margin, campaign: Campaign, gap: Gap, eggs: Eggs };
