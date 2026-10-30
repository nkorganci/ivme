import { useId, useState } from 'react';
import { EXPLORATIONS } from '../content/explorations.js';
import { MathText, Markdown } from '../math.jsx';
import { MODEL_CONTROLS, calculateModel, fmt, initialValues } from './models.js';
import './learning-experience.css';
import FigureZoom from './FigureZoom.jsx';

const letters = 'ABCDE';
const times = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
const text = (x, y, value, props = {}) => <text x={x} y={y} textAnchor="middle" {...props}>{value}</text>;
const rect = (x, y, w, h, tone = 'primary', props = {}) => <rect x={x} y={y} width={w} height={h} rx="6" className={`lm-${tone}`} {...props} />;

/** Her çizim aynı veriden üretilen metin açıklamasıyla birlikte sunulur. */
function Diagram({ model: m, title }) {
  const id = useId().replaceAll(':', '');
  let drawing;
  switch (m.kind) {
    case 'nested': drawing = <>
      {rect(14, 16, 452, 226, 'soft')}{text(240, 41, 'Gerçek sayılar ℝ')}
      {rect(28, 53, 294, 176, m.tier <= 2 ? 'primary-soft' : 'empty')}{text(175, 77, 'Rasyonel ℚ')}
      {rect(42, 91, 218, 125, m.tier <= 1 ? 'good-soft' : 'empty')}{text(151, 115, 'Tam ℤ')}
      {rect(57, 129, 140, 72, m.tier === 0 ? 'primary' : 'empty')}{text(127, 154, 'Doğal ℕ', { className: m.tier === 0 ? 'lm-inverse' : '' })}
      {m.tier === 0 && text(127, 183, m.name, { className: 'lm-inverse lm-large' })}
      {m.tier === 1 && text(224, 169, m.name, { className: 'lm-large' })}
      {m.tier === 2 && text(290, 143, m.name, { className: 'lm-large' })}
      {text(392, 103, 'İrrasyonel')}{text(392, 130, 'Kesre çevrilemez')}
      {m.tier === 3 && <>{rect(345, 153, 94, 56, 'primary')}{text(392, 187, m.name, { className: 'lm-inverse lm-large' })}</>}
    </>; break;
    case 'place': drawing = <>{[m.a, m.b, m.c].map((n, i) => <g key={i}>
      {rect(20 + 153 * i, 25, 135, 208, 'soft')}{text(87 + 153 * i, 52, ['Yüzler', 'Onlar', 'Birler'][i])}
      <line x1={87 + 153 * i} x2={87 + 153 * i} y1="70" y2="182" className="lm-line" />
      {times(n, (j) => <rect key={j} x={62 + 153 * i} y={173 - 11 * j} width="50" height="8" rx="4" className="lm-primary" />)}
      {text(87 + 153 * i, 216, `${n} × ${[100, 10, 1][i]}`, { className: 'lm-large' })}
    </g>)}</>; break;
    case 'division': drawing = <>
      {times(m.q + (m.r ? 1 : 0), (i) => <g key={i}>
        {rect(12 + i % 5 * 93, 24 + Math.floor(i / 5) * 74, 85, 62, i < m.q ? 'primary-soft' : 'warn-soft')}
        {times(i < m.q ? m.d : m.r, (j) => <rect key={j} x={22 + i % 5 * 93 + j % 3 * 23} y={34 + Math.floor(i / 5) * 74 + Math.floor(j / 3) * 20} width="15" height="15" rx="2" className={i < m.q ? 'lm-primary' : 'lm-warn'} />)}
      </g>)}
      {text(240, 255, `${m.q} dolu kutu · ${m.r} artan`)}</>; break;
    case 'rulers': drawing = <>{[12, 18].map((n, i) => <g key={n}>
      {text(240, 38 + i * 115, `${n} cm şerit · ${n % m.d} cm artar`)}
      {times(n, (j) => <g key={j}>{rect(24 + j * 24, 55 + i * 115, 22, 44, j >= n - n % m.d ? 'warn-soft' : Math.floor(j / m.d) % 2 ? 'good-soft' : 'primary-soft', { rx: 1 })}</g>)}
      {times(Math.floor(n / m.d) + 1, (j) => <line key={j} x1={24 + j * m.d * 24} x2={24 + j * m.d * 24} y1={50 + i * 115} y2={103 + i * 115} className="lm-line" />)}
    </g>)}</>; break;
    case 'fractions': drawing = <>{[[1, 2, 'Yarım'], [1, 3, 'Üçte bir'], [5, 6, 'Toplam']].map(([a, b, label], i) => {
      const d = m.d === 2 ? b : m.d;
      return <g key={label}>{text(240, 25 + i * 85, `${label}: ${m.d === 2 ? a : a * d / b}/${d}`)}
        {times(d, (j) => <g key={j}>{rect(24 + 432 * j / d, 38 + 85 * i, 432 / d - 2, 40, j < a * d / b ? (i === 1 ? 'good' : 'primary') : 'empty', { rx: 2 })}</g>)}
      </g>;
    })}</>; break;
    case 'power': drawing = <>
      {text(240, 35, `${m.n} kez ikiye katlama`)}
      {times(m.result, (i) => <circle key={i} cx={40 + i % 8 * 57} cy={75 + Math.floor(i / 8) * 43} r="12" className="lm-primary" />)}
      {text(240, 260, `${m.result} birim`)}</>; break;
    case 'square': drawing = <>
      {times(m.a * m.a, (i) => <g key={i}>{rect(140 + (i % m.a) * 25, 30 + Math.floor(i / m.a) * 25, 23, 23, 'primary-soft', { rx: 1 })}</g>)}
      {text(140 + m.a * 12.5, 55 + m.a * 25, `${m.a} birim kenar`)}
      {text(66, 120, `${m.a ** 2}` , { className: 'lm-large' })}{text(66, 147, 'birim² alan')}</>; break;
    case 'balance': drawing = <>
      <path d="M240 110 L220 235 L260 235 Z" className="lm-soft" />
      <path d="M65 114 H415 M90 114 V170 M390 114 V170 M30 170 Q90 205 150 170 M330 170 Q390 205 450 170" className="lm-line" fill="none" strokeWidth="4" />
      {times(m.s < 2 ? 2 : 1, (i) => <g key={i}>{rect(40 + i * 53, 49, 44, 45, 'primary')}{text(62 + i * 53, 79, 'x', { className: 'lm-inverse lm-large' })}</g>)}
      {m.s === 0 && <>{text(175, 78, '+3', { className: 'lm-large' })}</>}
      {rect(344, 49, 92, 45, 'good-soft')}{text(390, 79, [11, 8, 4][m.s], { className: 'lm-large' })}
      {text(240, 264, ['İki taraf eşit', 'İki taraftan da 3 çıkar', 'İki tarafı da 2’ye böl'][m.s])}</>; break;
    case 'line': {
      const x = (n) => 30 + (n - m.min) / (m.max - m.min) * 420;
      drawing = <>
        <line x1="25" x2="455" y1="150" y2="150" className="lm-line" />
        {times(m.max - m.min + 1, (i) => <g key={i}><line x1={x(i + m.min)} x2={x(i + m.min)} y1="144" y2="156" className="lm-line" />{text(x(i + m.min), 181, i + m.min)}</g>)}
        <line x1={x(m.a)} x2={x(m.b)} y1="120" y2="120" className="lm-accent-line" strokeWidth="7" />
        {[m.a, m.b].map((n, i) => <g key={i}><circle cx={x(n)} cy="150" r={i ? 8 : 11} className={i ? 'lm-good' : 'lm-primary'} />
          {text(Math.max(48, Math.min(432, x(n))), i ? 221 : 76, m.labels[i])}</g>)}
        {m.distance !== undefined && text(240, 35, `${m.distance} birim uzaklık`, { className: 'lm-large' })}
      </>; break;
    }
    case 'bars': drawing = <>{m.values.map((n, i) => <g key={i}>
      {text(24, 46 + i * 110, `${m.labels[i]}: ${n}`, { textAnchor: 'start' })}
      {rect(24, 64 + i * 110, 432, 44, 'empty')}{rect(24, 64 + i * 110, 432 * n / m.max, 44, i ? 'good' : 'primary')}
      {times(n - 1, (j) => <line key={j} x1={24 + (j + 1) * 432 / m.max} x2={24 + (j + 1) * 432 / m.max} y1={64 + i * 110} y2={108 + i * 110} className="lm-unit-line" />)}
    </g>)}</>; break;
    case 'machine': drawing = <>{m.values.map((n, i) => <g key={i}>
      {text(80 + i * 160, 66, ['Girdi', 'Ara sonuç', 'Çıktı'][i])}
      {rect(32 + i * 160, 92, 96, 77, i === 2 ? 'good-soft' : 'primary-soft')}{text(80 + i * 160, 141, n, { className: 'lm-large' })}
      {i < 2 && <>{text(160 + i * 160, 119, m.operations[i], { className: 'lm-large' })}{text(160 + i * 160, 151, '→')}</>}
    </g>)}</>; break;
    case 'hundred': drawing = <>
      {times(100, (i) => <g key={i}>{rect(130 + (i % 10) * 23, 16 + Math.floor(i / 10) * 23, 20, 20, i < m.p ? 'primary' : 'empty', { rx: 3 })}</g>)}
      {text(62, 110, `%${m.p}`, { className: 'lm-large' })}{text(62, 140, 'tuz payı')}
    </>; break;
    case 'price': drawing = <>
      {text(240, 49, 'Satış = maliyet + kâr')}{rect(30, 82, 280, 70, 'primary')}
      {m.profit > 0 && rect(310, 82, m.profit * 3.5, 70, 'good')}
      {text(170, 123, '80 TL maliyet', { className: 'lm-inverse' })}
      {text(310 + m.profit * 1.75, 190, `${fmt(m.profit)} TL kâr`)}
      <line x1="30" x2={310 + m.profit * 3.5} y1="220" y2="220" className="lm-line" />
      {text(240, 253, `Toplam ${fmt(80 + m.profit)} TL`)}
    </>; break;
    case 'motion': drawing = <>
      {text(95, 35, 'A · 60 km/sa →')}{text(385, 35, '← 40 km/sa · B')}
      <line x1="30" x2="450" y1="130" y2="130" className="lm-line" strokeWidth="4" />
      {times(7, (i) => <g key={i}><line x1={30 + i * 70} x2={30 + i * 70} y1="124" y2="136" className="lm-line" />{text(30 + i * 70, 166, `${i * 50}`)}</g>)}
      {rect(15 + m.a * 1.4, 82, 30, 24, 'primary')}{text(30 + m.a * 1.4, 72, 'A')}
      {rect(15 + m.b * 1.4, 186, 30, 24, 'good')}{text(30 + m.b * 1.4, 236, 'B')}
      {text(240, 270, `Kalan ara: ${fmt(m.gap)} km`)}
    </>; break;
    case 'graph': {
      const x = (n) => 45 + (n - m.minX) / (m.maxX - m.minX) * 390;
      const y = (n) => 235 - (n - m.minY) / (m.maxY - m.minY) * 195;
      const value = m.slope * m.x + m.intercept;
      drawing = <>
        {times(5, (i) => <line key={i} x1="45" x2="435" y1={40 + i * 48.75} y2={40 + i * 48.75} className="lm-grid-line" />)}
        <path d={`M45 ${y(0)} H445 M${x(0)} 25 V240`} className="lm-line" fill="none" />
        <path d={`M${x(m.minX)} ${y(m.slope * m.minX + m.intercept)} L${x(m.maxX)} ${y(m.slope * m.maxX + m.intercept)}`} className="lm-accent-line" strokeWidth="4" fill="none" />
        <path d={`M${x(m.x)} ${y(0)} V${y(value)} H${x(0)}`} className="lm-line" strokeDasharray="5 5" fill="none" />
        <circle cx={x(m.x)} cy={y(value)} r="7" className="lm-good" />
        {text(Math.min(415, Math.max(75, x(m.x))), Math.max(24, y(value) - 16), `(${m.x}, ${value})`)}
        {text(240, 275, m.xLabel)}{text(70, 18, m.yLabel)}
        {times(5, (i) => <g key={i}>{text(x(m.minX + (m.maxX - m.minX) * i / 4), 258, fmt(m.minX + (m.maxX - m.minX) * i / 4))}</g>)}
        {times(5, (i) => <g key={i}>{text(23, y(m.minY + (m.maxY - m.minY) * i / 4) + 5, fmt(m.minY + (m.maxY - m.minY) * i / 4))}</g>)}
      </>; break;
    }
    case 'subsets': drawing = <>{m.subsets.map((s, i) => <g key={s}>
      {rect(10 + (i % 4) * 118, 18 + Math.floor(i / 4) * 60, 110, 48, s ? 'primary-soft' : 'empty')}
      {text(65 + (i % 4) * 118, 49 + Math.floor(i / 4) * 60, s ? `{${s}}` : '∅')}
    </g>)}</>; break;
    case 'venn': drawing = <>
      <defs><clipPath id={`${id}-a`}><circle cx="185" cy="133" r="100" /></clipPath></defs>
      <circle cx="185" cy="133" r="100" className={m.regions[0] ? 'lm-primary-soft' : 'lm-empty'} />
      <circle cx="295" cy="133" r="100" className={m.regions[2] ? 'lm-primary-soft' : 'lm-empty'} />
      <circle cx="295" cy="133" r="100" clipPath={`url(#${id}-a)`} className={m.regions[1] ? 'lm-good' : 'lm-empty'} />
      {text(132, 28, 'A · müzik')}{text(348, 28, 'B · spor')}
      {text(146, 127, '8', { className: 'lm-large' })}{text(240, 127, '4', { className: m.regions[1] ? 'lm-inverse lm-large' : 'lm-large' })}{text(335, 127, '6', { className: 'lm-large' })}
      {text(146, 155, 'yalnız A')}{text(240, 155, 'ortak', { className: m.regions[1] ? 'lm-inverse' : '' })}{text(335, 155, 'yalnız B')}
    </>; break;
    case 'polynomial': drawing = <>
      {rect(28, 35, 35 * m.x, 35 * m.x, 'primary-soft')}{text(28 + 17.5 * m.x, 25, `x = ${m.x}`)}
      {text(28 + 17.5 * m.x, 55 + 17.5 * m.x, 'x²')}
      {rect(240, 35, 28, 35 * m.x, 'good-soft')}{text(254, 25, 'x')}
      {rect(360, 35, 28, 28, 'warn-soft')}{text(374, 92, '1')}
      {text(240, 260, `${m.x ** 2} + ${m.x} + 1 birim²`)}
    </>; break;
    case 'area': {
      const unit = 210 / (m.a + m.b), a = m.a * unit, b = m.b * unit, start = 135;
      drawing = <>
        {rect(start, 35, a, a, 'primary-soft', { rx: 0 })}{rect(start + a, 35, b, a, 'good-soft', { rx: 0 })}
        {rect(start, 35 + a, a, b, 'good-soft', { rx: 0 })}{rect(start + a, 35 + a, b, b, 'warn-soft', { rx: 0 })}
        {text(start + a / 2, 20, `a=${m.a}`)}{text(start + a + b / 2, 20, `b=${m.b}`)}
        {text(start + a / 2, 40 + a / 2, 'a²')}{text(start + a + b / 2, 40 + a / 2, 'ab')}
        {text(start + a / 2, 40 + a + b / 2, 'ab')}{text(start + a + b / 2, 40 + a + b / 2, 'b²')}
      </>; break;
    }
    case 'choices': drawing = <>{times(m.rows, (i) => <g key={i}>{text(35, 50 + i * 47, `T${i + 1}`)}
      {times(m.cols, (j) => <g key={j}>{rect(70 + j * 100, 20 + i * 47, 88, 39, 'primary-soft')}{text(114 + j * 100, 45 + i * 47, `T${i + 1} · P${j + 1}`)}</g>)}
    </g>)}</>; break;
    case 'pairs': drawing = <>{times(m.n, (i) => <g key={i}>
      {times(m.n, (j) => <g key={j}>{rect(82 + j * 62, 15 + i * 51, 55, 44, j > i ? 'primary-soft' : 'empty')}
        {text(109 + j * 62, 44 + i * 51, i === j ? '×' : `${letters[i]}${letters[j]}`, { opacity: j < i ? 0.45 : 1 })}</g>)}
    </g>)}</>; break;
    case 'binomial': drawing = <>{m.paths.map((path, i) => <g key={path}>
      {rect(12 + i % 4 * 118, 18 + Math.floor(i / 4) * 60, 106, 48, [...path].filter((c) => c === 'B').length === 1 ? 'good-soft' : 'empty')}
      {text(65 + i % 4 * 118, 49 + Math.floor(i / 4) * 60, path)}
    </g>)}</>; break;
    case 'dice': drawing = <>{times(6, (i) => {
      const n = i + 1, available = m.available.includes(n), desired = m.desired.includes(n);
      return <g key={n} opacity={available ? 1 : 0.35}>
        {rect(34 + i % 3 * 151, 24 + Math.floor(i / 3) * 128, 110, 98, desired ? 'good-soft' : 'empty')}
        {text(89 + i % 3 * 151, 66 + Math.floor(i / 3) * 128, n, { className: 'lm-large' })}
        {text(89 + i % 3 * 151, 97 + Math.floor(i / 3) * 128, !available ? 'dışarıda' : desired ? '✓ istenen' : 'mümkün')}
      </g>;
    })}</>; break;
    case 'logic': drawing = <>
      {[m.p, m.q].map((n, i) => <g key={i}>{rect(25 + i * 250, 28, 180, 66, n ? 'good-soft' : 'warn-soft')}
        {text(115 + i * 250, 69, `${i ? 'q' : 'p'}: ${n ? '✓ Doğru' : '× Yanlış'}`)}</g>)}
      {m.results.map((n, i) => <g key={i}>{rect(m.conditional ? 120 : 25 + i * 250, 157, m.conditional ? 240 : 180, 80, n ? 'good-soft' : 'warn-soft')}
        {text(m.conditional ? 240 : 115 + i * 250, 190, m.conditional ? 'p ⇒ q' : i ? 'p VEYA q' : 'p VE q')}
        {text(m.conditional ? 240 : 115 + i * 250, 219, n ? '✓ Doğru' : '× Yanlış')}
      </g>)}
      <path d="M115 98 L240 136 L365 98" className="lm-line" fill="none" />
    </>; break;
    case 'mean': drawing = <>
      {m.values.map((n, i) => <g key={i}>{rect(70 + i * 100, 235 - n * 6, 55, n * 6, i === 3 ? 'good' : 'primary')}
        {text(97 + i * 100, 223 - n * 6, n)}{text(97 + i * 100, 260, `${i + 1}. kişi`)}</g>)}
      <line x1="30" x2="455" y1={235 - m.mean * 6} y2={235 - m.mean * 6} className="lm-mean-line" strokeDasharray="6 4" strokeWidth="3" />
      {text(240, 27, `Kesikli çizgi: ortalama ${fmt(m.mean)}`)}
    </>; break;
    case 'pie': drawing = <>
      <circle cx="240" cy="139" r="102" className="lm-soft" />
      {m.p === 100 ? <circle cx="240" cy="139" r="102" className="lm-primary" /> : m.p > 0 && <path d={`M240 139 L240 37 A102 102 0 ${m.p > 50 ? 1 : 0} 1 ${240 + 102 * Math.sin(m.p * Math.PI / 50)} ${139 - 102 * Math.cos(m.p * Math.PI / 50)} Z`} className="lm-primary" />}
      <circle cx="240" cy="139" r="55" className="lm-empty" />
      {text(240, 135, `%${m.p}`, { className: 'lm-large' })}{text(240, 160, `${fmt(m.angle)}°`)}
      {text(240, 271, `${m.count} / 120 kişi`)}
    </>; break;
    default: drawing = null;
  }
  return <svg className="lm-diagram" viewBox="0 0 480 290" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
    <title id={`${id}-title`}>{title}</title><desc id={`${id}-desc`}>{m.equation}. {m.observation}</desc>{drawing}
  </svg>;
}

