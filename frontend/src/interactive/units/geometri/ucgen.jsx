import { useState } from 'react';
import Plot from '../../kit/Plot.jsx';
import { Choice, LabGrid, Note, NumberField, Panel, Readouts, Slider, Steps, Toggle } from '../../kit/controls.jsx';
import { add, dist, foot, lerp, mid, placeBySides, quadInfo, sub, triangleInfo } from '../../kit/geometry.js';
import { fractionText } from '../../kit/mathExpr.js';
import { fmt } from '../../kit/num.js';

const NAMES = ['A', 'B', 'C', 'D'];
const COLOR = ['red', 'blue', 'green', 'warn'];

/** √ ile tam yazım: 4,8 → 24/5; 3,1623 → √10 (karesi tam sayıysa). */
export function niceLength(value) {
  const square = value * value;
  if (Math.abs(value * 60 - Math.round(value * 60)) < 1e-6) return fractionText(value);
  if (Math.abs(square - Math.round(square)) < 1e-6) {
    let inside = Math.round(square); let outside = 1;
    for (let k = Math.floor(Math.sqrt(inside)); k > 1; k -= 1) if (inside % (k * k) === 0) { outside = k; inside /= k * k; break; }
    return `${outside > 1 ? outside : ''}√${inside} ≈ ${fmt(value, 3)}`;
  }
  return fmt(value, 3);
}

