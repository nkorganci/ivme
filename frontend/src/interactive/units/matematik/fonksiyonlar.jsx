import { useMemo } from 'react';
import Plot from '../../kit/Plot.jsx';
import { Choice, LabGrid, MathText, Note, Panel, Readouts, Slider, Steps, TextField, Toggle } from '../../kit/controls.jsx';
import { compile, derivative, findRoots, fractionText, parse, prettyText, quadraticRootsText, simplify, substitute, toPolynomial, toText } from '../../kit/mathExpr.js';
import { fmt } from '../../kit/num.js';

const PRESETS = ['x^2 - 4x + 3', 'x^3 - 3x', '|x|', 'sqrt(x)', '1/x', '2^x', 'ln(x)', 'sin(x)', '|x^2 - 4|', '(x - 1)(x + 2)(x - 3)'];
const num = (v) => ({ t: 'num', v });

/** g(x) = a·f(b·(x − h)) + k; isteğe bağlı f(|x|) ve |g(x)|. */
export function compose(state) {
  const fTree = parse(state.expr);
  const x = state.absIn ? { t: 'fn', n: 'abs', a: { t: 'var', n: 'x' } } : { t: 'var', n: 'x' };
  const inner = simplify({ t: 'mul', a: num(state.b), b: { t: 'sub', a: x, b: num(state.h) } });
  let tree = simplify({ t: 'add', a: { t: 'mul', a: num(state.a), b: substitute(fTree, 'x', inner) }, b: num(state.k) });
  if (state.absOut) tree = { t: 'fn', n: 'abs', a: tree };
  return { fTree, tree, f: compile(fTree), g: compile(tree) };
}

function analyse(state) {
  let built;
  try { built = compose(state); } catch (error) { return { error: error.message }; }
  const { fTree, tree } = built;
  const f = (x) => built.f({ x });
  const g = (x) => built.g({ x });
  const v = state.view;
  const roots = findRoots(g, -v, v);
  let extrema = [];
  try {
    const dTree = derivative(tree);
    const d = compile(dTree);
    extrema = findRoots((x) => d({ x }), -v, v).filter((x) => Number.isFinite(g(x))).map((x) => {
      const left = g(x - 1e-3); const right = g(x + 1e-3); const mid = g(x);
      return { x, y: mid, kind: mid >= left && mid >= right ? 'yerel maksimum' : mid <= left && mid <= right ? 'yerel minimum' : 'büküm' };
    }).filter((e) => e.kind !== 'büküm');
  } catch { /* türev alınamadıysa yalnız grafik */ }
  const line = (x) => state.p * x + state.q;
  const crossings = state.showLine ? findRoots((x) => g(x) - line(x), -v, v) : [];
  const poly = state.absIn || state.absOut ? null : toPolynomial(tree);
  let quadratic = null;
  if (poly && poly.length === 3 && Math.abs(poly[2]) > 1e-12) {
    const [C, B, A] = poly;
    const delta = B * B - 4 * A * C;
    const r = -B / (2 * A);
    const lineDelta = (B - state.p) ** 2 - 4 * A * (C - state.q);
    quadratic = { A, B, C, delta, r, top: A * r * r + B * r + C, lineDelta };
  }
  return { fTree, tree, f, g, roots, extrema, crossings, poly, quadratic, text: prettyText(tree), fText: toText(fTree) };
}

