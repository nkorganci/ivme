import { C, L, R, T, times } from './svg.jsx';
import { sup } from './yardim.js';

const W = 190;

function Dilimler({ x, y, l, wholes = 1, fill }) {
  const w = W / l;
  return times(l * wholes, (i) => <rect key={i} x={x + i * w} y={y} width={w} height={36} className={`lm-${fill(i)}`} stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />);
}

function OrtakPayda({ model: m }) {
  const wholes = m.R > m.l ? 2 : 1;
  const resultFill = (i) => {
    if (m.op) return i < m.R ? 'primary' : i < m.first ? 'warn-soft' : 'soft';
    return i < m.A ? 'primary' : i < m.A + m.Cn ? 'good' : 'soft';
  };
  return <>
    <T x={36} y={44} style={{ fontSize: 17 }}>{`${m.a}/${m.b}`}</T>
    <Dilimler x={70} y={20} l={m.l} fill={(i) => (i < m.A ? 'primary' : 'soft')} />
    <T x={W + 110} y={44} anchor="start" style={{ fontSize: 17 }}>{`= ${m.A}/${m.l}`}</T>
    <T x={36} y={114} style={{ fontSize: 17 }}>{`${m.c}/${m.d}`}</T>
    <Dilimler x={70} y={90} l={m.l} fill={(i) => (i < m.Cn ? 'good' : 'soft')} />
    <T x={W + 110} y={114} anchor="start" style={{ fontSize: 17 }}>{`= ${m.Cn}/${m.l}`}</T>
    <T x={36} y={184} style={{ fontSize: 15 }}>{m.op ? 'fark' : 'toplam'}</T>
    <Dilimler x={70} y={160} l={m.l} wholes={wholes} fill={resultFill} />
    {wholes === 2 && <L x1={70 + W} y1={152} x2={70 + W} y2={204} tone="accent-line" />}
    <T x={240} y={244}>{`Bütün ${m.l} eş dilime ayrıldı (EKOK)`}</T>
    <T x={240} y={274} size="large">{`${m.R}/${m.l}${m.op ? ' kaldı' : ' dilim'}`}</T>
  </>;
}

function Bolme({ model: m }) {
  const max = Math.max(1, Math.ceil(m.a / m.b));
  const sx = (v) => 40 + (v / max) * 400;
  const piece = m.c / m.d;
  const full = m.whole;
  return <>
    <T x={sx(m.a / m.b / 2)} y={64}>{`bölünen ${m.b === 1 ? m.a : `${m.a}/${m.b}`}`}</T>
    <R x={sx(0)} y={74} w={sx(m.a / m.b) - sx(0)} h={28} tone="primary-soft" rx={4} />
    <L x1={sx(0)} y1={130} x2={sx(max)} y2={130} />
    {times(max + 1, (i) => <g key={i}><L x1={sx(i)} y1={122} x2={sx(i)} y2={138} /><T x={sx(i)} y={156} style={{ fontSize: 13 }}>{i}</T></g>)}
    {times(full, (i) => <g key={`p${i}`}>
      <R x={sx(i * piece) + 1} y={170} w={sx(piece) - sx(0) - 2} h={30} tone={i % 2 ? 'good-soft' : 'primary-soft'} rx={3} />
      {sx(piece) - sx(0) >= 16 && <T x={sx((i + 0.5) * piece)} y={191} style={{ fontSize: 12 }}>{i + 1}</T>}
    </g>)}
    {m.rest > 0 && <>
      <rect x={sx(full * piece) + 1} y={170} width={sx(piece) - sx(0) - 2} height={30} rx={3} className="lm-soft" strokeDasharray="4 3" stroke="currentColor" strokeOpacity="0.6" />
      <R x={sx(full * piece) + 1} y={170} w={(sx(piece) - sx(0) - 2) * (m.rest / m.den)} h={30} tone="warn-soft" rx={3} />
    </>}
    <T x={240} y={232} style={{ fontSize: 14 }}>{`Her parça ${m.c}/${m.d}`}</T>
    <T x={240} y={268} size="large">{m.rest ? `${full} tam parça + ${m.restText} parça` : `${full} parça sığdı`}</T>
  </>;
}

const EXPS = [4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6];
function Virgul({ model: m }) {
  const cx = (i) => 22 + i * 40;
  const row = (cells, y) => EXPS.map((p, i) => <g key={`${y}-${p}`}>
    <R x={cx(i)} y={y} w={36} h={40} tone={cells[p] != null ? 'primary-soft' : 'soft'} rx={4} />
    {cells[p] != null && <T x={cx(i) + 18} y={y + 27} size="large">{cells[p]}</T>}
  </g>);
  const comma = cx(5) - 2;
  return <>
    {EXPS.map((p, i) => <T key={p} x={cx(i) + 18} y={22} style={{ fontSize: 14 }}>{`10${sup(p)}`}</T>)}
    <T x={240} y={48} style={{ fontSize: 15 }}>{`önce: ${m.from}`}</T>
    {row(m.before, 58)}
    <T x={240} y={128} style={{ fontSize: 14 }}>{m.k === 0 ? '× 1' : `× 10${sup(m.k)}  (${Math.abs(m.k)} basamak ${m.k > 0 ? 'büyür' : 'küçülür'})`}</T>
    <T x={240} y={156} style={{ fontSize: 15 }}>{`sonra: ${m.to}`}</T>
    {row(m.after, 166)}
    <L x1={comma} y1={56} x2={comma} y2={100} tone="accent-line" /><L x1={comma} y1={164} x2={comma} y2={208} tone="accent-line" />
    <T x={comma} y={230} style={{ fontSize: 14 }}>virgül</T>
    <T x={240} y={272} size="large">{`${m.from} → ${m.to}`}</T>
  </>;
}

