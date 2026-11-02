// Yüzde ve Karışım laboratuvarı çizimleri: adım adım fiyat, oy çubuğu, karışım kapları, ortalama terazisi.
import { fmt } from '../sayi.js';
import { CLASS, MIX, POLL } from '../konular/yuzde-karisim.js';

function Steps({ result }) {
  const s = 1.6;
  const bar = (y, v, label) => <g><text x="8" y={y + 15} className="tl-svg-small">{label}</text>
    <rect x="80" y={y} width={v * s} height="22" className="tl-bar" /><text x={86 + v * s} y={y + 15} className="tl-svg-label">{fmt(v, 2)}</text></g>;
  return <svg className="tl-svg" viewBox="0 0 360 120" role="img" aria-label={`100 → ${fmt(result.mid, 2)} → ${fmt(result.end, 2)}`}>
    {bar(10, 100, 'başlangıç')}{bar(44, result.mid, `%${result.p >= 0 ? '+' : ''}${result.p}`)}{bar(78, result.end, `%${result.q >= 0 ? '+' : ''}${result.q}`)}
    <line x1={80 + 100 * s} x2={80 + 100 * s} y1="6" y2="104" className="tl-mean" />
  </svg>;
}

function Poll({ result }) {
  const W = 300, e = (result.e / result.t) * W;
  return <svg className="tl-svg" viewBox="0 0 360 100" role="img" aria-label={`Edirne ${result.e}/${result.t}`}>
    <rect x="20" y="24" width={e} height="30" className="tl-bar" />
    <rect x={20 + e} y="24" width={W - e} height="30" className="tl-bar tl-bar-odd" />
    <line x1={20 + W / 2} x2={20 + W / 2} y1="16" y2="62" className="tl-mean" />
    <text x="20" y="80" className="tl-svg-small">Edirne {result.e} · diğerleri {result.t - result.e} (sabit) · kesikli: %50</text>
  </svg>;
}

function Beakers({ result }) {
  const beaker = (x, total, salt, label) => { const h = total * 2, sh = salt * 2;
    return <g><rect x={x} y={120 - h} width="60" height={h} className="tl-set" /><rect x={x} y={120 - sh} width="60" height={sh} className="tl-bar" />
      <text x={x + 30} y="136" textAnchor="middle" className="tl-svg-small">{label}</text></g>; };
  return <svg className="tl-svg" viewBox="0 0 360 145" role="img" aria-label={`Karışım ${result.total} kg, tuz ${fmt(result.salt, 1)} kg`}>
    {beaker(20, MIX.a, MIX.a * MIX.pa, '20 kg %10')}{beaker(110, result.x, result.x * MIX.pb, `${result.x} kg %40`)}
    {beaker(240, Math.min(result.total, 55), Math.min(result.salt, 55), `= %${fmt(result.pct, 1)}`)}
    <text x="185" y="70" className="tl-svg-label">→</text>
  </svg>;
}

function Avg({ result }) {
  const X = (v) => 20 + (v - 55) * 11;
  return <svg className="tl-svg" viewBox="0 0 360 110" role="img" aria-label={`Genel ortalama ${fmt(result.mean, 2)}`}>
    <line x1="20" x2="340" y1="60" y2="60" className="tl-axis" />
    {[60, 70, 80].map((t) => <g key={t}><line x1={X(t)} x2={X(t)} y1="55" y2="65" className="tl-axis" /><text x={X(t)} y="80" textAnchor="middle" className="tl-svg-small">{t}</text></g>)}
    <rect x={X(60) - CLASS.na / 2} y={40 - CLASS.na / 2} width={CLASS.na} height={CLASS.na} className="tl-bar" />
    <rect x={X(80) - result.n / 2} y={40 - result.n / 2} width={result.n} height={result.n} className="tl-bar tl-bar-odd" />
    <path d={`M${X(result.mean)},62 l-8,14 h16 z`} className="tl-dot-ok" />
    <text x={X(result.mean)} y="100" textAnchor="middle" className="tl-svg-label">{fmt(result.mean, 1)}</text>
  </svg>;
}

export default { steps: Steps, poll: Poll, beakers: Beakers, avg: Avg };
