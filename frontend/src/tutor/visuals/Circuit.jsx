import { formatNumber } from './svg.js';

/** Basit devre: seri ya da paralel dirençler; eşdeğer direnç ve kol akımları hesaplanır. */
export default function Circuit({ params }) {
  const resistors = params.resistors ?? [];
  const series = params.layout !== 'parallel';
  const total = series ? resistors.reduce((s, r) => s + r.ohm, 0) : 1 / resistors.reduce((s, r) => s + 1 / r.ohm, 0);
  const current = params.voltage / total;
  const W = 560;
  const H = series ? 220 : 120 + resistors.length * 50;
  return <figure>
    <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg" role="img" aria-label="Devre şeması">
      <rect x="60" y="40" width="440" height={H - 80} fill="none" stroke="var(--ink)" strokeWidth="2.5" />
      <line x1="40" x2="80" y1={H / 2 - 12} y2={H / 2 - 12} stroke="var(--ink)" strokeWidth="4" />
      <line x1="48" x2="72" y1={H / 2 + 4} y2={H / 2 + 4} stroke="var(--ink)" strokeWidth="4" />
      <text x="20" y={H / 2 + 34} className="viz-label">{formatNumber(params.voltage)} V</text>
      {series
        ? resistors.map((r, i) => {
          const x = 140 + i * (320 / Math.max(1, resistors.length));
          const v = current * r.ohm;
          return <g key={r.id}>
            <rect x={x} y="28" width="64" height="24" rx="4" fill="var(--warn-soft)" stroke="var(--warn)" strokeWidth="2" />
            <text x={x + 32} y="45" textAnchor="middle" className="viz-small">{r.label} {formatNumber(r.ohm)}Ω</text>
            <text x={x + 32} y="76" textAnchor="middle" className="viz-small">{formatNumber(v)} V</text>
          </g>;
        })
        : resistors.map((r, i) => {
          const y = 80 + i * 50;
          return <g key={r.id}>
            <line x1="200" x2="200" y1="40" y2={y} stroke="var(--ink)" strokeWidth="2" />
            <line x1="360" x2="360" y1="40" y2={y} stroke="var(--ink)" strokeWidth="2" />
            <line x1="200" x2="248" y1={y} y2={y} stroke="var(--ink)" strokeWidth="2" />
            <line x1="312" x2="360" y1={y} y2={y} stroke="var(--ink)" strokeWidth="2" />
            <rect x="248" y={y - 12} width="64" height="24" rx="4" fill="var(--warn-soft)" stroke="var(--warn)" strokeWidth="2" />
            <text x="280" y={y + 5} textAnchor="middle" className="viz-small">{r.label} {formatNumber(r.ohm)}Ω</text>
            <text x="372" y={y + 5} className="viz-small">{formatNumber(params.voltage / r.ohm)} A</text>
          </g>;
        })}
    </svg>
    <figcaption className="viz-measures">
      <span className="chip chip-primary">Eşdeğer direnç: {formatNumber(total)} Ω</span>
      <span className="chip chip-primary">Ana kol akımı: {formatNumber(current)} A</span>
    </figcaption>
  </figure>;
}
