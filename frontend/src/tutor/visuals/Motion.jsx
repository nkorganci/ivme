import { useEffect, useState } from 'react';
import { formatNumber, niceStep, prefersReducedMotion, scale, stroke, ticks } from './svg.js';

const W = 620;

function position(object, t) {
  return (object.x0 ?? 0) + (object.v0 ?? 0) * t + 0.5 * (object.a ?? 0) * t * t;
}
function velocity(object, t) {
  return (object.v0 ?? 0) + (object.a ?? 0) * t;
}

function Graph({ params, t, objects, kind }) {
  const H = 200;
  const duration = params.duration;
  const values = objects.flatMap((o) => Array.from({ length: 41 }, (_, i) => (kind === 'v-t' ? velocity : position)(o, (duration * i) / 40)));
  const lo = Math.min(0, ...values);
  const hi = Math.max(1, ...values);
  const sx = scale(0, duration, 44, W - 14);
  const sy = scale(lo, hi, H - 28, 12);
  return <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg" role="img" aria-label={`${kind} grafiği`}>
    {ticks(0, duration, niceStep(duration, 6)).map((x) => <text key={x} x={sx(x)} y={H - 10} textAnchor="middle" className="viz-small">{formatNumber(x)}</text>)}
    <line x1={44} x2={W - 14} y1={sy(0)} y2={sy(0)} stroke="var(--ink)" />
    <line x1={44} x2={44} y1={12} y2={H - 28} stroke="var(--ink)" />
    <text x={W - 14} y={sy(0) - 6} textAnchor="end" className="viz-small">t (s)</text>
    <text x={50} y={20} className="viz-small">{kind === 'v-t' ? 'hız (m/s)' : 'konum (m)'}</text>
    {objects.map((o) => {
      const d = Array.from({ length: 81 }, (_, i) => {
        const time = (duration * i) / 80;
        return `${i ? 'L' : 'M'}${sx(time)},${sy((kind === 'v-t' ? velocity : position)(o, time))}`;
      }).join('');
      return <path key={o.id} d={d} fill="none" stroke={stroke(o.tone ?? 'navy')} strokeWidth="2.5" />;
    })}
    <line x1={sx(t)} x2={sx(t)} y1={12} y2={H - 28} stroke="var(--warn)" strokeDasharray="4 3" />
  </svg>;
}

