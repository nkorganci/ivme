import { memo } from 'react';
import { fmt, positionExtent, unitsOf } from './model.js';
import { arrowPath, linear, niceRange, ticks, toneOf } from './svgKit.js';

const LANE = 82;
const TOP = 6;
const RULER = 44;

function Car({ x, y, dir, color, label }) {
  return <g>
    <g transform={`translate(${x.toFixed(1)},${y}) scale(${dir},1)`}>
      <path d="M-24,5 L-24,-4 Q-23,-9 -16,-9 L-9,-9 L-4,-17 L10,-17 L16,-9 L21,-9 Q24,-8 24,-3 L24,5 Z" fill={color} stroke="var(--ink)" strokeWidth="1.2" />
      <path d="M-2,-15 L9,-15 L13,-10 L-5,-10 Z" fill="var(--surface)" opacity=".8" />
      <circle cx="-13" cy="6" r="5.5" fill="var(--ink)" /><circle cx="13" cy="6" r="5.5" fill="var(--ink)" />
      <circle cx="-13" cy="6" r="2" fill="var(--surface)" /><circle cx="13" cy="6" r="2" fill="var(--surface)" />
    </g>
    <text x={x} y={y + 1} textAnchor="middle" className="ml-car-label">{label}</text>
  </g>;
}

function Ball({ x, y, color, label, r = 13 }) {
  return <g>
    <circle cx={x} cy={y} r={r} fill={color} stroke="var(--ink)" strokeWidth="1.2" />
    <text x={x} y={y + 4.5} textAnchor="middle" className="ml-car-label">{label}</text>
  </g>;
}

/** Eşit zaman aralıklı iz noktaları: aralık sabitse hız sabit, açılıyorsa hızlanma. */
function strobeTimes(T, step, t) {
  const out = [];
  for (let k = 0; k * step <= t + 1e-9 && k <= 400; k += 1) out.push(Number((k * step).toFixed(6)));
  return out;
}

function scaleFactors(motions, size = 1) {
  let maxV = 0;
  let maxA = 0;
  for (const motion of motions) {
    for (const [, v] of motion.nodes) maxV = Math.max(maxV, Math.abs(v));
    for (const seg of motion.segs) maxA = Math.max(maxA, Math.abs(seg.a));
  }
  return { kv: (120 * size) / Math.max(maxV, 1e-6), ka: (70 * size) / Math.max(maxA, 1e-6) };
}

function Horizontal({ scenario, motions, t, layers, narrow }) {
  const W = narrow ? 600 : 1000;
  const units = unitsOf(scenario);
  const n = scenario.bodies.length;
  const H = TOP + n * LANE + RULER;
  const range = niceRange(positionExtent(motions, scenario.T, scenario.bodies.map((b) => b.x0 ?? 0)), { pad: 0.06, count: narrow ? 6 : 10 });
  const sx = linear(range.min, range.max, 46, W - 46);
  const { kv, ka } = scaleFactors(motions, W / 1000);
  const strobeStep = scenario.strobe ?? 1;
  const yRuler = TOP + n * LANE + 8;
  return <svg viewBox={`0 0 ${W} ${H}`} className="ml-svg" role="img"
    aria-label={`Yol sahnesi: ${scenario.bodies.map((b, i) => `${b.label} ${fmt(motions[i].x(t))} ${units.x}`).join(', ')}`}>
    {scenario.bodies.map((body, i) => {
      const motion = motions[i];
      const y0 = TOP + i * LANE;
      const cy = y0 + 46;
      const color = toneOf(body);
      const x = motion.x(t);
      const v = motion.v(t);
      const a = motion.a(t);
      const px = sx(x);
      let lastLabel = -Infinity;
      return <g key={body.id}>
        <rect x="20" y={y0 + 24} width={W - 40} height="42" rx="8" fill="var(--tint)" stroke="var(--line)" />
        <line x1="26" x2={W - 26} y1={y0 + 45} y2={y0 + 45} stroke="var(--line)" strokeDasharray="10 8" />
        <text x="24" y={y0 + 18} className="ml-lane-label" fill={color}>{body.name ?? body.label}</text>
        <g>
          <line x1={sx(motion.x0)} x2={sx(motion.x0)} y1={y0 + 22} y2={y0 + 68} stroke="var(--ink)" strokeDasharray="3 3" />
          <path d={`M${sx(motion.x0)},${y0 + 22} l9,4 l-9,4 z`} fill="var(--ink)" />
        </g>
        {layers.strobe && strobeTimes(scenario.T, strobeStep, t).map((time) => {
          const p = sx(motion.x(time));
          const showLabel = Math.abs(p - lastLabel) > 40;
          if (showLabel) lastLabel = p;
          return <g key={time}>
            <circle cx={p} cy={cy} r="4" fill={color} opacity=".45" />
            {showLabel && <text x={p} y={y0 + 76} textAnchor="middle" className="ml-strobe-label">{fmt(time, 2)} {units.t}</text>}
          </g>;
        })}
        {layers.disp && Math.abs(x - motion.x0) > 1e-6 && <g>
          <path d={arrowPath(sx(motion.x0), y0 + 62, px, y0 + 62, 9)} stroke={color} fill={color} strokeWidth="2.5" />
          <text x={(sx(motion.x0) + px) / 2} y={y0 + 60} textAnchor="middle" className="ml-arrow-label">Δx = {fmt(x - motion.x0)} {units.x}</text>
        </g>}
        {body.shape === 'ball' ? <Ball x={px} y={cy} color={color} label={body.label} />
          : <Car x={px} y={cy} dir={v < -1e-6 ? -1 : 1} color={color} label={body.label} />}
        {layers.arrows && Math.abs(v) > 1e-6 && <g>
          <path d={arrowPath(px, y0 + 12, px + v * kv, y0 + 12, 9)} stroke={color} fill={color} strokeWidth="3" />
          <text x={px + v * kv + (v > 0 ? 6 : -6)} y={y0 + 16} textAnchor={v > 0 ? 'start' : 'end'} className="ml-arrow-label">v = {fmt(v)} {units.v}</text>
        </g>}
        {layers.arrows && Math.abs(a) > 1e-6 && <g>
          <path d={arrowPath(px, cy, px + a * ka, cy, 7)} stroke="var(--warn)" fill="var(--warn)" strokeWidth="2.5" strokeDasharray="5 3" />
          <text x={px + a * ka + (a > 0 ? 6 : -6)} y={cy - 6} textAnchor={a > 0 ? 'start' : 'end'} className="ml-accel-label">a = {fmt(a, 2)}</text>
        </g>}
      </g>;
    })}
    <line x1="30" x2={W - 30} y1={yRuler} y2={yRuler} stroke="var(--ink)" strokeWidth="1.4" />
    {ticks(range.min, range.max, range.step).map((value) => <g key={value}>
      <line x1={sx(value)} x2={sx(value)} y1={yRuler - 5} y2={yRuler + 5} stroke="var(--ink)" />
      <text x={sx(value)} y={yRuler + 20} textAnchor="middle" className="ml-tick">{fmt(value, 2)}</text>
    </g>)}
    <text x={W - 30} y={yRuler + 36} textAnchor="end" className="ml-axis-label">konum x ({units.x})</text>
  </svg>;
}