function fitView(points) {
  const xs = points.map((p) => p[0]); const ys = points.map((p) => p[1]);
  const pad = 1.5;
  let x0 = Math.min(...xs) - pad; let x1 = Math.max(...xs) + pad; let y0 = Math.min(...ys) - pad; let y1 = Math.max(...ys) + pad;
  const w = Math.max(x1 - x0, (y1 - y0) * 1.3, 8); const h = Math.max(y1 - y0, w / 1.6);
  const cx = (x0 + x1) / 2; const cy = (y0 + y1) / 2;
  x0 = Math.floor(cx - w / 2); x1 = Math.ceil(cx + w / 2); y0 = Math.floor(cy - h / 2); y1 = Math.ceil(cy + h / 2);
  return { x: [x0, x1], y: [y0, y1] };
}

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const [sides, setSides] = useState({ a: 10, b: 9, c: 6 });
  const pts = s.quad ? s.pts : s.pts.slice(0, 3);
  const [A, B, C] = pts;
  const view = fitView(pts);
  const items = [{ type: 'poly', points: pts, closed: true, color: 'navy', fill: 'navy', fillOpacity: 0.08, width: 2.6 }];
  let readouts; let steps = []; let notes = null;

  if (!s.quad) {
    const t = triangleInfo(A, B, C);
    const vi = NAMES.indexOf(s.vertex);
    const V = pts[vi]; const P = pts[(vi + 1) % 3]; const Q = pts[(vi + 2) % 3];
    const opp = dist(P, Q); const s1 = dist(V, P); const s2 = dist(V, Q);
    const sideName = { A: 'a', B: 'b', C: 'c' }[s.vertex];
    items.push({ type: 'angle', at: A, from: B, to: C, label: `${fmt(t.alpha, 1)}°`, color: 'red', r: 24, right: true });
    items.push({ type: 'angle', at: B, from: C, to: A, label: `${fmt(t.beta, 1)}°`, color: 'blue', r: 24, right: true });
    items.push({ type: 'angle', at: C, from: A, to: B, label: `${fmt(t.gamma, 1)}°`, color: 'green', r: 24, right: true });
    const sideLabel = (p, q, text) => { const m = mid(p, q); const n = sub(m, t.G); const len = Math.hypot(...n) || 1; return { type: 'text', x: m[0] + (n[0] / len) * 0.45, y: m[1] + (n[1] / len) * 0.45, text, anchor: 'middle', color: 'ink' }; };
    items.push(sideLabel(B, C, `a = ${fmt(t.a, 2)}`), sideLabel(C, A, `b = ${fmt(t.b, 2)}`), sideLabel(A, B, `c = ${fmt(t.c, 2)}`));
    if (s.median) {
      const M = mid(P, Q);
      items.push({ type: 'segment', from: V, to: M, color: 'green', width: 2.2 }, { type: 'point', x: M[0], y: M[1], color: 'green', r: 4, label: 'M' });
      steps.push(`Kenarortay V_${sideName}: ${sideName === 'a' ? 'V_a^2 = (2b^2 + 2c^2 − a^2)/4' : 'karşı kenarın orta noktasına'} → |${s.vertex}M| = ${niceLength(dist(V, M))}`);
    }
    if (s.bisector) {
      const D = lerp(P, Q, s1 / (s1 + s2));
      items.push({ type: 'segment', from: V, to: D, color: 'warn', width: 2.2 }, { type: 'point', x: D[0], y: D[1], color: 'warn', r: 4, label: 'D' });
      steps.push(`Açıortay teoremi: |${NAMES[(vi + 1) % 3]}D| / |D${NAMES[(vi + 2) % 3]}| = |${s.vertex}${NAMES[(vi + 1) % 3]}| / |${s.vertex}${NAMES[(vi + 2) % 3]}| = ${fmt(s1, 2)} / ${fmt(s2, 2)} → |${NAMES[(vi + 1) % 3]}D| = ${niceLength(dist(P, D))}, |D${NAMES[(vi + 2) % 3]}| = ${niceLength(dist(D, Q))}`);
    }
    if (s.altitude) {
      const H = foot(V, P, Q);
      items.push({ type: 'segment', from: V, to: H, color: 'blue', width: 2.2, dashed: true }, { type: 'point', x: H[0], y: H[1], color: 'blue', r: 4, label: 'H' });
      items.push({ type: 'segment', from: P, to: H, color: 'line', dashed: true, width: 1.2 }, { type: 'segment', from: Q, to: H, color: 'line', dashed: true, width: 1.2 });
      steps.push(`Yükseklik: h = 2·Alan / taban = 2·${fmt(t.area, 2)} / ${fmt(opp, 2)} = ${niceLength((2 * t.area) / opp)}`);
      if (t.rightAt === s.vertex) {
        const p = dist(P, H); const k = dist(H, Q);
        steps.push(`Öklid: h^2 = p·k → ${fmt(dist(V, H) ** 2, 2)} = ${fmt(p, 2)}·${fmt(k, 2)}; ${NAMES[(vi + 1) % 3]}'den: kenar^2 = p·hipotenüs`);
      }
    }
    if (s.centroid) { items.push({ type: 'point', x: t.G[0], y: t.G[1], color: 'green', r: 5, label: 'G' }); steps.push('Ağırlık merkezi G kenarortayları köşeden 2 : 1 böler.'); }
    if (s.incircle) { items.push({ type: 'circle', cx: t.I[0], cy: t.I[1], r: t.r, color: 'warn', width: 1.8 }, { type: 'point', x: t.I[0], y: t.I[1], color: 'warn', r: 4, label: 'I' }); steps.push(`İç teğet çember: r = Alan / u = ${fmt(t.area, 2)} / ${fmt(t.u, 2)} = ${niceLength(t.r)}`); }
    if (s.circumcircle && t.O) { items.push({ type: 'circle', cx: t.O[0], cy: t.O[1], r: t.R, color: 'blue', width: 1.6, dashed: true }, { type: 'point', x: t.O[0], y: t.O[1], color: 'blue', r: 4, label: 'O' }); steps.push(`Çevrel çember: R = abc / (4·Alan) = ${niceLength(t.R)}${t.byAngle === 'dik' ? ' (dik üçgende R = hipotenüs / 2)' : ''}`); }
    if (s.parallel) {
      const D = lerp(A, B, s.k); const E = lerp(A, C, s.k);
      items.push({ type: 'poly', points: [A, D, E], closed: true, color: 'red', fill: 'red', fillOpacity: 0.16, width: 2 });
      items.push({ type: 'point', x: D[0], y: D[1], color: 'red', r: 4, label: 'D' }, { type: 'point', x: E[0], y: E[1], color: 'red', r: 4, label: 'E' });
      const small = t.area * s.k * s.k;
      steps.push(`DE ∥ BC, benzerlik oranı k = |AD|/|AB| = ${fractionText(s.k)} → |DE| = k·a = ${niceLength(s.k * t.a)}`);
      steps.push(`Alan oranı k^2 = ${fractionText(s.k * s.k)} → A(ADE) = ${fmt(small, 3)}, A(DBCE) = ${fmt(t.area - small, 3)}`);
    }
    if (t.rightAt) steps.push(`Pisagor (dik açı ${t.rightAt}'da): ${t.rightAt === 'A' ? 'a^2 = b^2 + c^2' : t.rightAt === 'B' ? 'b^2 = a^2 + c^2' : 'c^2 = a^2 + b^2'} → ${fmt(Math.max(t.a, t.b, t.c) ** 2, 2)} = ${fmt(t.a ** 2 + t.b ** 2 + t.c ** 2 - Math.max(t.a, t.b, t.c) ** 2, 2)}`);
    readouts = <Readouts title="Ölçüler (canlı)" items={[
      ['Kenarlar', `a = ${niceLength(t.a)} · b = ${niceLength(t.b)} · c = ${niceLength(t.c)}`],
      ['Açılar', `${fmt(t.alpha, 2)}° + ${fmt(t.beta, 2)}° + ${fmt(t.gamma, 2)}° = ${fmt(t.alpha + t.beta + t.gamma, 1)}°`],
      ['Tür', `${t.bySide}, ${t.byAngle}${t.rightAt ? ` (dik açı ${t.rightAt})` : ''}`],
      ['Alan', `${niceLength(t.area)} (½·taban·yükseklik)`, 'ok'],
      ['Çevre', niceLength(t.perimeter)],
      ['Üçgen eşitsizliği', `|b − c| < a < b + c → ${fmt(Math.abs(t.b - t.c), 2)} < ${fmt(t.a, 2)} < ${fmt(t.b + t.c, 2)}`],
    ]} />;
    if (t.degenerate) notes = <Note tone="bad">Üç nokta doğrusal: üçgen oluşmuyor.</Note>;
  } else {
    const q = quadInfo(...pts);
    items.push({ type: 'segment', from: pts[0], to: pts[2], color: 'green', dashed: true }, { type: 'segment', from: pts[1], to: pts[3], color: 'green', dashed: true });
    pts.forEach((p, i) => items.push({ type: 'angle', at: p, from: pts[(i + 3) % 4], to: pts[(i + 1) % 4], label: `${fmt(q.angles[i], 1)}°`, color: COLOR[i], r: 22, right: true }));
    if (q.O) items.push({ type: 'point', x: q.O[0], y: q.O[1], color: 'green', r: 4, label: 'K' });
    readouts = <Readouts title="Dörtgen (canlı)" items={[
      ['Tür', q.type, 'ok'],
      ['Kenarlar AB, BC, CD, DA', q.sides.map((x) => fmt(x, 2)).join(' · ')],
      ['Açılar toplamı', `${fmt(q.angles.reduce((p, x) => p + x, 0), 1)}°`],
      ['Köşegenler AC, BD', `${niceLength(q.diag1)} · ${niceLength(q.diag2)}${q.perpendicularDiagonals ? ' (dik kesişir)' : ''}`],
      ['Alan', niceLength(q.area), 'ok'],
    ]} />;
    steps = ['Paralelkenar: karşılıklı kenarlar paralel ve eşit; köşegenler birbirini ortalar.', 'Eşkenar dörtgen ve karede köşegenler diktir; alan = e·f / 2.', 'Yamuk: yalnız bir çift kenar paralel; alan = (alt + üst)/2 · h.'];
  }
  pts.forEach((p, i) => items.push({ type: 'point', x: p[0], y: p[1], color: COLOR[i], label: `${NAMES[i]}(${fmt(p[0], 1)}; ${fmt(p[1], 1)})`, dx: 10, dy: -10, snap: s.snap ? 0.5 : 0.01,
    onDrag: (x, y) => set({ pts: s.pts.map((old, k) => (k === i ? [x, y] : old)) }), aria: `${NAMES[i]} köşesi` }));
  const buildSSS = () => {
    const placed = placeBySides(sides.a, sides.b, sides.c);
    if (!placed) return;
    const shift = [1, 1];
    set({ quad: false, pts: [add(placed.A, shift), add(placed.B, shift), add(placed.C, shift), s.pts[3]] });
  };
  const sssValid = !!placeBySides(sides.a, sides.b, sides.c);
  return <LabGrid visual={<>
    <Plot x={view.x} y={view.y} width={680} equal items={items} xTickStep={1} yTickStep={1} ariaLabel="Üçgen" />
    {readouts}
    {notes}
  </>} side={<>
    <Panel title="Şekil">
      <Choice options={[{ value: false, label: 'Üçgen' }, { value: true, label: 'Dörtgen' }]} value={s.quad} onChange={(quad) => set({ quad })} />
      <Toggle label="Izgaraya oturt (0,5)" checked={s.snap} onChange={(snap) => set({ snap })} />
    </Panel>
    {!s.quad && <>
      <Panel title="Kenarlardan kur (SSS)">
        <div className="kit-row">
          <NumberField label="a = |BC|" value={sides.a} onChange={(a) => setSides({ ...sides, a })} width={96} />
          <NumberField label="b = |CA|" value={sides.b} onChange={(b) => setSides({ ...sides, b })} width={96} />
          <NumberField label="c = |AB|" value={sides.c} onChange={(c) => setSides({ ...sides, c })} width={96} />
        </div>
        <button type="button" className="btn btn-secondary btn-sm" disabled={!sssValid} onClick={buildSSS}>{sssValid ? 'Bu kenarlarla çiz' : 'Üçgen eşitsizliği sağlanmıyor'}</button>
      </Panel>
      <Panel title="Özel doğrular">
        <Choice label="Köşe" options={['A', 'B', 'C'].map((v) => ({ value: v, label: v }))} value={s.vertex} onChange={(vertex) => set({ vertex })} />
        <div className="kit-chips">
          <Toggle label="Kenarortay" checked={s.median} onChange={(median) => set({ median })} />
          <Toggle label="Açıortay" checked={s.bisector} onChange={(bisector) => set({ bisector })} />
          <Toggle label="Yükseklik" checked={s.altitude} onChange={(altitude) => set({ altitude })} />
          <Toggle label="Ağırlık merkezi" checked={s.centroid} onChange={(centroid) => set({ centroid })} />
          <Toggle label="İç teğet çember" checked={s.incircle} onChange={(incircle) => set({ incircle })} />
          <Toggle label="Çevrel çember" checked={s.circumcircle} onChange={(circumcircle) => set({ circumcircle })} />
        </div>
      </Panel>
      <Panel title="Benzerlik: DE ∥ BC">
        <Toggle label="Paralel doğruyu göster" checked={s.parallel} onChange={(parallel) => set({ parallel })} />
        {s.parallel && <Slider label="k = |AD| / |AB|" value={s.k} min={0.1} max={0.9} step={1 / 12} digits={3} onChange={(k) => set({ k })} />}
      </Panel>
    </>}
    {steps.length > 0 && <Steps title="Bağıntılar (değerlerle)" lines={steps} />}
  </>} />;
}

