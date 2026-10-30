import { C, L, R, T, times } from './svg.jsx';
import { show } from './yardim.js';

const NX = (x, lo = -15, hi = 15) => 30 + ((x - lo) / (hi - lo)) * 420;

function Dogru({ y, lo, hi, step = 5 }) {
  return <>
    <L x1={NX(lo, lo, hi)} y1={y} x2={NX(hi, lo, hi)} y2={y} />
    {times(Math.floor((hi - lo) / step) + 1, (i) => {
      const t = lo + i * step;
      return <g key={t}><L x1={NX(t, lo, hi)} y1={y - 5} x2={NX(t, lo, hi)} y2={y + 5} /><T x={NX(t, lo, hi)} y={y + 20} style={{ fontSize: 11 }}>{show(t)}</T></g>;
    })}
  </>;
}

function Ayna({ model: m }) {
  return <>
    <T x={240} y={22} style={{ fontSize: 14 }}>önce</T>
    <Dogru y={60} lo={-15} hi={15} />
    <C x={NX(m.a)} y={60} r={7} tone="primary" /><T x={NX(m.a)} y={44} style={{ fontSize: 13 }}>a</T>
    <C x={NX(m.b)} y={60} r={7} tone="good" /><T x={NX(m.b)} y={44} style={{ fontSize: 13 }}>b</T>
    <L x1={NX(m.a)} y1={68} x2={NX(m.ka)} y2={172} tone="accent-line" strokeDasharray="5 4" />
    <L x1={NX(m.b)} y1={68} x2={NX(m.kb)} y2={172} tone="line" strokeDasharray="5 4" />
    <T x={240} y={124} style={{ fontSize: 14 }}>{`× ${show(m.k)}`}</T>
    <Dogru y={180} lo={-15} hi={15} />
    <C x={NX(m.ka)} y={180} r={7} tone="primary" /><T x={NX(m.ka)} y={222} style={{ fontSize: 13 }}>ka</T>
    <C x={NX(m.kb)} y={180} r={7} tone="good" /><T x={NX(m.kb)} y={240} style={{ fontSize: 13 }}>kb</T>
    <T x={240} y={276} size="large">{`${show(m.a)} ${m.before} ${show(m.b)}  →  ${show(m.ka)} ${m.after} ${show(m.kb)}`}</T>
  </>;
}

const AX = (x) => NX(x, -6, 6);
function Parca({ y, lo, hi, closedLo, closedHi, tone, label }) {
  if (lo >= hi) return <T x={240} y={y + 4} style={{ fontSize: 13 }}>{`${label} boş`}</T>;
  return <>
    <L x1={AX(lo)} y1={y} x2={AX(hi)} y2={y} tone={tone} strokeWidth={6} />
    <C x={AX(lo)} y={y} r={6} tone={closedLo ? 'primary' : 'soft'} stroke="currentColor" strokeWidth={2} />
    <C x={AX(hi)} y={y} r={6} tone={closedHi ? 'primary' : 'soft'} stroke="currentColor" strokeWidth={2} />
    <T x={22} y={y + 5} anchor="start" style={{ fontSize: 14 }}>{label}</T>
  </>;
}
function Aralik({ model: m }) {
  return <>
    <Parca y={40} lo={m.p} hi={m.q} closedLo closedHi={false} tone="accent-line" label="A" />
    <Parca y={80} lo={m.r} hi={m.s} closedLo={false} closedHi tone="line" label="B" />
    <Dogru y={120} lo={-6} hi={6} step={1} />
    {m.both.map((x) => <C key={`b${x}`} x={AX(x)} y={170} r={8} tone="good" />)}
    {m.onlyA.map((x) => <C key={`a${x}`} x={AX(x)} y={200} r={6} tone="warn-soft" />)}
    <T x={AX(-6)} y={175} anchor="start" style={{ fontSize: 12 }}>∩</T>
    <T x={AX(-6)} y={205} anchor="start" style={{ fontSize: 12 }}>A∖B</T>
    <T x={240} y={244} style={{ fontSize: 14 }}>{`A = [${show(m.p)}, ${show(m.q)}),  B = (${show(m.r)}, ${show(m.s)}]`}</T>
    <T x={240} y={276} size="large">{`A ∩ B = ${m.cap}`}</T>
  </>;
}

