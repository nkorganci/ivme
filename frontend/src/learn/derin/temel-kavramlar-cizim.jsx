import { C, L, R, T, times } from './svg.jsx';
import { power } from './temel-kavramlar.js';

const show = (n) => (n < 0 ? `−${-n}` : String(n));

/** Sayıyı ikişerli sütunlar hâlinde nokta olarak çizer; açıkta kalan nokta uyarı renginde. */
function Dots({ n, y, label }) {
  const pairs = Math.floor(n / 2);
  return <g>
    <T x={44} y={y + 22} anchor="middle">{label}</T>
    {times(pairs, (i) => <g key={i}>
      <C x={100 + i * 34} y={y + 6} r={10} tone="primary-soft" />
      <C x={100 + i * 34} y={y + 32} r={10} tone="primary-soft" />
      <L x1={100 + i * 34} y1={y + 16} x2={100 + i * 34} y2={y + 22} />
    </g>)}
    {n % 2 === 1 && <C x={100 + pairs * 34} y={y + 6} r={10} tone="warn-soft" />}
  </g>;
}

function TekCift({ model: m }) {
  if (m.op < 2) return <>
    <Dots n={m.a} y={30} label={`a = ${m.a}`} />
    <Dots n={m.b} y={110} label={`b = ${m.b}`} />
    <L x1={20} y1={182} x2={460} y2={182} tone="grid-line" />
    <R x={70} y={198} w={340} h={70} tone={m.even ? 'good-soft' : 'warn-soft'} />
    <T x={240} y={226} size="large">{`${m.a} ${m.symbol} ${m.b} = ${show(m.result)}`}</T>
    <T x={240} y={254}>{m.even ? 'Açıkta nesne kalmıyor → çift' : 'Bir nesne açıkta → tek'}</T>
  </>;
  const cell = 20;
  const x0 = 240 - (m.a * cell) / 2;
  const tone = (col, row) => {
    if (m.a % 2 === 0) return 'good-soft';
    if (col < m.a - 1) return 'good-soft';
    if (m.b % 2 === 0) return 'primary-soft';
    return row < m.b - 1 ? 'primary-soft' : 'warn-soft';
  };
  return <>
    <T x={240} y={22}>{`${m.a} sütun × ${m.b} satır`}</T>
    {times(m.b, (row) => times(m.a, (col) => <rect key={`${row}-${col}`} x={x0 + col * cell} y={34 + row * cell} width={cell - 2} height={cell - 2} rx="3" className={`lm-${tone(col, row)}`} />))}
    <R x={70} y={222} w={340} h={58} tone={m.even ? 'good-soft' : 'warn-soft'} />
    <T x={240} y={247} size="large">{`${m.a} × ${m.b} = ${m.result}`}</T>
    <T x={240} y={272}>{m.even ? 'Bütün kareler eşleşiyor → çift' : 'Bir kare eşsiz kalıyor → tek'}</T>
  </>;
}

function Isaret({ model: m }) {
  const w = 54;
  const x0 = 272 - (m.n * (w + 8)) / 2;
  return <>
    <T x={240} y={28}>{`${show(m.base)} sayısını ${m.n} kez çarpıyoruz`}</T>
    {times(m.n, (i) => <g key={i}>
      <R x={x0 + i * (w + 8)} y={48} w={w} h={56} tone="primary-soft" />
      <T x={x0 + i * (w + 8) + w / 2} y={84} size="large">{show(m.base)}</T>
      <R x={x0 + i * (w + 8)} y={120} w={w} h={56} tone={m.signs[i] === '+' ? 'good-soft' : m.signs[i] === '−' ? 'warn-soft' : 'soft'} />
      <T x={x0 + i * (w + 8) + w / 2} y={156} size="large">{m.signs[i]}</T>
    </g>)}
    <T x={x0 - 8} y={84} anchor="end">çarpan</T>
    <T x={x0 - 8} y={156} anchor="end">işaret</T>
    <R x={90} y={198} w={300} h={70} tone={m.value > 0 ? 'good-soft' : m.value < 0 ? 'warn-soft' : 'soft'} />
    <T x={240} y={228} size="large">{`${power(m.base, m.n)} = ${show(m.value)}`}</T>
    <T x={240} y={256}>{m.value > 0 ? 'Sonuç pozitif' : m.value < 0 ? 'Sonuç negatif' : 'Sonuç 0'}</T>
  </>;
}

function Ardisik({ model: m }) {
  const w = 36;
  const gap = 4;
  const x0 = 268 - (m.n * (w + gap)) / 2;
  return <>
    <T x={x0 - 6} y={64} anchor="end">dizi</T>
    <T x={x0 - 6} y={126} anchor="end">ters</T>
    {m.terms.map((t, i) => <g key={i}>
      <R x={x0 + i * (w + gap)} y={40} w={w} h={38} tone="primary-soft" />
      <T x={x0 + i * (w + gap) + w / 2} y={65}>{t}</T>
      <R x={x0 + i * (w + gap)} y={102} w={w} h={38} tone="soft" />
      <T x={x0 + i * (w + gap) + w / 2} y={127}>{m.terms[m.n - 1 - i]}</T>
      <R x={x0 + i * (w + gap)} y={160} w={w} h={38} tone="good-soft" />
      <T x={x0 + i * (w + gap) + w / 2} y={185}>{m.pair}</T>
    </g>)}
    <T x={240} y={232}>{`${m.n} sütun × ${m.pair} = ${m.n * m.pair} (iki kez yazıldı)`}</T>
    <T x={240} y={266} size="large">{`Toplam = ${m.sum}`}</T>
  </>;
}

function UcDeger({ model: m }) {
  const unit = 13;
  const max = Math.max(...m.products);
  return <>
    <R x={24} y={40} w={m.x * unit} h={m.y * unit} tone={m.area === max ? 'good-soft' : 'primary-soft'} rx={2} />
    <T x={24 + (m.x * unit) / 2} y={32}>{`x = ${m.x}`}</T>
    <T x={30 + m.x * unit} y={44 + (m.y * unit) / 2} anchor="start">{`y = ${m.y}`}</T>
    <T x={110} y={278}>{`Alan = ${m.area}`}</T>
    <L x1={238} y1={232} x2={470} y2={232} />
    {m.products.map((p, i) => <g key={i}>
      <rect x={244 + i * 20} y={232 - p * 5} width={15} height={p * 5} rx="2" className={`lm-${i + 1 === m.x ? 'warn' : p === max ? 'good-soft' : 'primary-soft'}`} />
      <T x={251 + i * 20} y={250} style={{ fontSize: 11 }}>{i + 1}</T>
    </g>)}
    <T x={354} y={276}>x değerine göre çarpım</T>
  </>;
}

export const diagrams = { 'temel-tekcift': TekCift, 'temel-isaret': Isaret, 'temel-ardisik': Ardisik, 'temel-ucdeger': UcDeger };
