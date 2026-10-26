import Plot from '../../kit/Plot.jsx';
import { Choice, LabGrid, Note, Panel, Readouts, Slider, Steps, Toggle } from '../../kit/controls.jsx';
import { fmt } from '../../kit/num.js';
import { equivalenceVolume, indicatorColor, mixMolarity, SOLUTES, strongPH, titrationPH } from './acidbase.js';

function Beaker({ x, label, volume, molarity, maxVolume = 1000, sub }) {
  const h = 150 * Math.min(1, volume / maxVolume);
  const shade = Math.min(0.85, 0.06 + molarity * 0.55);
  const dots = Math.min(70, Math.round(molarity * volume / 10));
  return <g>
    <path d={`M${x},20 L${x},190 Q${x},200 ${x + 10},200 L${x + 100},200 Q${x + 110},200 ${x + 110},190 L${x + 110},20`} fill="none" stroke="var(--ink)" strokeWidth="2.5" />
    <rect x={x + 2} y={198 - h} width="106" height={h} fill="var(--pen-blue)" opacity={shade} />
    {Array.from({ length: dots }, (_, i) => <circle key={i} cx={x + 10 + ((i * 37) % 90)} cy={196 - ((i * 53) % Math.max(4, h - 6)) - 3} r="2.2" fill="var(--ink)" opacity=".55" />)}
    <text x={x + 55} y="218" textAnchor="middle" className="kit-label" fill="var(--ink)">{label}</text>
    <text x={x + 55} y="234" textAnchor="middle" className="kit-small">{fmt(molarity, 3)} M · {fmt(volume, 0)} mL</text>
    {sub && <text x={x + 55} y="250" textAnchor="middle" className="kit-small">{sub}</text>}
  </g>;
}

