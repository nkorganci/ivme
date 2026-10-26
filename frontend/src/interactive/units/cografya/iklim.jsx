import { useRef } from 'react';
import { Choice, LabGrid, Note, Panel, Readouts, Steps } from '../../kit/controls.jsx';
import { svgPoint } from '../../motion/svgKit.js';
import { fmt } from '../../kit/num.js';
import { classifyClimate, CLIMATE_PRESETS, MONTHS } from './climateEngine.js';

const W = 660; const H = 360; const M = { left: 50, right: 56, top: 20, bottom: 36 };
const T_RANGE = [-30, 40];

function Climograph({ T, P, pMax, onChange, dry }) {
  const svgRef = useRef(null);
  const drag = useRef(null);
  const colW = (W - M.left - M.right) / 12;
  const xOf = (i) => M.left + colW * (i + 0.5);
  const yT = (t) => M.top + ((T_RANGE[1] - t) / (T_RANGE[1] - T_RANGE[0])) * (H - M.top - M.bottom);
  const yP = (p) => H - M.bottom - (p / pMax) * (H - M.top - M.bottom);
  const tFromY = (y) => T_RANGE[1] - ((y - M.top) / (H - M.top - M.bottom)) * (T_RANGE[1] - T_RANGE[0]);
  const pFromY = (y) => ((H - M.bottom - y) / (H - M.top - M.bottom)) * pMax;
  const move = (event) => {
    const d = drag.current; if (!d) return;
    const pt = svgPoint(svgRef.current, event);
    if (d.kind === 'T') onChange({ T: T.map((v, k) => (k === d.i ? Math.round(Math.max(T_RANGE[0], Math.min(T_RANGE[1], tFromY(pt.y)))) : v)) });
    else onChange({ P: P.map((v, k) => (k === d.i ? Math.round(Math.max(0, Math.min(pMax, pFromY(pt.y))) / 5) * 5 : v)) });
  };
  const start = (kind, i) => (event) => { event.stopPropagation(); svgRef.current.setPointerCapture?.(event.pointerId); drag.current = { kind, i }; };
  const key = (kind, i) => (event) => {
    const step = { ArrowUp: 1, ArrowDown: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    if (kind === 'T') onChange({ T: T.map((v, k) => (k === i ? v + step : v)) });
    else onChange({ P: P.map((v, k) => (k === i ? Math.max(0, v + step * 5) : v)) });
  };
  const tTicks = [-30, -20, -10, 0, 10, 20, 30, 40];
  const pTicks = Array.from({ length: 7 }, (_, k) => (pMax / 6) * k);
  return <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="kit-plot kit-plot-drag clim-svg" role="group" aria-label="İklim grafiği: sıcaklık çizgisi ve yağış sütunları"
    onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
    <rect width={W} height={H} fill="var(--surface)" />
    {dry.map((i) => <rect key={`d${i}`} x={M.left + colW * i} y={M.top} width={colW} height={H - M.top - M.bottom} fill="var(--warn-soft)" />)}
    {tTicks.map((t) => <g key={`t${t}`}><line x1={M.left} x2={W - M.right} y1={yT(t)} y2={yT(t)} stroke={t === 0 ? 'var(--ink)' : 'var(--line)'} strokeWidth={t === 0 ? 1.2 : 0.7} />
      <text x={M.left - 6} y={yT(t) + 4} textAnchor="end" className="kit-small" fill="var(--pen-red)">{t}</text></g>)}
    {pTicks.map((p) => <text key={`p${p}`} x={W - M.right + 6} y={yP(p) + 4} className="kit-small" fill="var(--pen-blue)">{Math.round(p)}</text>)}
    <text x={M.left} y={12} className="kit-axis" fill="var(--pen-red)">°C</text><text x={W - M.right + 4} y={12} className="kit-axis" fill="var(--pen-blue)">mm</text>
    {P.map((p, i) => <g key={`b${i}`}>
      <rect x={xOf(i) - colW * 0.32} y={yP(p)} width={colW * 0.64} height={H - M.bottom - yP(p)} fill="var(--pen-blue)" opacity=".55" />
      <g className="kit-drag" tabIndex={0} role="slider" aria-label={`${i + 1}. ay yağış`} aria-valuenow={p} onPointerDown={start('P', i)} onKeyDown={key('P', i)}>
        <rect x={xOf(i) - colW * 0.36} y={yP(p) - 8} width={colW * 0.72} height="14" fill="transparent" />
        <rect x={xOf(i) - colW * 0.32} y={yP(p) - 3} width={colW * 0.64} height="6" rx="3" fill="var(--pen-blue)" />
      </g>
    </g>)}
    <path d={T.map((t, i) => `${i ? 'L' : 'M'}${xOf(i)},${yT(t)}`).join('')} fill="none" stroke="var(--pen-red)" strokeWidth="3" />
    {T.map((t, i) => <g key={`p${i}`} className="kit-drag" tabIndex={0} role="slider" aria-label={`${i + 1}. ay sıcaklık`} aria-valuenow={t} onPointerDown={start('T', i)} onKeyDown={key('T', i)}>
      <circle cx={xOf(i)} cy={yT(t)} r="14" fill="transparent" /><circle cx={xOf(i)} cy={yT(t)} r="6" fill="var(--surface)" stroke="var(--pen-red)" strokeWidth="3" />
    </g>)}
    {MONTHS.map((m, i) => <text key={`m${i}`} x={xOf(i)} y={H - 14} textAnchor="middle" className="kit-small">{m}</text>)}
  </svg>;
}

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const result = classifyClimate(s.T, s.P);
  const m = result.metrics;
  const load = (id) => { const p = CLIMATE_PRESETS.find((x) => x.id === id); if (p) set({ T: p.T, P: p.P, preset: id, pMax: Math.max(...p.P) > 600 ? 900 : Math.max(...p.P) > 300 ? 600 : 300 }); };
  return <LabGrid top={<div className="kit-row">
    <label className="field"><span className="field-label">Hazır istasyon</span>
      <select value={s.preset} onChange={(e) => load(e.target.value)}>{CLIMATE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}<option value="ozel">Kendi grafiğim</option></select></label>
    <Choice label="Yağış ekseni üst sınırı" options={[300, 600, 900].map((v) => ({ value: v, label: `${v} mm` }))} value={s.pMax} onChange={(pMax) => set({ pMax })} />
  </div>} visual={<>
    <Climograph T={s.T} P={s.P} pMax={s.pMax} dry={m.dryMonths} onChange={(patch) => set({ ...patch, preset: 'ozel' })} />
    <div className="kit-legend"><span><i style={{ background: 'var(--pen-red)' }} />sıcaklık (sürükle)</span><span><i style={{ background: 'var(--pen-blue)' }} />yağış (sütun ucunu sürükle)</span><span><i style={{ background: 'var(--warn-soft)' }} />kurak ay (P &lt; 2T)</span></div>
    <Readouts title={`Çözümleme: ${result.type}`} items={[
      ['İklim tipi', result.type, 'ok'],
      ['Gerekçeler', result.reasons.join(' ')],
      ['Ortalama sıcaklık', `${fmt(m.mean, 1)} °C`],
      ['Yıllık sıcaklık farkı', `${fmt(m.range, 1)} °C (en sıcak ${m.maxT}, en soğuk ${m.minT})`],
      ['Toplam yağış', `${m.total} mm`],
      ['Mevsimlik yağış', Object.entries(m.seasonP).map(([k, v]) => `${k} ${v} mm (%${Math.round((v / (m.total || 1)) * 100)})`).join(' · ')],
      ['Kurak ay (Gaussen: P < 2T)', `${m.dryMonths.length} ay${m.dryMonths.length ? `: ${m.dryMonths.map((i) => MONTHS[i]).join(', ')}` : ''}`],
    ]} />
  </>} side={<>
    <Steps title="Grafik nasıl okunur?" lines={[
      'Önce en sıcak aya bak: Temmuz civarı Kuzey, Ocak civarı Güney Yarım Küre.',
      'Sıcaklık farkı büyükse karasallık (denizden uzak), küçükse denizel etki.',
      'Yağışın mevsimi: kış yağışlı + yaz kurak → Akdeniz; her mevsim → Karadeniz/okyanusal; yaz yağışlı + kış kurak → muson/savan.',
      'Toplam yağış: < 250 mm çöl, ≈ 250–500 mm step (bozkır).',
    ]} />
    <Panel title="Dene">
      <p className="muted small">Antalya'yı seç ve yaz yağışlarını artır: Akdeniz ölçütü bozulunca tip değişir. Ankara'nın kış sıcaklıklarını −10 °C'ye indir: sert karasala döner.</p>
    </Panel>
    {m.south && <Note>En sıcak ay Aralık–Şubat arasında: Güney Yarım Küre. Mevsimler tersine çevrilerek değerlendirildi.</Note>}
  </>} />;
}