function Vertical({ scenario, motions, t, layers, narrow }) {
  const units = unitsOf(scenario);
  const VW = narrow ? 440 : 640;
  const VH = 330;
  const range = niceRange(positionExtent(motions, scenario.T, [0, ...scenario.bodies.map((b) => b.x0 ?? 0)]), { pad: 0.05, count: 6 });
  const sy = linear(range.min, range.max, VH - 24, 20);
  const { kv, ka } = scaleFactors(motions);
  const strobeStep = scenario.strobe ?? 0.1;
  return <svg viewBox={`0 0 ${VW} ${VH}`} className="ml-svg ml-svg-vertical" role="img"
    aria-label={`Dikey sahne: ${scenario.bodies.map((b, i) => `${b.label} yüksekliği ${fmt(motions[i].x(t), 2)} ${units.x}`).join(', ')}`}>
    <line x1="70" x2="70" y1="14" y2={VH - 20} stroke="var(--ink)" strokeWidth="1.4" />
    {ticks(range.min, range.max, range.step).map((value) => <g key={value}>
      <line x1="64" x2="76" y1={sy(value)} y2={sy(value)} stroke="var(--ink)" />
      <line x1="76" x2={VW - 20} y1={sy(value)} y2={sy(value)} stroke="var(--line)" strokeWidth=".6" />
      <text x="58" y={sy(value) + 4} textAnchor="end" className="ml-tick">{fmt(value, 2)}</text>
    </g>)}
    <text x="20" y="12" className="ml-axis-label">yükseklik ({units.x})</text>
    {range.min <= 0 && <rect x="76" y={sy(0)} width={VW - 96} height="10" fill="var(--ok-soft)" stroke="var(--ok)" />}
    {scenario.bodies.map((body, i) => {
      const motion = motions[i];
      const cx = (narrow ? 165 : 200) + i * (narrow ? 150 : 190);
      const color = toneOf(body);
      const y = motion.x(t);
      const v = motion.v(t);
      const a = motion.a(t);
      const py = sy(y);
      let lastLabel = -Infinity;
      return <g key={body.id}>
        <text x={cx} y={VH - 2} textAnchor="middle" className="ml-lane-label" fill={color}>{body.name ?? body.label}</text>
        {layers.strobe && strobeTimes(scenario.T, strobeStep, t).map((time) => {
          const p = sy(motion.x(time));
          const showLabel = Math.abs(p - lastLabel) > 16;
          if (showLabel) lastLabel = p;
          return <g key={time}>
            <circle cx={cx} cy={p} r="4" fill={color} opacity=".45" />
            {showLabel && <text x={cx - 22} y={p + 4} textAnchor="end" className="ml-strobe-label">{fmt(time, 2)} {units.t}</text>}
          </g>;
        })}
        <Ball x={cx} y={py} color={color} label={body.label} r={body.mass && body.mass < 0.01 ? 9 : 14} />
        {layers.arrows && Math.abs(v) > 1e-6 && <g>
          <path d={arrowPath(cx + 26, py, cx + 26, py - v * kv * 0.8, 8)} stroke={color} fill={color} strokeWidth="3" />
          <text x={cx + 34} y={py - v * kv * 0.4} className="ml-arrow-label">v = {fmt(v)} {units.v}</text>
        </g>}
        {layers.arrows && Math.abs(a) > 1e-6 && <g>
          <path d={arrowPath(cx - 26, py, cx - 26, py - a * ka * 0.8, 7)} stroke="var(--warn)" fill="var(--warn)" strokeWidth="2.5" strokeDasharray="5 3" />
          <text x={cx - 34} y={py - a * ka * 0.3} textAnchor="end" className="ml-accel-label">a = {fmt(a, 2)}</text>
        </g>}
      </g>;
    })}
  </svg>;
}

/** Hareket sahnesi: yatay yol (araçlar) ya da dikey düşme (toplar). */
function Scene(props) {
  return props.scenario.orientation === 'vertical' ? <Vertical {...props} /> : <Horizontal {...props} />;
}

export default memo(Scene);
