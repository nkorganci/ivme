import Plot from '../../kit/Plot.jsx';
import { Choice, LabGrid, MathText, Note, Panel, Readouts, Slider, Steps, TextField, Toggle } from '../../kit/controls.jsx';
import { compile, fractionText, parse } from '../../kit/mathExpr.js';
import { dist } from '../../kit/geometry.js';
import { fmt } from '../../kit/num.js';
import { lineFromPoints, normalizeLine, parseLine } from './lineEngine.js';


const term = (coef, name, first) => {
  if (Math.abs(coef) < 1e-12) return '';
  const sign = coef < 0 ? (first ? '−' : ' − ') : first ? '' : ' + ';
  const abs = Math.abs(coef);
  return `${sign}${abs === 1 && name ? '' : fractionText(abs)}${name}`;
};
export function lineText(line) {
  const { a, b, c } = normalizeLine(line);
  const left = `${term(a, 'x', true)}${term(b, 'y', !a)}${term(c, '', !a && !b)}`;
  return `${left || '0'} = 0`;
}
const slopeOf = ({ a, b }) => (Math.abs(b) < 1e-12 ? Infinity : -a / b);

function describe(line) {
  const m = slopeOf(line);
  const n = Math.abs(line.b) < 1e-12 ? null : -line.c / line.b;
  const xInt = Math.abs(line.a) < 1e-12 ? null : -line.c / line.a;
  return { m, n, xInt, angle: m === Infinity ? 90 : ((Math.atan(m) * 180) / Math.PI + 180) % 180 };
}

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const errors = {};
  const lineOf = (mode, eq, P, Q, key) => {
    if (mode === 'points') return lineFromPoints(P, Q);
    try { return parseLine(eq, s.a); } catch (error) { errors[key] = error.message; return null; }
  };
  const L1 = lineOf(s.mode1, s.eq1, s.A, s.B, 1);
  const L2 = s.showL2 ? lineOf(s.mode2, s.eq2, s.C, s.D, 2) : null;
  const usesA = /(^|[^a-z])a([^a-z]|$)/.test(`${s.mode1 === 'equation' ? s.eq1 : ''} ${s.mode2 === 'equation' && s.showL2 ? s.eq2 : ''}`);
  const v = s.view;
  const items = [];
  const d1 = L1 && describe(L1); const d2 = L2 && describe(L2);
  if (L1) items.push({ type: 'line', ...lineToABC(L1), color: 'blue', width: 2.8 });
  if (L2) items.push({ type: 'line', ...lineToABC(L2), color: 'red', width: 2.8 });
  let cross = null;
  if (L1 && L2) {
    const det = L1.a * L2.b - L2.a * L1.b;
    if (Math.abs(det) > 1e-12) cross = [(L1.b * L2.c - L2.b * L1.c) / det, (L2.a * L1.c - L1.a * L2.c) / det];
  }
  if (cross) items.push({ type: 'point', x: cross[0], y: cross[1], color: 'green', r: 5, label: `K(${fractionText(cross[0])}; ${fractionText(cross[1])})` });
  if (L1 && s.showP) {
    const k = (L1.a * s.P[0] + L1.b * s.P[1] + L1.c) / (L1.a ** 2 + L1.b ** 2);
    const F = [s.P[0] - L1.a * k, s.P[1] - L1.b * k];
    items.push({ type: 'segment', from: s.P, to: F, color: 'warn', dashed: true, width: 2 }, { type: 'point', x: F[0], y: F[1], color: 'warn', r: 4, label: 'H' });
  }
  if (L1 && s.showArea && d1.xInt !== null && d1.n !== null) items.push({ type: 'poly', points: [[0, 0], [d1.xInt, 0], [0, d1.n]], closed: true, color: 'blue', fill: 'blue', fillOpacity: 0.15, width: 1 });
  if (s.mode1 === 'points') {
    items.push({ type: 'point', x: s.A[0], y: s.A[1], color: 'blue', label: `A(${fmt(s.A[0])}; ${fmt(s.A[1])})`, snap: 0.5, onDrag: (x, y) => set({ A: [x, y] }), aria: 'A noktası' });
    items.push({ type: 'point', x: s.B[0], y: s.B[1], color: 'blue', label: `B(${fmt(s.B[0])}; ${fmt(s.B[1])})`, snap: 0.5, onDrag: (x, y) => set({ B: [x, y] }), aria: 'B noktası' });
  }
  if (s.showL2 && s.mode2 === 'points') {
    items.push({ type: 'point', x: s.C[0], y: s.C[1], color: 'red', label: `C(${fmt(s.C[0])}; ${fmt(s.C[1])})`, snap: 0.5, onDrag: (x, y) => set({ C: [x, y] }), aria: 'C noktası' });
    items.push({ type: 'point', x: s.D[0], y: s.D[1], color: 'red', label: `D(${fmt(s.D[0])}; ${fmt(s.D[1])})`, snap: 0.5, onDrag: (x, y) => set({ D: [x, y] }), aria: 'D noktası' });
  }
  if (s.showP) items.push({ type: 'point', x: s.P[0], y: s.P[1], color: 'warn', label: `P(${fmt(s.P[0])}; ${fmt(s.P[1])})`, snap: 0.5, onDrag: (x, y) => set({ P: [x, y] }), aria: 'P noktası' });

  const lineRows = (L, d, name) => L ? [
    [`${name}: denklem`, <MathText key={`${name}e`} text={lineText(L)} />],
    [`${name}: eğim m`, d.m === Infinity ? 'tanımsız (dikey doğru)' : fractionText(d.m)],
    [`${name}: y = mx + n`, d.m === Infinity ? `x = ${fractionText(d.xInt)}` : `y = ${fractionText(d.m)}x ${d.n < 0 ? '−' : '+'} ${fractionText(Math.abs(d.n))}`],
    [`${name}: eksenleri kestiği`, `x: ${d.xInt === null ? 'yok' : fractionText(d.xInt)} · y: ${d.n === null ? 'yok' : fractionText(d.n)}`],
    [`${name}: x ekseniyle açı`, `${fmt(d.angle, 2)}°`],
  ] : [];
  let relation = null;
  if (L1 && L2) {
    const m1 = d1.m; const m2 = d2.m;
    const parallel = Math.abs(L1.a * L2.b - L2.a * L1.b) < 1e-9;
    const perpendicular = Math.abs(L1.a * L2.a + L1.b * L2.b) < 1e-9;
    const same = parallel && Math.abs(L1.a * L2.c - L2.a * L1.c) < 1e-9 && Math.abs(L1.b * L2.c - L2.b * L1.c) < 1e-9;
    const angle = (Math.acos(Math.abs(L1.a * L2.a + L1.b * L2.b) / Math.hypot(L1.a, L1.b) / Math.hypot(L2.a, L2.b)) * 180) / Math.PI;
    const scaled = parallel && !same ? Math.abs(L1.c / Math.hypot(L1.a, L1.b) - (L2.c / Math.hypot(L2.a, L2.b)) * Math.sign(L1.a * L2.a + L1.b * L2.b || 1)) : null;
    relation = [
      ['Durum', same ? 'çakışık' : parallel ? 'paralel (m₁ = m₂)' : perpendicular ? 'dik (m₁·m₂ = −1)' : 'kesişiyor', parallel || perpendicular ? 'ok' : undefined],
      ['m₁ · m₂', m1 === Infinity || m2 === Infinity ? '—' : fractionText(m1 * m2)],
      ['Aralarındaki açı', `${fmt(angle, 2)}°`],
      cross && ['Kesişim noktası', `(${fractionText(cross[0])}; ${fractionText(cross[1])})`],
      scaled !== null && ['Paralel doğrular arası uzaklık', fractionText(scaled)],
    ];
  }
  const pRows = L1 && s.showP ? [
    ['P\'nin d₁\'e uzaklığı', `|ax₀ + by₀ + c| / √(a² + b²) = ${fractionText(Math.abs(L1.a * s.P[0] + L1.b * s.P[1] + L1.c) / Math.hypot(L1.a, L1.b))}`, 'ok'],
  ] : [];
  const extra = [
    s.mode1 === 'points' && ['|AB|', fractionText(dist(s.A, s.B)) + (Math.abs(dist(s.A, s.B) ** 2 - Math.round(dist(s.A, s.B) ** 2)) < 1e-9 && !Number.isInteger(dist(s.A, s.B)) ? ` (= √${Math.round(dist(s.A, s.B) ** 2)})` : '')],
    s.mode1 === 'points' && ['AB\'nin orta noktası', `(${fractionText((s.A[0] + s.B[0]) / 2)}; ${fractionText((s.A[1] + s.B[1]) / 2)})`],
    L1 && s.showArea && d1.xInt !== null && d1.n !== null && ['d₁ ile eksenlerin üçgeni', `Alan = |x-kesişim · y-kesişim| / 2 = ${fractionText(Math.abs(d1.xInt * d1.n) / 2)}`, 'ok'],
  ];
  return <LabGrid visual={<>
    <Plot x={[-v, v]} y={[-v * 0.75, v * 0.75]} width={680} equal items={items} xTickStep={v > 10 ? 2 : 1} yTickStep={v > 10 ? 2 : 1} xLabel="x" yLabel="y" ariaLabel="Analitik düzlem" />
    <div className="kit-legend"><span><i style={{ background: 'var(--pen-blue)' }} />d₁</span>{s.showL2 && <span><i style={{ background: 'var(--pen-red)' }} />d₂</span>}{s.showP && <span><i style={{ background: 'var(--warn)' }} />P ve dikme</span>}</div>
    <Readouts title="Canlı sonuçlar" items={[...lineRows(L1, d1, 'd₁'), ...lineRows(L2, d2, 'd₂'), ...(relation ?? []), ...pRows, ...extra].filter(Boolean)} />
  </>} side={<>
    <Panel title="d₁ doğrusu">
      <Choice options={[{ value: 'points', label: 'İki noktadan' }, { value: 'equation', label: 'Denklemden' }]} value={s.mode1} onChange={(mode1) => set({ mode1 })} />
      {s.mode1 === 'equation' && <TextField label="d₁:" value={s.eq1} onChange={(eq1) => set({ eq1 })} error={errors[1]} hint="Örnek: 3x + 4y - 12 = 0 ya da y = 2x + 3" />}
      {s.mode1 === 'points' && <p className="muted small">A ve B noktalarını sürükle (0,5 ızgara).</p>}
    </Panel>
    <Panel title="d₂ doğrusu">
      <Toggle label="İkinci doğruyu göster" checked={s.showL2} onChange={(showL2) => set({ showL2 })} />
      {s.showL2 && <><Choice options={[{ value: 'points', label: 'İki noktadan' }, { value: 'equation', label: 'Denklemden' }]} value={s.mode2} onChange={(mode2) => set({ mode2 })} />
        {s.mode2 === 'equation' && <TextField label="d₂:" value={s.eq2} onChange={(eq2) => set({ eq2 })} error={errors[2]} hint="Parametre için a yaz: a x + 2y - 1 = 0" />}</>}
    </Panel>
    {usesA && <Panel title="Parametre"><Slider label="a" value={s.a} min={-8} max={8} step={0.5} onChange={(a) => set({ a })} /></Panel>}
    <Panel title="Göster">
      <div className="kit-chips"><Toggle label="P noktası ve uzaklık" checked={s.showP} onChange={(showP) => set({ showP })} />
        <Toggle label="Eksenlerle üçgen" checked={s.showArea} onChange={(showArea) => set({ showArea })} /></div>
      <Slider label="Görünüm ±" value={s.view} min={4} max={20} step={1} onChange={(view) => set({ view })} />
    </Panel>
    <Steps title="Formüller" lines={['Eğim: m = (y₂ − y₁)/(x₂ − x₁) = −a/b', 'Paralel: m₁ = m₂ · Dik: m₁·m₂ = −1', 'Noktanın doğruya uzaklığı: |ax₀ + by₀ + c| / √(a² + b²)', 'Orta nokta: ((x₁ + x₂)/2, (y₁ + y₂)/2) · |AB| = √(Δx² + Δy²)']} />
    {Object.keys(errors).length > 0 && <Note tone="bad">Denklem okunamadı: {Object.values(errors)[0]}</Note>}
  </>} />;
}
const lineToABC = (L) => ({ a: L.a, b: L.b, c: -L.c });

