// Bölme ve Bölünebilme laboratuvarı çizimleri: gruplama, kuralın baktığı rakamlar, iki kural, iki döngü.
import { PATTERN_A, PATTERN_B } from '../konular/bolme-bolunebilme.js';

function Groups({ result }) {
  const { q, r } = result;
  const rows = q + Math.ceil(r / 7);
  const h = Math.min(18, 120 / Math.max(rows, 1));
  return <svg className="tl-svg" viewBox="0 0 360 160" role="img" aria-label={`${q} dolu 7’li sıra ve ${r} artan`}>
    {Array.from({ length: q }, (_, i) => Array.from({ length: 7 }, (_, j) => <circle key={`${i}-${j}`} cx={30 + j * 20} cy={16 + i * h} r={Math.min(7, h / 2.4)} className="tl-dot-ok" />))}
    {Array.from({ length: r }, (_, j) => <circle key={`r${j}`} cx={30 + (j % 7) * 20} cy={16 + (q + Math.floor(j / 7)) * h} r={Math.min(7, h / 2.4)} className="tl-dot" />)}
    <text x="190" y="30" className="tl-svg-label">{q} dolu sıra = bölüm</text>
    <text x="190" y="52" className="tl-svg-label">{r} artan = kalan</text>
    {r >= 7 && <text x="190" y="80" className="tl-svg-small">Artanlar 7’li bir sıra daha dolduruyor!</text>}
    <text x="190" y="150" className="tl-svg-small">Mavi: 7’li sıralar · turuncu: artan</text>
  </svg>;
}

function Rule({ result, values }) {
  const digits = String(result.n).split('');
  const look = { 3: [0, 1, 2, 3], 9: [0, 1, 2, 3], 4: [2, 3], 11: [0, 1, 2, 3] }[values.d];
  const sign = (i) => (values.d === 11 ? ((digits.length - 1 - i) % 2 ? '−' : '+') : values.d === 4 ? '' : '+');
  return <svg className="tl-svg" viewBox="0 0 360 150" role="img" aria-label={`${result.n}: ${values.d} kuralı ${result.ok ? 'sağlanıyor' : 'sağlanmıyor'}`}>
    {digits.map((d, i) => <g key={i}>
      <rect x={50 + i * 66} y="22" width="54" height="60" rx="10" className={look.includes(i) ? (i === 1 ? 'tl-rect tl-rect-bad' : 'tl-rect') : 'tl-set'} />
      <text x={77 + i * 66} y="62" textAnchor="middle" className="tl-svg-label" style={{ fontSize: 24 }}>{d}</text>
      {look.includes(i) && sign(i) && <text x={77 + i * 66} y="104" textAnchor="middle" className="tl-svg-label">{sign(i)}</text>}
    </g>)}
    <text x="143" y="16" className="tl-svg-small" textAnchor="middle">A ↓</text>
    <text x="8" y="140" className="tl-svg-label">{values.d} kuralı: {result.why} → {result.ok ? 'bölünür ✓' : 'bölünmez ✗'}</text>
  </svg>;
}

function Pair({ result }) {
  const box = (x, label, ok) => <g><rect x={x} y="20" width="100" height="56" rx="10" className={ok ? 'tl-rect' : 'tl-rect tl-rect-bad'} />
    <text x={x + 50} y="44" textAnchor="middle" className="tl-svg-label">{label}</text>
    <text x={x + 50} y="64" textAnchor="middle" className="tl-svg-small">{ok ? 'bölünür ✓' : 'bölünmez ✗'}</text></g>;
  return <svg className="tl-svg" viewBox="0 0 360 150" role="img" aria-label={`${result.n}: ${result.p} ${result.okP ? 'evet' : 'hayır'}, ${result.q} ${result.okQ ? 'evet' : 'hayır'}, 12 ${result.real ? 'evet' : 'hayır'}`}>
    {box(20, `÷ ${result.p}`, result.okP)}{box(140, `÷ ${result.q}`, result.okQ)}
    <text x="250" y="52" className="tl-svg-label">⇒ ?</text>
    <rect x="20" y="92" width="320" height="40" rx="10" className={result.real ? 'tl-rect' : 'tl-rect tl-rect-bad'} />
    <text x="180" y="117" textAnchor="middle" className="tl-svg-label">{result.n} ÷ 12 → kalan {result.n % 12} {result.okP && result.okQ && !result.real ? '(kurallar yanılttı!)' : ''}</text>
  </svg>;
}

function Cycle({ result }) {
  const wheel = (cx, items, idx, title) => <g>
    <text x={cx} y="14" textAnchor="middle" className="tl-svg-small">{title}</text>
    {items.map((t, i) => { const a = (i / items.length) * 2 * Math.PI - Math.PI / 2; const x = cx + 48 * Math.cos(a), y = 92 + 48 * Math.sin(a);
      return <g key={i}><circle cx={x} cy={y} r="19" className={i === idx ? 'tl-dot-ok' : 'tl-set'} /><text x={x} y={y + 4} textAnchor="middle" className={`tl-svg-small${i === idx ? ' tl-dot-text' : ''}`}>{t.slice(0, 3)}</text></g>; })}
    <text x={cx} y="96" textAnchor="middle" className="tl-svg-label">{idx + 1}. sıra</text>
  </g>;
  return <svg className="tl-svg" viewBox="0 0 360 185" role="img" aria-label={`${result.n}. karton: ${result.tags.join(' ')}`}>
    {wheel(95, PATTERN_A, result.r4, '1. makine (4’lük)')}{wheel(265, PATTERN_B, result.r3, '2. makine (3’lük)')}
    <text x="180" y="180" textAnchor="middle" className="tl-svg-label">{result.n}. karton: {result.tags.join(' · ')}</text>
  </svg>;
}

export default { groups: Groups, rule: Rule, pair: Pair, cycle: Cycle };
