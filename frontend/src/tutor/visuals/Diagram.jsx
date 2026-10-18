import { useId } from 'react';
import { fill, stroke, visible, focused, wrapText } from './svg.js';

const W = 640;
const UNIT = W / 100;

function box(node) {
  const lines = wrapText(node.text, node.shape === 'circle' ? 12 : 22);
  const width = node.shape === 'circle' ? 92 : Math.min(200, Math.max(96, Math.max(...lines.map((l) => l.length)) * 7.4 + 22));
  const height = node.shape === 'circle' ? 92 : lines.length * 16 + 18;
  return { lines, width, height, cx: node.x * UNIT, cy: node.y * UNIT };
}

function edgePoint(b, tx, ty) {
  const dx = tx - b.cx;
  const dy = ty - b.cy;
  const sx = dx === 0 ? Infinity : (b.width / 2) / Math.abs(dx);
  const sy = dy === 0 ? Infinity : (b.height / 2) / Math.abs(dy);
  const s = Math.min(sx, sy);
  return [b.cx + dx * s, b.cy + dy * s];
}

/** Kutu-ok şeması: süreç, neden-sonuç zinciri, argüman haritası; adımlar sırayla açılır. */
export default function Diagram({ params, state }) {
  const marker = `dg-${useId().replace(/:/g, '')}`;
  const height = (params.height ?? 60) * UNIT;
  const boxes = Object.fromEntries((params.nodes ?? []).map((node) => [node.id, box(node)]));
  const shown = (params.nodes ?? []).filter((node) => visible(state, node.id));
  const shownIds = new Set(shown.map((node) => node.id));
  return <svg viewBox={`0 0 ${W} ${height}`} className="viz-svg" role="img" aria-label="Şema">
    <defs>{['ink', 'ok', 'bad', 'warn', 'navy'].map((tone) => <marker key={tone} id={`${marker}-${tone}`} viewBox="0 0 10 10" refX="9" refY="5"
      markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={stroke(tone)} /></marker>)}</defs>
    {(params.edges ?? []).filter((edge) => visible(state, edge.id) && shownIds.has(edge.from) && shownIds.has(edge.to)).map((edge) => {
      const a = boxes[edge.from];
      const b = boxes[edge.to];
      const [x1, y1] = edgePoint(a, b.cx, b.cy);
      const [x2, y2] = edgePoint(b, a.cx, a.cy);
      const tone = edge.tone ?? 'ink';
      return <g key={edge.id} className={focused(state, edge.id) ? 'viz-focus' : ''}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke(tone)} strokeWidth="2" strokeDasharray={edge.dashed ? '6 4' : undefined}
          markerEnd={`url(#${marker}-${['ink', 'ok', 'bad', 'warn', 'navy'].includes(tone) ? tone : 'ink'})`} />
        {edge.label && <g>
          <rect x={(x1 + x2) / 2 - edge.label.length * 3.4 - 4} y={(y1 + y2) / 2 - 11} width={edge.label.length * 6.8 + 8} height="18" rx="4" fill="var(--surface)" />
          <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + 2} textAnchor="middle" className="viz-small">{edge.label}</text>
        </g>}
      </g>;
    })}
    {shown.map((node) => {
      const b = boxes[node.id];
      const tone = node.tone ?? 'navy';
      return <g key={node.id} className={focused(state, node.id) ? 'viz-focus' : ''}>
        {node.shape === 'circle'
          ? <circle cx={b.cx} cy={b.cy} r={b.width / 2} fill={fill(tone)} stroke={stroke(tone)} strokeWidth="2" />
          : <rect x={b.cx - b.width / 2} y={b.cy - b.height / 2} width={b.width} height={b.height} rx={node.shape === 'pill' ? b.height / 2 : 8}
            fill={fill(tone)} stroke={stroke(tone)} strokeWidth="2" />}
        <text x={b.cx} y={b.cy - ((b.lines.length - 1) * 16) / 2 + 5} textAnchor="middle" className="viz-node">
          {b.lines.map((line, i) => <tspan key={i} x={b.cx} dy={i === 0 ? 0 : 16}>{line}</tspan>)}
        </text>
      </g>;
    })}
  </svg>;
}
