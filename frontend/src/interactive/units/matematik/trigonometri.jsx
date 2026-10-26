import Plot from '../../kit/Plot.jsx';
import { Choice, LabGrid, MathText, Panel, Readouts, Slider, Steps, Toggle } from '../../kit/controls.jsx';
import { fractionText } from '../../kit/mathExpr.js';
import { fmt } from '../../kit/num.js';
import { exactValue, reduce } from './trigEngine.js';

const QUADRANT_SIGNS = { 1: 'hepsi +', 2: 'yalnız sin +', 3: 'tan ve cot +', 4: 'yalnız cos +' };

const piText = (multiple) => {
  if (Math.abs(multiple) < 1e-9) return '0';
  const f = fractionText(multiple, 24).replace('−', '-');
  const [top, bottom] = f.split('/');
  const sign = top.startsWith('-') ? '−' : '';
  const t = top.replace('-', '');
  return `${sign}${t === '1' ? '' : t}π${bottom ? `/${bottom}` : ''}`;
};

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const rad = (s.angle * Math.PI) / 180;
  const c = Math.cos(rad); const sn = Math.sin(rad);
  const { quadrant, ref, a } = reduce(s.angle);
  const vals = Object.fromEntries(['sin', 'cos', 'tan', 'cot'].map((fn) => [fn, exactValue(fn, s.angle)]));
  const tanY = Math.abs(c) > 1e-6 ? sn / c : null;
  const cotX = Math.abs(sn) > 1e-6 ? c / sn : null;
  const equal = Math.abs(sn - c) < 0.012;
  const circleItems = [
    { type: 'circle', cx: 0, cy: 0, r: 1, color: 'black', width: 2 },
    { type: 'sector', cx: 0, cy: 0, r: 0.22, from: 0, to: a, color: 'navy', opacity: 0.18 },
    { type: 'segment', from: [0, 0], to: [c, sn], color: 'navy', width: 2.4 },
    { type: 'segment', from: [0, 0], to: [c, 0], color: 'red', width: 5 },
    { type: 'segment', from: [c, 0], to: [c, sn], color: 'blue', width: 5 },
    { type: 'text', x: c / 2, y: 0, text: `cos ${vals.cos.text}`, dy: sn >= 0 ? 18 : -8, anchor: 'middle', color: 'red' },
    { type: 'text', x: c, y: sn / 2, text: `sin ${vals.sin.text}`, dx: c >= 0 ? 8 : -8, anchor: c >= 0 ? 'start' : 'end', color: 'blue' },
    { type: 'text', x: 0.62, y: 0.62, text: 'I: hepsi +', small: true, color: 'ink' }, { type: 'text', x: -1.12, y: 0.62, text: 'II: sin +', small: true, color: 'ink' },
    { type: 'text', x: -1.12, y: -0.7, text: 'III: tan, cot +', small: true, color: 'ink' }, { type: 'text', x: 0.62, y: -0.7, text: 'IV: cos +', small: true, color: 'ink' },
  ];
  if (s.showTan) {
    circleItems.push({ type: 'segment', from: [1, -1.6], to: [1, 1.6], color: 'line', width: 1.5 });
    circleItems.push({ type: 'segment', from: [-1.6, 1], to: [1.6, 1], color: 'line', width: 1.5 });
    if (tanY !== null && Math.abs(tanY) < 1.6) {
      circleItems.push({ type: 'segment', from: [0, 0], to: [1, tanY], color: 'green', dashed: true, width: 1.4 });
      circleItems.push({ type: 'segment', from: [1, 0], to: [1, tanY], color: 'green', width: 5 });
      circleItems.push({ type: 'text', x: 1, y: tanY, text: `tan ${vals.tan.text}`, dx: 8, color: 'green' });
    }
    if (cotX !== null && Math.abs(cotX) < 1.6) {
      circleItems.push({ type: 'segment', from: [0, 1], to: [cotX, 1], color: 'warn', width: 5 });
      circleItems.push({ type: 'text', x: cotX, y: 1, text: `cot ${vals.cot.text}`, dy: -8, anchor: 'middle', color: 'warn' });
    }
  }
  if (s.showDiag) circleItems.push({ type: 'segment', from: [-1.4, -1.4], to: [1.4, 1.4], color: 'warn', dashed: true, width: 1.4 });
  circleItems.push({ type: 'point', x: c, y: sn, color: equal && s.showDiag ? 'warn' : 'navy', label: `P (${fmt(c, 3)}; ${fmt(sn, 3)})`, onDrag: (px, py) => {
    const deg = (Math.atan2(py, px) * 180) / Math.PI;
    set({ angle: Math.round(((deg % 360) + 360) % 360) });
  }, aria: 'Birim çember üzerindeki nokta' });

  const fnOf = (x) => (s.fn === 'sin' ? Math.sin(x) : s.fn === 'cos' ? Math.cos(x) : Math.tan(x));
  const C = s.Cpi * Math.PI;
  const g = (x) => s.A * fnOf(s.B * x + C) + s.D;
  const period = s.fn === 'tan' ? Math.PI / Math.abs(s.B) : (2 * Math.PI) / Math.abs(s.B);
  const amp = Math.abs(s.A);
  const yMax = s.fn === 'tan' ? 6 : Math.max(2, amp + Math.abs(s.D) + 0.8);
  const x0 = rad > 2 * Math.PI ? rad - 2 * Math.PI : rad;
  const graphItems = [
    { type: 'fn', f: g, color: 'blue', width: 3 },
    s.fn !== 'tan' && { type: 'hline', y: s.D + amp, color: 'green' }, s.fn !== 'tan' && { type: 'hline', y: s.D - amp, color: 'green' },
    { type: 'vline', x: x0, color: 'navy' },
  ].filter(Boolean);
  if (s.A === 1 && s.B === 1 && s.Cpi === 0 && s.D === 0 && s.fn !== 'tan') graphItems.push({ type: 'point', x: x0, y: fnOf(x0), color: 'navy', label: `${s.fn} ${fmt(s.angle)}° = ${fmt(fnOf(x0), 3)}` });
  const fnName = { sin: 'sin', cos: 'cos', tan: 'tan' }[s.fn];
  const eqText = `y = ${s.A === 1 ? '' : s.A === -1 ? '−' : fmt(s.A, 2)}${fnName}(${s.B === 1 ? '' : fmt(s.B, 2)}x${s.Cpi ? ` ${s.Cpi < 0 ? '−' : '+'} ${piText(Math.abs(s.Cpi))}` : ''})${s.D ? ` ${s.D < 0 ? '−' : '+'} ${fmt(Math.abs(s.D), 2)}` : ''}`;
  const reductionLine = quadrant === 1 ? `${fmt(s.angle)}° zaten dar açı.` : `${fmt(a)}° = ${quadrant === 2 ? `180° − ${fmt(ref)}°` : quadrant === 3 ? `180° + ${fmt(ref)}°` : `360° − ${fmt(ref)}°`} → sin ${fmt(a)}° = ${vals.sin.value < -1e-12 ? '−' : ''}sin ${fmt(ref)}° (${QUADRANT_SIGNS[quadrant]})`;

  return <LabGrid visual={<>
    <div className="kit-row trig-row">
      <div className="trig-circle"><Plot x={[-1.6, 1.6]} y={[-1.6, 1.6]} width={460} equal items={circleItems} xTickStep={0.5} yTickStep={0.5} ariaLabel="Birim çember" /></div>
    </div>
    <Plot x={[-2 * Math.PI, 2 * Math.PI]} y={[-yMax, yMax]} height={300} piTicks items={graphItems} xLabel="x" yLabel="y" ariaLabel="Trigonometrik fonksiyon grafiği" />
    <Readouts title="Grafik (canlı)" items={[
      ['Denklem', <MathText key="e" text={eqText} />],
      ['Esas periyot', `${piText(period / Math.PI)}  (${s.fn === 'tan' ? 'π' : '2π'} / |B|)`],
      s.fn !== 'tan' && ['En büyük / en küçük değer', `${fmt(s.D + amp, 2)} / ${fmt(s.D - amp, 2)}  (D ± |A|)`],
      s.fn !== 'tan' && ['Genlik', fmt(amp, 2)],
      ['Yatay kayma', s.Cpi ? `${piText(Math.abs(s.Cpi / s.B))} ${s.Cpi / s.B > 0 ? 'sola' : 'sağa'}` : 'yok'],
    ]} />
  </>} side={<>
    <Panel title="Açı">
      <Slider label="α (derece)" value={s.angle} min={0} max={360} step={1} unit="°" onChange={(angle) => set({ angle })} />
      <div className="kit-chips">{[0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330].map((d) => <button key={d} type="button" className="ml-event-chip" onClick={() => set({ angle: d })}>{d}°</button>)}</div>
      <div className="kit-chips"><Toggle label="tan / cot doğruları" checked={s.showTan} onChange={(showTan) => set({ showTan })} />
        <Toggle label="y = x doğrusu (sin = cos)" checked={s.showDiag} onChange={(showDiag) => set({ showDiag })} /></div>
    </Panel>
    <Readouts title="Birim çember (canlı)" items={[
      ['Açı', `${fmt(s.angle)}° = ${piText(s.angle / 180)} rad`],
      ['Bölge', `${quadrant}. bölge (${QUADRANT_SIGNS[quadrant]})`],
      ['Referans (dar) açı', `${fmt(ref)}°`],
      ['sin α', vals.sin.text, 'ok'], ['cos α', vals.cos.text, 'ok'], ['tan α', vals.tan.text], ['cot α', vals.cot.text],
      ['sin²α + cos²α', fmt(sn * sn + c * c, 4)],
      s.showDiag && ['sin = cos ?', equal ? 'EVET (P, y = x doğrusunda)' : `fark ${fmt(sn - c, 3)}`, equal ? 'warn' : undefined],
    ]} />
    <Steps title="İndirgeme" lines={[reductionLine, 'cos α = P\'nin apsisi, sin α = ordinatı; tan α = sin/cos (x = 1 teğetinde okunur).']} />
    <Panel title="y = A · f(Bx + C) + D">
      <Choice label="f" options={[{ value: 'sin', label: 'sin' }, { value: 'cos', label: 'cos' }, { value: 'tan', label: 'tan' }]} value={s.fn} onChange={(fn) => set({ fn })} />
      <Slider label="A" value={s.A} min={-4} max={4} step={0.5} onChange={(A) => set({ A })} />
      <Slider label="B" value={s.B} min={-4} max={4} step={0.5} onChange={(B) => set({ B: B === 0 ? 0.5 : B })} />
      <Slider label={`C = ${piText(s.Cpi)}`} value={s.Cpi} min={-2} max={2} step={1 / 12} digits={3} unit="·π" onChange={(Cpi) => set({ Cpi })} />
      <Slider label="D" value={s.D} min={-4} max={4} step={0.5} onChange={(D) => set({ D })} />
    </Panel>
  </>} />;
}

