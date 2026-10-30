import { C, L, R, T, times } from './svg.jsx';
import { show } from './yardim.js';

function Kefe({ x0, n, kg, removed, removedKg }) {
  return <>
    <L x1={x0 + 90} y1={62} x2={x0 + 8} y2={140} />
    <L x1={x0 + 90} y1={62} x2={x0 + 172} y2={140} />
    <R x={x0} y={140} w={180} h={8} tone="line" rx={3} />
    {times(n, (i) => <g key={i}>
      <rect x={x0 + 6 + i * 27} y={108} width={24} height={30} rx={4} className={i < removed ? 'lm-soft' : 'lm-primary-soft'} strokeDasharray={i < removed ? '4 3' : undefined} stroke="currentColor" strokeOpacity={i < removed ? 0.5 : 0} />
      <T x={x0 + 18 + i * 27} y={129} style={{ fontSize: 14, opacity: i < removed ? 0.45 : 1 }}>x</T>
    </g>)}
    {kg > 0 && <g>
      <R x={x0 + 8 + n * 27} y={104} w={40} h={34} tone="warn-soft" rx={6} />
      <T x={x0 + 28 + n * 27} y={127} style={{ fontSize: 15 }}>{kg}</T>
      {removedKg > 0 && <T x={x0 + 28 + n * 27} y={98} style={{ fontSize: 12 }}>{`−${removedKg}`}</T>}
    </g>}
  </>;
}

function Terazi({ model: m }) {
  return <>
    <L x1={120} y1={62} x2={360} y2={62} />
    <L x1={240} y1={62} x2={240} y2={176} />
    <R x={200} y={176} w={80} h={8} tone="line" rx={3} />
    <C x={240} y={62} r={5} tone="primary" />
    <Kefe x0={30} n={m.a} kg={m.b} removed={m.common} removedKg={m.commonKg} />
    <Kefe x0={270} n={m.c} kg={m.d} removed={m.common} removedKg={m.commonKg} />
    <T x={240} y={30}>{`${m.a} paket + ${m.b} kilo = ${m.c} paket + ${m.d} kilo`}</T>
    <T x={240} y={212} style={{ fontSize: 14 }}>Kesikli olanlar iki kefeden birlikte atıldı</T>
    <T x={240} y={254} size="large">{m.A === 0 ? (m.all ? 'Her paket ağırlığı dengeyi korur' : 'Denge kurulamaz') : `${m.A > 0 ? `${m.A} paket = ${show(m.B)} kilo` : `${show(-m.B)} kilo = ${-m.A} paket`}`}</T>
  </>;
}

const OX = (x) => 60 + (x + 5) * 36;
const OY = (y) => 255 - (y + 5) * 24;
function Ozel({ model: m }) {
  const lim = m.a === 0 ? 5 : Math.min(5, 5 / Math.abs(m.a));
  return <>
    <L x1={OX(-5)} y1={OY(0)} x2={OX(5)} y2={OY(0)} tone="grid-line" />
    <L x1={OX(0)} y1={OY(-5)} x2={OX(0)} y2={OY(5)} tone="grid-line" />
    {times(11, (i) => <T key={i} x={OX(i - 5)} y={OY(0) + 16} style={{ fontSize: 11 }}>{i - 5 === 0 ? '' : i - 5}</T>)}
    <L x1={OX(-5)} y1={OY(m.b)} x2={OX(5)} y2={OY(m.b)} tone="accent-line" strokeWidth={m.sol === 'sonsuz' ? 7 : 3} strokeOpacity={m.sol === 'sonsuz' ? 0.35 : 1} />
    <L x1={OX(-lim)} y1={OY(-lim * m.a)} x2={OX(lim)} y2={OY(lim * m.a)} tone="line" strokeWidth={3} />
    <T x={OX(4.6)} y={OY(m.b) - 8} anchor="end" style={{ fontSize: 13 }}>{`y = ${show(m.b)}`}</T>
    <T x={OX(-lim) + 6} y={OY(-lim * m.a) + (m.a > 0 ? -6 : 16)} anchor="start" style={{ fontSize: 13 }}>{m.a === 0 ? 'y = 0' : `y = ${m.a === 1 ? '' : m.a === -1 ? '−' : show(m.a)}x`}</T>
    {m.sol === 'tek' && <><L x1={OX(m.root)} y1={OY(m.b)} x2={OX(m.root)} y2={OY(0)} tone="accent-line" strokeDasharray="4 3" /><C x={OX(m.root)} y={OY(m.b)} r={7} tone="good" /></>}
    <T x={240} y={284} style={{ fontSize: 14 }}>{m.sol === 'tek' ? `Tek kesim: x = ${m.rootText}` : m.sol === 'yok' ? 'Paralel: hiç kesişmez' : 'Çakışık: her x çözüm'}</T>
  </>;
}