function Ifade({ model: m }) {
  const lo = Math.min(-16, m.min), hi = Math.max(16, m.max);
  const box = (c, i) => {
    const tone = c.value === m.min ? 'warn-soft' : c.value === m.max ? 'good-soft' : 'soft';
    return <g key={i}>
      <R x={20 + i * 112} y={30} w={104} h={64} tone={tone} rx={8} />
      <T x={72 + i * 112} y={54} style={{ fontSize: 12 }}>{`a = ${show(c.a)}, b = ${show(c.b)}`}</T>
      <T x={72 + i * 112} y={82} size="large">{show(c.value)}</T>
    </g>;
  };
  return <>
    {m.corners.map(box)}
    <L x1={NX(lo, lo, hi)} y1={160} x2={NX(hi, lo, hi)} y2={160} />
    <L x1={NX(m.min, lo, hi)} y1={160} x2={NX(m.max, lo, hi)} y2={160} tone="accent-line" strokeWidth={8} />
    {m.corners.map((c, i) => <C key={i} x={NX(c.value, lo, hi)} y={160} r={5} tone="primary" />)}
    <L x1={NX(0, lo, hi)} y1={150} x2={NX(0, lo, hi)} y2={170} />
    <T x={NX(0, lo, hi)} y={186} style={{ fontSize: 11 }}>0</T>
    <T x={NX(m.min, lo, hi)} y={208} style={{ fontSize: 13 }}>{show(m.min)}</T>
    <T x={NX(m.max, lo, hi)} y={208} style={{ fontSize: 13 }}>{show(m.max)}</T>
    <T x={240} y={244} style={{ fontSize: 13 }}>{`a ∈ [${show(m.A[0])}, ${show(m.A[1])}],  b ∈ [${show(m.B[0])}, ${show(m.B[1])}]`}</T>
    <T x={240} y={276} size="large">{`${show(m.min)} ≤ ${m.name} ≤ ${show(m.max)}`}</T>
  </>;
}

const GX = (x) => 50 + x * 48;
const GY = (y) => 250 - y * 36;
function Bolge({ model: m }) {
  const f = (x) => (m.c - m.a * x) / m.b;
  const xa = Math.max(0, (m.c - m.b * 6.6) / m.a), xb = Math.min(8.6, m.c / m.a);
  const inside = new Set(m.points.map(([x, y]) => `${x},${y}`));
  return <>
    {times(9, (x) => <L key={`v${x}`} x1={GX(x)} y1={GY(0)} x2={GX(x)} y2={GY(6)} tone="grid-line" />)}
    {times(7, (y) => <L key={`h${y}`} x1={GX(0)} y1={GY(y)} x2={GX(8)} y2={GY(y)} tone="grid-line" />)}
    <L x1={GX(0)} y1={GY(0)} x2={GX(8.5)} y2={GY(0)} />
    <L x1={GX(0)} y1={GY(0)} x2={GX(0)} y2={GY(6.5)} />
    {times(9, (x) => <T key={`tx${x}`} x={GX(x)} y={GY(0) + 16} style={{ fontSize: 11 }}>{x}</T>)}
    {times(7, (y) => y > 0 && <T key={`ty${y}`} x={GX(0) - 10} y={GY(y) + 4} style={{ fontSize: 11 }}>{y}</T>)}
    <L x1={GX(xa)} y1={GY(f(xa))} x2={GX(xb)} y2={GY(f(xb))} tone="accent-line" strokeWidth={3} strokeDasharray={m.strict ? '7 5' : undefined} />
    {times(9, (x) => times(7, (y) => (m.zero || (x > 0 && y > 0)) && <C key={`p${x}-${y}`} x={GX(x)} y={GY(y)} r={inside.has(`${x},${y}`) ? 6 : 3} tone={inside.has(`${x},${y}`) ? 'good' : 'soft'} />))}
    <T x={GX(8)} y={22} anchor="end" style={{ fontSize: 14 }}>{`${m.count} nokta`}</T>
  </>;
}

export const diagrams = { 'esitsizlik-ayna': Ayna, 'esitsizlik-aralik': Aralik, 'esitsizlik-ifade': Ifade, 'esitsizlik-bolge': Bolge };