function transformNotes(s) {
  const notes = [];
  if (s.h) notes.push(`h = ${fmt(s.h)} → grafik ${fmt(Math.abs(s.h))} birim ${s.h > 0 ? 'sağa' : 'sola'} kayar (x yerine x − h yazılır)`);
  if (s.k) notes.push(`k = ${fmt(s.k)} → grafik ${fmt(Math.abs(s.k))} birim ${s.k > 0 ? 'yukarı' : 'aşağı'} kayar`);
  if (s.a < 0) notes.push('a < 0 → grafik x eksenine göre simetrisi alınır (ters döner)');
  if (Math.abs(s.a) !== 1 && s.a !== 0) notes.push(`|a| = ${fmt(Math.abs(s.a))} → dikeyde ${Math.abs(s.a) > 1 ? 'uzama' : 'kısalma'} (y değerleri ${fmt(Math.abs(s.a))} ile çarpılır)`);
  if (s.b < 0) notes.push('b < 0 → grafik y eksenine göre simetrisi alınır');
  if (Math.abs(s.b) !== 1 && s.b !== 0) notes.push(`|b| = ${fmt(Math.abs(s.b))} → yatayda ${Math.abs(s.b) > 1 ? 'daralma' : 'genişleme'} (x değerleri ${fmt(1 / Math.abs(s.b), 2)} ile çarpılır)`);
  if (s.absIn) notes.push('f(|x|): y ekseninin sağındaki parça sola aynalanır, soldaki silinir');
  if (s.absOut) notes.push('|f(x)|: x ekseninin altındaki parçalar yukarı katlanır');
  if (!notes.length) notes.push('Kaydırıcılar başlangıçta: g(x) = f(x). Bir değeri değiştir, grafiğin nasıl hareket ettiğini izle.');
  return notes;
}

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const info = useMemo(() => analyse(s), [s]);
  const v = s.view;
  const items = [];
  if (!info.error) {
    if (s.showF && (s.a !== 1 || s.b !== 1 || s.h || s.k || s.absIn || s.absOut)) items.push({ type: 'fn', f: info.f, color: 'black', dashed: true, width: 1.8, opacity: 0.6 });
    items.push({ type: 'fn', f: info.g, color: 'blue', width: 3 });
    if (s.showLine) items.push({ type: 'fn', f: (x) => s.p * x + s.q, color: 'red', width: 2.2 });
    for (const r of info.roots) items.push({ type: 'point', x: r, y: 0, color: 'blue', r: 4.5, label: fmt(r, 2), dy: 18, dx: -6 });
    for (const e of info.extrema) items.push({ type: 'point', x: e.x, y: e.y, color: 'green', r: 5, label: `(${fmt(e.x, 2)}; ${fmt(e.y, 2)})`, dy: e.kind === 'yerel minimum' ? 20 : -10 });
    for (const c of info.crossings) items.push({ type: 'point', x: c, y: s.p * c + s.q, color: 'red', r: 5, hollow: true });
    const py = info.g(s.probe);
    if (Number.isFinite(py) && Math.abs(py) < s.yView * 1.5) {
      items.push({ type: 'segment', from: [s.probe, 0], to: [s.probe, py], color: 'navy', dashed: true, width: 1.2 });
      items.push({ type: 'point', x: s.probe, y: py, color: 'navy', label: `g(${fmt(s.probe, 2)}) = ${fmt(py, 2)}`, onDrag: (px) => set({ probe: px }), snap: 0.1, aria: 'Eğri üzerindeki nokta' });
    }
  }
  const q = info.quadratic;
  const fit = () => {
    if (info.error) return;
    const values = [];
    for (let i = 0; i <= 200; i += 1) { const y = info.g(-v + (2 * v * i) / 200); if (Number.isFinite(y)) values.push(y); }
    values.sort((p, r) => p - r);
    const lo = values[Math.floor(values.length * 0.05)] ?? -5; const hi = values[Math.floor(values.length * 0.95)] ?? 5;
    set({ yView: Math.min(60, Math.max(2, Math.ceil(Math.max(Math.abs(lo), Math.abs(hi)) * 1.2))) });
  };
  const visual = <>
    <Plot x={[-v, v]} y={[-s.yView, s.yView]} height={430} items={items} xLabel="x" yLabel="y" ariaLabel="Fonksiyon grafiği" />
    <div className="kit-legend"><span><i style={{ background: 'var(--pen-blue)' }} />g(x)</span>{s.showF && <span><i style={{ background: 'var(--pen-black)' }} />f(x) (kesikli)</span>}
      {s.showLine && <span><i style={{ background: 'var(--pen-red)' }} />d: y = {fmt(s.p)}x {s.q < 0 ? '−' : '+'} {fmt(Math.abs(s.q))}</span>}
      <span><i style={{ background: 'var(--pen-green)' }} />yerel uç noktalar</span></div>
    {!info.error && <div className="kit-chips" aria-label="Değer tablosu">{[-3, -2, -1, 0, 1, 2, 3].map((x) => <span key={x} className="ml-event-chip">g({x}) = {fmt(info.g(x), 2)}</span>)}</div>}
  </>;
  const side = <>
    <Panel title="g(x) = a · f(b·(x − h)) + k">
      <Slider label="a (dikey ölçek / ters çevirme)" value={s.a} min={-4} max={4} step={0.5} onChange={(a) => set({ a })} />
      <Slider label="b (yatay ölçek)" value={s.b} min={-3} max={3} step={0.5} onChange={(b) => set({ b: b === 0 ? 0.5 : b })} />
      <Slider label="h (yatay kaydırma)" value={s.h} min={-6} max={6} step={0.5} onChange={(h) => set({ h })} />
      <Slider label="k (dikey kaydırma)" value={s.k} min={-8} max={8} step={0.5} onChange={(k) => set({ k })} />
      <div className="kit-chips"><Toggle label="f(|x|)" checked={s.absIn} onChange={(absIn) => set({ absIn })} /><Toggle label="|g(x)|" checked={s.absOut} onChange={(absOut) => set({ absOut })} />
        <Toggle label="f'yi göster" checked={s.showF} onChange={(showF) => set({ showF })} /></div>
    </Panel>
    <Panel title="Doğru d: y = p·x + q">
      <Toggle label="Doğruyu göster" checked={s.showLine} onChange={(showLine) => set({ showLine })} />
      {s.showLine && <><Slider label="p (eğim; 0 = yatay doğru)" value={s.p} min={-5} max={5} step={0.5} onChange={(p) => set({ p })} />
        <Slider label="q (y'yi kestiği yer)" value={s.q} min={-12} max={12} step={0.25} onChange={(qv) => set({ q: qv })} /></>}
    </Panel>
    <Panel title="Görünüm">
      <Slider label="x aralığı ±" value={s.view} min={2} max={20} step={1} onChange={(view) => set({ view })} />
      <Slider label="y aralığı ±" value={s.yView} min={2} max={60} step={1} onChange={(yView) => set({ yView })} />
      <button type="button" className="btn btn-secondary btn-sm" onClick={fit}>Grafiğe sığdır</button>
    </Panel>
  </>;
  return <LabGrid top={<>
    <TextField wide label="f(x) =" value={s.expr} onChange={(expr) => set({ expr })} error={info.error} hint="Örnek: x^2 - 4x + 3, |x - 2|, sqrt(x+1), 2^x, sin(x). Çarpma işareti gerekmez: 2x, 3(x+1)." />
    <div className="kit-chips">{PRESETS.map((p) => <button key={p} type="button" className="ml-event-chip" onClick={() => set({ expr: p, a: 1, b: 1, h: 0, k: 0, absIn: false, absOut: false })}><MathText text={p} /></button>)}</div>
  </>} visual={<>{visual}{!info.error && <div className="kit-row">
    <Readouts title="Denklem (canlı)" items={[
      ['f(x)', <MathText key="f" text={info.fText} />],
      ['g(x)', <MathText key="g" text={info.text} />],
      ['Kökler (g = 0)', info.roots.length ? info.roots.map((r) => fractionText(r)).join(' ; ') : 'yok (bu aralıkta)'],
      ['y eksenini kestiği', Number.isFinite(info.g(0)) ? `(0; ${fractionText(info.g(0))})` : 'tanımsız'],
      ['Yerel uç noktalar', info.extrema.length ? info.extrema.map((e) => `${e.kind}: (${fractionText(e.x)}; ${fractionText(e.y)})`).join(' · ') : 'yok'],
      s.showLine && ['g(x) = px + q çözüm sayısı', `${info.crossings.length}${info.crossings.length ? ` (x = ${info.crossings.map((c) => fmt(c, 2)).join(' ; ')})` : ''}`, info.crossings.length === 1 ? 'warn' : undefined],
    ]} />
  </div>}</>} side={<>{side}
    {!info.error && <Steps title="Dönüşüm ne yaptı?" lines={transformNotes(s)} />}
    {q && <Readouts title="İkinci derece analizi (g(x) = Ax² + Bx + C)" items={[
      ['A, B, C', `${fractionText(q.A)}, ${fractionText(q.B)}, ${fractionText(q.C)}`],
      ['Tepe noktası T(r, k)', `(${fractionText(q.r)}; ${fractionText(q.top)}) — r = −B/2A`],
      ['Simetri ekseni', `x = ${fractionText(q.r)}`],
      ['Δ = B² − 4AC', `${fractionText(q.delta)} → ${q.delta > 1e-9 ? 'iki farklı gerçel kök' : Math.abs(q.delta) <= 1e-9 ? 'çift katlı kök (x eksenine teğet)' : 'gerçel kök yok'}`, q.delta < -1e-9 ? 'bad' : q.delta <= 1e-9 ? 'warn' : 'ok'],
      ['Kökler (tam)', quadraticRootsText(q.A, q.B, q.C)],
      ['Kökler toplamı / çarpımı', `${fractionText(-q.B / q.A)} / ${fractionText(q.C / q.A)}`],
      ['Tepe noktası biçimi', <MathText key="v" text={`${fractionText(q.A)}(x ${q.r < 0 ? '+' : '−'} ${fractionText(Math.abs(q.r))})^2 ${q.top < 0 ? '−' : '+'} ${fractionText(Math.abs(q.top))}`} />],
      s.showLine && ['Doğru ile: Δ', `${fractionText(q.lineDelta)} → ${q.lineDelta > 1e-9 ? '2 noktada keser' : Math.abs(q.lineDelta) <= 1e-9 ? 'TEĞET (1 nokta)' : 'kesişmez'}`, Math.abs(q.lineDelta) <= 1e-9 ? 'warn' : undefined],
    ]} />}
    {!q && !info.error && <Note>İkinci derece analizi, g(x) bir parabol (Ax² + Bx + C) olduğunda açılır.</Note>}
  </>} />;
}