const tri = (a, b, c) => { const p = placeBySides(a, b, c); return [add(p.A, [1, 1]), add(p.B, [1, 1]), add(p.C, [1, 1]), [3, 7]]; };
const initial = { pts: [[2, 5], [0, 0], [7, 0], [8, 5]], quad: false, snap: true, vertex: 'A', median: false, bisector: false, altitude: false, centroid: false, incircle: false, circumcircle: false, parallel: false, k: 2 / 3 };

export default {
  Lab,
  initial,
  intro: 'Köşeleri sürükle ya da üç kenarı yazıp "Bu kenarlarla çiz" de. Açılar, kenarlar, alan ve seçtiğin özel doğruların uzunlukları formülleriyle birlikte canlı hesaplanır.',
  questions: [
    { id: 'oklid', title: 'Dik üçgende hipotenüse yükseklik', exam: 'TYT', topic: 'Dik üçgen',
      stem: 'ABC dik üçgeninde m(BÂC) = 90°, |AB| = 6 cm ve |AC| = 8 cm\'dir. [AH] ⊥ [BC] olduğuna göre |AH| kaç cm\'dir?',
      choices: { A: '4', B: '4,5', C: '4,8', D: '5', E: '5,2' }, answer: 'C',
      setup: { pts: [[1, 1], [1, 7], [9, 1], [3, 7]], vertex: 'A', altitude: true },
      build: 'Köşeleri A(1; 1), B(1; 7), C(9; 1) yap (dik açı A\'da, |AB| = 6, |AC| = 8). Köşe A, "Yükseklik" açık.',
      look: '"Yükseklik" satırı h = 2·Alan / taban formülünü değerlerle gösterir; Öklid bağıntısını da oku.',
      explanation: 'Hipotenüs |BC| = √(36 + 64) = 10. Alan = 6·8/2 = 24.\nAynı alanı BC tabanıyla yaz: 24 = 10·|AH|/2 → |AH| = 4,8.',
      rule: 'Dik üçgende hipotenüse ait yükseklik = (dik kenarların çarpımı) / hipotenüs.' },
    { id: 'aciortay', title: 'Açıortay teoremi', exam: 'TYT', topic: 'Üçgende açıortay',
      stem: 'ABC üçgeninde |AB| = 6 cm, |AC| = 9 cm, |BC| = 10 cm\'dir. A köşesinden çizilen iç açıortay BC kenarını D noktasında kestiğine göre |BD| kaç cm\'dir?',
      choices: { A: '3', B: '3,5', C: '4', D: '4,5', E: '5' }, answer: 'C',
      setup: { pts: tri(10, 9, 6), vertex: 'A', bisector: true },
      build: '"Kenarlardan kur" ile a = 10, b = 9, c = 6 gir ve çiz; köşe A, "Açıortay" açık.',
      look: 'Açıortay teoremi satırı: |BD| / |DC| = |AB| / |AC| = 6 / 9.',
      explanation: '|BD| / |DC| = 6 / 9 = 2 / 3. BC = 10 parçası 2 : 3 oranında bölünür → |BD| = 10·2/5 = 4.',
      rule: 'İç açıortay karşı kenarı, açıyı oluşturan kenarlar oranında böler.' },
    { id: 'benzerlik', title: 'Paralel doğru ve alan oranı', exam: 'TYT', topic: 'Benzerlik',
      stem: 'ABC üçgeninde D ∈ [AB], E ∈ [AC] ve DE ∥ BC\'dir. |AD| = 2|DB| ve A(ABC) = 27 cm² olduğuna göre DBCE dörtgeninin alanı kaç cm²\'dir?',
      choices: { A: '9', B: '12', C: '15', D: '18', E: '21' }, answer: 'C',
      setup: { pts: [[3, 7], [0, 1], [9, 1], [8, 5]], parallel: true, k: 2 / 3 },
      build: '"Paralel doğruyu göster" anahtarını aç; k = |AD| / |AB| = 2/3 yap (|AD| = 2|DB| ise AD : AB = 2 : 3).',
      look: 'Alan oranı satırı k^2 = 4/9 verir. Üçgenin şekli değişse de A(DBCE) / A(ABC) oranı 5/9 kalır; köşeleri sürükleyip dene.',
      explanation: 'Benzerlik oranı k = 2/3 → alanlar oranı k^2 = 4/9. A(ADE) = 27·4/9 = 12.\nA(DBCE) = 27 − 12 = 15.',
      rule: 'Benzer üçgenlerde uzunluk oranı k ise alan oranı k^2. Oranı AD/DB değil, AD/AB üzerinden kur.' },
    { id: 'kenarortay', title: 'Kenarortay uzunluğu', exam: 'TYT', topic: 'Üçgende kenarortay',
      stem: 'ABC üçgeninde |AB| = 4 cm, |AC| = 6 cm, |BC| = 8 cm\'dir. A köşesinden çizilen kenarortayın uzunluğu kaç cm\'dir?',
      choices: { A: '√6', B: '2√2', C: '√10', D: '2√3', E: '4' }, answer: 'C',
      setup: { pts: tri(8, 6, 4), vertex: 'A', median: true, snap: false },
      build: '"Kenarlardan kur": a = 8, b = 6, c = 4; köşe A, "Kenarortay" açık.',
      look: 'Kenarortay satırındaki uzunluğu oku (karesi tam sayıysa √ ile yazılır).',
      explanation: 'V_a^2 = (2b^2 + 2c^2 − a^2) / 4 = (72 + 32 − 64) / 4 = 10 → V_a = √10.',
      rule: 'Kenarortay: V_a^2 = (2b^2 + 2c^2 − a^2) / 4. a, kenarortayın indiği kenardır.' },
    { id: 'dortgen', title: 'Koordinatlarla dörtgen', exam: 'TYT', topic: 'Özel dörtgenler',
      stem: 'Köşeleri A(0, 0), B(6, 0), C(8, 4) ve D(2, 4) olan ABCD dörtgeninin alanı kaç birimkaredir?',
      choices: { A: '20', B: '22', C: '24', D: '26', E: '28' }, answer: 'C',
      setup: { quad: true, pts: [[0, 0], [6, 0], [8, 4], [2, 4]] },
      build: 'Şekil: Dörtgen. Köşeleri A(0; 0), B(6; 0), C(8; 4), D(2; 4) yap.',
      look: 'Tür satırı "paralelkenar" diyor mu? Alanı taban·yükseklik ile karşılaştır.',
      explanation: 'AB ∥ DC (ikisi de yatay, uzunluk 6) ve AD ∥ BC (eğim 2) → paralelkenar.\nAlan = taban · yükseklik = 6 · 4 = 24.',
      rule: 'Önce türü tanı (paralel kenarlar); paralelkenarın alanı taban × yükseklik.' },
  ],
  tips: [
    { title: 'Alanı iki yoldan yaz', see: 'Yükseklik, dik üçgen, "hipotenüse ait yükseklik"', look: 'Yükseklik + alan satırı.', rule: 'Aynı alanı farklı taban–yükseklik çiftleriyle eşitle: a·h_a = b·h_b = c·h_c.' },
    { title: 'Açıortay', see: '"açıortay", "açıyı iki eş parçaya böler"', look: 'Açıortay teoremi satırı.', rule: 'İç açıortay karşı kenarı komşu kenarlar oranında böler: |BD|/|DC| = |AB|/|AC|.' },
    { title: 'Benzerlik ve paralellik', see: '"DE ∥ BC", "benzer üçgenler"', look: 'Paralel doğru + k kaydırıcısı.', rule: 'Uzunluk oranı k → alan oranı k^2.', trap: 'AD/DB = 2 ise k = AD/AB = 2/3, k = 2 değil.' },
    { title: 'Kenarortay ve ağırlık merkezi', see: '"kenarortay", "ağırlık merkezi G"', look: 'Kenarortay + ağırlık merkezi.', rule: 'V_a^2 = (2b^2 + 2c^2 − a^2)/4; G kenarortayı köşeden 2 : 1 böler. Dik üçgende hipotenüse ait kenarortay = hipotenüs/2.' },
    { title: 'Dörtgen türleri', see: 'Koordinatlı köşeler, paralel kenarlar', look: 'Dörtgen modu: tür ve köşegenler.', rule: 'Paralelkenar: alan taban × yükseklik; eşkenar dörtgen/kare: köşegenler dik, alan e·f/2.' },
  ],
};
