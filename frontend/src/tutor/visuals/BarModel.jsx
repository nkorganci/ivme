import { fill, stroke, visible, focused, formatNumber } from './svg.js';

const W = 640;
const LEFT = 120;

/** Şerit (çubuk) model: parça-bütün ilişkileri, oran ve yüzde problemleri. */
export default function BarModel({ params, state }) {
  const bars = params.bars ?? [];
  const max = Math.max(...bars.map((bar) => bar.segments.reduce((sum, s) => sum + s.value, 0)));
  const unit = (W - LEFT - 20) / (max || 1);
  const rowH = 74;
  return <svg viewBox={`0 0 ${W} ${bars.length * rowH + 30}`} className="viz-svg" role="img" aria-label="Şerit model">
    {bars.map((bar, bi) => {
      const y = 34 + bi * rowH;
      let x = LEFT;
      const starts = [];
      const parts = bar.segments.map((segment) => {
        const width = segment.value * unit;
        const start = x;
        starts.push(start);
        x += width;
        if (!visible(state, segment.id)) return <rect key={segment.id} x={start} y={y} width={width} height="34" fill="var(--surface)" stroke="var(--line)" strokeDasharray="4 3" />;
        return <g key={segment.id} className={focused(state, segment.id) ? 'viz-focus' : ''}>
          <rect x={start} y={y} width={width} height="34" fill={fill(segment.tone ?? 'navy')} stroke={stroke(segment.tone ?? 'navy')} strokeWidth="1.5" />
          {width > 26 && <text x={start + width / 2} y={y + 22} textAnchor="middle" className="viz-small">{segment.label ?? formatNumber(segment.value)}</text>}
        </g>;
      });
      starts.push(x);
      return <g key={bar.id} className={focused(state, bar.id) ? 'viz-focus' : ''}>
        <text x={LEFT - 10} y={y + 22} textAnchor="end" className="viz-label">{bar.label}</text>
        {parts}
        {(params.brackets ?? []).filter((b) => b.bar === bar.id && visible(state, b.id)).map((bracket) => {
          const x1 = starts[bracket.from];
          const x2 = starts[bracket.to + 1];
          return <g key={bracket.id}>
            <path d={`M${x1},${y - 4} v-8 H${x2} v8`} fill="none" stroke="var(--warn)" strokeWidth="2" />
            <text x={(x1 + x2) / 2} y={y - 16} textAnchor="middle" className="viz-label">{bracket.label}</text>
          </g>;
        })}
      </g>;
    })}
  </svg>;
}
