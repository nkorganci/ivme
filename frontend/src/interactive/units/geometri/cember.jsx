import Plot from '../../kit/Plot.jsx';
import { Choice, LabGrid, Panel, Readouts, Slider, Steps } from '../../kit/controls.jsx';
import { angleAt, dist, intersect } from '../../kit/geometry.js';
import { fmt } from '../../kit/num.js';

const MODES = [
  { value: 'acilar', label: 'Merkez – çevre açı' },
  { value: 'teget', label: 'Teğet – kiriş' },
  { value: 'kirisler', label: 'Kesişen kirişler' },
  { value: 'kesen', label: 'Dış nokta: kesen ve teğet' },
  { value: 'dilim', label: 'Yay ve dilim' },
];
const norm = (a) => ((a % 360) + 360) % 360;
const onCircle = (r, deg) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];
/** a'dan b'ye saat yönü tersine yay ölçüsü (derece). */
const ccw = (a, b) => norm(b - a);
const between = (a, b, c) => ccw(a, c) < ccw(a, b);

/** Dış noktadan kesen ve teğet: PA ≤ PB kesişimler, T teğet değme noktası. */
export function secantTangent(r, d, tP, delta) {
  const P = onCircle(d, tP);
  const toO = [-P[0] / d, -P[1] / d];
  const rad = (delta * Math.PI) / 180;
  const u = [toO[0] * Math.cos(rad) - toO[1] * Math.sin(rad), toO[0] * Math.sin(rad) + toO[1] * Math.cos(rad)];
  const b = P[0] * u[0] + P[1] * u[1];
  const disc = b * b - (d * d - r * r);
  const tangentAngle = (Math.acos(r / d) * 180) / Math.PI;
  const T = onCircle(r, tP + tangentAngle);
  if (disc < 0) return { P, T, PT: Math.sqrt(d * d - r * r), miss: true };
  const s1 = -b - Math.sqrt(disc); const s2 = -b + Math.sqrt(disc);
  return { P, T, A: [P[0] + s1 * u[0], P[1] + s1 * u[1]], B: [P[0] + s2 * u[0], P[1] + s2 * u[1]], PA: s1, PB: s2, PT: Math.sqrt(d * d - r * r) };
}

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const r = s.r;
  const lim = s.mode === 'kesen' ? Math.max(r, s.d) + 1.5 : r + 1.6;
  const O = [0, 0];
  const items = [{ type: 'circle', cx: 0, cy: 0, r, color: 'black', width: 2.2 }, { type: 'point', x: 0, y: 0, color: 'black', r: 3.5, label: 'O', dx: -16, dy: 14 }];
  const dragOn = (key, label, color) => {
    const p = onCircle(r, s[key]);
    return { type: 'point', x: p[0], y: p[1], color, label, onDrag: (x, y) => set({ [key]: Math.round(norm((Math.atan2(y, x) * 180) / Math.PI)) }), aria: `${label} noktası` };
  };
  let readouts = []; let steps = [];

  if (s.mode === 'acilar') {
    const A = onCircle(r, s.t1); const B = onCircle(r, s.t2); const C = onCircle(r, s.t3);
    const arcAB = ccw(s.t1, s.t2);
    const cOnArc = between(s.t1, s.t2, s.t3);
    const seenArc = cOnArc ? 360 - arcAB : arcAB;
    const central = angleAt(A, O, B);
    const inscribed = angleAt(A, C, B);
    items.push({ type: 'sector', cx: 0, cy: 0, r, from: cOnArc ? s.t2 : s.t1, to: cOnArc ? s.t1 + 360 : s.t2, color: 'blue', opacity: 0.1 });
    items.push({ type: 'segment', from: O, to: A, color: 'blue' }, { type: 'segment', from: O, to: B, color: 'blue' });
    items.push({ type: 'segment', from: C, to: A, color: 'red' }, { type: 'segment', from: C, to: B, color: 'red' });
    items.push({ type: 'angle', at: O, from: A, to: B, label: `${fmt(central, 1)}°`, color: 'blue', r: 30, reflex: seenArc > 180 });
    items.push({ type: 'angle', at: C, from: A, to: B, label: `${fmt(inscribed, 1)}°`, color: 'red', r: 26 });
    items.push(dragOn('t1', 'A', 'blue'), dragOn('t2', 'B', 'blue'), dragOn('t3', 'C', 'red'));
    readouts = [['C\'nin gördüğü yay (AB)', `${fmt(seenArc, 1)}°`], ['Merkez açı AOB', `${fmt(seenArc > 180 ? 360 - central : central, 1)}° ${seenArc > 180 ? `(C\'nin gördüğü yay ${fmt(seenArc, 1)}°)` : ''}`], ['Çevre açı ACB', `${fmt(inscribed, 1)}°`, 'ok'], ['Yay / 2', `${fmt(seenArc / 2, 1)}°`]];
    steps = ['Çevre açı, gördüğü yayın yarısıdır: m(ACB) = m(AB yayı) / 2.', 'Aynı yayı gören bütün çevre açılar eşittir (C\'yi yay üzerinde gezdir).', Math.abs(seenArc - 180) < 0.6 ? 'AB çap → çevre açı 90° (Thales).' : 'AB çap olursa çevre açı 90° olur.'];
  }
  if (s.mode === 'teget') {
    const A = onCircle(r, s.t1); const B = onCircle(r, s.t2);
    const dir = [-A[1] / r, A[0] / r];
    const T1 = [A[0] + dir[0] * (r + 1), A[1] + dir[1] * (r + 1)];
    const T2 = [A[0] - dir[0] * (r + 1), A[1] - dir[1] * (r + 1)];
    const arc = ccw(s.t1, s.t2);
    const tangentChord = angleAt(T1, A, B);
    items.push({ type: 'sector', cx: 0, cy: 0, r, from: s.t1, to: s.t1 + arc, color: 'blue', opacity: 0.1 });
    items.push({ type: 'segment', from: T1, to: T2, color: 'green', width: 2.4 }, { type: 'segment', from: A, to: B, color: 'red', width: 2.4 });
    items.push({ type: 'segment', from: O, to: A, color: 'line', dashed: true });
    items.push({ type: 'angle', at: A, from: T1, to: B, label: `${fmt(tangentChord, 1)}°`, color: 'red', r: 28 });
    items.push({ type: 'angle', at: A, from: O, to: T1, color: 'green', r: 14, right: true });
    items.push(dragOn('t1', 'A (değme)', 'green'), dragOn('t2', 'B', 'red'));
    readouts = [['AB yayı (açının içindeki)', `${fmt(arc, 1)}°`], ['Teğet–kiriş açısı', `${fmt(tangentChord, 1)}°`, 'ok'], ['Yay / 2', `${fmt(arc / 2, 1)}°`]];
    steps = ['Teğet, değme noktasındaki yarıçapa diktir (OA ⊥ d).', 'Teğet–kiriş açısı, içinde kalan yayın yarısıdır (çevre açı gibi).'];
  }
  if (s.mode === 'kirisler') {
    const A = onCircle(r, s.t1); const B = onCircle(r, s.t2); const C = onCircle(r, s.t3); const D = onCircle(r, s.t4);
    const P = intersect(A, B, C, D);
    items.push({ type: 'segment', from: A, to: B, color: 'red', width: 2.4 }, { type: 'segment', from: C, to: D, color: 'blue', width: 2.4 });
    items.push(dragOn('t1', 'A', 'red'), dragOn('t2', 'B', 'red'), dragOn('t3', 'C', 'blue'), dragOn('t4', 'D', 'blue'));
    const inside = P && Math.hypot(...P) < r - 1e-9 && dist(A, P) + dist(P, B) - dist(A, B) < 1e-6;
    if (inside) {
      items.push({ type: 'point', x: P[0], y: P[1], color: 'green', r: 5, label: 'P' });
      const AP = dist(A, P); const PB = dist(P, B); const CP = dist(C, P); const PD = dist(P, D);
      const angle = angleAt(A, P, C);
      items.push({ type: 'angle', at: P, from: A, to: C, label: `${fmt(angle, 1)}°`, color: 'green', r: 22 });
      readouts = [['|AP| · |PB|', `${fmt(AP, 2)} · ${fmt(PB, 2)} = ${fmt(AP * PB, 3)}`, 'ok'], ['|CP| · |PD|', `${fmt(CP, 2)} · ${fmt(PD, 2)} = ${fmt(CP * PD, 3)}`, 'ok'],
        ['r² − |OP|²', fmt(r * r - Math.hypot(...P) ** 2, 3)], ['m(APC)', `${fmt(angle, 1)}° = (AC yayı + BD yayı)/2`]];
      steps = ['Kesişen kirişler: |AP|·|PB| = |CP|·|PD| (P\'nin kuvveti).', 'Noktaları sürükle: iki çarpım hep eşit kalır.', 'Kirişler arası açı, karşılıklı iki yayın ortalamasıdır.'];
    } else readouts = [['Kesişim', 'Kirişler çember içinde kesişmiyor; noktaları değiştir.']];
  }
  if (s.mode === 'kesen') {
    const k = secantTangent(r, s.d, s.tP, s.delta);
    items.push({ type: 'segment', from: k.P, to: k.T, color: 'green', width: 2.4 }, { type: 'segment', from: [0, 0], to: k.T, color: 'line', dashed: true });
    items.push({ type: 'point', x: k.T[0], y: k.T[1], color: 'green', r: 4.5, label: 'T' });
    if (!k.miss) {
      items.push({ type: 'segment', from: k.P, to: k.B, color: 'red', width: 2.4 });
      items.push({ type: 'point', x: k.A[0], y: k.A[1], color: 'red', r: 4.5, label: 'A' }, { type: 'point', x: k.B[0], y: k.B[1], color: 'red', r: 4.5, label: 'B' });
    }
    items.push({ type: 'point', x: k.P[0], y: k.P[1], color: 'navy', label: 'P', onDrag: (x, y) => { const d = Math.max(r + 0.2, Math.min(10, Math.hypot(x, y))); set({ d: Math.round(d * 10) / 10, tP: Math.round(norm((Math.atan2(y, x) * 180) / Math.PI)) }); }, aria: 'Dış nokta P' });
    readouts = [['|PT|²', `${fmt(k.PT, 3)}² = ${fmt(k.PT ** 2, 3)}`, 'ok'], !k.miss && ['|PA| · |PB|', `${fmt(k.PA, 3)} · ${fmt(k.PB, 3)} = ${fmt(k.PA * k.PB, 3)}`, 'ok'],
      ['|PO|² − r²', `${fmt(s.d, 2)}² − ${fmt(r, 2)}² = ${fmt(s.d * s.d - r * r, 3)}`], k.miss && ['Kesen', 'Doğru çemberi kesmiyor; açıyı küçült.']];
    steps = ['Dış noktanın kuvveti: |PT|² = |PA|·|PB| = |PO|² − r².', 'Keseni döndür: |PA|·|PB| değişmez.', 'Teğet parçası yarıçapa diktir: |PT|² + r² = |PO|².'];
  }
  if (s.mode === 'dilim') {
    const theta = ccw(s.t1, s.t2) || 360;
    const A = onCircle(r, s.t1); const B = onCircle(r, s.t2);
    items.push({ type: 'sector', cx: 0, cy: 0, r, from: s.t1, to: s.t1 + theta, color: 'blue', opacity: 0.25 });
    items.push({ type: 'segment', from: O, to: A, color: 'blue' }, { type: 'segment', from: O, to: B, color: 'blue' });
    items.push({ type: 'angle', at: O, from: A, to: B, label: `${fmt(theta, 1)}°`, color: 'blue', r: 26, reflex: theta > 180 });
    items.push(dragOn('t1', 'A', 'blue'), dragOn('t2', 'B', 'blue'));
    const frac = theta / 360;
    const piText = (k) => `${fmt(k, 3)}π ≈ ${fmt(k * Math.PI, 3)}`;
    readouts = [['Merkez açı θ', `${fmt(theta, 1)}°`], ['Yay uzunluğu', `2πr·θ/360 = ${piText(2 * r * frac)}`, 'ok'], ['Dilim alanı', `πr²·θ/360 = ${piText(r * r * frac)}`, 'ok'], ['Daire alanı / çevresi', `${piText(r * r)} / ${piText(2 * r)}`]];
    steps = ['Yay uzunluğu ve dilim alanı, merkez açıyla orantılıdır: θ/360 kesri kadar.', `Bu dilim dairenin ${fmt(frac * 100, 1)}%'si.`];
  }
  return <LabGrid visual={<>
    <Plot x={[-lim, lim]} y={[-lim, lim]} width={560} equal items={items} xTickStep={1} yTickStep={1} ariaLabel="Çember" />
  </>} side={<>
    <Panel title="Konu"><Choice options={MODES} value={s.mode} onChange={(mode) => set({ mode })} /></Panel>
    <Panel title="Değerler">
      <Slider label="Yarıçap r" value={s.r} min={1} max={6} step={0.5} onChange={(rv) => set({ r: rv })} />
      {s.mode !== 'kesen' && <Slider label="A konumu (°)" value={s.t1} min={0} max={359} step={1} unit="°" onChange={(t1) => set({ t1 })} />}
      {s.mode !== 'kesen' && <Slider label="B konumu (°)" value={s.t2} min={0} max={359} step={1} unit="°" onChange={(t2) => set({ t2 })} />}
      {['acilar', 'kirisler'].includes(s.mode) && <Slider label="C konumu (°)" value={s.t3} min={0} max={359} step={1} unit="°" onChange={(t3) => set({ t3 })} />}
      {s.mode === 'kirisler' && <Slider label="D konumu (°)" value={s.t4} min={0} max={359} step={1} unit="°" onChange={(t4) => set({ t4 })} />}
      {s.mode === 'kesen' && <><Slider label="|PO| = d" value={s.d} min={r + 0.2} max={10} step={0.1} onChange={(d) => set({ d })} />
        <Slider label="Kesenin sapma açısı" value={s.delta} min={-60} max={60} step={1} unit="°" onChange={(delta) => set({ delta })} /></>}
    </Panel>
    <Readouts title="Ölçüler (canlı)" items={readouts.filter(Boolean)} />
    <Steps title="Kural" lines={steps} />
  </>} />;
}

const initial = { mode: 'acilar', r: 4, t1: 220, t2: 320, t3: 100, t4: 300, d: 7, tP: 0, delta: 0 };

export default {
  Lab,
  initial,
  intro: 'Bir konu seç; noktaları çember üzerinde sürükle ya da açı değerini yaz. Açılar, yaylar, çarpımlar ve alanlar formülleriyle canlı hesaplanır: aynı kalan büyüklükler kuralın kendisidir.',
  questions: [
    { id: 'cevre-aci', title: 'Merkez açı → çevre açı', exam: 'AYT', topic: 'Çember ve daire',
      stem: 'O merkezli çemberde m(AOB) = 100°\'dir. C noktası büyük AB yayı üzerinde olduğuna göre m(ACB) kaç derecedir?',
      choices: { A: '25', B: '40', C: '50', D: '80', E: '100' }, answer: 'C',
      setup: { mode: 'acilar', t1: 220, t2: 320, t3: 90, r: 4 },
      build: 'Konu: Merkez – çevre açı. A = 220°, B = 320° (aradaki yay 100°), C = 90° (büyük yayda).',
      look: 'Mavi merkez açı ile kırmızı çevre açıyı karşılaştır; C\'yi büyük yay üzerinde gezdir: çevre açı değişmiyor.',
      explanation: 'Çevre açı, gördüğü yayın yarısıdır. AB yayı = merkez açı = 100° → m(ACB) = 50°.',
      rule: 'Çevre açı = gördüğü yay / 2; merkez açı = gördüğü yay.' },
    { id: 'kirisler', title: 'Kesişen kirişler', exam: 'AYT', topic: 'Çember ve daire',
      stem: 'Bir çemberde [AB] ve [CD] kirişleri P noktasında kesişiyor. |AP| = 4, |PB| = 6 ve |CP| = 3 birim olduğuna göre |PD| kaç birimdir?',
      choices: { A: '5', B: '6', C: '7', D: '8', E: '9' }, answer: 'D',
      setup: { mode: 'kirisler', r: 5, t1: 200, t2: 30, t3: 130, t4: 290 },
      build: 'Konu: Kesişen kirişler. Noktaları sürükle; |AP|·|PB| ile |CP|·|PD| satırlarını izle.',
      look: 'Kirişleri nasıl çizersen çiz iki çarpım eşit kalıyor. Bu eşitliği soruya uygula.',
      explanation: '|AP|·|PB| = |CP|·|PD| → 4·6 = 3·|PD| → |PD| = 8.',
      rule: 'Çember içinde kesişen kirişler: parçaların çarpımları eşit.' },
    { id: 'dilim', title: 'Daire diliminin alanı', exam: 'TYT', topic: 'Çember ve daire',
      stem: 'Yarıçapı 6 cm olan bir dairede merkez açısı 60° olan daire diliminin alanı kaç cm²\'dir?',
      choices: { A: '3π', B: '4π', C: '6π', D: '9π', E: '12π' }, answer: 'C',
      setup: { mode: 'dilim', r: 6, t1: 0, t2: 60 },
      build: 'Konu: Yay ve dilim. r = 6, A = 0°, B = 60°.',
      look: 'Dilim alanı satırı πr²·θ/360 değerini π cinsinden verir.',
      explanation: 'Dilim alanı = π·6²·60/360 = 36π/6 = 6π. (Yay uzunluğu 2π·6·60/360 = 2π.)',
      rule: 'Dilim alanı = πr² · θ/360; yay uzunluğu = 2πr · θ/360.' },
    { id: 'teget-kiris', title: 'Teğet–kiriş açısı', exam: 'AYT', topic: 'Çember ve daire',
      stem: 'Bir çembere A noktasında teğet olan d doğrusu ile [AB] kirişi arasındaki açının ölçüsü 70° olduğuna göre, bu açının içinde kalan AB yayının ölçüsü kaç derecedir?',
      choices: { A: '35', B: '70', C: '110', D: '140', E: '160' }, answer: 'D',
      setup: { mode: 'teget', t1: 270, t2: 50, r: 4 },
      build: 'Konu: Teğet – kiriş. A = 270°, B\'yi teğet–kiriş açısı 70° olacak biçimde ayarla (B = 50°).',
      look: 'Teğet–kiriş açısı ile içindeki yayı karşılaştır: yay her zaman açının iki katı.',
      explanation: 'Teğet–kiriş açısı içinde kalan yayın yarısıdır → yay = 2·70° = 140°.',
      rule: 'Teğet–kiriş açısı = yay / 2 (çevre açı gibi davranır).' },
    { id: 'kuvvet', title: 'Dış noktadan teğet ve kesen', exam: 'AYT', topic: 'Çember ve daire',
      stem: 'Çemberin dışındaki P noktasından çizilen teğet çembere T\'de değiyor ve |PT| = 6 birimdir. P\'den çizilen bir kesen çemberi A ve B\'de kesiyor ve |PA| = 4 birimdir (A, P\'ye yakın). |PB| kaç birimdir?',
      choices: { A: '6', B: '8', C: '9', D: '10', E: '12' }, answer: 'C',
      setup: { mode: 'kesen', r: 2.5, d: 6.5, tP: 0, delta: 0 },
      build: 'Konu: Dış nokta. r = 2,5 ve d = 6,5 yap (|PT| = 6 olur); sapma 0° iken |PA| = 4.',
      look: '|PT|² ile |PA|·|PB| satırları eşit; keseni döndürsen de çarpım 36 kalır.',
      explanation: '|PT|² = |PA|·|PB| → 36 = 4·|PB| → |PB| = 9.',
      rule: 'Dış noktanın kuvveti: |PT|² = |PA|·|PB| = |PO|² − r².' },
  ],
  tips: [
    { title: 'Çevre açı ve merkez açı', see: 'Merkez O, çember üzerinde üç nokta', look: 'Merkez – çevre açı modu.', rule: 'Merkez açı = yay; çevre açı = yay/2. Çapı gören çevre açı 90°.', trap: 'C küçük yaya geçerse büyük yayı görür.' },
    { title: 'Teğet', see: '"teğet", "değme noktası"', look: 'Teğet – kiriş modu.', rule: 'Teğet yarıçapa diktir. Teğet–kiriş açısı = yay/2. Bir noktadan çizilen iki teğet parçası eşittir.' },
    { title: 'Kirişler ve kuvvet', see: 'Kesişen kirişler, dış noktadan kesen', look: 'Kesişen kirişler ve dış nokta modları.', rule: 'İçte: AP·PB = CP·PD. Dışta: PT² = PA·PB.', trap: 'Dış kesende PB tüm kesen uzunluğudur (PA + AB), AB değil.' },
    { title: 'Yay ve dilim', see: '"yay uzunluğu", "daire dilimi"', look: 'Yay ve dilim modu.', rule: 'Yay = 2πr·θ/360, dilim = πr²·θ/360.' },
  ],
};
