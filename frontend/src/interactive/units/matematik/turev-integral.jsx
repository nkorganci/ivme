import { useMemo } from 'react';
import Plot from '../../kit/Plot.jsx';
import { LabGrid, MathText, Note, Panel, Readouts, Slider, Steps, TextField, Toggle } from '../../kit/controls.jsx';
import { compile, derivative, findRoots, fractionText, integrate, parse, polynomialText, prettyText, simplify, substitute, toPolynomial } from '../../kit/mathExpr.js';
import { fmt } from '../../kit/num.js';

const PRESETS = ['x^3 - 3x^2 + 2', 'x^2 - 2x + 3', 'x^3 - 3x', 'x^4 - 2x^2', 'x^3 + m x^2 + 3x', 'sin(x)', 'x·e^(-x)', 'ln(x)', '1/x', 'sqrt(x)'];

/** Ağaçlar ve işlevler: m parametresi kaydırıcıdan gelir. */
export function buildCalculus(expr, m) {
  const tree = parse(expr, ['x', 'm']);
  const withM = simplify(substitute(tree, 'm', { t: 'num', v: m }));
  const d1 = derivative(withM, 'x');
  const d2 = derivative(d1, 'x');
  const run = compile(withM); const run1 = compile(d1); const run2 = compile(d2);
  return { tree, withM, d1, d2, f: (x) => run({ x }), f1: (x) => run1({ x }), f2: (x) => run2({ x }) };
}