const initial = { mode1: 'points', A: [1, 2], B: [5, 10], eq1: '3x + 4y - 12 = 0', showL2: false, mode2: 'equation', C: [-2, 4], D: [6, 0], eq2: 'y = -x/2 + 5/2', a: 1, showP: false, P: [0, 0], showArea: false, view: 10 };

export default {
  Lab,
  initial,
  intro: 'Doğruyu iki noktayla (sürükleyerek) ya da denklemiyle tanımla. Eğim, denklemin bütün biçimleri, kesişim, paralellik–diklik ve uzaklıklar formülleriyle canlı hesaplanır. Denkleme a yazarsan kaydırıcıyla parametreyi değiştirebilirsin.',
  questions: [
    { id: 'dik-dogru', title: 'Dik doğrunun y-kesişimi', exam: 'AYT', topic: 'Analitik geometri',
      stem: 'A(1, 2) ve B(5, 10) noktalarından geçen doğruya A noktasında dik olan doğru y eksenini hangi noktada keser?',
      choices: { A: '(0, 2)', B: '(0, 5/2)', C: '(0, 3)', D: '(0, 7/2)', E: '(0, 4)' }, answer: 'B',
      setup: { mode1: 'points', A: [1, 2], B: [5, 10], showL2: true, mode2: 'equation', eq2: 'y = -x/2 + 5/2' },
      build: 'd₁: iki noktadan, A(1; 2), B(5; 10). d₂\'yi denklemle gir: y − 2 = −(1/2)(x − 1) → y = -x/2 + 5/2.',
      look: '"Durum: dik (m₁·m₂ = −1)" görünmeli; d₂\'nin y-kesişimini oku.',
      explanation: 'm_AB = (10 − 2)/(5 − 1) = 2 → dik doğrunun eğimi −1/2.\nA\'dan geçen: y − 2 = −(1/2)(x − 1) → y = −x/2 + 5/2 → y-kesişimi 5/2.',
      rule: 'Dik doğrular: m₁·m₂ = −1. Noktası ve eğimi bilinen doğru: y − y₁ = m(x − x₁).' },
    { id: 'uzaklik', title: 'Orijinin doğruya uzaklığı', exam: 'AYT', topic: 'Analitik geometri',
      stem: '3x + 4y − 12 = 0 doğrusunun orijine uzaklığı kaç birimdir?',
      choices: { A: '2', B: '12/5', C: '3', D: '16/5', E: '4' }, answer: 'B',
      setup: { mode1: 'equation', eq1: '3x + 4y - 12 = 0', showP: true, P: [0, 0], view: 8 },
      build: 'd₁: denklemden, 3x + 4y - 12 = 0. "P noktası ve uzaklık" açık, P(0; 0).',
      look: 'Turuncu dikme PH\'nin uzunluğu = "P\'nin d₁\'e uzaklığı" satırı.',
      explanation: 'd = |3·0 + 4·0 − 12| / √(9 + 16) = 12/5.',
      rule: 'Noktanın doğruya uzaklığı: |ax₀ + by₀ + c| / √(a² + b²).' },
    { id: 'paralel', title: 'Paralellik için parametre', exam: 'AYT', topic: 'Analitik geometri',
      stem: '2x − y + 3 = 0 ve ax + 2y − 1 = 0 doğruları paralel olduğuna göre a kaçtır?',
      choices: { A: '−4', B: '−2', C: '1', D: '2', E: '4' }, answer: 'A',
      setup: { mode1: 'equation', eq1: '2x - y + 3 = 0', showL2: true, mode2: 'equation', eq2: 'a x + 2y - 1 = 0', a: 1, view: 8 },
      build: 'd₁: 2x - y + 3 = 0; d₂: a x + 2y - 1 = 0 (a kaydırıcısı açılır).',
      look: 'a\'yı kaydır; "Durum: paralel" yazdığı anda a değerini oku.',
      explanation: 'm₁ = 2, m₂ = −a/2. Paralel ⇔ m₁ = m₂ → 2 = −a/2 → a = −4.',
      rule: 'ax + by + c = 0 biçiminde eğim −a/b. Paralellik için eğimleri eşitle.' },
    { id: 'eksen-ucgen', title: 'Eksenlerle oluşan üçgen', exam: 'TYT', topic: 'Doğrunun analitiği',
      stem: '3x + 4y − 12 = 0 doğrusunun koordinat eksenleriyle oluşturduğu üçgenin alanı kaç birimkaredir?',
      choices: { A: '6', B: '8', C: '10', D: '12', E: '24' }, answer: 'A',
      setup: { mode1: 'equation', eq1: '3x + 4y - 12 = 0', showArea: true, view: 8 },
      build: 'd₁: 3x + 4y - 12 = 0; "Eksenlerle üçgen" açık.',
      look: 'Eksenleri kestiği noktalar ve üçgen alanı satırı.',
      explanation: 'x = 0 → y = 3; y = 0 → x = 4. Dik kenarlar 4 ve 3 → alan 4·3/2 = 6.',
      rule: 'Eksen kesişimlerini bul (x = 0 ve y = 0 koy); alan = |x·y| / 2.' },
    { id: 'iki-nokta', title: 'İki nokta arası uzaklık', exam: 'TYT', topic: 'Doğrunun analitiği',
      stem: 'A(−1, 3) ve B(5, −5) noktaları arasındaki uzaklık kaç birimdir?',
      choices: { A: '6', B: '8', C: '10', D: '12', E: '14' }, answer: 'C',
      setup: { mode1: 'points', A: [-1, 3], B: [5, -5] },
      build: 'd₁: iki noktadan; A(−1; 3), B(5; −5).',
      look: '|AB| ve orta nokta satırları.',
      explanation: 'Δx = 6, Δy = −8 → |AB| = √(36 + 64) = 10. (Orta nokta (2, −1).)',
      rule: '|AB| = √((x₂ − x₁)² + (y₂ − y₁)²); 6-8-10 üçgeni gibi Pisagor üçlülerini tanı.' },
  ],
  tips: [
    { title: 'Eğim', see: 'İki nokta, "eğimi", açı', look: 'Eğim satırı ve x ekseniyle açı.', rule: 'm = Δy/Δx = −a/b = tan(eğim açısı).', trap: 'Dikey doğrunun eğimi tanımsızdır, sıfır değil.' },
    { title: 'Paralel ve dik', see: '"paralel", "dik", parametreli denklem', look: 'Durum satırı; a kaydırıcısı.', rule: 'Paralel: m₁ = m₂. Dik: m₁·m₂ = −1.' },
    { title: 'Uzaklık', see: '"noktanın doğruya uzaklığı", "paralel doğrular arası"', look: 'P noktası ve dikme.', rule: 'd = |ax₀ + by₀ + c| / √(a² + b²). Paralel doğrularda bir doğrudan nokta alıp diğerine uzaklığı ölç.' },
    { title: 'Eksenlerle üçgen', see: '"eksenlerle oluşturduğu üçgen"', look: 'Eksenlerle üçgen anahtarı.', rule: 'x = 0 ve y = 0 koyarak kesişimleri bul; alan = |x-kesişim · y-kesişim| / 2.' },
  ],
};
