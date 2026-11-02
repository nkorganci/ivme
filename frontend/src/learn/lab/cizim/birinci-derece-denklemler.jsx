// Birinci Dereceden Denklemler laboratuvarı çizimleri: terazi, iki doğru (özel durum ve sistem), denklemin katı.
import { fmt } from '../sayi.js';

function Pan({ x, coef, k, label }) {
  const boxes = Math.max(0, Math.round(coef * 4) / 4), units = Math.max(0, k);
  return <g>
    <text x={x + 60} y="150" textAnchor="middle" className="tl-svg-small">{label}</text>
    {Array.from({ length: Math.floor(boxes) }, (_, i) => <rect key={`b${i}`} x={x + 6 + (i % 4) * 28} y={94 - Math.floor(i / 4) * 26} width="24" height="22" rx="3" className="tl-rect" />)}
    {boxes % 1 > 0 && <rect x={x + 6 + (Math.floor(boxes) % 4) * 28} y={94 - Math.floor(Math.floor(boxes) / 4) * 26} width={24 * (boxes % 1)} height="22" rx="3" className="tl-rect tl-rect-bad" />}
    {Array.from({ length: Math.min(units, 16) }, (_, i) => <circle key={`u${i}`} cx={x + 10 + (i % 8) * 13} cy={128 - Math.floor(i / 8) * 12} r="5" className="tl-dot" />)}
    {units > 16 && <text x={x + 110} y="126" className="tl-svg-small">+{fmt(units - 16)}</text>}
  </g>;
}

function Balance({ result }) {
  const L = result.L, R = result.R;
  const tilt = result.holdsAt4 ? 0 : (L[0] * 4 + L[1]) > (R[0] * 4 + R[1]) ? 6 : -6;
  return <svg className="tl-svg" viewBox="0 0 360 160" role="img" aria-label={`Terazi ${result.holdsAt4 ? 'dengede' : 'bozuldu'}: sol ${L[0]} kutu ${L[1]} birim, sağ ${R[0]} kutu ${R[1]} birim`}>
    <line x1="180" x2="180" y1="20" y2="140" className="tl-axis" />
    <g transform={`rotate(${tilt} 180 30)`}><line x1="30" x2="330" y1="30" y2="30" className="tl-axis" style={{ strokeWidth: 3 }} /></g>
    <Pan x={20} coef={L[0]} k={L[1]} label={`sol: ${fmt(L[0])} kutu + ${fmt(L[1])}`} />
    <Pan x={210} coef={R[0]} k={R[1]} label={`sağ: ${fmt(R[0])} kutu + ${fmt(R[1])}`} />
    <text x="180" y="14" textAnchor="middle" className="tl-svg-label">{result.holdsAt4 ? 'dengede (kutu = 4)' : 'denge bozuldu!'}</text>
  </svg>;
}

const plot = (fns, point, labels, aria) => {
  const X = (x) => 180 + x * 18, Y = (y) => 90 - y * 9;
  return <svg className="tl-svg" viewBox="0 0 360 180" role="img" aria-label={aria}>
    <line x1="10" x2="350" y1={Y(0)} y2={Y(0)} className="tl-axis" style={{ opacity: 0.4 }} /><line x1={X(0)} x2={X(0)} y1="5" y2="175" className="tl-axis" style={{ opacity: 0.4 }} />
    {fns.map((f, i) => <polyline key={i} points={[-9, 9].map((x) => `${X(x)},${Y(f(x))}`).join(' ')} className="tl-curve" style={i ? { stroke: 'var(--warn)', strokeDasharray: '6 4' } : undefined} />)}
    {labels.map(([t, x, y], i) => <text key={i} x={x} y={y} className="tl-svg-small tl-halo">{t}</text>)}
    {point && <circle cx={X(point[0])} cy={Y(point[1])} r="6" className={point[2] ? 'tl-dot-ok' : 'tl-dot'} />}
  </svg>;
};

function PairLines({ result }) {
  const a = result.m - 2, b = result.n - 3;
  return plot([(x) => a * x, () => b], result.kind === 'tek' ? [result.x, b, true] : null,
    [[`y = ${a}x`, 14, 18], [`y = ${b}`, 260, Math.max(14, 86 - b * 9)], [result.kind === 'tek' ? 'kesişim: tek çözüm' : result.kind === 'sonsuz' ? 'çakışık: her x çözüm' : 'paralel: çözüm yok', 14, 172]],
    `Sol y=${a}x, sağ y=${b}; ${result.kind}`);
}

function System({ result }) {
  const ok = result.e1 === 11 && result.e2 === 13;
  const X = (x) => 30 + x * 36, Y = (y) => 170 - y * 18;
  return <svg className="tl-svg" viewBox="0 0 360 180" role="img" aria-label={`Nokta (${result.a}, ${result.b}); ${ok ? 'iki doğrunun kesişimi' : 'kesişim değil'}`}>
    <line x1="30" x2="350" y1="170" y2="170" className="tl-axis" /><line x1="30" x2="30" y1="10" y2="170" className="tl-axis" />
    <polyline points={`${X(0)},${Y(11)} ${X(5.5)},${Y(0)}`} className="tl-curve" />
    <polyline points={`${X(0)},${Y(13 / 3)} ${X(8)},${Y(5 / 3)}`} className="tl-curve" style={{ stroke: 'var(--warn)', strokeDasharray: '6 4' }} />
    <text x={X(0.4)} y={Y(10.4)} className="tl-svg-small tl-halo">2a + b = 11</text><text x={X(6)} y={Y(2.6)} className="tl-svg-small tl-halo">a + 3b = 13</text>
    <circle cx={X(result.a)} cy={Y(result.b)} r="6" className={ok ? 'tl-dot-ok' : 'tl-dot'} />
    <text x="340" y="164" textAnchor="end" className="tl-svg-small">a →</text><text x="36" y="18" className="tl-svg-small">b ↑</text>
  </svg>;
}

function Multiple({ result }) {
  const ok = result.lhs[0] === 4 && result.lhs[1] === 6;
  return <svg className="tl-svg" viewBox="0 0 360 140" role="img" aria-label={`${result.k} katı: ${result.lhs[0]}x + ${result.lhs[1]}y = ${result.rhs}`}>
    <text x="20" y="34" className="tl-svg-label" style={{ fontSize: 18 }}>{result.k} × ( 2x + 3y ) = {result.k} × 12</text>
    <text x="20" y="70" className="tl-svg-label" style={{ fontSize: 18 }}>{result.lhs[0]}x + {result.lhs[1]}y = {result.rhs}</text>
    <text x="20" y="104" className="tl-svg-small">{ok ? 'İstenen ifade elde edildi.' : 'Katsayılar henüz 4 ve 6 değil.'}</text>
    <text x="20" y="128" className="tl-svg-small">Seçilen çözüm (x = {fmt(result.x)}, y = {fmt(result.y, 2)}) için 4x + 6y = {fmt(result.target)}</text>
  </svg>;
}

export default { balance: Balance, 'pair-lines': PairLines, system: System, multiple: Multiple };