const initial = { T: CLIMATE_PRESETS[0].T, P: CLIMATE_PRESETS[0].P, preset: 'antalya', pMax: 300 };
const preset = (id, pMax = 300) => { const p = CLIMATE_PRESETS.find((x) => x.id === id); return { T: p.T, P: p.P, preset: id, pMax }; };

export default {
  Lab,
  initial,
  intro: 'Hazır bir istasyon seç ya da sıcaklık noktalarını ve yağış sütunlarını sürükleyerek kendi grafiğini çiz. İklim tipi, yarım küre, sıcaklık farkı, yağış rejimi ve kurak aylar gerekçeleriyle anında çözümlenir.',
  questions: [
    { id: 'akdeniz', title: 'Yazı kurak, kışı ılık', exam: 'TYT', topic: 'Atmosfer ve iklim',
      stem: 'Bir istasyonun iklim grafiğinde yaz aylarında sıcaklık 28 °C\'ye çıkarken yağış neredeyse hiç görülmemekte; kış aylarında sıcaklık 10 °C\'nin altına inmemekte ve en fazla yağış kışın düşmektedir. Yıllık yağış yaklaşık 1000 mm\'dir. Bu istasyonda hangi iklim görülür?',
      choices: { A: 'Akdeniz iklimi', B: 'Karadeniz iklimi', C: 'Karasal iklim', D: 'Muson iklimi', E: 'Ilıman okyanusal iklim' }, answer: 'A',
      setup: preset('antalya'),
      build: 'Hazır istasyon: Antalya.',
      look: 'Yaz sütunları neredeyse sıfır, kış sütunları yüksek; kurak aylar yaz mevsiminde toplanmış.',
      explanation: 'Yaz kuraklığı + ılık ve yağışlı kış Akdeniz ikliminin ayırt edici özelliğidir.',
      rule: 'Önce yağışın mevsimine bak: kış yağışlı / yaz kurak → Akdeniz.' },
    { id: 'guney', title: 'Ocak en sıcak ay', exam: 'TYT', topic: 'Atmosfer ve iklim',
      stem: 'Bir istasyonun iklim grafiğinde en yüksek sıcaklık Ocak ayında (25 °C), en düşük sıcaklık Temmuz ayında (13 °C) görülmekte; yağışlar ise en çok Haziran–Ağustos döneminde, en az Aralık–Şubat döneminde düşmektedir. Bu istasyonun iklimi için aşağıdakilerden hangisi doğrudur?',
      choices: { A: 'Kuzey Yarım Küre\'de Akdeniz iklimi', B: 'Güney Yarım Küre\'de Akdeniz iklimi', C: 'Güney Yarım Küre\'de muson iklimi', D: 'Kuzey Yarım Küre\'de okyanusal iklim', E: 'Ekvatoral iklim' }, answer: 'B',
      setup: preset('perth'),
      build: 'Hazır istasyon: Perth (Avustralya).',
      look: 'En sıcak ay Ocak: Güney Yarım Küre. Orada yaz (Aralık–Şubat) kurak, kış (Haziran–Ağustos) yağışlı.',
      explanation: 'Ocak\'ta en sıcak → Güney Yarım Küre. Mevsimleri tersine çevirince: yaz kurak, kış yağışlı → Akdeniz iklimi.',
      rule: 'Önce yarım küreyi belirle (en sıcak ay), sonra mevsimleri ona göre adlandır.' },
    { id: 'muson', title: 'Aşırı yaz yağışı', exam: 'TYT', topic: 'Atmosfer ve iklim',
      stem: 'Bir istasyonda her ay sıcaklık 24 °C\'nin üzerindedir; Haziran–Eylül arasında aylık yağış 300–800 mm iken Kasım–Nisan arasında yağış neredeyse yoktur. Bu istasyondaki iklim ve yağış rejiminin temel nedeni aşağıdakilerden hangisidir?',
      choices: { A: 'Akdeniz iklimi — cephe yağışları', B: 'Ekvatoral iklim — konveksiyonel yağış', C: 'Muson iklimi — mevsimlik yön değiştiren rüzgârlar', D: 'Çöl iklimi — dinamik yüksek basınç', E: 'Okyanusal iklim — batı rüzgârları' }, answer: 'C',
      setup: preset('mumbai', 900),
      build: 'Hazır istasyon: Mumbai; yağış ekseni 900 mm.',
      look: 'Yaz sütunları çok yüksek, kış sütunları sıfıra yakın; sıcaklık farkı küçük.',
      explanation: 'Yazın denizden karaya esen nemli muson rüzgârları aşırı yağış bırakır; kışın karadan denize esen kuru rüzgârlar kuraklık getirir.',
      rule: 'Her ay sıcak + yaz aşırı yağışlı + kış kurak → muson.' },
    { id: 'gaussen', title: 'Kurak ay sayısı', exam: 'TYT', topic: 'Atmosfer ve iklim',
      stem: 'Gaussen yöntemine göre aylık yağışı (mm) aylık ortalama sıcaklığın (°C) iki katından az olan aylar kurak kabul edilir. Ankara\'nın aylık sıcaklık ve yağış değerleri grafikteki gibi ise kaç ay kuraktır?',
      choices: { A: '2', B: '3', C: '4', D: '5', E: '6' }, answer: 'C',
      setup: preset('ankara'),
      build: 'Hazır istasyon: Ankara.',
      look: 'Sarı gölgeli sütunlar kurak aylar; "Kurak ay" satırında sayıyı oku. Haziran: 35 < 40, Ekim: 30 > 26 — sınırlara dikkat.',
      explanation: 'P < 2T olan aylar: Haziran (35 < 40), Temmuz (15 < 48), Ağustos (10 < 46), Eylül (20 < 38) → 4 ay.',
      rule: 'Gaussen: P(mm) < 2·T(°C) ise ay kuraktır.' },
  ],
  tips: [
    { title: 'Yarım küre', see: 'En sıcak ay Ocak/Şubat', look: 'Gerekçelerdeki yarım küre satırı.', rule: 'En sıcak ay Temmuz–Ağustos → Kuzey; Ocak–Şubat → Güney. Mevsim adları ona göre.' },
    { title: 'Yağış rejimi', see: '"yazları kurak", "her mevsim yağışlı"', look: 'Mevsimlik yağış satırı.', rule: 'Kış yağışlı/yaz kurak: Akdeniz. Her mevsim: Karadeniz/okyanusal. Yaz yağışlı/kış kurak: muson, savan; karasalda ilkbahar–yaz.' },
    { title: 'Sıcaklık farkı', see: '"yıllık sıcaklık farkı fazla"', look: 'Sıcaklık farkı satırı.', rule: 'Büyük fark karasallık (iç kesim), küçük fark denizellik ya da Ekvator\'a yakınlık.' },
    { title: 'Kuraklık', see: '"kurak ay", "Gaussen", "yağış az"', look: 'Sarı gölgeli aylar.', rule: '< 250 mm çöl; Gaussen kurak ayı: P < 2T.' },
  ],
};