export function ConceptModel({ conceptId, title }) {
  const [values, setValues] = useState(() => initialValues(conceptId));
  const model = calculateModel(conceptId, values);
  return <div className="lm-lab">
    <div className="lm-canvas"><Diagram model={model} title={title} /><div className="lm-equation">{model.equation}</div><FigureZoom><Diagram model={model} title={title} /></FigureZoom></div>
    <div className="lm-controls">
      <p className="lm-eyebrow">Değiştir · gözlemle · açıkla</p>
      {MODEL_CONTROLS[conceptId].map((c) => <label className="lm-control" key={c.key}>
        <span>{c.label}{!c.options && <output>{fmt(values[c.key])}</output>}</span>
        {c.options ? <select value={values[c.key]} onChange={(e) => setValues((v) => ({ ...v, [c.key]: Number(e.target.value) }))}>
          {c.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select> : <input type="range" min={c.min} max={c.max} step={c.step} value={values[c.key]}
          onChange={(e) => setValues((v) => ({ ...v, [c.key]: Number(e.target.value) }))} />}
      </label>)}
      <button type="button" className="lr-link lm-reset" onClick={() => setValues(initialValues(conceptId))}>Başlangıca dön</button>
      <div className="lm-observation" role="status" aria-live="polite"><strong>Ne değişti, neden?</strong><p>{model.observation}</p></div>
    </div>
  </div>;
}

export default function Exploration({ conceptId }) {
  const data = EXPLORATIONS[conceptId];
  const [phase, setPhase] = useState(0);
  const [step, setStep] = useState(1);
  const [choice, setChoice] = useState(null);
  const [hint, setHint] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const titleId = useId();
  if (!data) return null;
  const options = conceptId.length % 2 ? [data.transfer[1], data.transfer[2]] : [data.transfer[2], data.transfer[1]];
  const correct = choice === data.transfer[1];
  return <section className="lm-exploration" aria-labelledby={titleId}>
    <header className="lm-heading"><div><p className="lm-eyebrow">Mantığını keşfet</p><h3 id={titleId}>{data.title}</h3></div><span className="lm-badge">Günlük hayattan soruya</span></header>
    <nav className="lm-phases" aria-label="Keşif adımları">
      {['Görerek anla', 'Birlikte çözelim', 'Sen dene · püf noktaları'].map((label, i) => <button key={label} type="button" aria-pressed={phase === i} onClick={() => setPhase(i)}><span>{i + 1}</span>{label}</button>)}
    </nav>
    {phase === 0 && <div className="lm-phase">
      <div className="lm-story"><span className="lm-eyebrow">Bu ne işime yarar?</span><Markdown text={data.story} /></div>
      <details className="lm-terms"><summary>İlk kez görüyorsan: kelimeler ne demek?</summary><dl>{data.terms.map(([term, meaning]) => <div key={term}><dt>{term}</dt><dd>{meaning}</dd></div>)}</dl></details>
      <div className="lm-predict"><strong>Önce tahmin et, sonra dene</strong><p>{data.experiment}</p></div>
      <ConceptModel conceptId={conceptId} title={data.title} />
      <button type="button" className="btn btn-primary" onClick={() => setPhase(1)}>Şimdi bir örneği birlikte çözelim →</button>
    </div>}
    {phase === 1 && <div className="lm-phase">
      <div className="lm-example-problem"><span className="lm-eyebrow">Çözümlü örnek · işlemin gerekçesiyle</span><Markdown text={data.example} /></div>
      <ol className="lm-reasoning">{data.steps.slice(0, step).map(([heading, explanation], i) => <li key={heading}><span className="lm-step-number">{i + 1}</span><div><h4>{heading}</h4><Markdown text={explanation} /></div></li>)}</ol>
      <p className="small muted" role="status">{step}/{data.steps.length} adım açık. Bir sonraki işlemi açmadan önce kendin söylemeyi dene.</p>
      <div className="lr-actions">{step < data.steps.length ? <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)}>Sonraki adım ve nedeni →</button>
        : <button type="button" className="btn btn-primary" onClick={() => setPhase(2)}>Benzer bir soruyu ben deneyeyim →</button>}
        <button type="button" className="btn btn-secondary" onClick={() => setPhase(0)}>Görsele dön</button></div>
    </div>}
    {phase === 2 && <div className="lm-phase">
      <div className="lm-transfer"><p className="lm-eyebrow">Aynı mantık · yeni soru</p><h4><MathText text={data.transfer[0]} /></h4>
        <p className="small muted">Bu kısa deneme puanlanmaz. Sonuç kadar nedenini de düşün.</p>
        <div className="lm-transfer-options" role="group" aria-label="Keşif sorusunun cevabı">{options.map((option) => <button key={option} type="button" disabled={submitted} aria-pressed={choice === option} onClick={() => setChoice(option)}><MathText text={option} /></button>)}</div>
        {!submitted && <div className="lr-actions"><button type="button" className="btn btn-primary" disabled={choice === null} onClick={() => setSubmitted(true)}>Cevabımı kontrol et</button><button type="button" className="lr-link" onClick={() => setHint(true)}>Küçük bir ipucu</button></div>}
        {hint && !submitted && <aside className="lm-tip"><MathText text={data.tip} /></aside>}
        {submitted && <div className={`lr-feedback ${correct ? 'good' : 'bad'}`} role="status"><strong>{correct ? 'Doğru; şimdi gerekçeyi kontrol et.' : 'Bu noktayı birlikte düzeltelim.'}</strong><p><MathText text={data.transfer[3]} /></p>
          {!correct && <button type="button" className="lr-link" onClick={() => { setSubmitted(false); setChoice(null); setPhase(1); }}>Çözümlü örneğe dön ve yeniden dene</button>}</div>}
      </div>
      <aside className="lm-tip"><span className="lm-eyebrow">Örnekten çıkaracağın kısa yol</span><Markdown text={data.tip} /></aside>
      <aside className="lm-trap"><strong>Bu koşulu atlama</strong><Markdown text={data.trap} /></aside>
      <details className="lm-terms"><summary>Bir adım ileri · neden böyle, nerede sınırı var?</summary><Markdown text={data.expert} /></details>
      <p className="lm-next-note">Şimdi aşağıdaki bölümde bu fikri farklı örneklere uygulayacağız. Önce yöntemi kur; akıcılık kazandıkça hızlan.</p>
    </div>}
  </section>;
}
