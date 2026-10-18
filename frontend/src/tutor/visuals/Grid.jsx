import { fill, stroke, visible } from './svg.js';

const W = 560;

function genotype(a, b) {
  return [a, b].sort((x, y) => (x.toLowerCase() === y.toLowerCase() ? (x === x.toUpperCase() ? -1 : 1) : x.localeCompare(y))).join('');
}

function Pairs({ params, state }) {
  const groups = params.groups;
  const owner = [];
  groups.forEach((group) => { for (let i = 0; i < group.size; i += 1) owner.push(group); });
  const n = params.n;
  const cell = Math.floor((W - 40) / n);
  const counts = {};
  const cells = [];
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const [a, b] = [owner[i], owner[j]].sort((x, y) => groups.indexOf(x) - groups.indexOf(y));
      const id = `pair:${a.id}-${b.id}`;
      counts[id] = (counts[id] ?? 0) + 1;
      const shown = visible(state, id);
      const tone = a === b ? a.tone : 'warn';
      cells.push(<rect key={`${i}-${j}`} x={20 + j * cell} y={20 + i * cell} width={cell - 1} height={cell - 1}
        fill={shown ? fill(tone ?? 'navy') : 'var(--surface)'} stroke={shown ? stroke(tone ?? 'navy') : 'var(--line)'} strokeWidth=".6" />);
    }
  }
  const size = 40 + n * cell;
  return <>
    <svg viewBox={`0 0 ${size} ${size}`} className="viz-svg viz-square" role="img" aria-label="İkili seçimler">{cells}
    </svg>
    <p className="viz-legend">{Object.entries(counts).filter(([id]) => visible(state, id)).map(([id, count]) => {
      const [, ids] = id.split(':');
      const [a, b] = ids.split('-').map((gid) => groups.find((g) => g.id === gid));
      return <span key={id} className="viz-legend-item"><span className="viz-swatch" style={{ background: stroke(a === b ? a.tone : 'warn') }} />
        {a === b ? `${a.label} + ${b.label}` : `${a.label} + ${b.label}`}: {count}</span>;
    })}</p>
  </>;
}

function Punnett({ params, state }) {
  const cell = 74;
  const rows = params.rows;
  const cols = params.cols;
  const highlights = (params.highlight ?? []).filter((h) => visible(state, h.id));
  const tone = (g) => highlights.find((h) => h.match.includes(g))?.tone;
  return <svg viewBox={`0 0 ${(cols.length + 1) * cell + 10} ${(rows.length + 1) * cell + 10}`} className="viz-svg viz-square" role="img" aria-label="Çaprazlama tablosu">
    {cols.map((c, j) => <text key={`c${j}`} x={(j + 1.5) * cell} y={cell * 0.62} textAnchor="middle" className="viz-allele">{c}</text>)}
    {rows.map((r, i) => <g key={`r${i}`}>
      <text x={cell * 0.5} y={(i + 1.62) * cell} textAnchor="middle" className="viz-allele">{r}</text>
      {cols.map((c, j) => {
        const g = genotype(r, c);
        const t = tone(g);
        return <g key={j}>
          <rect x={(j + 1) * cell} y={(i + 1) * cell} width={cell - 4} height={cell - 4} rx="8" fill={t ? fill(t) : 'var(--surface)'} stroke={t ? stroke(t) : 'var(--line)'} strokeWidth="2" />
          <text x={(j + 1.5) * cell - 2} y={(i + 1.6) * cell} textAnchor="middle" className="viz-allele">{g}</text>
        </g>;
      })}
    </g>)}
  </svg>;
}

function Cells({ params, state }) {
  const groups = (params.groups ?? []).filter((g) => visible(state, g.id));
  const cell = Math.min(34, Math.floor((W - 40) / params.cols));
  const toneOf = (r, c) => groups.find((g) => (g.rows ?? []).includes(r) || (g.cols ?? []).includes(c));
  let remaining = 0;
  const rects = [];
  for (let r = 0; r < params.rows; r += 1) {
    for (let c = 0; c < params.cols; c += 1) {
      const group = toneOf(r, c);
      if (!group) remaining += 1;
      rects.push(<rect key={`${r}-${c}`} x={30 + c * cell} y={20 + r * cell} width={cell - 3} height={cell - 3} rx="4"
        fill={group ? fill(group.tone ?? 'bad') : 'var(--tint)'} stroke={group ? stroke(group.tone ?? 'bad') : 'var(--navy)'} strokeWidth="1.2"
        opacity={group ? 0.85 : 1} />);
    }
  }
  return <>
    <svg viewBox={`0 0 ${60 + params.cols * cell} ${40 + params.rows * cell}`} className="viz-svg" role="img" aria-label="Dizilim">{rects}</svg>
    <p className="viz-legend">
      <span className="viz-legend-item"><span className="viz-swatch" style={{ background: 'var(--navy)' }} />Kalan: {remaining}</span>
      {groups.map((g) => <span key={g.id} className="viz-legend-item"><span className="viz-swatch" style={{ background: stroke(g.tone ?? 'bad') }} />{g.label}</span>)}
    </p>
  </>;
}

/** Izgara: ikili seçim uzayı, Punnett karesi ya da sıra-sütun dizilimi. */
export default function Grid({ params, state }) {
  if (params.mode === 'pairs') return <Pairs params={params} state={state} />;
  if (params.mode === 'punnett') return <Punnett params={params} state={state} />;
  return <Cells params={params} state={state} />;
}
