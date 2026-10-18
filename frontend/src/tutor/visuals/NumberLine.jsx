import { useId } from 'react';
import { fill, formatNumber, scale, stroke, ticks, visible, focused } from './svg.js';

const W = 640;
const PAD = 40;

function overlap(rows) {
  let current = null;
  for (const row of rows) {
    const intervals = row.intervals ?? [];
    if (!intervals.length) return null;
    const [a] = intervals;
    const next = { from: a.from, to: a.to, openFrom: !!a.openFrom, openTo: !!a.openTo };
    if (!current) { current = next; continue; }
    const from = Math.max(current.from, next.from);
    const to = Math.min(current.to, next.to);
    if (from > to) return null;
    current = {
      from, to,
      openFrom: from === current.from ? current.openFrom || (from === next.from && next.openFrom) : next.openFrom,
      openTo: to === current.to ? current.openTo || (to === next.to && next.openTo) : next.openTo,
    };
  }
  return current;
}

function Axis({ y, x, min, max, step, arrow }) {
  return <g>
    <line x1={PAD - 10} x2={W - PAD + 10} y1={y} y2={y} stroke="var(--ink)" strokeWidth="1.5" markerEnd={`url(#${arrow})`} />
    {ticks(min, max, step).map((t) => <g key={t}>
      <line x1={x(t)} x2={x(t)} y1={y - 4} y2={y + 4} stroke="var(--ink)" />
      <text x={x(t)} y={y + 18} textAnchor="middle" className="viz-small">{formatNumber(t)}</text>
    </g>)}
  </g>;
}

function Interval({ x, y, item, tone }) {
  const color = stroke(item.tone ?? tone);
  return <g>
    <line x1={x(item.from)} x2={x(item.to)} y1={y} y2={y} stroke={color} strokeWidth="7" strokeLinecap="butt" opacity=".9" />
    <circle cx={x(item.from)} cy={y} r="6" fill={item.openFrom ? 'var(--surface)' : color} stroke={color} strokeWidth="2.5" />
    <circle cx={x(item.to)} cy={y} r="6" fill={item.openTo ? 'var(--surface)' : color} stroke={color} strokeWidth="2.5" />
  </g>;
}

/** Sayı doğrusu: aralıklar, işaret tabloları, kesişim ve işaretler adım adım. */
export default function NumberLine({ params, state }) {
  const arrow = `nl-arrow-${useId().replace(/:/g, '')}`;
  const step = params.step ?? 1;
  const x = scale(params.min, params.max, PAD, W - PAD);
  const signRows = (params.signs ?? []).filter((s) => visible(state, s.id));
  const rows = (params.rows ?? []).filter((r) => visible(state, r.id));
  const showIntersection = params.intersection && visible(state, params.intersection.id);
  const common = showIntersection ? overlap((params.rows ?? []).filter((r) => params.intersection.rows.includes(r.id))) : null;
  const lineCount = signRows.length + rows.length + (showIntersection ? 1 : 0);
  const rowHeight = 58;
  const height = Math.max(1, lineCount) * rowHeight + 30;
  let y = 30;
  const items = [];
  for (const sign of signRows) {
    const cuts = [params.min, ...sign.breaks, params.max];
    items.push(<g key={sign.id} className={focused(state, sign.id) ? 'viz-focus' : ''}>
      <text x={8} y={y - 14} className="viz-label">{sign.label} işareti</text>
      <line x1={PAD} x2={W - PAD} y1={y} y2={y} stroke="var(--line)" strokeWidth="1.5" />
      {sign.breaks.map((b) => <g key={b}>
        <line x1={x(b)} x2={x(b)} y1={y - 12} y2={y + 12} stroke="var(--ink)" strokeDasharray="3 3" />
        <text x={x(b)} y={y + 26} textAnchor="middle" className="viz-small">{formatNumber(b)}</text>
      </g>)}
      {sign.signs.map((s, i) => <text key={i} x={(x(cuts[i]) + x(cuts[i + 1])) / 2} y={y + 6} textAnchor="middle"
        className="viz-sign" fill={s === '+' ? 'var(--ok)' : s === '-' ? 'var(--bad)' : 'var(--ink)'}>{s === '-' ? '−' : s}</text>)}
    </g>);
    y += rowHeight;
  }
  for (const row of rows) {
    items.push(<g key={row.id} className={focused(state, row.id) ? 'viz-focus' : ''}>
      <text x={8} y={y - 16} className="viz-label">{row.label}</text>
      <Axis y={y} x={x} min={params.min} max={params.max} step={step} arrow={arrow} />
      {(row.intervals ?? []).map((item, i) => <Interval key={i} x={x} y={y} item={item} tone="navy" />)}
      {(row.points ?? []).map((point, i) => <circle key={i} cx={x(point.x)} cy={y} r="3" fill="var(--ink)" />)}
    </g>);
    y += rowHeight;
  }
  if (showIntersection) {
    items.push(<g key="ortak">
      <text x={8} y={y - 16} className="viz-label">{params.intersection.label ?? 'Ortak kısım'}</text>
      <Axis y={y} x={x} min={params.min} max={params.max} step={step} arrow={arrow} />
      {common ? <Interval x={x} y={y} item={{ ...common, tone: 'ok' }} tone="ok" />
        : <text x={W / 2} y={y - 10} textAnchor="middle" className="viz-label">Ortak kısım yok</text>}
    </g>);
  }
  const marks = (params.marks ?? []).filter((m) => visible(state, m.id));
  return <svg viewBox={`0 0 ${W} ${height}`} className="viz-svg" role="img" aria-label="Sayı doğrusu">
    <defs><marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--ink)" /></marker></defs>
    {items}
    {marks.map((mark) => <g key={mark.id}>
      <line x1={x(mark.x)} x2={x(mark.x)} y1={14} y2={height - 18} stroke={stroke(mark.tone ?? 'ok')} strokeWidth="2" strokeDasharray="5 4" />
      <rect x={x(mark.x) - 34} y={height - 22} width="68" height="20" rx="6" fill={fill(mark.tone ?? 'ok')} />
      <text x={x(mark.x)} y={height - 8} textAnchor="middle" className="viz-label">{mark.label}</text>
    </g>)}
  </svg>;
}