const SX = (x) => 40 + (x + 4) * 25;
const SY = (y) => 270 - (y + 4) * 16.25;
/** y = f(x) = p·x + r doğrusunun [−4, 12] × [−4, 12] penceresindeki parçası. */
function clip(p, r) {
  let lo = -4, hi = 12;
  if (p !== 0) {
    const a = (-4 - r) / p, b = (12 - r) / p;
    lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b));
  } else if (r < -4 || r > 12) return null;
  return lo <= hi ? [lo, p * lo + r, hi, p * hi + r] : null;
}
function Sistem({ model: m }) {
  const l1 = clip(-1, m.s), l2 = clip(m.k, -m.c);
  const inside = m.x != null && m.x >= -4 && m.x <= 12 && m.y >= -4 && m.y <= 12;
  return <>
    {times(5, (i) => <g key={i}><L x1={SX(-4 + i * 4)} y1={SY(-4)} x2={SX(-4 + i * 4)} y2={SY(12)} tone="grid-line" /><L x1={SX(-4)} y1={SY(-4 + i * 4)} x2={SX(12)} y2={SY(-4 + i * 4)} tone="grid-line" /></g>)}
    <L x1={SX(0)} y1={SY(-4)} x2={SX(0)} y2={SY(12)} tone="line" />
    <L x1={SX(-4)} y1={SY(0)} x2={SX(12)} y2={SY(0)} tone="line" />
    {[-4, 4, 8, 12].map((t) => <T key={t} x={SX(t)} y={SY(0) + 15} style={{ fontSize: 11 }}>{show(t)}</T>)}
    {l1 && <L x1={SX(l1[0])} y1={SY(l1[1])} x2={SX(l1[2])} y2={SY(l1[3])} tone="accent-line" strokeWidth={3} />}
    {l2 && <L x1={SX(l2[0])} y1={SY(l2[1])} x2={SX(l2[2])} y2={SY(l2[3])} tone="line" strokeWidth={m.same ? 8 : 3} strokeOpacity={m.same ? 0.35 : 1} />}
    {inside && <C x={SX(m.x)} y={SY(m.y)} r={7} tone="good" />}
    <T x={SX(12) - 4} y={22} anchor="end" style={{ fontSize: 13 }}>{`x + y = ${m.s}`}</T>
    <T x={240} y={286} style={{ fontSize: 14 }}>{m.x == null ? (m.same ? 'Çakışık: sonsuz çözüm' : 'Paralel: çözüm yok') : inside ? `Kesim: (${show(m.x)}, ${show(m.y)})` : `Kesim (${show(m.x)}, ${show(m.y)}) pencerenin dışında`}</T>
  </>;
}

function Jeton({ model: m }) {
  const s = m.s;
  const max = s.N * s.q;
  const bx = (v) => 40 + (v / max) * 400;
  return <>
    {times(s.N, (i) => {
      const big = i < m.g;
      return <g key={i}>
        <C x={60 + (i % 10) * 40} y={42 + Math.floor(i / 10) * 44} r={16} tone={big ? 'primary' : 'good-soft'} />
        <T x={60 + (i % 10) * 40} y={47 + Math.floor(i / 10) * 44} style={{ fontSize: 13 }} className={big ? 'lm-inverse' : ''}>{big ? s.q : s.p}</T>
      </g>;
    })}
    <T x={240} y={140} style={{ fontSize: 14 }}>{`${m.g} ${s.big} (${s.q}) + ${s.N - m.g} ${s.small} (${s.p})`}</T>
    <R x={40} y={156} w={400} h={30} tone="soft" rx={4} />
    <R x={40} y={156} w={bx(m.total) - 40} h={30} tone="good" rx={4} fillOpacity={0.55} />
    <L x1={bx(s.T)} y1={148} x2={bx(s.T)} y2={194} tone="accent-line" strokeWidth={3} />
    <T x={bx(s.T)} y={212} style={{ fontSize: 13 }}>{`hedef ${s.T}`}</T>
    <T x={240} y={244} style={{ fontSize: 14 }}>{`toplam ${m.total} ${s.unit}; her değişiklik ${m.step}`}</T>
    <T x={240} y={276} size="large">{m.diff === 0 ? `Cevap: ${m.g} ${s.big}` : `Fark ${Math.abs(m.diff)} = ${m.step} × ${Math.abs(m.diff) / m.step}`}</T>
  </>;
}

export const diagrams = { 'denklem-terazi': Terazi, 'denklem-ozel': Ozel, 'denklem-sistem': Sistem, 'denklem-jeton': Jeton };