/** Hareket: bir boyutta konum/hız ya da eğik atış; zaman kaydırıcısı ve eşzamanlı grafik. */
export default function Motion({ params, state }) {
  const [t, setT] = useState(state?.set?.t ?? 0);
  const [playing, setPlaying] = useState(false);
  const reduced = prefersReducedMotion();
  useEffect(() => { if (state?.set?.t !== undefined) setT(state.set.t); }, [state]);
  useEffect(() => {
    if (!playing) return undefined;
    let frame;
    let last = performance.now();
    const step = (now) => {
      setT((value) => {
        const next = value + ((now - last) / 1000) * (params.duration / 6);
        if (next >= params.duration) { setPlaying(false); return params.duration; }
        return next;
      });
      last = now;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, params.duration]);

  let scene;
  if (params.mode === 'projectile') {
    const g = params.g ?? 10;
    const rad = (params.angle * Math.PI) / 180;
    const vx = params.v0 * Math.cos(rad);
    const vy = params.v0 * Math.sin(rad);
    const xAt = (time) => (params.x0 ?? 0) + vx * time;
    const yAt = (time) => (params.y0 ?? 0) + vy * time - 0.5 * g * time * time;
    const minX = params.xRange?.[0] ?? 0;
    const maxX = params.xRange?.[1] ?? Math.max(1, xAt(params.duration));
    const maxY = params.yRange?.[1] ?? Math.max(1, (params.y0 ?? 0) + (vy * vy) / (2 * g));
    const H = 280;
    const sx = scale(minX, maxX, 40, W - 20);
    const sy = scale(0, maxY * 1.1, H - 30, 16);
    const path = Array.from({ length: 81 }, (_, i) => {
      const time = (params.duration * i) / 80;
      return `${i ? 'L' : 'M'}${sx(xAt(time))},${sy(Math.max(0, yAt(time)))}`;
    }).join('');
    const vyNow = vy - g * t;
    scene = <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg" role="img" aria-label="Eğik atış">
      <line x1={40} x2={W - 20} y1={H - 30} y2={H - 30} stroke="var(--ink)" strokeWidth="2" />
      {(params.objects ?? []).map((o) => <g key={o.id}>
        <rect x={sx(position(o, t)) - 18} y={H - 48} width="36" height="16" rx="5" fill={stroke(o.tone ?? 'bad')} />
        <text x={sx(position(o, t))} y={H - 54} textAnchor="middle" className="viz-small">{o.label} · x = {formatNumber(position(o, t), 1)} m</text>
      </g>)}
      <path d={path} fill="none" stroke="var(--line)" strokeWidth="2" strokeDasharray="5 4" />
      <circle cx={sx(xAt(t))} cy={sy(Math.max(0, yAt(t)))} r="9" fill="var(--navy)" />
      <line x1={sx(xAt(t))} y1={sy(Math.max(0, yAt(t)))} x2={sx(xAt(t)) + vx * 3} y2={sy(Math.max(0, yAt(t)))} stroke="var(--ok)" strokeWidth="3" />
      <line x1={sx(xAt(t))} y1={sy(Math.max(0, yAt(t)))} x2={sx(xAt(t))} y2={sy(Math.max(0, yAt(t))) - vyNow * 3} stroke="var(--bad)" strokeWidth="3" />
      <text x={W - 24} y={30} textAnchor="end" className="viz-label">yatay hız: {formatNumber(vx, 1)} m/s (sabit)</text>
      <text x={W - 24} y={50} textAnchor="end" className="viz-label">düşey hız: {formatNumber(vyNow, 1)} m/s</text>
      <text x={W - 24} y={70} textAnchor="end" className="viz-label">yükseklik: {formatNumber(Math.max(0, yAt(t)), 1)} m · x = {formatNumber(xAt(t), 1)} m</text>
      {(params.markers ?? []).map((m) => <g key={m.id}><circle cx={sx(xAt(m.t))} cy={sy(Math.max(0, yAt(m.t)))} r="4" fill="var(--warn)" />
        <text x={sx(xAt(m.t))} y={sy(Math.max(0, yAt(m.t))) - 10} textAnchor="middle" className="viz-small">{m.label}</text></g>)}
    </svg>;
  } else {
    const objects = params.objects ?? [];
    const all = objects.flatMap((o) => [position(o, 0), position(o, params.duration)]);
    const lo = params.xRange?.[0] ?? Math.min(0, ...all);
    const hi = params.xRange?.[1] ?? Math.max(1, ...all);
    const sx = scale(lo, hi, 40, W - 30);
    const H = 70 + objects.length * 46;
    scene = <>
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg" role="img" aria-label="Doğrusal hareket">
        {ticks(lo, hi, niceStep(hi - lo, 8)).map((x) => <g key={x}><line x1={sx(x)} x2={sx(x)} y1={H - 30} y2={H - 24} stroke="var(--ink)" />
          <text x={sx(x)} y={H - 10} textAnchor="middle" className="viz-small">{formatNumber(x)}</text></g>)}
        <line x1={40} x2={W - 30} y1={H - 30} y2={H - 30} stroke="var(--ink)" strokeWidth="2" />
        {objects.map((o, i) => <g key={o.id}>
          <text x={8} y={36 + i * 46} className="viz-small">{o.label}</text>
          <rect x={sx(position(o, t)) - 14} y={22 + i * 46} width="28" height="18" rx="5" fill={stroke(o.tone ?? 'navy')} />
          <text x={sx(position(o, t))} y={18 + i * 46} textAnchor="middle" className="viz-small">{formatNumber(velocity(o, t), 1)} m/s</text>
        </g>)}
      </svg>
      {params.graph && <Graph params={params} t={t} objects={objects} kind={params.graph} />}
    </>;
  }
  return <figure className="viz-motion">
    {scene}
    <figcaption className="viz-controls">
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => { if (t >= params.duration) setT(0); setPlaying((p) => !p); }}
        disabled={reduced}>{playing ? '⏸ Durdur' : '▶ Oynat'}</button>
      <label className="viz-slider">t = {formatNumber(t, 2)} s
        <input type="range" min="0" max={params.duration} step={params.duration / 100} value={t}
          onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }} aria-label="Zaman" />
      </label>
    </figcaption>
  </figure>;
}