function Devirli({ model: m }) {
  const steps = m.remainders.slice(0, 8);
  const x = (i) => 70 + i * 50;
  const rep = (i) => !m.finite && i >= m.start;
  return <>
    <T x={240} y={28} size="large">{`${m.p}/${m.q} = ${m.text}`}</T>
    <T x={8} y={86} anchor="start" style={{ fontSize: 14 }}>kalan</T>
    <T x={4} y={176} anchor="start" style={{ fontSize: 13 }}>basamak</T>
    {steps.map((r, i) => <g key={i}>
      <R x={x(i)} y={62} w={40} h={36} tone={!m.finite && r === m.repeatAt ? 'warn-soft' : 'soft'} rx={6} />
      <T x={x(i) + 20} y={86}>{r}</T>
      <L x1={x(i) + 20} y1={100} x2={x(i) + 20} y2={150} tone="line" />
      <T x={x(i) + 20} y={130} style={{ fontSize: 12 }}>{`${r * 10}:${m.q}`}</T>
      <R x={x(i)} y={152} w={40} h={36} tone={rep(i) ? 'good-soft' : 'primary-soft'} rx={6} />
      <T x={x(i) + 20} y={176} size="large">{m.digits[i]}</T>
    </g>)}
    {!m.finite && <>
      <L x1={x(m.start) + 4} y1={146} x2={x(steps.length - 1) + 36} y2={146} tone="accent-line" />
      <path d={`M ${x(steps.length - 1) + 20} 60 C ${x(steps.length - 1) + 20} 38, ${x(m.start) + 20} 38, ${x(m.start) + 20} 60`} className="lm-accent-line" fill="none" />
    </>}
    {m.finite && steps.length > 0 && <><R x={x(steps.length)} y={62} w={40} h={36} tone="good-soft" rx={6} /><T x={x(steps.length) + 20} y={86}>0</T></>}
    <T x={240} y={232} style={{ fontSize: 14 }}>{m.finite ? (steps.length ? 'Kalan 0 oldu: bölme bitti' : 'Tam bölündü') : `Kalan ${m.repeatAt} yeniden geldi: döngü`}</T>
    <T x={240} y={266} style={{ fontSize: 14 }}>{`Payda ${m.q}: en çok ${Math.max(m.q - 1, 0)} farklı kalan olabilir`}</T>
  </>;
}

function SayiDogrusu({ model: m }) {
  const sx = (v) => 40 + (v / m.max) * 400;
  const fine = m.max <= 2;
  return <>
    <T x={240} y={30} size="large">{`${m.a}/${m.b} ${m.cmp} ${m.c}/${m.d}`}</T>
    <T x={240} y={56} style={{ fontSize: 13 }}>{`çapraz: ${m.left} ${m.cmp} ${m.right}`}</T>
    <L x1={sx(0)} y1={150} x2={sx(m.max)} y2={150} />
    {fine && times(m.b * m.max + 1, (i) => <L key={`b${i}`} x1={sx(i / m.b)} y1={142} x2={sx(i / m.b)} y2={150} tone="line" />)}
    {fine && times(m.d * m.max + 1, (i) => <L key={`d${i}`} x1={sx(i / m.d)} y1={150} x2={sx(i / m.d)} y2={158} tone="line" />)}
    {times(m.max + 1, (i) => <g key={i}><L x1={sx(i)} y1={136} x2={sx(i)} y2={164} /><T x={sx(i)} y={182} style={{ fontSize: 13 }}>{i}</T></g>)}
    <L x1={sx(m.x)} y1={104} x2={sx(m.x)} y2={150} tone="accent-line" />
    <C x={sx(m.x)} y={150} r={7} tone="primary" />
    <T x={sx(m.x)} y={96}>{`${m.a}/${m.b}`}</T>
    <L x1={sx(m.y)} y1={190} x2={sx(m.y)} y2={206} tone="accent-line" />
    <C x={sx(m.y)} y={150} r={7} tone="good" />
    <T x={sx(m.y)} y={224}>{`${m.c}/${m.d}`}</T>
    <C x={sx(m.mid)} y={150} r={4} tone="warn" />
    <T x={240} y={270} style={{ fontSize: 14 }}>{`turuncu: ara kesir ${m.mp}/${m.mq}`}</T>
  </>;
}

export const diagrams = { 'rasyonel-ortakpayda': OrtakPayda, 'rasyonel-bolme': Bolme, 'rasyonel-virgul': Virgul, 'rasyonel-devirli': Devirli, 'rasyonel-sayidogrusu': SayiDogrusu };
