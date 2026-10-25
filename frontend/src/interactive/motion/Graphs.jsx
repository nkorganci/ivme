import { useId, useMemo, useRef } from 'react';
import { equalVelocityTimes, fmt, meetings, motionOf, positionExtent, signedAreas, unitsOf, zeroVelocityEvents } from './model.js';
import { linear, niceRange, niceStep, polyline, svgPoint, ticks, toneOf } from './svgKit.js';

const M = { left: 58, right: 18, top: 18, bottom: 30 };
const HEIGHT = { x: 196, v: 196, a: 142 };
const TITLES = {
  x: ['Konum – zaman (x–t)', 'eğim = hız'],
  v: ['Hız – zaman (v–t)', 'alan = yer değiştirme · eğim = ivme'],
  a: ['İvme – zaman (a–t)', 'alan = hız değişimi'],
};

function valueRange(kind, scenario, motions) {
  if (kind === 'x') {
    const extra = [];
    const target = scenario.target;
    if (target?.kind === 'x-points') for (const [, value] of target.points) extra.push(value);
    if (target?.kind === 'x-curve') extra.push(...positionExtent([motionOf(target.body, scenario.T)], scenario.T));
    return niceRange(positionExtent(motions, scenario.T, extra), { pad: 0.08, count: 4 });
  }
  if (kind === 'v') {
    if (scenario.vRange) return { min: scenario.vRange[0], max: scenario.vRange[1], step: niceStep(scenario.vRange[1] - scenario.vRange[0], 4) };
    const values = motions.flatMap((m) => m.nodes.map(([, v]) => v));
    return niceRange([Math.min(...values), Math.max(...values)], { pad: 0.15, count: 4 });
  }
  const values = motions.flatMap((m) => m.segs.map((seg) => (Math.abs(seg.a) < 1e-9 ? 0 : seg.a)));
  return niceRange([Math.min(0, ...values), Math.max(0, ...values)], { pad: 0.25, count: 4 });
}

function xCurve(motion, T, st, sy) {
  const points = [];
  for (const seg of motion.segs) {
    const count = Math.max(2, Math.ceil(((seg.t1 - seg.t0) / T) * 120));
    for (let i = 0; i <= count; i += 1) {
      const time = seg.t0 + ((seg.t1 - seg.t0) * i) / count;
      points.push([st(time), sy(motion.x(time))]);
    }
  }
  return polyline(points);
}

function areaPath(kind, motion, tc, st, sy) {
  const points = [[0, 0]];
  if (kind === 'v') {
    for (const [time, value] of motion.nodes) { if (time >= tc) break; points.push([time, value]); }
    points.push([tc, motion.v(tc)]);
  } else {
    for (const seg of motion.segs) {
      if (seg.t0 >= tc) break;
      points.push([seg.t0, seg.a], [Math.min(seg.t1, tc), seg.a]);
    }
  }
  points.push([tc, 0]);
  return `${polyline(points.map(([time, value]) => [st(time), sy(value)]))}Z`;
}