const initial = { expr: 'x^2 - 4x + 3', a: 1, b: 1, h: 0, k: 0, absIn: false, absOut: false, showF: true, showLine: false, p: 0, q: 1, view: 6, yView: 8, probe: 1 };

export default {
  Lab,
  initial,
  intro: 'f(x)\'i yaz; a, b, h, k kaydırıcıları g(x) = a·f(b(x − h)) + k dönüşümünü uygular. Denklem açılmış hâliyle, kökler, tepe noktası ve Δ canlı güncellenir. Kırmızı doğru ile kesişim sayısı, f(x) = m tipi soruların cevabıdır.',
  questions: [
    { id: 'kaydirma', title: 'Kaydırılan parabolün tepesi', exam: 'TYT', topic: 'Fonksiyonlar',
      stem: 'f(x) = x^2 − 4x olmak üzere y = f(x − 2) + 1 fonksiyonunun grafiğinin tepe noktası aşağıdakilerden hangisidir?',
      choices: { A: '(2, −4)', B: '(4, −3)', C: '(0, −3)', D: '(4, 5)', E: '(2, −3)' }, answer: 'B',
      setup: { expr: 'x^2 - 4x', h: 2, k: 1, showF: true, view: 6, yView: 6 },
      build: 'f(x) kutusuna x^2 - 4x yaz; h = 2, k = 1 yap.',
      look: 'İkinci derece analizindeki tepe noktasını oku; kesikli f ile karşılaştır: grafik 2 sağa, 1 yukarı kaydı.',
      explanation: 'f\'nin tepe noktası: r = −(−4)/2 = 2, f(2) = −4 → (2, −4).\nx yerine x − 2 → 2 birim sağa: (4, −4). Sonuna +1 → 1 birim yukarı: (4, −3).',
      rule: 'f(x − h) + k: h kadar sağa, k kadar yukarı. f(x + 2) sola kaydırır.' },
    { id: 'mutlak-kok', title: '|x² − 4| = m kaç kök?', exam: 'AYT', topic: 'Fonksiyonlarda uygulamalar',
      stem: 'f(x) = |x^2 − 4| olmak üzere f(x) = m denkleminin birbirinden farklı dört gerçel kökü olması için m hangi aralıkta olmalıdır?',
      choices: { A: 'm > 4', B: '0 < m < 4', C: 'm = 4', D: 'm < 0', E: '0 < m ≤ 4' }, answer: 'B',
      setup: { expr: 'x^2 - 4', absOut: true, showLine: true, p: 0, q: 2, view: 5, yView: 8 },
      build: 'f(x) = x^2 - 4 yaz ve |g(x)| anahtarını aç (ya da doğrudan |x^2 - 4| yaz). Doğruyu göster; eğim p = 0.',
      look: 'q\'yu (yani m\'yi) yukarı aşağı kaydır, "çözüm sayısı" satırını izle: q = 0 → 2, 0 < q < 4 → 4, q = 4 → 3, q > 4 → 2.',
      explanation: 'x^2 − 4\'ün eksi kalan parçası (−2 < x < 2) yukarı katlanır; tepe (0, 4) olur.\nYatay doğru 0 ile 4 arasındayken grafiği 4 noktada keser. m = 4\'te tepeye değer (3 kök), m > 4\'te 2 kök.',
      rule: 'f(x) = m çözüm sayısı = y = m yatay doğrusunun grafiği kestiği nokta sayısı.' },
    { id: 'teget', title: 'Parabole teğet doğru', exam: 'AYT', topic: 'İkinci dereceden denklemler',
      stem: 'y = x^2 − 2x + 3 parabolü ile y = 2x + n doğrusu teğet olduğuna göre n kaçtır?',
      choices: { A: '−1', B: '0', C: '1', D: '2', E: '3' }, answer: 'A',
      setup: { expr: 'x^2 - 2x + 3', showLine: true, p: 2, q: 1, view: 6, yView: 10 },
      build: 'f(x) = x^2 - 2x + 3; doğruyu göster, p = 2. q\'yu değiştirerek doğruyu parabole teğet yap.',
      look: 'Kesişim sayısı 1, "Doğru ile Δ" satırı 0 olduğunda q değerini oku.',
      explanation: 'x^2 − 2x + 3 = 2x + n → x^2 − 4x + (3 − n) = 0.\nTeğet ⇔ Δ = 16 − 4(3 − n) = 0 → 4 + 4n = 0 → n = −1.',
      rule: 'Parabol ile doğru: eşitle, tek tarafta topla; Δ > 0 iki nokta, Δ = 0 teğet, Δ < 0 kesişmez.' },
    { id: 'f-mutlak-x', title: 'f(|x|) ile yatay doğru', exam: 'AYT', topic: 'Fonksiyonlar',
      stem: 'f(x) = x^2 − 4x + 3 olmak üzere y = f(|x|) fonksiyonunun grafiği ile y = 1 doğrusu kaç noktada kesişir?',
      choices: { A: '1', B: '2', C: '3', D: '4', E: '5' }, answer: 'D',
      setup: { expr: 'x^2 - 4x + 3', absIn: true, showLine: true, p: 0, q: 1, view: 6, yView: 6 },
      build: 'f(x) = x^2 - 4x + 3 yaz, f(|x|) anahtarını aç; doğruyu göster: p = 0, q = 1.',
      look: 'Sağ yarıdaki iki kesişim y eksenine göre aynalanır: toplam kesişim sayısını oku.',
      explanation: 'x ≥ 0 için x^2 − 4x + 3 = 1 → x^2 − 4x + 2 = 0 → x = 2 ± √2 (ikisi de pozitif).\nf(|x|) çift fonksiyondur; bu iki kök sola aynalanır: −2 ± √2. Toplam 4 nokta.',
      rule: 'f(|x|): yalnız x ≥ 0 kısmını çiz, y eksenine göre aynala. Pozitif köklerin sayısı iki katına çıkar.' },
  ],
  tips: [
    { title: 'Kaydırma', see: 'f(x − 3), f(x + 2) − 1 gibi ifadeler', look: 'h ve k kaydırıcıları; kesikli f ile karşılaştır.', rule: 'f(x − h) + k → h birim sağa, k birim yukarı. Tepe/kök noktaları da aynı kadar kayar.', trap: 'f(x + 2) sağa değil, sola kaydırır.' },
    { title: 'Simetri ve mutlak değer', see: '−f(x), f(−x), |f(x)|, f(|x|)', look: 'a = −1, b = −1, |g(x)| ve f(|x|) anahtarları.', rule: '−f(x): x eksenine göre; f(−x): y eksenine göre simetri. |f(x)| alttakini yukarı katlar; f(|x|) sağ yarıyı sola aynalar.', trap: '|f(x)| ile f(|x|) farklıdır: biri y değerine, diğeri x değerine mutlak değer uygular.' },
    { title: 'f(x) = m kaç kök?', see: '"farklı gerçel kök sayısı", "m hangi aralıkta"', look: 'p = 0 yap; q\'yu kaydır, çözüm sayısını izle.', rule: 'Kök sayısı = yatay doğrunun grafiği kestiği nokta sayısı. Sınır değerler tepe ve uç noktalardır.' },
    { title: 'Parabol: tepe, Δ, kökler', see: 'ax² + bx + c, "tepe noktası", "x eksenine teğet"', look: 'İkinci derece analizi paneli.', rule: 'r = −b/2a; Δ > 0 iki kök, Δ = 0 teğet, Δ < 0 kök yok. Toplam −b/a, çarpım c/a.', trap: 'Kökler toplamı −b/a\'dır, b/a değil.' },
    { title: 'Parabol ve doğru', see: '"teğet", "kesişmez", "iki noktada keser"', look: 'Doğruyu aç; "Doğru ile Δ" satırı.', rule: 'Denklemleri eşitle → ax² + (b − p)x + (c − q) = 0. Teğet ⇔ bu denklemin Δ\'sı sıfır.' },
  ],
};