function Concentration({ s, set }) {
  const solute = SOLUTES[s.solute];
  const n = s.amountMode === 'g' ? s.mass / solute.M : s.mol;
  const M1 = n / (s.V / 1000);
  const V2 = s.V + s.water;
  const M2 = n / (V2 / 1000);
  const Mmix = s.mix ? mixMolarity(M2, V2, s.M2, s.V2) : null;
  const final = s.mix ? Mmix : M2;
  const finalV = s.mix ? V2 + s.V2 : V2;
  const factor = solute.h ?? solute.oh ?? 1;
  const pH = solute.kind === 'asit' || solute.kind === 'baz' ? strongPH(solute.kind, final, factor) : 7;
  const massSolute = n * solute.M;
  const percent = (massSolute / (massSolute + s.V)) * 100;
  return <LabGrid visual={<>
    <svg viewBox="0 0 560 260" className="kit-plot" role="img" aria-label="Çözelti kapları">
      <rect width="560" height="260" fill="var(--surface)" />
      <Beaker x={20} label="1. çözelti" volume={s.V} molarity={M1} sub={`${fmt(n, 4)} mol ${s.solute}`} />
      {s.water > 0 && <><path d="M150,110 L190,110" stroke="var(--ink)" strokeWidth="2" /><text x="170" y="100" textAnchor="middle" className="kit-small">+{fmt(s.water, 0)} mL su</text>
        <Beaker x={200} label="Seyreltilmiş" volume={V2} molarity={M2} /></>}
      {s.mix && <><text x={s.water > 0 ? 335 : 155} y="110" className="kit-label" fill="var(--ink)">+</text>
        <Beaker x={s.water > 0 ? 350 : 180} label="2. çözelti" volume={s.V2} molarity={s.M2} /></>}
    </svg>
    {s.mix && <svg viewBox="0 0 560 260" className="kit-plot" role="img" aria-label="Karışım"><rect width="560" height="260" fill="var(--surface)" />
      <Beaker x={225} label="Karışım" volume={finalV} molarity={Mmix} maxVolume={2000} /></svg>}
    <Readouts title="Hesap (canlı)" items={[
      ['Mol sayısı', s.amountMode === 'g' ? `n = m / M_A = ${fmt(s.mass, 3)} / ${solute.M} = ${fmt(n, 4)} mol` : `n = ${fmt(n, 4)} mol (${fmt(massSolute, 3)} g)`],
      ['Molarite', `M = n / V = ${fmt(n, 4)} / ${fmt(s.V / 1000, 3)} L = ${fmt(M1, 4)} M`, 'ok'],
      s.water > 0 && ['Seyreltme', `M₁V₁ = M₂V₂ → ${fmt(M1, 4)} · ${fmt(s.V, 0)} = M₂ · ${fmt(V2, 0)} → M₂ = ${fmt(M2, 4)} M`, 'ok'],
      s.mix && ['Karıştırma', `M = (M₁V₁ + M₂V₂) / (V₁ + V₂) = (${fmt(M2, 4)}·${fmt(V2, 0)} + ${fmt(s.M2, 3)}·${fmt(s.V2, 0)}) / ${fmt(finalV, 0)} = ${fmt(Mmix, 4)} M`, 'ok'],
      solute.ions.length > 0 && ['İyon derişimleri', solute.ions.map(([ion, k]) => `[${ion}] = ${fmt(final * k, 4)} M`).join(' · ')],
      (solute.kind === 'asit' || solute.kind === 'baz') && ['pH', `${fmt(pH, 2)} (${solute.kind === 'asit' ? `[H⁺] = ${fmt(final * factor, 4)} M` : `[OH⁻] = ${fmt(final * factor, 4)} M, pOH = ${fmt(14 - pH, 2)}`})`],
      ['Kütlece % (yaklaşık)', `${fmt(percent, 2)} % (su özkütlesi 1 g/mL kabulüyle)`],
    ]} />
  </>} side={<>
    <Panel title="Çözünen">
      <label className="field"><span className="field-label">Madde</span>
        <select value={s.solute} onChange={(e) => set({ solute: e.target.value })}>{Object.entries(SOLUTES).map(([k, v]) => <option key={k} value={k}>{k} ({v.M} g/mol)</option>)}</select></label>
      <Choice options={[{ value: 'g', label: 'Kütle (g)' }, { value: 'mol', label: 'Mol' }]} value={s.amountMode} onChange={(amountMode) => set({ amountMode })} />
      {s.amountMode === 'g' ? <Slider label="Kütle" value={s.mass} min={0.1} max={100} step={0.1} unit="g" onChange={(mass) => set({ mass })} />
        : <Slider label="Mol" value={s.mol} min={0.001} max={2} step={0.001} digits={3} unit="mol" onChange={(mol) => set({ mol })} />}
      <Slider label="Çözelti hacmi V" value={s.V} min={50} max={1000} step={10} unit="mL" onChange={(V) => set({ V })} />
    </Panel>
    <Panel title="Seyreltme ve karıştırma">
      <Slider label="Eklenen su" value={s.water} min={0} max={1000} step={10} unit="mL" onChange={(water) => set({ water })} />
      <Toggle label="Aynı maddenin ikinci çözeltisiyle karıştır" checked={s.mix} onChange={(mix) => set({ mix })} />
      {s.mix && <><Slider label="2. çözelti molaritesi" value={s.M2} min={0} max={2} step={0.01} unit="M" onChange={(M2v) => set({ M2: M2v })} />
        <Slider label="2. çözelti hacmi" value={s.V2} min={0} max={1000} step={10} unit="mL" onChange={(V2v) => set({ V2: V2v })} /></>}
    </Panel>
    <Steps title="Kurallar" lines={['Molarite M = n (mol) / V (L). Hacmi mL ise 1000\'e böl.', 'Su eklemek mol sayısını değiştirmez: M₁V₁ = M₂V₂.', 'Aynı maddenin iki çözeltisi: toplam mol / toplam hacim.', 'İyon derişimi = molarite × formüldeki iyon sayısı.']} />
  </>} />;
}