function analyse(s) {
  let c;
  try { c = buildCalculus(s.expr, s.m); } catch (error) { return { error: error.message }; }
  const v = s.view;
  const signAt = (fn, x) => { const y = fn(x); return Number.isFinite(y) ? Math.sign(Math.abs(y) < 1e-10 ? 0 : y) : NaN; };
  const critical = findRoots(c.f1, -v, v).filter((x) => Number.isFinite(c.f(x))).map((x) => {
    const left = signAt(c.f1, x - 1e-3); const right = signAt(c.f1, x + 1e-3);
    const kind = left > 0 && right < 0 ? 'yerel maksimum' : left < 0 && right > 0 ? 'yerel minimum' : 'dönüm (işaret değişmez)';
    return { x, y: c.f(x), kind };
  });
  const inflection = findRoots(c.f2, -v, v).filter((x) => signAt(c.f2, x - 1e-3) * signAt(c.f2, x + 1e-3) < 0 && Number.isFinite(c.f(x)));
  // f' işaret şeridi: kritik noktalar arasındaki aralıklar.
  const cuts = [-v, ...critical.map((p) => p.x), v];
  const intervals = [];
  for (let i = 0; i < cuts.length - 1; i += 1) {
    const mid = (cuts[i] + cuts[i + 1]) / 2;
    const sign = signAt(c.f1, mid);
    if (Number.isFinite(sign)) intervals.push({ from: cuts[i], to: cuts[i + 1], sign });
  }
  const fa = c.f(s.a); const slope = c.f1(s.a);
  const poly = toPolynomial(c.withM);
  const antiderivative = poly ? poly.reduce((acc, coef, i) => { acc[i + 1] = coef / (i + 1); return acc; }, [0]) : null;
  const F = antiderivative ? (x) => antiderivative.reduce((sum, coef, i) => sum + coef * x ** i, 0) : null;
  const lo = Math.min(s.from, s.to); const hi = Math.max(s.from, s.to);
  const signed = integrate(c.f, s.from, s.to);
  const area = integrate(c.f, lo, hi, { abs: true });
  return { ...c, critical, inflection, intervals, fa, slope, antiderivative, F, signed, area, hasM: /m/.test(s.expr.replace(/[a-z]{2,}/g, '')) };
}

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const info = useMemo(() => analyse(s), [s]);
  const v = s.view;
  const mainItems = []; const derivItems = [];
  if (!info.error) {
    if (s.showArea) {
      mainItems.push({ type: 'area', f: (x) => Math.max(0, info.f(x)), from: Math.min(s.from, s.to), to: Math.max(s.from, s.to), color: 'green', opacity: 0.22 });
      mainItems.push({ type: 'area', f: (x) => Math.min(0, info.f(x)), from: Math.min(s.from, s.to), to: Math.max(s.from, s.to), color: 'red', opacity: 0.22 });
    }
    mainItems.push({ type: 'fn', f: info.f, color: 'blue', width: 3 });
    if (Number.isFinite(info.fa) && Number.isFinite(info.slope)) {
      mainItems.push({ type: 'fn', f: (x) => info.slope * (x - s.a) + info.fa, color: 'green', width: 2, domain: [s.a - v * 0.45, s.a + v * 0.45] });
      mainItems.push({ type: 'segment', from: [s.a, info.fa], to: [s.a + 1, info.fa], color: 'warn', dashed: true, width: 1.5 });
      mainItems.push({ type: 'segment', from: [s.a + 1, info.fa], to: [s.a + 1, info.fa + info.slope], color: 'warn', dashed: true, width: 1.5 });
      mainItems.push({ type: 'text', x: s.a + 1, y: info.fa + info.slope / 2, text: `eğim ${fmt(info.slope, 2)}`, dx: 6, color: 'warn' });
      mainItems.push({ type: 'point', x: s.a, y: info.fa, color: 'green', label: `A(${fmt(s.a, 2)}; ${fmt(info.fa, 2)})`, onDrag: (x) => set({ a: x }), snap: 0.05, aria: 'Teğet noktası' });
    }
    for (const p of info.critical) mainItems.push({ type: 'point', x: p.x, y: p.y, color: p.kind === 'yerel maksimum' ? 'red' : p.kind === 'yerel minimum' ? 'blue' : 'black', r: 5, label: p.kind === 'dönüm (işaret değişmez)' ? '' : (p.kind === 'yerel maksimum' ? 'max' : 'min'), dy: p.kind === 'yerel maksimum' ? -10 : 20 });
    for (const x of info.inflection) mainItems.push({ type: 'point', x, y: info.f(x), color: 'warn', r: 4.5, hollow: true });
    if (s.showArea) {
      mainItems.push({ type: 'point', x: s.from, y: 0, color: 'navy', label: `a = ${fmt(s.from, 2)}`, dy: 22, onDrag: (x) => set({ from: x }), snap: 0.25, aria: 'Alan alt sınırı' });
      mainItems.push({ type: 'point', x: s.to, y: 0, color: 'navy', label: `b = ${fmt(s.to, 2)}`, dy: 22, onDrag: (x) => set({ to: x }), snap: 0.25, aria: 'Alan üst sınırı' });
    }
    for (const it of info.intervals) derivItems.push({ type: 'area', f: info.f1, from: it.from, to: it.to, color: it.sign > 0 ? 'green' : 'red', opacity: 0.16 });
    derivItems.push({ type: 'fn', f: info.f1, color: 'red', width: 2.8 });
    if (s.showD2) derivItems.push({ type: 'fn', f: info.f2, color: 'warn', width: 2, dashed: true });
    derivItems.push({ type: 'vline', x: s.a, color: 'green' });
    if (Number.isFinite(info.slope)) derivItems.push({ type: 'point', x: s.a, y: info.slope, color: 'green', r: 5, label: `f′(${fmt(s.a, 2)}) = ${fmt(info.slope, 2)}` });
    for (const p of info.critical) derivItems.push({ type: 'point', x: p.x, y: 0, color: 'black', r: 4.5 });
  }
  const tangentN = info.fa - info.slope * s.a;
  const lineText = (m, n) => `y = ${fmt(m, 3)}x ${n < 0 ? '−' : '+'} ${fmt(Math.abs(n), 3)}`;
  const derivText = info.error ? '' : prettyText(info.d1);
  const visual = <>
    <Plot x={[-v, v]} y={[-s.yView, s.yView]} height={390} items={mainItems} xLabel="x" yLabel="f(x)" ariaLabel="f fonksiyonunun grafiği" />
    {s.showD && <Plot x={[-v, v]} y={[-s.dView, s.dView]} height={230} items={derivItems} xLabel="x" yLabel="f′(x)" ariaLabel="Türev grafiği" />}
    {!info.error && <div className="kit-chips" aria-label="İşaret şeridi">{info.intervals.map((it, i) => <span key={i} className={`ml-event-chip ${it.sign > 0 ? 'tone-up' : 'tone-down'}`}>
      ({i === 0 ? '−∞' : fmt(it.from, 2)}, {i === info.intervals.length - 1 ? '+∞' : fmt(it.to, 2)}): f′ {it.sign > 0 ? '> 0 ↗ artan' : it.sign < 0 ? '< 0 ↘ azalan' : '= 0'}</span>)}</div>}
  </>;
  const side = <>
    {info.hasM && <Panel title="Parametre"><Slider label="m" value={s.m} min={-6} max={6} step={0.5} onChange={(m) => set({ m })} /></Panel>}
    <Panel title="Teğet noktası">
      <Slider label="a (noktanın apsisi)" value={s.a} min={-v} max={v} step={0.05} onChange={(a) => set({ a })} />
    </Panel>
    <Panel title="Göster">
      <div className="kit-chips"><Toggle label="f′ grafiği" checked={s.showD} onChange={(showD) => set({ showD })} />
        <Toggle label="f″ (kesikli)" checked={s.showD2} onChange={(showD2) => set({ showD2 })} />
        <Toggle label="Alan / integral" checked={s.showArea} onChange={(showArea) => set({ showArea })} /></div>
      {s.showArea && <div className="kit-row"><Slider label="Alt sınır a" value={s.from} min={-v} max={v} step={0.25} onChange={(from) => set({ from })} />
        <Slider label="Üst sınır b" value={s.to} min={-v} max={v} step={0.25} onChange={(to) => set({ to })} /></div>}
    </Panel>
    <Panel title="Görünüm">
      <Slider label="x aralığı ±" value={s.view} min={2} max={12} step={1} onChange={(view) => set({ view })} />
      <Slider label="f için y ±" value={s.yView} min={2} max={60} step={1} onChange={(yView) => set({ yView })} />
      <Slider label="f′ için y ±" value={s.dView} min={2} max={60} step={1} onChange={(dView) => set({ dView })} />
    </Panel>
  </>;
  const readouts = info.error ? null : <Readouts title="Canlı sonuçlar" items={[
    ['f(x)', <MathText key="f" text={prettyText(info.withM)} />],
    ['f′(x)', <MathText key="d" text={derivText} />],
    ['f″(x)', <MathText key="dd" text={prettyText(info.d2)} />],
    ['Teğet (x = a)', Number.isFinite(info.slope) ? lineText(info.slope, tangentN) : 'tanımsız'],
    ['Normal doğrunun eğimi', Math.abs(info.slope) > 1e-9 ? fmt(-1 / info.slope, 3) : 'dikey doğru (x = a)'],
    ['Kritik noktalar (f′ = 0)', info.critical.length ? info.critical.map((p) => `x = ${fractionText(p.x)} → ${p.kind}, f = ${fractionText(p.y)}`).join(' · ') : 'yok (bu aralıkta)'],
    ['Büküm noktaları', info.inflection.length ? info.inflection.map((x) => `x = ${fractionText(x)}`).join(' · ') : 'yok'],
    s.showArea && ['∫ f(x) dx (işaretli)', `${fractionText(info.signed)}  [${fmt(s.from, 2)}, ${fmt(s.to, 2)}]`],
    s.showArea && ['Alan (|f| integrali)', fractionText(info.area), 'ok'],
    s.showArea && info.antiderivative && ['F(x) (ilkel)', <MathText key="F" text={`${polynomialText(info.antiderivative)} + c`} />],
    s.showArea && info.F && ['F(b) − F(a)', `${fractionText(info.F(s.to))} − (${fractionText(info.F(s.from))}) = ${fractionText(info.F(s.to) - info.F(s.from))}`],
  ]} />;
  return <LabGrid top={<>
    <TextField wide label="f(x) =" value={s.expr} onChange={(expr) => set({ expr })} error={info.error} hint="Örnek: x^3 - 3x^2 + 2, x·e^(-x), sin(x). Parametre için m kullan (ör. x^3 + m x^2 + 3x): kaydırıcı açılır." />
    <div className="kit-chips">{PRESETS.map((p) => <button key={p} type="button" className="ml-event-chip" onClick={() => set({ expr: p })}><MathText text={p} /></button>)}</div>
  </>} visual={<>{visual}{readouts}</>} side={<>{side}
    <Steps title="Okuma kuralları" lines={[
      'f′ > 0 olan aralıkta f artar, f′ < 0 olan aralıkta azalır.',
      'f′ işaret değiştirdiği noktada yerel uç: + → − maksimum, − → + minimum.',
      'Teğetin eğimi m = f′(a); denklemi y − f(a) = m(x − a).',
      'İntegral işaretlidir: x ekseninin altı negatif sayılır; alan için |f| alınır.',
    ]} />
    {!info.error && info.critical.some((p) => p.kind.startsWith('dönüm')) && <Note tone="warn">f′ = 0 olduğu hâlde işaret değişmiyorsa orası uç nokta değildir (ör. x³ için x = 0).</Note>}
  </>} />;
}