const initial = { angle: 150, showTan: true, showDiag: false, fn: 'sin', A: 1, B: 1, Cpi: 0, D: 0 };

export default {
  Lab,
  initial,
  intro: 'P noktasını çember üzerinde sürükle ya da açıyı yaz: cos (kırmızı) ve sin (mavi) doğru parçaları, işaretler ve tam değerler canlı değişir. Alttaki grafikte A, B, C, D ile periyot, genlik ve kaymayı dene.',
  questions: [
    { id: 'indirgeme', title: 'sin 150° + cos 240°', exam: 'TYT', topic: 'Trigonometri',
      stem: 'sin 150° + cos 240° toplamının değeri kaçtır?',
      choices: { A: '−1', B: '−1/2', C: '0', D: '1/2', E: '1' }, answer: 'C',
      setup: { angle: 150 },
      build: 'Açıyı 150° yap ve sin değerini oku; sonra 240° yapıp cos değerini oku.',
      look: 'İki açının referans açısı da 30° ve 60°. Bölge işaretlerine dikkat: 150° II. bölge (sin +), 240° III. bölge (cos −).',
      explanation: 'sin 150° = sin(180° − 30°) = sin 30° = 1/2.\ncos 240° = cos(180° + 60°) = −cos 60° = −1/2. Toplam 0.',
      rule: 'Önce bölgeyi bul (işaret), sonra referans dar açının değerini yaz.' },
    { id: 'periyot', title: 'En büyük değer ve periyot', exam: 'AYT', topic: 'Trigonometri',
      stem: 'f(x) = 3sin(2x − π/3) + 1 fonksiyonunun en büyük değeri ve esas periyodu sırasıyla aşağıdakilerden hangisidir?',
      choices: { A: '3 ve π', B: '4 ve π', C: '4 ve 2π', D: '3 ve 2π', E: '1 ve π/2' }, answer: 'B',
      setup: { fn: 'sin', A: 3, B: 2, Cpi: -1 / 3, D: 1 },
      build: 'Grafik panelinde f = sin, A = 3, B = 2, C = −π/3 (−0,333·π), D = 1 yap.',
      look: 'Yeşil yatay çizgiler en büyük/en küçük değeri, "Esas periyot" satırı periyodu verir; C yalnız yatay kaydırır.',
      explanation: 'En büyük değer D + |A| = 1 + 3 = 4. Periyot 2π / |B| = 2π / 2 = π.\nC = −π/3 grafiği kaydırır ama periyodu ve en büyük değeri değiştirmez.',
      rule: 'y = A sin(Bx + C) + D: periyot 2π/|B|, değer aralığı [D − |A|, D + |A|]. C yalnız kaydırır.' },
    { id: 'tan-bolge', title: 'tan x = −3/4, II. bölge', exam: 'TYT', topic: 'Dik üçgen ve trigonometri',
      stem: 'tan x = −3/4 ve 90° < x < 180° olduğuna göre sin x + cos x toplamı kaçtır?',
      choices: { A: '−7/5', B: '−1/5', C: '1/5', D: '7/5', E: '−1' }, answer: 'B',
      setup: { angle: 143 },
      build: 'Açıyı ikinci bölgede tan ≈ −0,75 olacak şekilde ayarla (≈ 143°; tam değer 143,13°).',
      look: 'sin ve cos değerlerini oku: 3/5 = 0,6 ve −4/5 = −0,8\'e çok yakın olmalı.',
      explanation: '3-4-5 üçgeni: referans açıda karşı 3, komşu 4, hipotenüs 5.\nII. bölgede sin +, cos −: sin x = 3/5, cos x = −4/5 → toplam −1/5.',
      rule: 'tan verildiğinde dik üçgen kur (Pisagor), işareti bölgeden ver.' },
    { id: 'sin-cos-esit', title: 'sin x = cos x olan açılar', exam: 'AYT', topic: 'Trigonometrik denklemler',
      stem: '0° ≤ x < 360° olmak üzere sin x = cos x eşitliğini sağlayan x değerlerinin toplamı kaç derecedir?',
      choices: { A: '90', B: '180', C: '225', D: '270', E: '360' }, answer: 'D',
      setup: { angle: 30, showDiag: true },
      build: '"y = x doğrusu" anahtarını aç; P\'yi çember üzerinde gezdir.',
      look: 'P, y = x doğrusunun çemberi kestiği iki noktaya geldiğinde "sin = cos? EVET" yazar. İki açıyı oku.',
      explanation: 'sin x = cos x ⇔ tan x = 1 ⇔ P, y = x doğrusu üzerinde.\nÇember bu doğruyu 45° ve 225°\'de keser. Toplam 270°.',
      rule: 'sin x = cos x ⇔ tan x = 1; tan\'ın periyodu 180° olduğundan çözümler 45° + k·180°.' },
  ],
  tips: [
    { title: 'İndirgeme (açıyı küçültme)', see: '150°, 240°, 330° gibi açılar', look: 'Referans açı ve bölge satırı.', rule: '180° ± α ve 360° − α biçiminde yaz; değer referans açınınki, işaret bölgenin.', trap: '90° ± α ve 270° ± α kullanırsan sin ↔ cos değişir.' },
    { title: 'Bölge işaretleri', see: '"90° < x < 180°", "x III. bölgede"', look: 'Çember üzerindeki bölge etiketleri.', rule: 'I: hepsi +, II: sin +, III: tan ve cot +, IV: cos +.' },
    { title: 'Periyot ve değer aralığı', see: 'A sin(Bx + C) + D, "en büyük değer", "periyot"', look: 'Grafik paneli: A, B, C, D.', rule: 'Periyot 2π/|B| (tan için π/|B|); en büyük D + |A|, en küçük D − |A|.', trap: 'C ve D periyodu değiştirmez.' },
    { title: 'Bir oran verildiğinde', see: '"tan x = 3/4 ise", "sin x = 5/13 ise"', look: 'Açıyı o orana getir; diğer oranları oku.', rule: 'Dik üçgen kur, eksik kenarı Pisagor ile bul, işareti bölgeden ver.' },
  ],
};