function Titration({ s, set }) {
  const Veq = equivalenceVolume({ Ca: s.Ca, Va: s.Va, Cb: s.Cb });
  const Vmax = Math.max(10, Math.min(200, Veq * 2));
  const Ka = 10 ** -s.pKa;
  const params = { analyte: s.analyte, Ca: s.Ca, Va: s.Va, Cb: s.Cb, Ka };
  const pH = titrationPH({ ...params, Vb: s.Vb });
  const molA = (s.Ca * s.Va) / 1000; const molB = (s.Cb * s.Vb) / 1000;
  const color = indicatorColor(pH);
  const titrant = s.analyte === 'baz' ? 'HCl' : 'NaOH';
  const analyteName = s.analyte === 'baz' ? 'NaOH' : s.analyte === 'guclu' ? 'HCl' : 'HA (zayıf asit)';
  const items = [
    s.analyte === 'zayif' && { type: 'rect', x: Veq * 0.1, y: 0, w: Veq * 0.8, h: 14, color: 'ok', opacity: 0.08 },
    { type: 'fn', f: (v) => titrationPH({ ...params, Vb: v }), color: 'blue', width: 3, domain: [0, Vmax] },
    { type: 'vline', x: Veq, color: 'green' },
    { type: 'text', x: Veq, y: 13.2, text: `eşdeğerlik ${fmt(Veq, 1)} mL`, dx: 4, color: 'green' },
    s.analyte === 'zayif' && { type: 'vline', x: Veq / 2, color: 'warn' },
    s.analyte === 'zayif' && { type: 'text', x: Veq / 2, y: s.pKa, text: `yarı nötralleşme: pH = pKa = ${fmt(s.pKa, 1)}`, dx: 6, dy: -8, color: 'warn' },
    { type: 'hline', y: 7, color: 'line' },
    { type: 'point', x: s.Vb, y: pH, color: 'red', label: `pH ${fmt(pH, 2)}`, onDrag: (v) => set({ Vb: Math.max(0, Math.min(Vmax, v)) }), aria: 'Eklenen hacim' },
  ].filter(Boolean);
  let region;
  if (Math.abs(s.Vb - Veq) < Veq * 0.01) region = s.analyte === 'zayif' ? 'Eşdeğerlik: yalnız A⁻ kaldı, hidroliz nedeniyle ortam bazik (pH > 7).' : 'Eşdeğerlik: tam nötralleşme, pH = 7.';
  else if (s.Vb < Veq) region = s.analyte === 'zayif' && s.Vb > 0 ? 'Tampon bölgesi: HA ve A⁻ birlikte; pH yavaş değişir.' : s.analyte === 'baz' ? 'Baz fazla: ortam bazik.' : 'Asit fazla: ortam asidik.';
  else region = s.analyte === 'baz' ? 'Asit fazla: ortam asidik.' : 'Baz fazla: ortam bazik.';
  const flaskShade = color.tone === 'pink' ? 0.55 : color.tone === 'pink-light' ? 0.25 : 0;
  return <LabGrid visual={<>
    <div className="kit-row gas-row">
      <svg viewBox="0 0 220 260" className="kit-plot titr-svg" role="img" aria-label={`Erlen: indikatör ${color.name}`}>
        <rect width="220" height="260" fill="var(--surface)" />
        <rect x="98" y="8" width="24" height="120" fill="var(--tint)" stroke="var(--ink)" strokeWidth="2" />
        <rect x="100" y={10 + 116 * Math.min(1, s.Vb / Vmax)} width="20" height={116 * (1 - Math.min(1, s.Vb / Vmax))} fill="var(--pen-blue)" opacity=".35" />
        <path d="M106,128 L114,128 L112,146 L108,146 Z" fill="var(--ink)" />
        <text x="130" y="30" className="kit-small">{titrant} {fmt(s.Cb, 2)} M</text>
        <path d="M90,160 L90,180 L45,245 L175,245 L130,180 L130,160 Z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.5" />
        <path d="M60,225 L160,225 L175,245 L45,245 Z" fill="var(--pen-red)" opacity={flaskShade} />
        <path d="M60,225 L160,225 L175,245 L45,245 Z" fill="none" stroke="var(--pen-blue)" opacity=".4" />
        <text x="110" y="214" textAnchor="middle" className="kit-small">{analyteName}</text>
        <text x="110" y="258" textAnchor="middle" className="kit-small">fenolftalein: {color.name}</text>
      </svg>
      <div className="gas-graphs titr-graph"><Plot x={[0, Vmax]} y={[0, 14]} height={300} items={items} xLabel={`eklenen ${titrant} (mL)`} yLabel="pH" yTickStep={2} ariaLabel="Titrasyon eğrisi" /></div>
    </div>
    <Readouts title="Hesap (canlı)" items={[
      ['Analit', `${analyteName}: ${fmt(s.Ca, 3)} M × ${fmt(s.Va, 0)} mL = ${fmt(molA * 1000, 3)} mmol`],
      ['Eklenen', `${titrant}: ${fmt(s.Cb, 3)} M × ${fmt(s.Vb, 1)} mL = ${fmt(molB * 1000, 3)} mmol`],
      ['Fazla olan', Math.abs(molA - molB) < 1e-9 ? 'yok (eşdeğerlik)' : molA > molB ? `${s.analyte === 'baz' ? 'OH⁻' : s.analyte === 'guclu' ? 'H⁺' : 'HA'}: ${fmt((molA - molB) * 1000, 3)} mmol` : `${s.analyte === 'baz' ? 'H⁺' : 'OH⁻'}: ${fmt((molB - molA) * 1000, 3)} mmol`],
      ['Toplam hacim', `${fmt(s.Va + s.Vb, 1)} mL`],
      ['pH', fmt(pH, 2), 'ok'],
      ['[H⁺] · [OH⁻]', `${(10 ** -pH).toExponential(2).replace('.', ',')} M · ${(10 ** (pH - 14)).toExponential(2).replace('.', ',')} M`],
      ['Bölge', region],
    ]} />
  </>} side={<>
    <Panel title="Titre edilen (erlende)">
      <Choice options={[{ value: 'guclu', label: 'Güçlü asit' }, { value: 'zayif', label: 'Zayıf asit' }, { value: 'baz', label: 'Güçlü baz' }]} value={s.analyte} onChange={(analyte) => set({ analyte })} />
      <Slider label="Derişim" value={s.Ca} min={0.01} max={1} step={0.01} unit="M" onChange={(Ca) => set({ Ca })} />
      <Slider label="Hacim" value={s.Va} min={10} max={200} step={5} unit="mL" onChange={(Va) => set({ Va })} />
      {s.analyte === 'zayif' && <Slider label="pKa (Ka = 10^−pKa)" value={s.pKa} min={2} max={10} step={0.1} onChange={(pKa) => set({ pKa })} />}
    </Panel>
    <Panel title={`Büretteki ${titrant}`}>
      <Slider label="Derişim" value={s.Cb} min={0.01} max={1} step={0.01} unit="M" onChange={(Cb) => set({ Cb })} />
      <Slider label="Eklenen hacim" value={s.Vb} min={0} max={Vmax} step={0.5} unit="mL" onChange={(Vb) => set({ Vb })} />
    </Panel>
    <Steps title="Kurallar" lines={['Nötralleşme: mol H⁺ = mol OH⁻ olduğunda eşdeğerlik.', 'Güçlü asit + güçlü baz → eşdeğerlikte pH = 7.', 'Zayıf asit + güçlü baz → eşdeğerlikte pH > 7; yarı yolda pH = pKa (tampon).', 'Fazla iyonun derişimi = fazla mol / toplam hacim.']} />
    {s.analyte === 'zayif' && <Note>Kırmızı noktayı eğri boyunca sürükle: tampon bölgesinde pH çok yavaş değişir, eşdeğerlik çevresinde ise sıçrar.</Note>}
  </>} />;
}

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  return <div className="kit-lab">
    <div className="kit-top"><Choice options={[{ value: 'derisim', label: 'Derişim · seyreltme · karıştırma' }, { value: 'titrasyon', label: 'Asit–baz titrasyonu' }]} value={s.mode} onChange={(mode) => set({ mode })} /></div>
    {s.mode === 'derisim' ? <Concentration s={s} set={set} /> : <Titration s={s} set={set} />}
  </div>;
}

