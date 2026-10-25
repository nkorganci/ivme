import { useId, useMemo } from 'react';
import { compileExpr } from '../expr.js';
import { draw, fill, formatNumber, niceStep, scale, stroke, ticks, visible } from './svg.js';

const W = 640;
const H = 400;
const M = { left: 48, right: 16, top: 16, bottom: 40 };

function sample(fn, env, x0, x1, holes, count = 480) {
  const segments = [];
  let current = [];
  const dx = (x1 - x0) / count;
  let previous = null;
  for (let i = 0; i <= count; i += 1) {
    const xv = x0 + i * dx;
    const nearHole = holes.some((h) => Math.abs(xv - h) < dx * 0.6);
    let y = nearHole ? NaN : fn({ ...env, x: xv });
    if (!Number.isFinite(y) || (previous !== null && Math.abs(y - previous) > 1e4)) {
      if (current.length > 1) segments.push(current);
      current = [];
      previous = Number.isFinite(y) ? y : null;
      if (!Number.isFinite(y)) continue;
    }
    current.push([xv, y]);
    previous = y;
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

/** Fonksiyon/veri grafiği: delikler, teğet, alan ve kaydırıcılı parametreler. */
export default function Plot({ params, state, values = {} }) {
  const sliderNames = (params.sliders ?? []).map((s) => s.name);
  const env = useMemo(() => Object.fromEntries((params.sliders ?? []).map((s) => [s.name, values[s.name] ?? state?.set?.[s.name] ?? s.value])),
    [params.sliders, values, state]);
  const compiled = useMemo(() => {
    const out = {};
    for (const fn of params.functions ?? []) out[fn.id] = compileExpr(fn.expr, ['x', ...sliderNames]);
    for (const area of params.areas ?? []) out[area.id] = compileExpr(area.expr, ['x', ...sliderNames]);
    for (const t of params.tangents ?? []) out[t.id] = compileExpr(t.expr, ['x', ...sliderNames]);
    return out;
  }, [params, sliderNames.join('|')]);
  const [x0, x1] = params.x;
  const [y0, y1] = params.y;
  const sx = scale(x0, x1, M.left, W - M.right);
  const sy = scale(y0, y1, H - M.bottom, M.top);
  const xs = ticks(x0, x1, niceStep(x1 - x0, 8));
  const ys = ticks(y0, y1, niceStep(y1 - y0, 6));
  const path = (points) => points.map(([px, py], i) => `${i ? 'L' : 'M'}${sx(px).toFixed(1)},${sy(py).toFixed(1)}`).join('');
  const clip = `plot-clip-${useId().replace(/:/g, '')}`;
  return <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg" role="img" aria-label="Grafik">
    <defs><clipPath id={clip}><rect x={M.left} y={M.top} width={W - M.left - M.right} height={H - M.top - M.bottom} /></clipPath></defs>
    {xs.map((t) => <line key={`gx${t}`} x1={sx(t)} x2={sx(t)} y1={M.top} y2={H - M.bottom} stroke="var(--line)" strokeWidth=".7" />)}
    {ys.map((t) => <line key={`gy${t}`} x1={M.left} x2={W - M.right} y1={sy(t)} y2={sy(t)} stroke="var(--line)" strokeWidth=".7" />)}
    {y0 <= 0 && y1 >= 0 && <line x1={M.left} x2={W - M.right} y1={sy(0)} y2={sy(0)} stroke="var(--ink)" strokeWidth="1.4" />}
    {x0 <= 0 && x1 >= 0 && <line x1={sx(0)} x2={sx(0)} y1={M.top} y2={H - M.bottom} stroke="var(--ink)" strokeWidth="1.4" />}
    {xs.map((t) => <text key={`lx${t}`} x={sx(t)} y={H - M.bottom + 16} textAnchor="middle" className="viz-small">{formatNumber(t)}</text>)}
    {ys.map((t) => <text key={`ly${t}`} x={M.left - 6} y={sy(t) + 4} textAnchor="end" className="viz-small">{formatNumber(t)}</text>)}
    {params.xLabel && <text x={W - M.right} y={H - 6} textAnchor="end" className="viz-label">{params.xLabel}</text>}
    {params.yLabel && <text x={M.left} y={M.top - 4} className="viz-label">{params.yLabel}</text>}
    <g clipPath={`url(#${clip})`}>
      {(params.areas ?? []).filter((a) => visible(state, a.id)).map((area) => {
        const pts = sample(compiled[area.id], env, area.from, area.to, [], 160).flat();
        if (!pts.length) return null;
        const d = `M${sx(area.from)},${sy(0)}${pts.map(([px, py]) => `L${sx(px)},${sy(py)}`).join('')}L${sx(area.to)},${sy(0)}Z`;
        return <path key={area.id} d={d} fill={fill(area.tone ?? 'warn')} stroke="none" />;
      })}
      {(params.series ?? []).filter((s) => visible(state, s.id)).map((series) => series.kind === 'bar'
        ? <g key={series.id}>{series.points.map(([px, py], i) => {
          const width = (sx(x0 + (x1 - x0) / (series.points.length + 1)) - sx(x0)) * 0.7;
          return <rect key={i} x={sx(px) - width / 2} y={Math.min(sy(py), sy(0))} width={width} height={Math.abs(sy(py) - sy(0))}
            fill={fill(series.tone ?? 'navy')} stroke={stroke(series.tone ?? 'navy')} />;
        })}</g>
        : <path key={series.id} d={path(series.points)} fill="none" stroke={stroke(series.tone ?? 'navy')} strokeWidth="2.5" {...draw()} />)}
      {(params.functions ?? []).filter((fn) => visible(state, fn.id)).map((fn) => {
        const [d0, d1] = fn.domain ?? [x0, x1];
        return sample(compiled[fn.id], env, Math.max(d0, x0), Math.min(d1, x1), fn.holes ?? []).map((segment, i) =>
          <path key={`${fn.id}-${i}`} d={path(segment)} fill="none" stroke={stroke(fn.tone ?? 'navy')} strokeWidth="2.6"
            strokeDasharray={fn.dashed ? '6 5' : undefined} {...draw(fn.dashed)} />);
      })}
      {(params.tangents ?? []).filter((t) => visible(state, t.id)).map((t) => {
        const at = typeof t.at === 'number' ? t.at : env[t.at];
        const f = compiled[t.id];
        const h = 1e-4;
        const slope = (f({ ...env, x: at + h }) - f({ ...env, x: at - h })) / (2 * h);
        const yAt = f({ ...env, x: at });
        return <g key={t.id}>
          <line x1={sx(x0)} y1={sy(yAt + slope * (x0 - at))} x2={sx(x1)} y2={sy(yAt + slope * (x1 - at))} stroke={stroke(t.tone ?? 'warn')} strokeWidth="2" />
          <circle cx={sx(at)} cy={sy(yAt)} r="5" fill={stroke(t.tone ?? 'warn')} />
          <text x={sx(at) + 8} y={sy(yAt) - 8} className="viz-label">{t.label ?? `eğim ≈ ${formatNumber(slope)}`}</text>
        </g>;
      })}
      {(params.segments ?? []).filter((s) => visible(state, s.id)).map((segment) =>
        <line key={segment.id} x1={sx(segment.from[0])} y1={sy(segment.from[1])} x2={sx(segment.to[0])} y2={sy(segment.to[1])}
          stroke={stroke(segment.tone ?? 'ink')} strokeWidth="1.8" strokeDasharray={segment.dashed ? '6 4' : undefined} />)}
    </g>
    {(params.functions ?? []).filter((fn) => visible(state, fn.id)).flatMap((fn) => (fn.holes ?? []).map((hole) => {
      const f = compiled[fn.id];
      const y = (f({ ...env, x: hole - 1e-6 }) + f({ ...env, x: hole + 1e-6 })) / 2;
      return Number.isFinite(y) ? <circle key={`${fn.id}-h${hole}`} cx={sx(hole)} cy={sy(y)} r="5.5" fill="var(--surface)" stroke={stroke(fn.tone ?? 'navy')} strokeWidth="2.5" /> : null;
    }))}
    {(params.points ?? []).filter((p) => visible(state, p.id)).map((point) => <g key={point.id}>
      <circle cx={sx(point.x)} cy={sy(point.y)} r="6" fill={point.open ? 'var(--surface)' : stroke(point.tone ?? 'ok')} stroke={stroke(point.tone ?? 'ok')} strokeWidth="2.5" />
      {point.label && <text x={sx(point.x) + 9} y={sy(point.y) + 18} className="viz-label">{point.label}</text>}
    </g>)}
    {(params.functions ?? []).filter((fn) => visible(state, fn.id) && fn.label).map((fn, i) =>
      <g key={`leg-${fn.id}`}><rect x={M.left + 8} y={M.top + 6 + i * 20} width="14" height="4" fill={stroke(fn.tone ?? 'navy')} />
        <text x={M.left + 28} y={M.top + 12 + i * 20} className="viz-small">{fn.label}</text></g>)}
  </svg>;
}
