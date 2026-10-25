import { useId, useMemo, useRef, useState } from 'react';
import { draw, fill, formatNumber, scale, stroke, visible, focused } from './svg.js';

const W = 560;

function angleAt(vertex, a, b) {
  const u = [a.x - vertex.x, a.y - vertex.y];
  const v = [b.x - vertex.x, b.y - vertex.y];
  const cos = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

/** Dinamik geometri: noktalar, kenarlar, çemberler, açı yayları; sürüklenebilir noktada ölçüler canlı güncellenir. */
export default function Geometry({ params, state }) {
  const [xmin, xmax, ymin, ymax] = params.view;
  const H = Math.round((W * (ymax - ymin)) / (xmax - xmin));
  const sx = scale(xmin, xmax, 0, W);
  const sy = scale(ymin, ymax, H, 0);
  const [moved, setMoved] = useState({});
  const svgRef = useRef(null);
  const marker = `geo-${useId().replace(/:/g, '')}`;
  const points = useMemo(() => Object.fromEntries((params.points ?? []).map((p) => [p.id, { ...p, ...(moved[p.id] ?? {}) }])), [params.points, moved]);
  const circles = Object.fromEntries((params.circles ?? []).map((c) => {
    const center = points[c.center];
    const r = c.through ? Math.hypot(points[c.through].x - center.x, points[c.through].y - center.y) : c.r;
    return [c.id, { ...c, cx: center.x, cy: center.y, r }];
  }));
  const drag = (params.drag ?? [])[0];
  const startDrag = (event) => {
    event.preventDefault();
    const svg = svgRef.current;
    const move = (e) => {
      const rect = svg.getBoundingClientRect();
      const px = xmin + ((e.clientX - rect.left) / rect.width) * (xmax - xmin);
      const py = ymax - ((e.clientY - rect.top) / rect.height) * (ymax - ymin);
      let next = { x: px, y: py };
      if (drag.on.circle) {
        const c = circles[drag.on.circle];
        const angle = Math.atan2(py - c.cy, px - c.cx);
        next = { x: c.cx + c.r * Math.cos(angle), y: c.cy + c.r * Math.sin(angle) };
      } else if (drag.on.segment) {
        const [a, b] = drag.on.segment.map((id) => points[id]);
        const t = Math.max(0, Math.min(1, ((px - a.x) * (b.x - a.x) + (py - a.y) * (b.y - a.y)) / ((b.x - a.x) ** 2 + (b.y - a.y) ** 2 || 1)));
        next = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
      }
      setMoved((m) => ({ ...m, [drag.point]: next }));
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const nudge = (event) => {
    if (!drag?.on?.circle || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const c = circles[drag.on.circle];
    const p = points[drag.point];
    const angle = Math.atan2(p.y - c.cy, p.x - c.cx) + (event.key === 'ArrowLeft' ? 0.06 : -0.06);
    setMoved((m) => ({ ...m, [drag.point]: { x: c.cx + c.r * Math.cos(angle), y: c.cy + c.r * Math.sin(angle) } }));
  };
  const measures = (params.measures ?? []).map((m) => {
    const refs = m.refs.map((id) => points[id]);
    const value = m.kind === 'angle' ? angleAt(refs[1], refs[0], refs[2]) : Math.hypot(refs[1].x - refs[0].x, refs[1].y - refs[0].y);
    return { ...m, value };
  });
  const cls = (id) => (focused(state, id) ? 'viz-focus' : '');
  return <figure className="viz-geometry">
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="viz-svg" role="img" aria-label="Geometri çizimi">
      <defs>{['ink', 'navy', 'ok', 'bad', 'warn'].map((tone) => <marker key={tone} id={`${marker}-${tone}`} viewBox="0 0 10 10" refX="9" refY="5"
        markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={stroke(tone)} /></marker>)}</defs>
      {(params.polygons ?? []).filter((p) => visible(state, p.id)).map((polygon) =>
        <polygon key={polygon.id} className={cls(polygon.id)} points={polygon.points.map((id) => `${sx(points[id].x)},${sy(points[id].y)}`).join(' ')}
          fill={fill(polygon.tone ?? 'navy')} stroke={stroke(polygon.tone ?? 'navy')} strokeWidth="1.5" />)}
      {Object.values(circles).filter((c) => visible(state, c.id)).map((c) =>
        <circle key={c.id} className={`${cls(c.id)}${c.dashed ? '' : ' viz-draw'}`} pathLength={c.dashed ? undefined : 1} cx={sx(c.cx)} cy={sy(c.cy)} r={Math.abs(sx(c.cx + c.r) - sx(c.cx))} fill="none"
          stroke={stroke(c.tone ?? 'navy')} strokeWidth="2" strokeDasharray={c.dashed ? '6 4' : undefined} />)}
      {(params.segments ?? []).filter((s) => visible(state, s.id)).map((segment) => {
        const a = points[segment.from];
        const b = points[segment.to];
        return <g key={segment.id} className={cls(segment.id)}>
          <line x1={sx(a.x)} y1={sy(a.y)} x2={sx(b.x)} y2={sy(b.y)} stroke={stroke(segment.tone ?? 'ink')} strokeWidth={segment.arrow ? 3 : 2.2}
            strokeDasharray={segment.dashed ? '6 4' : undefined} {...draw(segment.dashed)}
            markerEnd={segment.arrow ? `url(#${marker}-${['ink', 'navy', 'ok', 'bad', 'warn'].includes(segment.tone) ? segment.tone : 'ink'})` : undefined} />
          {segment.label && <text x={(sx(a.x) + sx(b.x)) / 2 + 6} y={(sy(a.y) + sy(b.y)) / 2 - 6} className="viz-label">{segment.label}</text>}
        </g>;
      })}
      {(params.paths ?? []).filter((path) => visible(state, path.id)).map((path) => {
        const pts = path.points.map((id) => points[id]);
        const last = pts[pts.length - 1];
        return <g key={path.id} className={cls(path.id)}>
          <polyline points={pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')} fill="none" stroke={stroke(path.tone ?? 'navy')} strokeWidth="4"
            strokeLinejoin="round" strokeDasharray={path.dashed ? '8 5' : undefined} {...draw(path.dashed)}
            markerEnd={`url(#${marker}-${['ink', 'navy', 'ok', 'bad', 'warn'].includes(path.tone) ? path.tone : 'navy'})`} />
          {path.label && <text x={sx(last.x) + 10} y={sy(last.y) + 18} className="viz-label">{path.label}</text>}
        </g>;
      })}
      {(params.angles ?? []).filter((a) => visible(state, a.id)).map((angle) => {
        const v = points[angle.vertex];
        const a = points[angle.from];
        const b = points[angle.to];
        const r = 26;
        const t1 = Math.atan2(sy(a.y) - sy(v.y), sx(a.x) - sx(v.x));
        const t2 = Math.atan2(sy(b.y) - sy(v.y), sx(b.x) - sx(v.x));
        let delta = t2 - t1;
        while (delta <= -Math.PI) delta += 2 * Math.PI;
        while (delta > Math.PI) delta -= 2 * Math.PI;
        const p1 = [sx(v.x) + r * Math.cos(t1), sy(v.y) + r * Math.sin(t1)];
        const p2 = [sx(v.x) + r * Math.cos(t1 + delta), sy(v.y) + r * Math.sin(t1 + delta)];
        const mid = t1 + delta / 2;
        return <g key={angle.id} className={cls(angle.id)}>
          {angle.right
            ? <path d={`M${sx(v.x) + 14 * Math.cos(t1)},${sy(v.y) + 14 * Math.sin(t1)} l${14 * Math.cos(t1 + delta)},${14 * Math.sin(t1 + delta)} l${-14 * Math.cos(t1)},${-14 * Math.sin(t1)}`}
              fill="none" stroke={stroke(angle.tone ?? 'warn')} strokeWidth="2" />
            : <path d={`M${p1[0]},${p1[1]} A${r},${r} 0 0 ${delta > 0 ? 1 : 0} ${p2[0]},${p2[1]}`} fill="none" stroke={stroke(angle.tone ?? 'warn')} strokeWidth="2.5" />}
          {angle.label && <text x={sx(v.x) + (r + 14) * Math.cos(mid)} y={sy(v.y) + (r + 14) * Math.sin(mid) + 4} textAnchor="middle" className="viz-label">{angle.label}</text>}
        </g>;
      })}
      {(params.texts ?? []).filter((t) => visible(state, t.id)).map((text) =>
        <text key={text.id} x={sx(text.x)} y={sy(text.y)} textAnchor="middle" className="viz-label">{text.text}</text>)}
      {Object.values(points).filter((p) => !p.hidden && visible(state, p.id)).map((point) => {
        const draggable = drag?.point === point.id;
        return <g key={point.id}>
          <circle cx={sx(point.x)} cy={sy(point.y)} r={draggable ? 9 : 4.5} fill={draggable ? 'var(--warn)' : 'var(--ink)'}
            stroke="var(--surface)" strokeWidth="2" style={draggable ? { cursor: 'grab', touchAction: 'none' } : undefined}
            onPointerDown={draggable ? startDrag : undefined} tabIndex={draggable ? 0 : undefined} onKeyDown={draggable ? nudge : undefined}
            role={draggable ? 'slider' : undefined} aria-label={draggable ? `${point.label ?? point.id} noktasını sürükle (ok tuşları)` : undefined} />
          {point.label && <text x={sx(point.x) + 9} y={sy(point.y) - 9} className="viz-point">{point.label}</text>}
        </g>;
      })}
    </svg>
    {measures.length > 0 && <figcaption className="viz-measures">
      {measures.filter((m) => visible(state, m.id)).map((m) => <span key={m.id} className="chip chip-primary">
        {m.label}: {formatNumber(m.value, m.kind === 'angle' ? 1 : 2)}{m.kind === 'angle' ? '°' : ''}</span>)}
      {drag && <span className="muted">Turuncu noktayı sürükle: hangi ölçü değişmiyor?</span>}
    </figcaption>}
  </figure>;
}