function Panel({ kind, lab, editable, onNodeMove, compact, narrow }) {
  // Dar ekranda daha dar bir çizim alanı: yazılar küçülmeden okunur kalır.
  const W = narrow ? 420 : 640;
  const { scenario, motions, t, layers, focus, selected } = lab;
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const uid = useId().replace(/:/g, '');
  const units = unitsOf(scenario);
  const H = compact ? HEIGHT[kind] - 30 : HEIGHT[kind];
  const T = scenario.T;
  const st = linear(0, T, M.left, W - M.right);
  const range = useMemo(() => valueRange(kind, scenario, motions), [kind, scenario, motions]);
  const sy = linear(range.min, range.max, H - M.bottom, M.top);
  const timeStep = Math.max(scenario.grid?.dt ?? 0, niceStep(T, narrow ? 6 : 10));
  const focusIndex = Math.max(0, scenario.bodies.findIndex((b) => b.id === focus));
  const focusMotion = motions[focusIndex];
  const zeroY = sy(Math.min(range.max, Math.max(range.min, 0)));

  const curves = useMemo(() => scenario.bodies.map((body, i) => {
    const motion = motions[i];
    if (kind === 'x') return xCurve(motion, T, st, sy);
    if (kind === 'v') return polyline(motion.nodes.map(([time, value]) => [st(time), sy(value)]));
    return motion.segs.map((seg) => `M${st(seg.t0).toFixed(1)},${sy(seg.a).toFixed(1)}L${st(seg.t1).toFixed(1)},${sy(seg.a).toFixed(1)}`).join('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [kind, scenario, motions, range, H, W]);

  const events = useMemo(() => {
    if (!layers.events) return [];
    if (kind === 'x' && motions.length === 2) return meetings(motions[0], motions[1], T).filter((m) => m.t > 1e-6 && !m.together).map((m) => ({ ...m, label: `yan yana · t = ${fmt(m.t)} ${units.t}` }));
    if (kind === 'v') {
      const out = [];
      if (motions.length === 2) for (const item of equalVelocityTimes(motions[0], motions[1], T)) if (!item.together) out.push({ t: item.t, y: item.v, label: 'hızlar eşit', diamond: true });
      motions.forEach((motion, i) => { for (const item of zeroVelocityEvents(motion)) if (item.turn) out.push({ t: item.t, y: 0, label: `${scenario.bodies[i].label} yön değiştirir`, tone: toneOf(scenario.bodies[i]) }); });
      return out;
    }
    return [];
  }, [kind, layers.events, motions, T, scenario.bodies, units.t]);

  const editableIds = editable ? (editable.bodies ?? scenario.bodies.map((b) => b.id)) : [];
  const isLocked = (bodyId, index, count) => {
    const locked = editable?.locked?.[bodyId];
    if (locked === 'all') return true;
    if (Array.isArray(locked) && locked.includes(index)) return true;
    return editable?.lockEnds && (index === 0 || index === count - 1);
  };

  const pointer = (event) => {
    const point = svgPoint(svgRef.current, event);
    return [st.invert(point.x), sy.invert(point.y)];
  };
  const onPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    svgRef.current.setPointerCapture?.(event.pointerId);
    dragRef.current = { scrub: true };
    lab.seek(pointer(event)[0]);
  };
  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const [time, value] = pointer(event);
    if (drag.scrub) lab.seek(time);
    else onNodeMove(drag.bodyId, drag.index, [time, value]);
  };
  const endDrag = () => { dragRef.current = null; };
  const startNodeDrag = (event, bodyId, index) => {
    event.stopPropagation();
    svgRef.current.setPointerCapture?.(event.pointerId);
    dragRef.current = { bodyId, index };
    lab.setSelected({ bodyId, index });
  };
  const onNodeKey = (event, bodyId, index, [time, value]) => {
    const dv = scenario.grid?.dv || 1;
    const dt = scenario.grid?.dt || 1;
    const moves = { ArrowUp: [0, dv], ArrowDown: [0, -dv], ArrowRight: [dt, 0], ArrowLeft: [-dt, 0] };
    if (!moves[event.key]) return;
    event.preventDefault();
    const [mt, mv] = moves[event.key];
    onNodeMove(bodyId, index, [time + mt, value + mv]);
  };

  const [title, hint] = TITLES[kind];
  const unit = units[kind];
  const valueAt = (motion, time) => (kind === 'x' ? motion.x(time) : kind === 'v' ? motion.v(time) : motion.a(time));
  const editableGraph = kind === 'v' && editableIds.length > 0;

  return <figure className={`ml-graph ml-graph-${kind}`}>
    <figcaption><strong>{title}</strong> <span className="muted">{hint}</span></figcaption>
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className={`ml-svg${editableGraph ? ' ml-editable' : ''}`}
      role={editableGraph ? 'group' : 'img'} aria-label={`${title}. Zamanı değiştirmek için grafiğe tıkla ya da sürükle.`}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
      <defs>
        <clipPath id={`${uid}-plot`}><rect x={M.left} y={M.top - 4} width={W - M.left - M.right} height={H - M.top - M.bottom + 8} /></clipPath>
        <clipPath id={`${uid}-pos`}><rect x={M.left} y={0} width={W} height={zeroY} /></clipPath>
        <clipPath id={`${uid}-neg`}><rect x={M.left} y={zeroY} width={W} height={H} /></clipPath>
        {scenario.bodies.map((body) => <pattern key={body.id} id={`${uid}-hatch-${body.id}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="7" fill={toneOf(body)} opacity=".08" /><line x1="0" y1="0" x2="0" y2="7" stroke={toneOf(body)} strokeWidth="2.4" opacity=".45" /></pattern>)}
      </defs>
      <rect x={M.left} y={M.top} width={W - M.left - M.right} height={H - M.top - M.bottom} fill="var(--surface)" />
      {ticks(0, T, timeStep).map((time) => <g key={`t${time}`}>
        <line x1={st(time)} x2={st(time)} y1={M.top} y2={H - M.bottom} stroke="var(--line)" strokeWidth=".7" />
        <text x={st(time)} y={H - M.bottom + 16} textAnchor="middle" className="ml-tick">{fmt(time, 2)}</text>
      </g>)}
      {ticks(range.min, range.max, range.step).map((value) => <g key={`y${value}`}>
        <line x1={M.left} x2={W - M.right} y1={sy(value)} y2={sy(value)} stroke="var(--line)" strokeWidth=".7" />
        <text x={M.left - 6} y={sy(value) + 4} textAnchor="end" className="ml-tick">{fmt(value, 2)}</text>
      </g>)}
      <line x1={M.left} x2={W - M.right} y1={zeroY} y2={zeroY} stroke="var(--ink)" strokeWidth="1.4" />
      <line x1={M.left} x2={M.left} y1={M.top} y2={H - M.bottom} stroke="var(--ink)" strokeWidth="1.4" />
      <text x={M.left + 4} y={M.top - 5} className="ml-axis-label">{kind} ({unit})</text>
      <text x={W - M.right} y={H - 3} textAnchor="end" className="ml-axis-label">t ({units.t})</text>

      <g clipPath={`url(#${uid}-plot)`}>
        {layers.area && kind !== 'x' && scenario.bodies.map((body, i) => {
          if (kind === 'a' && i !== focusIndex) return null;
          const d = areaPath(kind, motions[i], t, st, sy);
          return <g key={`area-${body.id}`}>
            <path d={d} fill={toneOf(body)} opacity=".16" clipPath={`url(#${uid}-pos)`} />
            <path d={d} fill={`url(#${uid}-hatch-${body.id})`} clipPath={`url(#${uid}-neg)`} />
          </g>;
        })}
        {layers.target && scenario.target?.kind === 'x-curve' && kind === 'x' &&
          <path d={xCurve(motionOf(scenario.target.body, T), T, st, sy)} fill="none" stroke="var(--ink)" strokeWidth="3" strokeDasharray="8 6" opacity=".55" />}
        {layers.target && scenario.target?.kind === 'x-points' && kind === 'x' && scenario.target.points.map(([time, value]) =>
          <g key={`tp${time}`}><circle cx={st(time)} cy={sy(value)} r="7" fill="none" stroke="var(--ink)" strokeWidth="2" strokeDasharray="3 2" />
            <circle cx={st(time)} cy={sy(value)} r="2.5" fill="var(--ink)" /></g>)}
        {scenario.bodies.map((body, i) => <path key={`c-${body.id}`} d={curves[i]} fill="none" stroke={toneOf(body)}
          strokeWidth={i === focusIndex ? 3.2 : 2.6} strokeLinejoin="round" />)}
        {kind === 'a' && scenario.bodies.map((body, i) => motions[i].segs.slice(1).map((seg, k) => <line key={`j-${body.id}-${k}`}
          x1={st(seg.t0)} x2={st(seg.t0)} y1={sy(motions[i].segs[k].a)} y2={sy(seg.a)} stroke={toneOf(body)} strokeDasharray="2 3" />))}
        {layers.slope && kind === 'x' && focusMotion && (() => {
          const x = focusMotion.x(t);
          const v = focusMotion.v(t);
          const half = T * 0.16;
          return <g>
            <line x1={st(t - half)} y1={sy(x - v * half)} x2={st(t + half)} y2={sy(x + v * half)} stroke="var(--warn)" strokeWidth="2.4" />
          </g>;
        })()}
        {layers.slope && kind === 'v' && focusMotion && (() => {
          const seg = focusMotion.segs.find((s) => t < s.t1 - 1e-9) ?? focusMotion.segs.at(-1);
          return <g>
            <line x1={st(seg.t0)} y1={sy(seg.v0)} x2={st(seg.t1)} y2={sy(seg.v1)} stroke="var(--warn)" strokeWidth="5" opacity=".5" />
            <path d={`M${st(seg.t0)},${sy(seg.v0)}L${st(seg.t1)},${sy(seg.v0)}L${st(seg.t1)},${sy(seg.v1)}`} fill="none" stroke="var(--warn)" strokeWidth="1.6" strokeDasharray="5 3" />
            <text x={(st(seg.t0) + st(seg.t1)) / 2} y={sy(seg.v0) + (seg.v1 >= seg.v0 ? 15 : -7)} textAnchor="middle" className="ml-slope-label">Δt = {fmt(seg.t1 - seg.t0)}</text>
            {Math.abs(seg.v1 - seg.v0) > 1e-9 && <text x={st(seg.t1) + 5} y={(sy(seg.v0) + sy(seg.v1)) / 2 + 4} className="ml-slope-label">Δv = {fmt(seg.v1 - seg.v0)}</text>}
          </g>;
        })()}
        {events.map((item, k) => {
          const px = st(item.t);
          const py = kind === 'x' ? sy(item.x) : sy(item.y);
          // Etiket eksen hizasında durur; kılavuz çizgi işarete bağlar (imleç değerleriyle çakışmasın).
          const ly = H - M.bottom - 6 - (k % 2) * 15;
          const right = px > W - 170;
          return <g key={`e${k}`} className="ml-event">
            <line x1={px} x2={px} y1={py} y2={ly + 3} stroke={item.tone ?? 'var(--ink)'} strokeWidth="1" strokeDasharray="2 3" opacity=".7" />
            {item.diamond ? <path d={`M${px},${py - 8}l8,8l-8,8l-8,-8z`} fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
              : <circle cx={px} cy={py} r="8" fill="none" stroke={item.tone ?? 'var(--ink)'} strokeWidth="2.4" />}
            <text x={px + (right ? -6 : 6)} y={ly} textAnchor={right ? 'end' : 'start'} className="ml-event-label">{item.label}</text>
          </g>;
        })}
      </g>

      {layers.area && kind === 'v' && <g className="ml-area-summary">
        {scenario.bodies.map((body, i) => {
          const { positive, negative } = signedAreas(motions[i], t);
          const parts = [positive ? `+${fmt(positive)}` : null, negative ? fmt(negative) : null].filter(Boolean).join(' ');
          return <text key={body.id} x={M.left + 8} y={M.top + 16 + i * 17} fill={toneOf(body)} className="ml-area-text">
            {body.label}: alan {parts || '0'} → Δx = {fmt(positive + negative)} {units.x}</text>;
        })}
      </g>}
      {layers.area && kind === 'a' && focusMotion && <text x={M.left + 8} y={M.top + 16} fill={toneOf(scenario.bodies[focusIndex])} className="ml-area-text">
        {scenario.bodies[focusIndex].label}: alan → Δv = {fmt(focusMotion.v(t) - focusMotion.v(0))} {units.v}</text>}
      {layers.slope && kind !== 'a' && focusMotion && <text x={M.left + 8} y={M.top + 16 + (kind === 'v' && layers.area ? scenario.bodies.length * 17 : 0)} className="ml-slope-label">
        {scenario.bodies[focusIndex].label}: eğim = {kind === 'x' ? `v = ${fmt(focusMotion.v(t))} ${units.v}` : `a = ${fmt(focusMotion.a(t), 2)} ${units.a}`}</text>}

      <line x1={st(t)} x2={st(t)} y1={M.top - 4} y2={H - M.bottom} stroke="var(--navy)" strokeWidth="1.6" strokeDasharray="4 3" />
      {scenario.bodies.map((body, i) => {
        const value = valueAt(motions[i], t);
        return <g key={`cur-${body.id}`} pointerEvents="none">
          <circle cx={st(t)} cy={sy(value)} r="5" fill={toneOf(body)} stroke="var(--surface)" strokeWidth="1.5" />
          <text x={st(t) + (st(t) > W - 90 ? -9 : 9)} y={sy(value) + (i === 0 ? -8 : 16)} textAnchor={st(t) > W - 90 ? 'end' : 'start'}
            className="ml-value-label" fill={toneOf(body)}>{fmt(value, 2)}</text>
        </g>;
      })}

      {kind === 'v' && scenario.bodies.map((body, i) => {
        if (!editableIds.includes(body.id)) return null;
        const nodes = motions[i].nodes;
        return nodes.map(([time, value], index) => {
          if (isLocked(body.id, index, nodes.length)) return <circle key={`n-${body.id}-${index}`} cx={st(time)} cy={sy(value)} r="4" fill={toneOf(body)} pointerEvents="none" />;
          const active = selected?.bodyId === body.id && selected.index === index;
          return <g key={`n-${body.id}-${index}`} className={`ml-node${active ? ' active' : ''}`} tabIndex={0} role="slider"
            aria-label={`${body.label} grafiği, ${fmt(time)} ${units.t} noktası`} aria-valuenow={value} aria-valuetext={`${fmt(value)} ${units.v}`}
            aria-valuemin={range.min} aria-valuemax={range.max}
            onPointerDown={(event) => startNodeDrag(event, body.id, index)} onFocus={() => lab.setSelected({ bodyId: body.id, index })}
            onKeyDown={(event) => onNodeKey(event, body.id, index, [time, value])}>
            <circle cx={st(time)} cy={sy(value)} r="16" fill="transparent" />
            <circle cx={st(time)} cy={sy(value)} r="8" fill="var(--surface)" stroke={toneOf(body)} strokeWidth="3.2" />
          </g>;
        });
      })}

      {scenario.bodies.length > 1 && <g className="ml-legend" pointerEvents="none">
        {scenario.bodies.map((body, i) => <g key={body.id} transform={`translate(${W - M.right - 44 - (scenario.bodies.length - 1 - i) * 44},${M.top + 10})`}>
          <rect x="0" y="-4" width="16" height="4" fill={toneOf(body)} /><text x="21" y="1" className="ml-tick">{body.label}</text></g>)}
      </g>}
    </svg>
  </figure>;
}

/** Senkron x–t, v–t ve a–t grafikleri. Düzenlenebilir cisimlerin v–t düğümleri sürüklenir. */
export default function Graphs({ lab, editable, onNodeMove, compact = false, narrow = false }) {
  const kinds = lab.scenario.graphs ?? ['x', 'v', 'a'];
  return <div className="ml-graphs">
    {kinds.map((kind) => <Panel key={kind} kind={kind} lab={lab} editable={editable} onNodeMove={onNodeMove} compact={compact} narrow={narrow} />)}
  </div>;
}
