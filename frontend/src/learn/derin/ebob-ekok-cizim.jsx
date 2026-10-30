import { C, L, R, T } from './svg.jsx';

function Bolen({ model: m }) {
  const rows = m.pairs.length;
  const h = Math.min(34, 190 / rows);
  return <>
    <T x={240} y={24}>{`${m.n} = ${m.factorText}`}</T>
    {m.pairs.map(([a, b], i) => {
      const same = a === b;
      return <g key={i}>
        <R x={110} y={40 + i * (h + 4)} w={110} h={h} tone={same ? 'warn-soft' : 'primary-soft'} />
        <T x={165} y={40 + i * (h + 4) + h / 2 + 6}>{a}</T>
        <T x={240} y={40 + i * (h + 4) + h / 2 + 6}>×</T>
        <R x={260} y={40 + i * (h + 4)} w={110} h={h} tone={same ? 'warn-soft' : 'good-soft'} />
        <T x={315} y={40 + i * (h + 4) + h / 2 + 6}>{b}</T>
      </g>;
    })}
    <T x={240} y={266} size="large">{`${m.count} bölen${m.square ? ' (tek: tam kare)' : ''}`}</T>
  </>;
}

function Venn({ model: m }) {
  const place = (list, cx) => list.map((p, i) => <T key={i} x={cx + ((i % 2) * 2 - 1) * (list.length > 1 ? 16 : 0)} y={98 + Math.floor(i / 2) * 30} size="large">{p}</T>);
  return <>
    <circle cx={180} cy={120} r={98} className="lm-primary-soft" fillOpacity="0.55" />
    <circle cx={300} cy={120} r={98} className="lm-good-soft" fillOpacity="0.55" />
    <T x={130} y={18}>{m.a}</T>
    <T x={350} y={18}>{m.b}</T>
    {place(m.onlyA, 128)}
    {place(m.common, 240)}
    {place(m.onlyB, 352)}
    <R x={30} y={236} w={200} h={44} tone="warn-soft" />
    <T x={130} y={264}>{`EBOB = ${m.ebob}`}</T>
    <R x={250} y={236} w={200} h={44} tone="soft" />
    <T x={350} y={264}>{`EKOK = ${m.ekok}`}</T>
  </>;
}

function Kare({ model: m }) {
  const unit = Math.min(400 / m.w, 200 / m.h);
  const W = m.w * unit, H = m.h * unit;
  const x0 = 240 - W / 2, y0 = 30;
  const cols = Math.floor(m.w / m.s), rows = Math.floor(m.h / m.s);
  const tiles = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) tiles.push(<rect key={`${r}-${c}`} x={x0 + c * m.s * unit + 1} y={y0 + r * m.s * unit + 1} width={m.s * unit - 2} height={m.s * unit - 2} rx="2" className={`lm-${m.fits ? (m.s === m.g ? 'good-soft' : 'primary-soft') : 'primary-soft'}`} />);
  return <>
    <rect x={x0} y={y0} width={W} height={H} className="lm-warn-soft" />
    {tiles}
    <T x={240} y={22}>{`${m.w} × ${m.h} duvar, fayans kenarı ${m.s}`}</T>
    <T x={240} y={y0 + H + 26}>{m.fits ? `${m.tiles} fayans, kesik şerit yok` : 'Turuncu şerit: fayans sığmıyor'}</T>
  </>;
}

function Zil({ model: m }) {
  const sx = (t) => 74 + (t / m.T) * 380;
  return <>
    <L x1={74} y1={150} x2={454} y2={150} />
    <T x={240} y={22}>{`0’dan ${m.T}. dakikaya kadar`}</T>
    {m.ringsA.map((t) => <C key={`a${t}`} x={sx(t)} y={96} r={6} tone={t % m.b === 0 ? 'good' : 'primary-soft'} />)}
    {m.ringsB.map((t) => <C key={`b${t}`} x={sx(t)} y={204} r={6} tone={t % m.a === 0 ? 'good' : 'warn-soft'} />)}
    {m.together.map((t) => <g key={`t${t}`}><L x1={sx(t)} y1={84} x2={sx(t)} y2={216} tone="accent-line" /><T x={sx(t)} y={176} style={{ fontSize: 13 }}>{t}</T></g>)}
    <T x={8} y={101} anchor="start" style={{ fontSize: 13 }}>{`${m.a} dk`}</T>
    <T x={8} y={209} anchor="start" style={{ fontSize: 13 }}>{`${m.b} dk`}</T>
    <T x={240} y={262} size="large">{`Birlikte: her ${m.l} dakikada`}</T>
  </>;
}

const SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function Takvim({ model: m }) {
  return <>
    <T x={240} y={30}>{`${m.n} gün = ${m.q} hafta + ${m.r} gün`}</T>
    {m.days.map((d, i) => <g key={d}>
      <R x={14 + i * 66} y={60} w={58} h={96} tone={i === m.end ? 'good-soft' : i === m.start ? 'primary-soft' : 'soft'} />
      <T x={43 + i * 66} y={102} style={{ fontSize: 13 }}>{SHORT[i]}</T>
      {i === m.start && <T x={43 + i * 66} y={136} style={{ fontSize: 12 }}>bugün</T>}
      {i === m.end && <T x={43 + i * 66} y={i === m.start ? 150 : 136} style={{ fontSize: 12 }}>varış</T>}
    </g>)}
    <T x={240} y={202}>{m.r === 0 ? 'Kalan 0: aynı gün' : `Tam haftalar atıldı; ${m.r} adım ileri`}</T>
    <T x={240} y={250} size="large">{m.days[m.end]}</T>
  </>;
}

export const diagrams = { 'ebob-bolen': Bolen, 'ebob-venn': Venn, 'ebob-kare': Kare, 'ekok-zil': Zil, 'ebob-takvim': Takvim };
