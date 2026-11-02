// Temel Kavramlar laboratuvarı çizimleri: değişen miktarı ve sabit ilişkiyi gösterir; değerler modelin compute çıktısıdır.
import { fmt } from '../sayi.js';

function Sets({ result }) {
  const inQ = result.value && result.rational;
  return <svg className="tl-svg" viewBox="0 0 360 170" role="img" aria-label={result.value ? `Sonuç ${inQ ? 'rasyonel sayılar kümesinde' : 'irrasyonel sayılar bölgesinde'}` : 'Sonuç tanımsız'}>
    <rect x="6" y="6" width="348" height="158" rx="16" className="tl-set" /><text x="20" y="28" className="tl-svg-label">Gerçek sayılar ℝ</text>
    <rect x="20" y="40" width="190" height="112" rx="14" className="tl-set tl-set-q" /><text x="32" y="60" className="tl-svg-label">Rasyonel ℚ (q = 0)</text>
    <text x="232" y="60" className="tl-svg-label">İrrasyonel (q ≠ 0)</text>
    {result.value && <g className="tl-dot-group"><circle cx={inQ ? 115 : 285} cy="110" r="16" className={inQ ? 'tl-dot-ok' : 'tl-dot'} />
      <text x={inQ ? 115 : 285} y="115" textAnchor="middle" className="tl-dot-text">sonuç</text></g>}
    <text x={result.aIrr ? 250 : 60} y="140" className="tl-svg-small">1. sayı</text>
    <text x={result.bIrr ? 300 : 140} y="140" className="tl-svg-small">2. sayı</text>
  </svg>;
}

function Order({ result }) {
  const X = (v) => 30 + (Math.max(-6, Math.min(6, v)) + 6) * 25;
  const labels = { x: 'x', 'x^2': 'x²', 'x^3': 'x³', '1/x': '1/x' };
  return <svg className="tl-svg" viewBox="0 0 360 150" role="img" aria-label={result.order ? `Sıra: ${result.order.map((k) => labels[k]).join(' küçüktür ')}` : 'Sınır noktası'}>
    <line x1="20" x2="340" y1="100" y2="100" className="tl-axis" />
    {[-6, -3, -1, 0, 1, 3, 6].map((t) => <g key={t}><line x1={X(t)} x2={X(t)} y1="94" y2="106" className="tl-axis" />
      <text x={X(t)} y="124" textAnchor="middle" className={`tl-svg-small${[-1, 0, 1].includes(t) ? ' tl-strong' : ''}`}>{fmt(t)}</text></g>)}
    {[-1, 0, 1].map((t) => <rect key={t} x={X(t) - 1} y="30" width="2" height="70" className="tl-boundary" />)}
    {result.values && result.order.map((k, i) => {
      const v = result.values[k];
      return <g key={k}><circle cx={X(v)} cy="100" r="6" className={k === 'x' ? 'tl-dot-ok' : 'tl-dot'} />
        <text x={X(v)} y={86 - i * 16} textAnchor="middle" className="tl-svg-label tl-halo">{labels[k]}{Math.abs(v) > 6 ? (v > 0 ? ' →' : ' ←') : ''}</text></g>;
    })}
    <text x="20" y="144" className="tl-svg-small">Kırmızı çizgiler: sıranın değişebildiği −1, 0, 1</text>
  </svg>;
}

function Run({ result }) {
  const { terms, mean } = result;
  const lo = Math.min(0, ...terms), hi = Math.max(1, ...terms);
  const H = (v) => 130 - ((v - lo) / (hi - lo)) * 110;
  const w = 300 / terms.length;
  return <svg className="tl-svg" viewBox="0 0 360 160" role="img" aria-label={`Terimler ${terms.join(', ')}; ortalama ${fmt(mean)}`}>
    <line x1="30" x2="340" y1={H(0)} y2={H(0)} className="tl-axis" />
    {terms.map((t, i) => <g key={i}><rect x={36 + i * w} y={Math.min(H(t), H(0))} width={w - 6} height={Math.max(1, Math.abs(H(t) - H(0)))} className={t % 2 === 0 ? 'tl-bar' : 'tl-bar tl-bar-odd'} />
      <text x={36 + i * w + (w - 6) / 2} y="152" textAnchor="middle" className="tl-svg-small">{fmt(t)}</text></g>)}
    <line x1="30" x2="340" y1={H(mean)} y2={H(mean)} className="tl-mean" />
    <text x="34" y={H(mean) - 6} className="tl-svg-label tl-halo">orta = {fmt(mean)}</text>
    <text x="30" y="14" className="tl-svg-small">Koyu: çift · Açık: tek</text>
  </svg>;
}

function Product({ result }) {
  const xs = Array.from({ length: 21 }, (_, i) => i - 4);
  const P = (x) => x * (12 - x);
  const X = (x) => 190 + (x + 4) * 8; const Y = (p) => 120 - (p / 36) * 90;
  const box = result.x > 0 && result.y > 0;
  return <svg className="tl-svg" viewBox="0 0 360 170" role="img" aria-label={`x = ${result.x}, y = ${result.y}, çarpım ${result.product}`}>
    {box ? <g><rect x="12" y={150 - result.y * 10} width={result.x * 10} height={result.y * 10} className={result.invalid ? 'tl-rect tl-rect-bad' : 'tl-rect'} />
      <text x={12 + result.x * 5} y="164" textAnchor="middle" className="tl-svg-small">x = {result.x}</text>
      <text x={18 + result.x * 10} y={150 - result.y * 5} className="tl-svg-small">y = {result.y}</text></g>
      : <text x="14" y="90" className="tl-svg-small">Bir kenar ≤ 0: dikdörtgen yok, çarpım {fmt(result.product)}</text>}
    <defs><clipPath id="tl-product-clip"><rect x="186" y="20" width="170" height="145" /></clipPath></defs>
    <line x1="186" x2="356" y1={Y(0)} y2={Y(0)} className="tl-axis" />
    <text x="182" y={Y(0) + 4} textAnchor="end" className="tl-svg-small">0</text>
    <line x1="186" x2="356" y1={Y(36)} y2={Y(36)} className="tl-mean" />
    <text x="182" y={Y(36) + 4} textAnchor="end" className="tl-svg-small">36</text>
    <line x1={X(6)} x2={X(6)} y1="20" y2="165" className="tl-boundary" />
    <g clipPath="url(#tl-product-clip)">
      <polyline points={xs.map((x) => `${X(x)},${Y(P(x))}`).join(' ')} className="tl-curve" />
      <circle cx={X(result.x)} cy={Y(result.product)} r="6" className={result.invalid ? 'tl-dot' : 'tl-dot-ok'} />
    </g>
    {Y(result.product) > 165 && <text x={X(result.x)} y="160" textAnchor="middle" className="tl-svg-small">↓ {fmt(result.product)}</text>}
    <text x={X(6)} y="16" textAnchor="middle" className="tl-svg-small">x = 6 (yasak)</text>
  </svg>;
}

export default { sets: Sets, order: Order, run: Run, product: Product };
