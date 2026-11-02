// Sayı Basamakları laboratuvarı çizimleri: rakamın değeri basamağından gelir; çizim değişen basamak değerini gösterir.
import { fmt } from '../sayi.js';

function Blocks({ result }) {
  const row = (y, tens, ones, label, value) => <g>
    <text x="8" y={y + 22} className="tl-svg-label">{label}</text>
    {Array.from({ length: tens }, (_, i) => <rect key={`t${i}`} x={52 + i * 15} y={y} width="11" height="40" className="tl-bar" />)}
    {Array.from({ length: ones }, (_, i) => <rect key={`o${i}`} x={52 + tens * 15 + 8 + (i % 5) * 13} y={y + 4 + Math.floor(i / 5) * 18} width="10" height="10" className="tl-bar tl-bar-odd" />)}
    <text x="352" y={y + 26} textAnchor="end" className="tl-svg-label">{value}</text>
  </g>;
  return <svg className="tl-svg" viewBox="0 0 360 150" role="img" aria-label={`AB = ${result.ab}: ${result.a} onluk ${result.b} birlik; BA = ${result.ba}`}>
    {row(14, result.a, result.b, 'AB', fmt(result.ab))}
    {result.invalid ? <text x="52" y="102" className="tl-svg-label">BA = 0{result.a}: iki basamaklı değil</text> : row(78, result.b, result.a, 'BA', fmt(result.ba))}
    <text x="8" y="144" className="tl-svg-small">Çubuk = 10, kare = 1. Rakam aynı, değer basamağına göre.</text>
  </svg>;
}

function Swap({ result, values }) {
  const places = ['100', '10', '1'];
  const pair = { yb: [0, 2], yo: [0, 1], ob: [1, 2] }[values.kind];
  const card = (d, i, y, moved) => <g key={`${y}-${i}`}>
    <rect x={70 + i * 80} y={y} width="56" height="46" rx="8" className={moved ? 'tl-rect tl-rect-bad' : 'tl-rect'} />
    <text x={98 + i * 80} y={y + 31} textAnchor="middle" className="tl-svg-label" style={{ fontSize: 20 }}>{d}</text></g>;
  return <svg className="tl-svg" viewBox="0 0 360 170" role="img" aria-label={`${result.before} sayısında rakam yer değişimi: ${result.swapped.join('')}, fark ${result.diff}`}>
    {places.map((p, i) => <text key={p} x={98 + i * 80} y="14" textAnchor="middle" className="tl-svg-small">×{p}</text>)}
    {result.digits.map((d, i) => card(d, i, 22, pair.includes(i)))}
    <path d={`M${98 + pair[0] * 80},74 C${98 + pair[0] * 80},96 ${98 + pair[1] * 80},96 ${98 + pair[1] * 80},74`} className="tl-curve" />
    {result.swapped.map((d, i) => card(d, i, 100, pair.includes(i)))}
    <text x="8" y="50" className="tl-svg-small">önce</text><text x="8" y="128" className="tl-svg-small">sonra</text>
    <text x="352" y="164" textAnchor="end" className="tl-svg-label">fark {result.invalid ? '—' : fmt(result.diff)}</text>
  </svg>;
}

function Digits({ result, values }) {
  const d = [values.a, values.b, values.c];
  const seen = d.map((x, i) => d.indexOf(x) !== i || d.lastIndexOf(x) !== i);
  return <svg className="tl-svg" viewBox="0 0 360 140" role="img" aria-label={`Sayı ${result.n}; rakam toplamı ${result.sumDigits}`}>
    {['yüzler', 'onlar', 'birler'].map((p, i) => <g key={p}>
      <text x={90 + i * 90} y="16" textAnchor="middle" className="tl-svg-small">{p}</text>
      <rect x={60 + i * 90} y="24" width="60" height="62" rx="10" className={(i === 0 && d[0] === 0) || seen[i] ? 'tl-rect tl-rect-bad' : 'tl-rect'} />
      <text x={90 + i * 90} y="67" textAnchor="middle" className="tl-svg-label" style={{ fontSize: 26 }}>{d[i]}</text>
      {i === 0 && d[0] === 0 && <text x="90" y="104" textAnchor="middle" className="tl-svg-small">başta 0 olmaz</text>}
      {seen[i] && <text x={90 + i * 90} y="118" textAnchor="middle" className="tl-svg-small">tekrar</text>}
    </g>)}
    <text x="352" y="134" textAnchor="end" className="tl-svg-label">{d.join(' + ')} = {result.sumDigits}</text>
  </svg>;
}

function Zeros({ result }) {
  const { a, b, c, pairs } = result;
  const dot = (x, y, label, cls) => <g key={`${label}-${x}-${y}`}><circle cx={x} cy={y} r="11" className={cls} /><text x={x} y={y + 4} textAnchor="middle" className="tl-svg-small tl-dot-text">{label}</text></g>;
  return <svg className="tl-svg" viewBox="0 0 360 150" role="img" aria-label={`${a} tane 2, ${b} tane 5, ${c} tane 3; ${pairs} tane 10`}>
    <text x="8" y="16" className="tl-svg-small">Üstte 2’ler, altta 5’ler; çizgiyle eşleşen her çift bir 10 = bir sıfır.</text>
    {Array.from({ length: a }, (_, i) => dot(30 + i * 30, 44, '2', i < pairs ? 'tl-dot-ok' : 'tl-dot'))}
    {Array.from({ length: b }, (_, i) => dot(30 + i * 30, 96, '5', i < pairs ? 'tl-dot-ok' : 'tl-dot'))}
    {Array.from({ length: pairs }, (_, i) => <line key={i} x1={30 + i * 30} x2={30 + i * 30} y1="55" y2="85" className="tl-axis" />)}
    {Array.from({ length: c }, (_, i) => dot(280 + (i % 2) * 28, 44 + Math.floor(i / 2) * 30, '3', 'tl-dot'))}
    <text x="8" y="140" className="tl-svg-label">{pairs} çift → {pairs} sıfır · sayı {result.digits} basamaklı</text>
  </svg>;
}

export default { blocks: Blocks, swap: Swap, digits: Digits, zeros: Zeros };
