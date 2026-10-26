import { useEffect, useRef, useState } from 'react';
import Plot from '../../kit/Plot.jsx';
import { Choice, LabGrid, Note, Panel, Readouts, Slider, Steps, Toggle } from '../../kit/controls.jsx';
import { fmt } from '../../kit/num.js';
import { prefersReducedMotion } from '../../../tutor/visuals/svg.js';
import { GASES, R, solveGas } from './gasEngine.js';

function Container({ state, nA, nB, gasA, gasB, Vmax }) {
  const ref = useRef(null);
  const [particles, setParticles] = useState([]);
  const count = (n) => Math.min(90, Math.max(n > 0 ? 3 : 0, Math.round(n * 30)));
  const height = 40 + 190 * Math.min(1, state.V / Vmax);
  const top = 250 - height;
  useEffect(() => {
    const make = (k, kind) => Array.from({ length: k }, () => ({ kind, x: 30 + Math.random() * 180, y: top + 8 + Math.random() * (height - 16), a: Math.random() * Math.PI * 2 }));
    setParticles([...make(count(nA), 'A'), ...make(count(nB), 'B')]);
  }, [nA, nB]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let frame;
    const tick = () => {
      setParticles((list) => list.map((p) => {
        const mass = GASES[p.kind === 'A' ? gasA : gasB];
        const speed = 0.25 * Math.sqrt(state.T / mass);
        let { x, y, a } = p;
        x += Math.cos(a) * speed; y += Math.sin(a) * speed;
        if (x < 26 || x > 214) { a = Math.PI - a; x = Math.min(214, Math.max(26, x)); }
        if (y < top + 6 || y > 244) { a = -a; y = Math.min(244, Math.max(top + 6, y)); }
        return { ...p, x, y, a };
      }));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state.T, top, gasA, gasB]);
  const gaugeAngle = Math.min(1, state.P / 6) * 240 - 210;
  const tempH = Math.min(1, state.T / 900) * 150;
  return <svg ref={ref} viewBox="0 0 400 270" className="kit-plot gas-svg" role="img" aria-label={`Kap: P ${fmt(state.P, 2)} atm, V ${fmt(state.V, 2)} L, T ${fmt(state.T, 1)} K`}>
    <rect x="0" y="0" width="400" height="270" fill="var(--surface)" />
    <rect x="20" y="20" width="200" height="232" fill="none" stroke="var(--ink)" strokeWidth="3" />
    <rect x="22" y={top} width="196" height={250 - top} fill="var(--tint)" />
    <rect x="18" y={top - 12} width="204" height="12" fill="var(--navy)" />
    <rect x="114" y="0" width="12" height={top - 12} fill="var(--navy)" />
    {particles.map((p, i) => <circle key={i} cx={p.x} cy={Math.max(p.y, top + 5)} r={p.kind === 'A' ? 4.5 : 3.5} fill={p.kind === 'A' ? 'var(--pen-blue)' : 'var(--pen-red)'} />)}
    <text x="120" y="266" textAnchor="middle" className="kit-small">V = {fmt(state.V, 2)} L</text>
    <circle cx="300" cy="80" r="52" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.5" />
    {[0, 1, 2, 3, 4, 5, 6].map((k) => { const ang = ((k / 6) * 240 - 210) * Math.PI / 180; return <g key={k}>
      <line x1={300 + 42 * Math.cos(ang)} y1={80 + 42 * Math.sin(ang)} x2={300 + 50 * Math.cos(ang)} y2={80 + 50 * Math.sin(ang)} stroke="var(--ink)" strokeWidth="2" />
      <text x={300 + 32 * Math.cos(ang)} y={84 + 32 * Math.sin(ang)} textAnchor="middle" className="kit-small">{k}</text></g>; })}
    <line x1="300" y1="80" x2={300 + 40 * Math.cos((gaugeAngle * Math.PI) / 180)} y2={80 + 40 * Math.sin((gaugeAngle * Math.PI) / 180)} stroke="var(--pen-red)" strokeWidth="3.5" />
    <text x="300" y="120" textAnchor="middle" className="kit-label" fill="var(--ink)">{fmt(state.P, 2)} atm</text>
    <rect x="360" y="90" width="16" height="160" rx="8" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
    <rect x="363" y={245 - tempH} width="10" height={tempH} rx="5" fill="var(--pen-red)" />
    <text x="368" y="80" textAnchor="middle" className="kit-small">{fmt(state.T - 273, 0)} °C</text>
  </svg>;
}

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const n = s.mix ? s.nA + s.nB : s.nA;
  const state = solveGas({ solveFor: s.solveFor, P: s.P, V: s.V, T: s.T, n });
  const nTotal = state.n;
  const nA = s.mix ? (s.solveFor === 'n' ? nTotal * (s.nA / (s.nA + s.nB || 1)) : s.nA) : nTotal;
  const nB = s.mix ? nTotal - nA : 0;
  const massA = nA * GASES[s.gasA]; const massB = nB * GASES[s.gasB];
  const molarMix = (massA + massB) / nTotal;
  const density = (state.P * molarMix) / (R * state.T);
  const Vmax = 60;
  const pvItems = [
    { type: 'fn', f: (v) => (nTotal * R * state.T) / v, color: 'blue', width: 2.6, domain: [0.5, 60] },
    { type: 'point', x: state.V, y: state.P, color: 'red', label: `(${fmt(state.V, 1)}; ${fmt(state.P, 2)})` },
  ];
  const vtItems = [
    { type: 'fn', f: (tk) => (nTotal * R * tk) / state.P, color: 'blue', width: 2.6, domain: [0, 1000] },
    { type: 'fn', f: (tk) => (nTotal * R * tk) / state.P, color: 'blue', width: 1.4, dashed: true, domain: [-273, 0] },
    { type: 'point', x: state.T, y: state.V, color: 'red', label: `${fmt(state.T, 0)} K` },
    { type: 'vline', x: 0, color: 'line' },
  ];
  const ptItems = [
    { type: 'fn', f: (tk) => (nTotal * R * tk) / state.V, color: 'blue', width: 2.6, domain: [0, 1000] },
    { type: 'point', x: state.T, y: state.P, color: 'red' },
  ];
  const fixed = { P: 'P', V: 'V', T: 'T', n: 'n' };
  const law = s.solveFor === 'P' ? 'Sabit V\'de P ∝ T (Gay-Lussac), sabit T\'de P ∝ 1/V (Boyle), P ∝ n (Avogadro).'
    : s.solveFor === 'V' ? 'Sabit P\'de V ∝ T (Charles), V ∝ n (Avogadro).' : s.solveFor === 'T' ? 'T = PV / nR.' : 'n = PV / RT (normal koşulda 1 mol = 22,4 L).';
  const sub = (label, key, min, max, step, unit) => s.solveFor === key ? null : <Slider label={label} value={s[key]} min={min} max={max} step={step} unit={unit} onChange={(v) => set({ [key]: v })} />;
  return <LabGrid visual={<>
    <div className="kit-row gas-row">
      <div className="gas-box"><Container state={state} nA={nA} nB={nB} gasA={s.gasA} gasB={s.gasB} Vmax={Vmax} /></div>
      <div className="gas-graphs">
        <Plot x={[0, 60]} y={[0, 8]} height={200} items={pvItems} xLabel="V (L)" yLabel="P (atm)" ariaLabel="P–V grafiği" width={420} />
      </div>
    </div>
    <div className="kit-row gas-row">
      <div className="gas-graphs"><Plot x={[-300, 1000]} y={[0, Math.max(10, state.V * 1.8)]} height={190} items={vtItems} xLabel="T (K)" yLabel="V (L)" ariaLabel="V–T grafiği" width={420} /></div>
      <div className="gas-graphs"><Plot x={[0, 1000]} y={[0, Math.max(4, state.P * 1.8)]} height={190} items={ptItems} xLabel="T (K)" yLabel="P (atm)" ariaLabel="P–T grafiği" width={420} /></div>
    </div>
    <Readouts title="Hesap (canlı)" items={[
      ['Denklem', `P·V = n·R·T → ${fmt(state.P, 3)} · ${fmt(state.V, 3)} = ${fmt(nTotal, 3)} · (22,4/273) · ${fmt(state.T, 1)}`],
      [`Bilinmeyen ${fixed[s.solveFor]}`, s.solveFor === 'P' ? `${fmt(state.P, 3)} atm` : s.solveFor === 'V' ? `${fmt(state.V, 3)} L` : s.solveFor === 'T' ? `${fmt(state.T, 2)} K (${fmt(state.T - 273, 2)} °C)` : `${fmt(state.n, 4)} mol`, 'ok'],
      ['Sıcaklık', `${fmt(state.T, 1)} K = ${fmt(state.T - 273, 1)} °C (T(K) = t(°C) + 273)`],
      ['Kütle', `${fmt(massA + massB, 3)} g`],
      ['Özkütle', `d = P·M / R·T = ${fmt(density, 3)} g/L`],
      s.mix && ['Kısmi basınçlar', `P(${s.gasA}) = ${fmt((nA / nTotal) * state.P, 3)} atm · P(${s.gasB}) = ${fmt((nB / nTotal) * state.P, 3)} atm`, 'ok'],
      s.mix && ['Mol kesirleri', `X(${s.gasA}) = ${fmt(nA / nTotal, 3)} · X(${s.gasB}) = ${fmt(nB / nTotal, 3)}`],
      s.mix && ['Ortalama hız oranı', `v(${s.gasA}) / v(${s.gasB}) = √(${GASES[s.gasB]} / ${GASES[s.gasA]}) = ${fmt(Math.sqrt(GASES[s.gasB] / GASES[s.gasA]), 3)}`],
      ['Ortalama kinetik enerji', `T ile orantılı; gaz türünden bağımsız (${fmt(state.T, 0)} K)`],
    ]} />
  </>} side={<>
    <Panel title="Bilinmeyen (hesaplanacak)">
      <Choice options={[{ value: 'P', label: 'P' }, { value: 'V', label: 'V' }, { value: 'T', label: 'T' }, { value: 'n', label: 'n' }]} value={s.solveFor} onChange={(solveFor) => set({ P: state.P, V: state.V, T: state.T, nA: s.mix ? s.nA : state.n, solveFor })} />
      <p className="muted small">Diğer üç değişkeni ayarla; seçtiğin büyüklük gaz denkleminden hesaplanır. Bir değişkeni değiştirirken ötekiler sabit kalır: yasalar böyle görünür.</p>
    </Panel>
    <Panel title="Değişkenler">
      {sub('Basınç P', 'P', 0.1, 6, 0.05, 'atm')}
      {sub('Hacim V', 'V', 0.5, 60, 0.1, 'L')}
      {s.solveFor !== 'T' && <><Slider label="Sıcaklık T" value={s.T} min={50} max={900} step={1} unit="K" onChange={(T) => set({ T })} />
        <p className="muted small">= {fmt(s.T - 273, 0)} °C</p></>}
      {s.solveFor !== 'n' && <Slider label={s.mix ? `${s.gasA} mol` : 'Mol sayısı n'} value={s.nA} min={0.01} max={3} step={0.01} unit="mol" onChange={(nAv) => set({ nA: nAv })} />}
      {s.mix && s.solveFor !== 'n' && <Slider label={`${s.gasB} mol`} value={s.nB} min={0} max={3} step={0.01} unit="mol" onChange={(nBv) => set({ nB: nBv })} />}
    </Panel>
    <Panel title="Gaz">
      <Choice label="Gaz A" options={Object.keys(GASES).map((g) => ({ value: g, label: g }))} value={s.gasA} onChange={(gasA) => set({ gasA })} />
      <Toggle label="Gaz karışımı (Dalton)" checked={s.mix} onChange={(mix) => set({ mix })} />
      {s.mix && <Choice label="Gaz B" options={Object.keys(GASES).map((g) => ({ value: g, label: g }))} value={s.gasB} onChange={(gasB) => set({ gasB })} />}
    </Panel>
    <Steps title="Yasalar" lines={[law, 'Gaz hesabında sıcaklık her zaman kelvinle: T = t + 273.', 'Dalton: Pᵢ = Xᵢ · P_toplam (mol kesri kadar pay).', 'Graham: aynı T\'de v₁/v₂ = √(M₂/M₁).']} />
    {s.solveFor === 'n' && <Note>Mol sayısı hesaplanıyor; mol kaydırıcıları gizlendi.</Note>}
  </>} />;
}