const initial = { expr: 'x^3 - 3x^2 + 2', m: 0, a: 1, showD: true, showD2: false, showArea: false, from: 0, to: 2, view: 4, yView: 6, dView: 10 };

export default {
  Lab,
  initial,
  intro: 'f(x)\'i yaz: üstte f, altta türevi f′ çizilir. Yeşil noktayı sürükle; teğet ve eğimi canlı değişir. f′ şeridindeki yeşil/kırmızı bölgeler f\'nin arttığı/azaldığı aralıklardır. "Alan / integral" ile sınırları sürükleyip integrali ve alanı karşılaştır.',
  questions: [
    { id: 'yerel-max', title: 'Yerel maksimum değeri', exam: 'AYT', topic: 'Türev',
      stem: 'f(x) = x^3 − 3x^2 + 2 fonksiyonunun yerel maksimum değeri kaçtır?',
      choices: { A: '−2', B: '0', C: '1', D: '2', E: '3' }, answer: 'D',
      setup: { expr: 'x^3 - 3x^2 + 2', showD: true },
      build: 'f(x) = x^3 - 3x^2 + 2 yaz; f′ grafiğini aç.',
      look: 'f′ şeridinde + → − geçişi olan noktayı bul; o noktadaki f değerini "Kritik noktalar" satırından oku.',
      explanation: 'f′(x) = 3x^2 − 6x = 3x(x − 2) → kritik noktalar 0 ve 2.\nf′ işareti: + (x < 0), − (0 < x < 2), + (x > 2). x = 0\'da + → − : yerel maksimum, f(0) = 2.',
      rule: 'Yerel maksimum: f′ işareti +\'dan −\'ye döner. Değer sorulursa f(x)\'te yerine koy, apsisi verme.' },
    { id: 'teget', title: 'Teğet doğrusunun denklemi', exam: 'AYT', topic: 'Türev',
      stem: 'f(x) = x^2 − 2x + 3 eğrisine x = 3 apsisli noktasından çizilen teğetin denklemi aşağıdakilerden hangisidir?',
      choices: { A: 'y = 4x − 6', B: 'y = 4x + 6', C: 'y = 2x', D: 'y = 6x − 12', E: 'y = 4x − 3' }, answer: 'A',
      setup: { expr: 'x^2 - 2x + 3', a: 3, yView: 12, view: 5 },
      build: 'f(x) = x^2 - 2x + 3 yaz; teğet noktasını a = 3 yap.',
      look: '"Teğet (x = a)" satırını ve sarı eğim üçgenini oku: 1 birim sağa gidince 4 birim yukarı.',
      explanation: 'f(3) = 9 − 6 + 3 = 6 → nokta (3, 6). f′(x) = 2x − 2 → f′(3) = 4 = eğim.\ny − 6 = 4(x − 3) → y = 4x − 6.',
      rule: 'Teğet: nokta (a, f(a)) ve eğim f′(a). İki bilgiyle doğru denklemi: y − f(a) = f′(a)(x − a).' },
    { id: 'alan', title: 'İşaretli integral mi, alan mı?', exam: 'AYT', topic: 'İntegral',
      stem: 'y = x^2 − 2x eğrisi, x ekseni ve x = 3 doğrusu arasında kalan bölgelerin alanları toplamı kaç birimkaredir?',
      choices: { A: '0', B: '4/3', C: '2', D: '8/3', E: '3' }, answer: 'D',
      setup: { expr: 'x^2 - 2x', showArea: true, from: 0, to: 3, yView: 4, view: 4 },
      build: 'f(x) = x^2 - 2x yaz; "Alan / integral" anahtarını aç; a = 0, b = 3.',
      look: 'İşaretli integral 0 çıkıyor ama alan değil! Kırmızı (eksen altı) ve yeşil (üstü) bölgeleri ayrı ayrı gör.',
      explanation: '0–2 arası eğri eksenin altında: ∫₀² (x^2 − 2x) dx = −4/3 → alan 4/3.\n2–3 arası üstünde: ∫₂³ (x^2 − 2x) dx = 4/3. Toplam alan 4/3 + 4/3 = 8/3.\n(İşaretli integral −4/3 + 4/3 = 0 olur; "alan" sorulduğunda bu tuzaktır.)',
      rule: 'Alan sorusunda önce kökleri bul; eksen altındaki parçanın integralini mutlak değerle topla.' },
    { id: 'turev-grafigi', title: 'f′ verildi, f\'nin minimumu', exam: 'AYT', topic: 'Türev',
      stem: 'f′(x) = (x − 1)(x − 3) olduğuna göre f fonksiyonunun yerel minimum noktasının apsisi kaçtır?',
      choices: { A: '0', B: '1', C: '2', D: '3', E: '4' }, answer: 'D',
      setup: { expr: 'x^3/3 - 2x^2 + 3x', showD: true, view: 5, yView: 4, dView: 6 },
      build: 'Türevi (x − 1)(x − 3) olan bir f yaz: x^3/3 - 2x^2 + 3x. f′ grafiğini aç (f′\'nin (x − 1)(x − 3) olduğunu "f′(x)" satırından doğrula).',
      look: 'f′ grafiğinin x eksenini kestiği iki noktada işaret nasıl değişiyor? − → + olan nokta minimumdur.',
      explanation: 'f′ işareti: + (x < 1), − (1 < x < 3), + (x > 3).\nx = 1\'de + → − : yerel maksimum; x = 3\'te − → + : yerel minimum.',
      rule: 'f′ grafiği verildiğinde f\'yi çizmeye gerek yok: f′\'nin eksenin üstü/altı f\'nin artan/azalan olduğu yerdir.' },
    { id: 'artan', title: 'Her yerde artan için parametre', exam: 'AYT', topic: 'Türev',
      stem: 'f(x) = x^3 + m x^2 + 3x fonksiyonu tüm gerçel sayılarda artan olduğuna göre m hangi aralıktadır?',
      choices: { A: 'm ≥ 3', B: '−3 ≤ m ≤ 3', C: 'm ≤ −3', D: '−1 ≤ m ≤ 1', E: 'm her gerçel sayı' }, answer: 'B',
      setup: { expr: 'x^3 + m x^2 + 3x', m: 4, showD: true, view: 4, yView: 10, dView: 12 },
      build: 'f(x) = x^3 + m x^2 + 3x yaz; m kaydırıcısı açılır. f′ grafiğini aç.',
      look: 'm\'yi kaydır: f′ grafiği x eksenini kesmediği (en çok değdiği) sürece şerit tamamen yeşil kalır. Bu hangi m aralığında oluyor?',
      explanation: 'f′(x) = 3x^2 + 2mx + 3 ≥ 0 her x için olmalı.\nBaşkatsayı pozitif; Δ ≤ 0 yeterli: 4m^2 − 36 ≤ 0 → m^2 ≤ 9 → −3 ≤ m ≤ 3.',
      rule: '"Her x için artan" ⇔ f′(x) ≥ 0. İkinci derece f′ için: başkatsayı > 0 ve Δ ≤ 0.' },
  ],
  tips: [
    { title: 'Artan / azalan', see: '"artandır", "azalandır", f′ grafiği', look: 'f′ şeridi: yeşil artan, kırmızı azalan.', rule: 'f′ > 0 → artan; f′ < 0 → azalan. f\'nin değeri değil, türevin işareti belirler.' },
    { title: 'Yerel uç noktalar', see: '"yerel maksimum/minimum değeri/noktası"', look: 'Kritik noktalar satırı ve f′\'nin eksenden geçişi.', rule: 'f′ = 0 ve işaret değişimi gerekir: + → − maksimum, − → + minimum.', trap: 'f′ = 0 ama işaret değişmiyorsa (x³) uç değildir. "Değeri" sorulursa f(x), "noktası" sorulursa x istenir.' },
    { title: 'Teğet ve normal', see: '"teğetin denklemi", "teğetin eğimi", "normal"', look: 'Yeşil noktayı sürükle; eğim üçgeni.', rule: 'Eğim = f′(a), nokta (a, f(a)). Normalin eğimi −1/f′(a).' },
    { title: 'İntegral ve alan', see: '"alanı", "∫", "bölgelerin alanları toplamı"', look: 'Alan / integral anahtarı: işaretli değer ile alanı karşılaştır.', rule: '∫ işaretlidir. Alan için kökleri bul, eksen altındaki parçayı mutlak değerle al.', trap: 'Eğri ekseni kesiyorsa tek integral alanı vermez.' },
    { title: 'Parametreli artanlık', see: '"her x için artan", "m aralığı"', look: 'm kaydırıcısı + f′ grafiği.', rule: 'f′ ikinci dereceyse başkatsayı > 0 ve Δ ≤ 0.' },
  ],
};
