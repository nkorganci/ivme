import { MathText } from '../math.jsx';

const W = 640;
const H = 96;
const PAD = 34;

/** Sayı doğrusu: aralıklar (açık/kapalı uç, ±∞), noktalar ve işaretler. Renkler tema değişkenlerinden. */
export default function NumberLine({ spec, alt, caption }) {
  const [min, max] = spec.range;
  const x = (value) => PAD + ((Math.max(min, Math.min(max, value)) - min) / (max - min)) * (W - 2 * PAD);
  const ticks = spec.ticks ?? Array.from({ length: Math.floor(max - min) + 1 }, (_, i) => min + i).filter((v) => Number.isInteger(v));
  const y = 52;
  return <figure className="lr-figure lr-numberline">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={alt}>
      <line x1={PAD - 18} y1={y} x2={W - PAD + 18} y2={y} className="nl-axis" />
      <path d={`M${W - PAD + 18},${y} l-9,-5 v10 z`} className="nl-arrow" />
      <path d={`M${PAD - 18},${y} l9,-5 v10 z`} className="nl-arrow" />
      {ticks.map((t) => <g key={t}>
        <line x1={x(t)} y1={y - 6} x2={x(t)} y2={y + 6} className="nl-tick" />
        <text x={x(t)} y={y + 24} textAnchor="middle" className="nl-label">{String(t).replace('-', '−')}</text>
      </g>)}
      {spec.intervals.map((iv, i) => {
        const from = Number.isFinite(iv.from) ? x(iv.from) : PAD - 16;
        const to = Number.isFinite(iv.to) ? x(iv.to) : W - PAD + 16;
        const lift = y - 14 - i * 10;
        return <g key={i} className={`nl-interval nl-${iv.color}`}>
          <line x1={from} y1={lift} x2={to} y2={lift} />
          {Number.isFinite(iv.from) && <circle cx={from} cy={lift} r={6} className={iv.openFrom ? 'open' : 'closed'} />}
          {Number.isFinite(iv.to) && <circle cx={to} cy={lift} r={6} className={iv.openTo ? 'open' : 'closed'} />}
          {iv.label && <text x={(from + to) / 2} y={lift - 9} textAnchor="middle" className="nl-label strong">{iv.label}</text>}
        </g>;
      })}
      {spec.points.map((p, i) => <g key={`p${i}`} className="nl-point">
        <circle cx={x(p.x)} cy={y} r={6} className={p.open ? 'open' : 'closed'} />
        {p.label && <text x={x(p.x)} y={y - 12} textAnchor="middle" className="nl-label strong">{p.label}</text>}
      </g>)}
    </svg>
    {caption && <figcaption><MathText text={caption} /></figcaption>}
  </figure>;
}