const initial = { solveFor: 'P', P: 1, V: 22.4, T: 273, nA: 1, nB: 0.5, gasA: 'He', gasB: 'Ne', mix: false };

export default {
  Lab,
  initial,
  intro: 'Bilinmeyeni seç (P, V, T ya da n) ve diğerlerini kaydır: kap, basınç göstergesi, termometre ve üç grafik birlikte değişir. Bir değişkeni oynatırken ötekiler sabit kalır; Boyle, Charles ve Gay-Lussac yasaları böylece görünür.',
  questions: [
    { id: 'boyle', title: 'Sabit sıcaklıkta sıkıştırma', exam: 'AYT', topic: 'Gaz yasaları',
      stem: 'Sabit sıcaklıkta 6 L hacimli bir kapta basıncı 1 atm olan ideal gazın hacmi 2 L\'ye indirilirse basıncı kaç atm olur?',
      choices: { A: '1/3', B: '2', C: '3', D: '4', E: '6' }, answer: 'C',
      setup: { solveFor: 'P', V: 6, T: 273, nA: 6 / 22.4, mix: false },
      build: 'Bilinmeyen: P. V = 6 L, T = 273 K, n = 0,268 mol (P = 1 atm olur). Sonra V\'yi 2 L\'ye indir.',
      look: 'T ve n sabitken V üçte birine inince P üç katına çıkar; P–V grafiğinde nokta aynı hiperbol üzerinde kayar.',
      explanation: 'Boyle: P₁V₁ = P₂V₂ → 1·6 = P₂·2 → P₂ = 3 atm.',
      rule: 'Sabit n ve T: P ile V ters orantılı (P·V sabit).' },
    { id: 'charles', title: '°C tuzağı (Charles)', exam: 'AYT', topic: 'Gaz yasaları',
      stem: 'Sabit basınçta 27 °C\'de 3 L hacim kaplayan ideal gaz 127 °C\'ye ısıtılırsa hacmi kaç L olur?',
      choices: { A: '4', B: '6', C: '9', D: '12', E: '14,1' }, answer: 'A',
      setup: { solveFor: 'V', P: 1, T: 300, nA: 3 / (R * 300), mix: false },
      build: 'Bilinmeyen: V. P = 1 atm, T = 300 K (27 °C), n = 0,122 mol (V = 3 L olur). Sonra T\'yi 400 K (127 °C) yap.',
      look: 'V–T grafiğinde doğru 0 K\'den geçer: oran kelvinle kurulur. 127/27 ≈ 4,7 kat değil, 400/300 = 4/3 kat.',
      explanation: 'V₁/T₁ = V₂/T₂ (kelvin!) → 3/300 = V₂/400 → V₂ = 4 L.',
      rule: 'Gaz oranlarında sıcaklık kelvin: T = t + 273. °C ile oran kurmak (127/27) yanlıştır.' },
    { id: 'dalton', title: 'Kısmi basınç', exam: 'AYT', topic: 'Gaz karışımları',
      stem: 'Bir kapta 0,2 mol He ve 0,3 mol Ne gazları bulunmaktadır. Karışımın toplam basıncı 2 atm olduğuna göre He gazının kısmi basıncı kaç atm\'dir?',
      choices: { A: '0,4', B: '0,8', C: '1', D: '1,2', E: '2' }, answer: 'B',
      setup: { solveFor: 'P', V: 5.6, T: 273, mix: true, gasA: 'He', gasB: 'Ne', nA: 0.2, nB: 0.3 },
      build: 'Gaz karışımını aç: A = He 0,2 mol, B = Ne 0,3 mol. Bilinmeyen P; V = 5,6 L, T = 273 K (toplam P = 2 atm olur).',
      look: '"Kısmi basınçlar" satırı: He\'nin payı mol kesri kadar (0,4).',
      explanation: 'X(He) = 0,2 / 0,5 = 0,4 → P(He) = 0,4 · 2 = 0,8 atm.',
      rule: 'Dalton: kısmi basınç = mol kesri × toplam basınç.' },
    { id: 'graham', title: 'Ortalama hız oranı', exam: 'AYT', topic: 'Gazlarda kinetik teori',
      stem: 'Aynı sıcaklıktaki He (4 g/mol) ve CH₄ (16 g/mol) gazlarının ortalama hızları oranı v(He) / v(CH₄) kaçtır?',
      choices: { A: '1/4', B: '1/2', C: '1', D: '2', E: '4' }, answer: 'D',
      setup: { solveFor: 'P', V: 22.4, T: 273, mix: true, gasA: 'He', gasB: 'CH4', nA: 0.5, nB: 0.5 },
      build: 'Gaz karışımı: A = He, B = CH4. Kaptaki mavi (He) taneciklerin kırmızılardan hızlı hareket ettiğine bak.',
      look: '"Ortalama hız oranı" satırı √(M₂/M₁) formülünü değerlerle verir. Ortalama kinetik enerjileri ise eşit.',
      explanation: 'Aynı T\'de ortalama kinetik enerji eşit: ½m₁v₁² = ½m₂v₂² → v₁/v₂ = √(M₂/M₁) = √(16/4) = 2.',
      rule: 'Aynı sıcaklıkta hafif gaz daha hızlı: v ∝ 1/√M. Kinetik enerji ise yalnız T\'ye bağlı.' },
  ],
  tips: [
    { title: 'Hangi değişken sabit?', see: '"sabit sıcaklıkta", "esnek balon", "sabit hacimli kap"', look: 'Bilinmeyeni seç; diğerlerini sabit tut, birini değiştir.', rule: 'Sabit T: PV sabit. Sabit P: V/T sabit. Sabit V: P/T sabit.' },
    { title: 'Kelvin', see: 'Sıcaklık °C ile verilmiş', look: 'Sıcaklık satırı (K ve °C).', rule: 'Oranlar ve denklem kelvinle kurulur: T = t + 273.', trap: '27 °C\'den 54 °C\'ye çıkmak sıcaklığı iki katına çıkarmak değildir.' },
    { title: 'Karışımlar', see: '"kısmi basınç", "mol kesri"', look: 'Gaz karışımı anahtarı.', rule: 'Pᵢ = Xᵢ·P_toplam; her gaz kabın tamamını doldurur.' },
    { title: 'Kinetik teori', see: '"ortalama hız", "kinetik enerji", "difüzyon"', look: 'İki gazın tanecik hızları.', rule: 'Ortalama kinetik enerji ∝ T; aynı T\'de v₁/v₂ = √(M₂/M₁).' },
  ],
};