const initial = { mode: 'derisim', solute: 'NaOH', amountMode: 'g', mass: 4, mol: 0.1, V: 500, water: 0, mix: false, M2: 0.6, V2: 100, analyte: 'guclu', Ca: 0.1, Va: 50, Cb: 0.1, Vb: 25, pKa: 5 };

export default {
  Lab,
  initial,
  intro: 'Derişim modunda madde miktarını ve hacmi gir, su ekle ya da ikinci bir çözeltiyle karıştır: molarite, iyon derişimleri ve pH canlı hesaplanır. Titrasyon modunda büretten baz (ya da asit) ekledikçe pH eğrisi, eşdeğerlik ve indikatör rengi değişir.',
  questions: [
    { id: 'molarite', title: 'Kütleden molarite', exam: 'TYT', topic: 'Derişim birimleri',
      stem: '4 gram NaOH katısı suda çözülerek 500 mL çözelti hazırlanıyor. Çözeltinin molar derişimi kaç M\'dir? (NaOH = 40 g/mol)',
      choices: { A: '0,1', B: '0,2', C: '0,4', D: '0,5', E: '0,8' }, answer: 'B',
      setup: { mode: 'derisim', solute: 'NaOH', amountMode: 'g', mass: 4, V: 500, water: 0, mix: false },
      build: 'Derişim modu: madde NaOH, kütle 4 g, hacim 500 mL.',
      look: 'Önce mol (0,1), sonra hacmi litreye çevirip molarite satırı.',
      explanation: 'n = 4 / 40 = 0,1 mol; V = 0,5 L → M = 0,1 / 0,5 = 0,2 M.',
      rule: 'M = n / V (litre). mL ile bölme tuzağına dikkat.' },
    { id: 'seyreltme', title: 'Su ekleyerek seyreltme', exam: 'AYT', topic: 'Derişim birimleri',
      stem: '0,4 M 200 mL NaCl çözeltisine 600 mL saf su ekleniyor. Son çözeltinin derişimi kaç M olur?',
      choices: { A: '0,05', B: '0,1', C: '0,133', D: '0,2', E: '0,3' }, answer: 'B',
      setup: { mode: 'derisim', solute: 'NaCl', amountMode: 'mol', mol: 0.08, V: 200, water: 600, mix: false },
      build: 'Madde NaCl, mol 0,08 (0,4 M × 0,2 L), hacim 200 mL; eklenen su 600 mL.',
      look: 'Mol sayısı değişmiyor; hacim 4 katına çıktı → derişim dörtte biri.',
      explanation: 'M₁V₁ = M₂V₂ → 0,4 · 200 = M₂ · 800 → M₂ = 0,1 M.',
      rule: 'Su eklemek mol sayısını değiştirmez; toplam hacmi kullan (200 + 600).' },
    { id: 'karistirma', title: 'İki çözeltiyi karıştırma', exam: 'AYT', topic: 'Derişim birimleri',
      stem: '0,2 M 300 mL NaCl çözeltisi ile 0,6 M 100 mL NaCl çözeltisi karıştırılıyor. Karışımda NaCl derişimi kaç M olur?',
      choices: { A: '0,25', B: '0,3', C: '0,4', D: '0,45', E: '0,8' }, answer: 'B',
      setup: { mode: 'derisim', solute: 'NaCl', amountMode: 'mol', mol: 0.06, V: 300, water: 0, mix: true, M2: 0.6, V2: 100 },
      build: '1. çözelti: NaCl 0,06 mol, 300 mL (0,2 M). Karıştır: 2. çözelti 0,6 M, 100 mL.',
      look: 'Karıştırma satırı: toplam mol / toplam hacim.',
      explanation: 'Toplam mol = 0,06 + 0,06 = 0,12; toplam hacim 0,4 L → M = 0,3 M.',
      rule: 'Aynı madde karışırken derişimler toplanmaz; mol toplanır, hacim toplanır.' },
    { id: 'notrlesme', title: 'Fazla asit, [H⁺] kaç?', exam: 'AYT', topic: 'Asitlerin ve bazların tepkimeleri',
      stem: '0,2 M 100 mL HCl çözeltisi ile 0,1 M 100 mL NaOH çözeltisi karıştırılıyor. Son çözeltide [H⁺] kaç M\'dir?',
      choices: { A: '0,025', B: '0,05', C: '0,1', D: '0,15', E: '0,2' }, answer: 'B',
      setup: { mode: 'titrasyon', analyte: 'guclu', Ca: 0.2, Va: 100, Cb: 0.1, Vb: 100 },
      build: 'Titrasyon modu: güçlü asit 0,2 M, 100 mL; NaOH 0,1 M, eklenen 100 mL.',
      look: 'Fazla olan satırı (10 mmol H⁺) ve toplam hacim (200 mL); pH 1,3 → [H⁺] = 0,05 M.',
      explanation: 'H⁺: 20 mmol, OH⁻: 10 mmol → 10 mmol H⁺ artar. 10 mmol / 200 mL = 0,05 M.',
      rule: 'Önce mol karşılaştır, artanı bul; derişim için toplam hacme böl.' },
    { id: 'tampon', title: 'Yarı nötralleşmede pH', exam: 'AYT', topic: 'Sulu çözelti dengeleri',
      stem: 'Ka = 1·10⁻⁵ olan zayıf HA asidinin 0,1 M 50 mL çözeltisine 0,1 M NaOH çözeltisinden 25 mL ekleniyor. Oluşan çözeltinin pH değeri kaçtır?',
      choices: { A: '3', B: '4', C: '5', D: '7', E: '9' }, answer: 'C',
      setup: { mode: 'titrasyon', analyte: 'zayif', Ca: 0.1, Va: 50, Cb: 0.1, Vb: 25, pKa: 5 },
      build: 'Titrasyon: zayıf asit 0,1 M 50 mL, pKa = 5; NaOH 0,1 M, eklenen 25 mL.',
      look: 'Eşdeğerlik 50 mL; 25 mL yarı yol: turuncu çizgide pH = pKa. Noktayı sürükleyip tampon bölgesinde pH\'ın ne kadar az değiştiğine bak.',
      explanation: '25 mL NaOH, asidin yarısını A⁻\'ye çevirir: [HA] = [A⁻] → tampon. pH = pKa + log([A⁻]/[HA]) = 5 + 0 = 5.',
      rule: 'Yarı nötralleşmede zayıf asit tamponunun pH\'ı pKa\'ya eşittir.' },
  ],
  tips: [
    { title: 'Molarite', see: '"… gram … mL çözelti", "kaç M"', look: 'Derişim modu, mol ve molarite satırları.', rule: 'n = m / M_A; M = n / V(L).', trap: 'Hacmi mL olarak bölmek 1000 kat hata yapar.' },
    { title: 'Seyreltme ve karıştırma', see: '"su ekleniyor", "karıştırılıyor"', look: 'Eklenen su ve ikinci çözelti.', rule: 'Seyreltme: M₁V₁ = M₂V₂. Karıştırma: (M₁V₁ + M₂V₂)/(V₁ + V₂).' },
    { title: 'Nötralleşme hesabı', see: 'Asit ve baz çözeltileri karıştırılıyor', look: 'Titrasyon: fazla olan ve toplam hacim.', rule: 'mol H⁺ ile mol OH⁻ karşılaştır; artanın derişimi = artan mol / toplam hacim.' },
    { title: 'Tampon ve titrasyon eğrisi', see: '"zayıf asit", "Ka", "tampon", "eşdeğerlik"', look: 'Zayıf asit eğrisi, turuncu ve yeşil çizgiler.', rule: 'Yarı yolda pH = pKa; zayıf asit–güçlü baz eşdeğerliği bazik.', trap: 'Her nötralleşmede eşdeğerlik pH\'ı 7 değildir.' },
  ],
};
