import { useId } from 'react';
import { fill, stroke, visible, focused } from './svg.js';

const LAYOUT = {
  2: [{ cx: 230, cy: 170, r: 120 }, { cx: 390, cy: 170, r: 120 }],
  3: [{ cx: 240, cy: 150, r: 110 }, { cx: 380, cy: 150, r: 110 }, { cx: 310, cy: 260, r: 110 }],
};
// Bölge etiket konumları: içinde olunan kümelerin dizinlerinden oluşan anahtar.
const ANCHORS = {
  2: { '0': [170, 170], '1': [450, 170], '01': [310, 170], '': [310, 320] },
  3: { '0': [200, 120], '1': [420, 120], '2': [310, 320], '01': [310, 110], '02': [250, 225], '12': [370, 225], '012': [310, 190], '': [70, 350] },
};

/** Venn şeması: bölge vurgusu ve öğe yerleşimi (kesişim, fark, tümleyen). */
export default function Venn({ params, state }) {
  const uid = useId().replace(/:/g, '');
  const sets = params.sets ?? [];
  const layout = LAYOUT[sets.length] ?? LAYOUT[2];
  const index = Object.fromEntries(sets.map((set, i) => [set.id, i]));
  const key = (inside) => [...inside].map((id) => index[id]).sort().join('');
  const placed = {};
  return <svg viewBox="0 0 620 380" className="viz-svg" role="img" aria-label="Venn şeması">
    <defs>
      {layout.map((c, i) => <clipPath key={i} id={`${uid}-c${i}`}><circle cx={c.cx} cy={c.cy} r={c.r} /></clipPath>)}
      {(params.regions ?? []).map((region) => <mask key={region.id} id={`${uid}-m-${region.id}`}>
        <rect x="0" y="0" width="620" height="380" fill="white" />
        {sets.map((set, i) => !region.inside.includes(set.id) && <circle key={i} cx={layout[i].cx} cy={layout[i].cy} r={layout[i].r} fill="black" />)}
      </mask>)}
    </defs>
    <rect x="10" y="10" width="600" height="360" rx="14" fill="var(--surface)" stroke="var(--line)" />
    {(params.regions ?? []).filter((region) => visible(state, region.id)).map((region) => {
      const shape = <rect x="0" y="0" width="620" height="380" fill={fill(region.tone ?? 'warn')} mask={`url(#${uid}-m-${region.id})`} />;
      const clipped = region.inside.reduce((inner, id) => <g clipPath={`url(#${uid}-c${index[id]})`}>{inner}</g>, shape);
      return <g key={region.id} className={focused(state, region.id) ? 'viz-focus' : ''}>{clipped}</g>;
    })}
    {sets.map((set, i) => <g key={set.id}>
      <circle cx={layout[i].cx} cy={layout[i].cy} r={layout[i].r} fill="none" stroke={stroke(set.tone ?? ['navy', 'ok', 'bad'][i])} strokeWidth="2.5" />
      <text x={layout[i].cx + (i === 0 ? -70 : i === 1 ? 70 : 0)} y={i === 2 ? layout[i].cy + layout[i].r + 18 : layout[i].cy - layout[i].r - 8}
        textAnchor="middle" className="viz-label">{set.label}</text>
    </g>)}
    {(params.regions ?? []).filter((region) => visible(state, region.id) && region.label).map((region) => {
      const [x, y] = ANCHORS[sets.length]?.[key(region.inside)] ?? [310, 190];
      return <text key={`l-${region.id}`} x={x} y={y + 24} textAnchor="middle" className="viz-small">{region.label}</text>;
    })}
    {(params.items ?? []).filter((item) => visible(state, item.id)).map((item) => {
      const k = key(item.inside);
      const [x, y] = ANCHORS[sets.length]?.[k] ?? [310, 190];
      const n = (placed[k] = (placed[k] ?? 0) + 1) - 1;
      return <text key={item.id} x={x} y={y - 18 + n * 17} textAnchor="middle" className={`viz-label${focused(state, item.id) ? ' viz-focus' : ''}`}>{item.text}</text>;
    })}
  </svg>;
}
