import { useEffect, useId, useRef, useState } from 'react';
import { arrowPath, linear, niceStep, svgPoint, ticks } from '../motion/svgKit.js';
import { fmt } from './num.js';

// Renkler yalnız theme.css değişkenleri.
export const COLORS = {
  blue: 'var(--pen-blue)', red: 'var(--pen-red)', green: 'var(--pen-green)', black: 'var(--pen-black)',
  navy: 'var(--navy)', warn: 'var(--warn)', ok: 'var(--ok)', bad: 'var(--bad)', line: 'var(--line)', ink: 'var(--ink)', tint: 'var(--tint)',
};
const colorOf = (name) => COLORS[name] ?? name ?? COLORS.navy;

const PI_LABELS = { 0: '0', 0.5: 'π/2', 1: 'π', 1.5: '3π/2', 2: '2π', '-0.5': '−π/2', '-1': '−π', '-1.5': '−3π/2', '-2': '−2π', 2.5: '5π/2', 3: '3π', '-2.5': '−5π/2', '-3': '−3π' };

/** Fonksiyonu örnekleyip kopukluklarda (asimptot) parçalar. */
function sampleFn(f, from, to, sy, yspan, count = 700) {
  const segments = [];
  let current = [];
  let previous = null;
  for (let i = 0; i <= count; i += 1) {
    const x = from + ((to - from) * i) / count;
    let y;
    try { y = f(x); } catch { y = NaN; }
    if (!Number.isFinite(y) || (previous !== null && Math.abs(y - previous) > yspan * 4)) {
      if (current.length > 1) segments.push(current);
      current = [];
      previous = Number.isFinite(y) ? y : null;
      if (!Number.isFinite(y)) continue;
    }
    current.push([x, Math.max(-1e6, Math.min(1e6, y))]);
    previous = y;
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

/**
 * Genel 2B çizim: fonksiyon, alan, çokgen, nokta (sürüklenebilir), doğru parçası, ok, açı yayı, metin.
 * Koordinatlar veri biriminde; equal = true iken bir birim x ve y'de aynı uzunluktadır.
 */
export default function Plot({ x: [x0, x1], y: [y0, y1], width = 640, height = 380, equal = false, items = [], xLabel, yLabel,
  xTickStep, yTickStep, piTicks = false, grid = true, onClick, ariaLabel = 'Grafik', className = '', axisLabelsAtEdge = false }) {
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const uid = useId().replace(/:/g, '');
  // Çizim alanı kapsayıcının gerçek genişliğini kullanır: yazılar her ekranda aynı (okunur) boyutta kalır.
  const [measured, setMeasured] = useState(null);
  useEffect(() => {
    const parent = svgRef.current?.parentElement;
    if (!parent || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(Math.min(width * 1.25, Math.max(300, entry.contentRect.width)));
      setMeasured((current) => (current && Math.abs(current - next) < 4 ? current : next));
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, [width]);
  const reference = width;
  width = measured ?? width;
  const M = { left: 40, right: 14, top: 14, bottom: 26 };
  const H = equal ? Math.round(M.top + M.bottom + ((width - M.left - M.right) * (y1 - y0)) / (x1 - x0)) : Math.round(height * Math.min(1, Math.max(0.62, width / reference)));
  const sx = linear(x0, x1, M.left, width - M.right);
  const sy = linear(y0, y1, H - M.bottom, M.top);
  const xs = piTicks ? ticks(x0, x1, Math.PI / 2) : ticks(x0, x1, xTickStep ?? niceStep(x1 - x0, 10));
  const ys = ticks(y0, y1, yTickStep ?? niceStep(y1 - y0, 8));
  const yspan = y1 - y0;
  const axisY = !axisLabelsAtEdge && y0 <= 0 && y1 >= 0 ? sy(0) : H - M.bottom;
  const axisX = !axisLabelsAtEdge && x0 <= 0 && x1 >= 0 ? sx(0) : M.left;
  const unitX = Math.abs(sx(1) - sx(0));
  const unitY = Math.abs(sy(1) - sy(0));

  const toData = (event) => { const p = svgPoint(svgRef.current, event); return [sx.invert(p.x), sy.invert(p.y)]; };
  const clampSnap = (value, min, max, snap) => { const v = snap ? Math.round(value / snap) * snap : value; return Math.min(max, Math.max(min, Number(v.toFixed(6)))); };
  const moveItem = (item, [px, py]) => item.onDrag(clampSnap(px, x0, x1, item.snap), clampSnap(py, y0, y1, item.snap));
  const onPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (onClick) { const [px, py] = toData(event); onClick(px, py); }
  };
  const onPointerMove = (event) => {
    const item = dragRef.current;
    if (item) moveItem(item, toData(event));
  };
  const stop = () => { dragRef.current = null; };
  const piText = (value) => PI_LABELS[String(Number((value / Math.PI).toFixed(3)))] ?? fmt(value, 2);

  const render = (item, i) => {
    const color = colorOf(item.color);
    switch (item.type) {
      case 'fn': {
        const [from, to] = item.domain ?? [x0, x1];
        return sampleFn(item.f, Math.max(from, x0), Math.min(to, x1), sy, yspan).map((segment, k) =>
          <path key={`${i}-${k}`} d={segment.map(([px, py], j) => `${j ? 'L' : 'M'}${sx(px).toFixed(1)},${sy(py).toFixed(1)}`).join('')}
            fill="none" stroke={color} strokeWidth={item.width ?? 2.6} strokeDasharray={item.dashed ? '7 5' : undefined} opacity={item.opacity} strokeLinejoin="round" />);
      }
      case 'area': {
        const from = Math.max(item.from ?? x0, x0);
        const to = Math.min(item.to ?? x1, x1);
        if (to <= from) return null;
        const base = item.base ?? (() => 0);
        const count = 240;
        const top = [];
        const bottom = [];
        for (let k = 0; k <= count; k += 1) {
          const px = from + ((to - from) * k) / count;
          const fy = item.f(px);
          const by = base(px);
          if (!Number.isFinite(fy) || !Number.isFinite(by)) continue;
          top.push(`${sx(px).toFixed(1)},${sy(Math.max(y0, Math.min(y1, fy))).toFixed(1)}`);
          bottom.unshift(`${sx(px).toFixed(1)},${sy(Math.max(y0, Math.min(y1, by))).toFixed(1)}`);
        }
        if (!top.length) return null;
        return <polygon key={i} points={[...top, ...bottom].join(' ')} fill={color} opacity={item.opacity ?? 0.18} stroke="none" />;
      }
      case 'poly': {
        if (!item.points?.length) return null;
        const d = item.points.map(([px, py], k) => `${k ? 'L' : 'M'}${sx(px).toFixed(1)},${sy(py).toFixed(1)}`).join('') + (item.closed ? 'Z' : '');
        return <path key={i} d={d} fill={item.fill ? colorOf(item.fill) : 'none'} fillOpacity={item.fillOpacity ?? 0.15} stroke={item.stroke === false ? 'none' : color}
          strokeWidth={item.width ?? 2.4} strokeDasharray={item.dashed ? '6 4' : undefined} strokeLinejoin="round" />;
      }
      case 'rect': {
        const left = sx(Math.min(item.x, item.x + item.w));
        const right = sx(Math.max(item.x, item.x + item.w));
        const topY = sy(Math.max(item.y, item.y + item.h));
        const bottomY = sy(Math.min(item.y, item.y + item.h));
        return <rect key={i} x={left} y={topY} width={Math.max(0, right - left)} height={Math.max(0, bottomY - topY)} fill={color} opacity={item.opacity ?? 0.85}
          stroke={item.stroke ? colorOf(item.stroke) : 'none'} rx={item.rx ?? 0} />;
      }
      case 'segment': case 'arrow': {
        const [ax, ay] = item.from; const [bx, by] = item.to;
        if (item.type === 'arrow') return <path key={i} d={arrowPath(sx(ax), sy(ay), sx(bx), sy(by), item.head ?? 10)} stroke={color} fill={color} strokeWidth={item.width ?? 2.6} />;
        return <line key={i} x1={sx(ax)} y1={sy(ay)} x2={sx(bx)} y2={sy(by)} stroke={color} strokeWidth={item.width ?? 2} strokeDasharray={item.dashed ? '6 4' : undefined} />;
      }
      case 'line': {
        // Sonsuz doğru: a x + b y = c
        const { a, b, c } = item;
        let p1; let p2;
        if (Math.abs(b) > 1e-12) { p1 = [x0, (c - a * x0) / b]; p2 = [x1, (c - a * x1) / b]; }
        else if (Math.abs(a) > 1e-12) { p1 = [c / a, y0]; p2 = [c / a, y1]; }
        else return null;
        return <line key={i} x1={sx(p1[0])} y1={sy(p1[1])} x2={sx(p2[0])} y2={sy(p2[1])} stroke={color} strokeWidth={item.width ?? 2.4} strokeDasharray={item.dashed ? '7 5' : undefined} />;
      }
      case 'vline': return <line key={i} x1={sx(item.x)} x2={sx(item.x)} y1={M.top} y2={H - M.bottom} stroke={color} strokeWidth={item.width ?? 1.5} strokeDasharray={item.dashed === false ? undefined : '5 4'} />;
      case 'hline': return <line key={i} x1={M.left} x2={width - M.right} y1={sy(item.y)} y2={sy(item.y)} stroke={color} strokeWidth={item.width ?? 1.5} strokeDasharray={item.dashed === false ? undefined : '5 4'} />;
      case 'circle': return <ellipse key={i} cx={sx(item.cx)} cy={sy(item.cy)} rx={item.r * unitX} ry={item.r * unitY} fill={item.fill ? colorOf(item.fill) : 'none'}
        fillOpacity={item.fillOpacity ?? 0.12} stroke={color} strokeWidth={item.width ?? 2.2} strokeDasharray={item.dashed ? '6 4' : undefined} />;
      case 'sector': {
        // Merkez açı ve dilim: başlangıç ve bitiş açısı (derece, saat yönü tersine).
        const r = item.r;
        const a0 = (item.from * Math.PI) / 180;
        const a1 = (item.to * Math.PI) / 180;
        const large = Math.abs(item.to - item.from) % 360 > 180 ? 1 : 0;
        const p0 = [sx(item.cx + r * Math.cos(a0)), sy(item.cy + r * Math.sin(a0))];
        const p1 = [sx(item.cx + r * Math.cos(a1)), sy(item.cy + r * Math.sin(a1))];
        const d = `M${sx(item.cx)},${sy(item.cy)}L${p0[0]},${p0[1]}A${r * unitX},${r * unitY} 0 ${large} 0 ${p1[0]},${p1[1]}Z`;
        return <path key={i} d={d} fill={color} fillOpacity={item.opacity ?? 0.2} stroke={color} strokeWidth="1.5" />;
      }
      case 'angle': {
        // Açı yayı: tepe noktası at, kollar from ve to yönünde; piksel yarıçapı r.
        const [vx, vy] = item.at;
        const angleTo = ([px, py]) => Math.atan2(-(sy(py) - sy(vy)), sx(px) - sx(vx));
        let a0 = angleTo(item.from); let a1 = angleTo(item.to);
        let delta = a1 - a0;
        while (delta <= -Math.PI) delta += 2 * Math.PI;
        while (delta > Math.PI) delta -= 2 * Math.PI;
        if (item.reflex) delta = delta > 0 ? delta - 2 * Math.PI : delta + 2 * Math.PI;
        const r = item.r ?? 26;
        const cx = sx(vx); const cy = sy(vy);
        const start = [cx + r * Math.cos(a0), cy - r * Math.sin(a0)];
        const end = [cx + r * Math.cos(a0 + delta), cy - r * Math.sin(a0 + delta)];
        const mid = a0 + delta / 2;
        const right = item.right && Math.abs(Math.abs(delta) - Math.PI / 2) < 0.02;
        return <g key={i}>
          {right ? <path d={`M${cx + 14 * Math.cos(a0)},${cy - 14 * Math.sin(a0)}L${cx + 14 * Math.SQRT2 * Math.cos(mid)},${cy - 14 * Math.SQRT2 * Math.sin(mid)}L${cx + 14 * Math.cos(a0 + delta)},${cy - 14 * Math.sin(a0 + delta)}`} fill="none" stroke={color} strokeWidth="1.8" />
            : <path d={`M${cx},${cy}L${start[0]},${start[1]}A${r},${r} 0 ${Math.abs(delta) > Math.PI ? 1 : 0} ${delta > 0 ? 0 : 1} ${end[0]},${end[1]}Z`} fill={color} fillOpacity=".16" stroke={color} strokeWidth="1.6" />}
          {item.label && <text x={cx + (r + 14) * Math.cos(mid)} y={cy - (r + 14) * Math.sin(mid) + 4} textAnchor="middle" className="kit-label" fill={color}>{item.label}</text>}
        </g>;
      }
      case 'text': return <text key={i} x={sx(item.x) + (item.dx ?? 0)} y={sy(item.y) + (item.dy ?? 0)} textAnchor={item.anchor ?? 'start'}
        className={item.small ? 'kit-small' : 'kit-label'} fill={color}>{item.text}</text>;
      case 'point': {
        const px = sx(item.x); const py = sy(item.y);
        const draggable = !!item.onDrag;
        const body = <>
          {draggable && <circle cx={px} cy={py} r="16" fill="transparent" />}
          <circle cx={px} cy={py} r={item.r ?? (draggable ? 7 : 5)} fill={item.hollow ? 'var(--surface)' : color} stroke={draggable ? 'var(--surface)' : color} strokeWidth={draggable ? 2.5 : 1.5} />
          {draggable && <circle cx={px} cy={py} r={(item.r ?? 7) + 3} fill="none" stroke={color} strokeWidth="2" />}
          {item.label && <text x={px + (item.dx ?? 10)} y={py + (item.dy ?? -10)} className="kit-label" fill={color} textAnchor={item.anchor ?? 'start'}>{item.label}</text>}
        </>;
        if (!draggable) return <g key={i} pointerEvents="none">{body}</g>;
        const step = item.snap || (x1 - x0) / 100;
        return <g key={i} className="kit-drag" tabIndex={0} role="slider" aria-label={item.aria ?? item.label ?? 'Sürüklenebilir nokta'}
          aria-valuetext={`(${fmt(item.x, 2)}; ${fmt(item.y, 2)})`}
          onPointerDown={(event) => { event.stopPropagation(); svgRef.current.setPointerCapture?.(event.pointerId); dragRef.current = item; }}
          onKeyDown={(event) => {
            const moves = { ArrowUp: [0, step], ArrowDown: [0, -step], ArrowRight: [step, 0], ArrowLeft: [-step, 0] };
            if (!moves[event.key]) return;
            event.preventDefault();
            moveItem(item, [item.x + moves[event.key][0], item.y + moves[event.key][1]]);
          }}>{body}</g>;
      }
      default: return null;
    }
  };

  return <svg ref={svgRef} viewBox={`0 0 ${width} ${H}`} className={`kit-plot${items.some((it) => it.onDrag) ? ' kit-plot-drag' : ''} ${className}`}
    role="img" aria-label={ariaLabel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stop} onPointerCancel={stop}>
    <defs><clipPath id={`${uid}-clip`}><rect x={M.left} y={M.top} width={width - M.left - M.right} height={H - M.top - M.bottom} /></clipPath></defs>
    <rect x={M.left} y={M.top} width={width - M.left - M.right} height={H - M.top - M.bottom} fill="var(--surface)" />
    {grid && xs.map((v) => <line key={`gx${v}`} x1={sx(v)} x2={sx(v)} y1={M.top} y2={H - M.bottom} stroke="var(--line)" strokeWidth=".7" />)}
    {grid && ys.map((v) => <line key={`gy${v}`} x1={M.left} x2={width - M.right} y1={sy(v)} y2={sy(v)} stroke="var(--line)" strokeWidth=".7" />)}
    <line x1={M.left} x2={width - M.right} y1={axisY} y2={axisY} stroke="var(--ink)" strokeWidth="1.4" />
    <line x1={axisX} x2={axisX} y1={M.top} y2={H - M.bottom} stroke="var(--ink)" strokeWidth="1.4" />
    {xs.map((v) => (Math.abs(v) < 1e-9 && axisX !== M.left ? null : <text key={`lx${v}`} x={sx(v)} y={Math.min(H - 6, axisY + 16)} textAnchor="middle" className="kit-small">{piTicks ? piText(v) : fmt(v, 2)}</text>))}
    {ys.map((v) => (Math.abs(v) < 1e-9 && axisY !== H - M.bottom ? null : <text key={`ly${v}`} x={Math.max(M.left - 4, axisX - 5)} y={sy(v) + 4} textAnchor="end" className="kit-small">{fmt(v, 2)}</text>))}
    {xLabel && <text x={width - M.right - 2} y={axisY - 6} textAnchor="end" className="kit-axis">{xLabel}</text>}
    {yLabel && <text x={axisX + 6} y={M.top + 12} className="kit-axis">{yLabel}</text>}
    <g clipPath={`url(#${uid}-clip)`}>{items.filter((it) => !['point', 'text'].includes(it.type) && !it.noClip).map(render)}</g>
    {items.filter((it) => it.noClip && !['point', 'text'].includes(it.type)).map(render)}
    {items.filter((it) => it.type === 'text').map(render)}
    {items.filter((it) => it.type === 'point').map(render)}
  </svg>;
}
