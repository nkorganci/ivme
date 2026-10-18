import { fill, niceStep, scale, stroke, ticks, visible, focused, wrapText } from './svg.js';

const W = 680;
const PAD = 36;

export const yearLabel = (year) => (year < 0 ? `MÖ ${Math.abs(year)}` : String(year));

/** Zaman çizelgesi: dönem bantları, olaylar ve süre parantezleri adım adım açılır. */
export default function Timeline({ params, state }) {
  const x = scale(params.from, params.to, PAD, W - PAD);
  const step = params.labelEvery ?? niceStep(params.to - params.from, 7);
  const eras = (params.eras ?? []).filter((era) => visible(state, era.id));
  const events = (params.events ?? []).filter((event) => visible(state, event.id));
  const spans = (params.spans ?? []).filter((span) => visible(state, span.id));
  const axisY = 150;
  return <svg viewBox={`0 0 ${W} 260`} className="viz-svg" role="img" aria-label="Zaman çizelgesi">
    {eras.map((era) => <g key={era.id} className={focused(state, era.id) ? 'viz-focus' : ''}>
      <rect x={x(Math.max(era.from, params.from))} y={axisY - 30} width={Math.max(4, x(Math.min(era.to, params.to)) - x(Math.max(era.from, params.from)))}
        height="22" rx="5" fill={fill(era.tone ?? 'navy')} stroke={stroke(era.tone ?? 'navy')} />
      <text x={(x(Math.max(era.from, params.from)) + x(Math.min(era.to, params.to))) / 2} y={axisY - 15} textAnchor="middle" className="viz-small">{era.label}</text>
    </g>)}
    <line x1={PAD} x2={W - PAD} y1={axisY} y2={axisY} stroke="var(--ink)" strokeWidth="2" />
    {ticks(params.from, params.to, step).map((t) => <g key={t}>
      <line x1={x(t)} x2={x(t)} y1={axisY - 5} y2={axisY + 5} stroke="var(--ink)" />
      <text x={x(t)} y={axisY + 20} textAnchor="middle" className="viz-small">{yearLabel(t)}</text>
    </g>)}
    {params.from < 0 && params.to > 0 && <g>
      <line x1={x(0)} x2={x(0)} y1={axisY - 40} y2={axisY + 8} stroke="var(--warn)" strokeDasharray="4 3" />
      <text x={x(0)} y={axisY - 44} textAnchor="middle" className="viz-small">MÖ | MS</text>
    </g>}
    {events.map((event, index) => {
      const above = index % 2 === 0;
      const lines = wrapText(event.label, 18);
      const top = above ? axisY - 52 - lines.length * 13 : axisY + 44;
      return <g key={event.id} className={focused(state, event.id) ? 'viz-focus' : ''}>
        <line x1={x(event.year)} x2={x(event.year)} y1={axisY} y2={above ? axisY - 46 : axisY + 34} stroke={stroke(event.tone ?? 'navy')} />
        <circle cx={x(event.year)} cy={axisY} r="6" fill={stroke(event.tone ?? 'navy')} />
        <text x={x(event.year)} y={top} textAnchor="middle" className="viz-label">
          {lines.map((line, i) => <tspan key={i} x={x(event.year)} dy={i === 0 ? 0 : 13}>{line}</tspan>)}
          <tspan x={x(event.year)} dy="13" className="viz-small">{yearLabel(event.year)}</tspan>
        </text>
      </g>;
    })}
    {spans.map((span, index) => {
      const y = axisY + 72 + index * 26;
      return <g key={span.id} className={focused(state, span.id) ? 'viz-focus' : ''}>
        <path d={`M${x(span.from)},${y - 8} v8 H${x(span.to)} v-8`} fill="none" stroke={stroke(span.tone ?? 'warn')} strokeWidth="2" />
        <text x={(x(span.from) + x(span.to)) / 2} y={y + 14} textAnchor="middle" className="viz-small">{span.label}</text>
      </g>;
    })}
  </svg>;
}
