import { useEffect, useState } from 'react';
import Plot from '../../kit/Plot.jsx';
import { LabGrid, Note, Panel, Readouts, Slider, Steps } from '../../kit/controls.jsx';
import { fmt } from '../../kit/num.js';
import { AGES, POP_PRESETS, project, structure, transitionStage } from './popEngine.js';

function Pyramid({ pop, ghost, title }) {
  const W = 640; const rowH = 21; const top = 30; const H = top + rowH * 17 + 34; const cx = W / 2; const gap = 30;
  const total = pop.male.reduce((p, v) => p + v, 0) + pop.female.reduce((p, v) => p + v, 0);
  const totalGhost = ghost.male.reduce((p, v) => p + v, 0) + ghost.female.reduce((p, v) => p + v, 0);
  const share = (v, t) => (v / t) * 100;
  const maxShare = Math.max(6, ...pop.male.map((v) => share(v, total)), ...pop.female.map((v) => share(v, total)), ...ghost.male.map((v) => share(v, totalGhost)), ...ghost.female.map((v) => share(v, totalGhost)));
  const k = (cx - gap - 20) / maxShare;
  const y = (i) => top + rowH * (16 - i);
  return <svg viewBox={`0 0 ${W} ${H}`} className="kit-plot" role="img" aria-label={`Nüfus piramidi: ${title}`}>
    <rect width={W} height={H} fill="var(--surface)" />
    <text x={cx - gap - 10} y="18" textAnchor="end" className="kit-label" fill="var(--pen-blue)">Erkek</text>
    <text x={cx + gap + 10} y="18" className="kit-label" fill="var(--pen-red)">Kadın</text>
    {AGES.map((age, i) => {
      const m = share(pop.male[i], total); const f = share(pop.female[i], total);
      const gm = share(ghost.male[i], totalGhost); const gf = share(ghost.female[i], totalGhost);
      return <g key={age}>
        <rect x={cx - gap - m * k} y={y(i) + 2} width={m * k} height={rowH - 4} fill="var(--pen-blue)" opacity=".75" />
        <rect x={cx + gap} y={y(i) + 2} width={f * k} height={rowH - 4} fill="var(--pen-red)" opacity=".75" />
        <rect x={cx - gap - gm * k} y={y(i) + 2} width={gm * k} height={rowH - 4} fill="none" stroke="var(--ink)" strokeDasharray="3 3" />
        <rect x={cx + gap} y={y(i) + 2} width={gf * k} height={rowH - 4} fill="none" stroke="var(--ink)" strokeDasharray="3 3" />
        <text x={cx} y={y(i) + rowH - 6} textAnchor="middle" className="kit-small">{age}</text>
      </g>;
    })}
    {[0, 2, 4, 6, 8, 10, 12].filter((v) => v <= maxShare).map((v) => <g key={v}>
      <text x={cx - gap - v * k} y={H - 10} textAnchor="middle" className="kit-small">{v}</text>
      <text x={cx + gap + v * k} y={H - 10} textAnchor="middle" className="kit-small">{v}</text>
    </g>)}
    <text x={W - 10} y={H - 10} textAnchor="end" className="kit-small">% (toplam nüfus içinde)</text>
  </svg>;
}

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const [playing, setPlaying] = useState(false);
  const preset = POP_PRESETS.find((p) => p.id === s.preset) ?? POP_PRESETS[0];
  const params = { tfr: s.tfr, e0: s.e0, migration: s.migration };
  const pop = project(preset.pop, params, s.steps);
  const now = structure(pop); const start = structure(preset.pop);
  const prev = s.steps > 0 ? structure(project(preset.pop, params, s.steps - 1)) : null;
  const growth = prev ? (Math.log(now.total / prev.total) / 5) * 1000 : null;
  const baseYear = preset.id === 'turkiye' ? 2020 : 0;
  const yearText = baseYear ? `${baseYear + 5 * s.steps}` : `başlangıç + ${5 * s.steps} yıl`;
  useEffect(() => {
    if (!playing) return undefined;
    if (s.steps >= 10) { setPlaying(false); return undefined; }
    const timer = setTimeout(() => set({ steps: s.steps + 1 }), 650);
    return () => clearTimeout(timer);
  }, [playing, s.steps]); // eslint-disable-line react-hooks/exhaustive-deps
  const series = Array.from({ length: Math.max(s.steps, 10) + 1 }, (_, i) => ({ i, st: structure(project(preset.pop, params, i)) }));
  const unit = preset.id === 'genc' || preset.id === 'yasli' ? '(başlangıç = 100)' : 'milyon';
  return <LabGrid top={<div className="kit-row">
    <label className="field"><span className="field-label">Başlangıç piramidi</span>
      <select value={s.preset} onChange={(e) => { const p = POP_PRESETS.find((x) => x.id === e.target.value); set({ preset: p.id, tfr: p.tfr, e0: p.e0, migration: p.migration, steps: 0 }); }}>
        {POP_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <button type="button" className="btn btn-secondary btn-sm" disabled={s.steps <= 0} onClick={() => set({ steps: s.steps - 1 })}>−5 yıl</button>
    <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ steps: Math.min(20, s.steps + 1) })}>+5 yıl</button>
    <button type="button" className="btn btn-primary btn-sm" onClick={() => { if (s.steps >= 10) set({ steps: 0 }); setPlaying((v) => !v); }}>{playing ? '⏸ Durdur' : '▶ 50 yılı oynat'}</button>
    <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ steps: 0 })}>Başa dön</button>
    <strong className="pop-year">{yearText}</strong>
  </div>} visual={<>
    <Pyramid pop={pop} ghost={preset.pop} title={yearText} />
    <p className="muted small">Kesikli çerçeve başlangıç piramidi; renkli çubuklar seçilen yıl.</p>
    <Plot x={[0, series.length - 1]} y={[0, 60]} height={200} items={[
      { type: 'poly', points: series.map(({ i, st }) => [i, st.youngShare]), color: 'green', width: 2.6 },
      { type: 'poly', points: series.map(({ i, st }) => [i, st.workingShare]), color: 'blue', width: 2.6 },
      { type: 'poly', points: series.map(({ i, st }) => [i, st.oldShare]), color: 'red', width: 2.6 },
      { type: 'vline', x: s.steps, color: 'navy' },
    ]} xTickStep={2} yTickStep={10} xLabel="5 yıllık adım" yLabel="%" ariaLabel="Yaş gruplarının payı" axisLabelsAtEdge />
    <div className="kit-legend"><span><i style={{ background: 'var(--pen-green)' }} />0–14 yaş</span><span><i style={{ background: 'var(--pen-blue)' }} />15–64 yaş</span><span><i style={{ background: 'var(--pen-red)' }} />65+ yaş</span></div>
  </>} side={<>
    <Panel title="Değişkenler">
      <Slider label="Toplam doğurganlık (çocuk/kadın)" value={s.tfr} min={1} max={7} step={0.1} onChange={(tfr) => set({ tfr })} hint="2,1 ≈ yenilenme düzeyi" />
      <Slider label="Ortalama yaşam süresi" value={s.e0} min={40} max={90} step={1} unit="yıl" onChange={(e0) => set({ e0 })} />
      <Slider label="Net göç (her 5 yılda, nüfusa oranı)" value={s.migration} min={-5} max={8} step={0.5} unit="%" onChange={(migration) => set({ migration })} />
    </Panel>
    <Readouts title={`${yearText} (canlı)`} items={[
      ['Piramit tipi', now.type, 'ok'],
      ['Toplam nüfus', `${fmt(now.total, 1)} ${unit} (başlangıca göre %${fmt((now.total / start.total - 1) * 100, 1)})`],
      growth !== null && ['Yıllık artış hızı', `‰ ${fmt(growth, 1)}`],
      ['0–14 / 15–64 / 65+', `%${fmt(now.youngShare, 1)} / %${fmt(now.workingShare, 1)} / %${fmt(now.oldShare, 1)}`],
      ['Bağımlı nüfus oranı', `(0–14 + 65+) / (15–64) × 100 = ${fmt(now.dependency, 1)}`],
      ['Genç / yaşlı bağımlılık', `${fmt(now.youngDep, 1)} / ${fmt(now.oldDep, 1)}`],
      ['Ortanca (medyan) yaş', `${fmt(now.median, 1)}`],
      ['Evre', transitionStage(s.tfr, s.e0)],
    ]} />
    <Steps title="Kurallar" lines={['Geniş taban: yüksek doğum, genç nüfus, hızlı artış.', 'Dar taban ve geniş üst: düşük doğum, uzun yaşam, yaşlanma.', 'Doğurganlık 2,1\'in altında kalırsa uzun vadede nüfus azalır.', 'Göç alan şehirde çalışma çağındaki (özellikle genç erkek) nüfus şişkinliği görülür.']} />
    {s.migration > 0 && <Note>Göç 20–39 yaş grubuna eklenir (erkek payı daha yüksek).</Note>}
  </>} />;
}

const initial = { preset: 'turkiye', tfr: 1.6, e0: 78, migration: 0, steps: 0 };
const setup = (id, patch = {}) => { const p = POP_PRESETS.find((x) => x.id === id); return { preset: id, tfr: p.tfr, e0: p.e0, migration: p.migration, steps: 0, ...patch }; };

export default {
  Lab,
  initial,
  intro: 'Başlangıç piramidini seç; doğurganlığı, ortalama yaşam süresini ve göçü değiştir, zamanı 5\'er yıl ilerlet. Piramidin biçimi, yaş grupları, bağımlı nüfus oranı ve medyan yaş canlı hesaplanır.',
  questions: [
    { id: 'tip', title: 'Geniş tabanlı piramit', exam: 'TYT', topic: 'Nüfus ve göç',
      stem: 'Tabanı geniş, üst kısmı dar (üçgen biçimli) bir nüfus piramidine sahip ülke için aşağıdakilerden hangisi söylenemez?',
      choices: { A: 'Doğum oranı yüksektir.', B: 'Genç nüfus oranı fazladır.', C: 'Ortalama yaşam süresi kısadır.', D: 'Yaşlı nüfus oranı yüksektir.', E: 'Nüfus artış hızı yüksektir.' }, answer: 'D',
      setup: setup('genc'),
      build: 'Başlangıç piramidi: Gelişmekte olan ülke.',
      look: '65+ payı ve piramit tipi satırı; zamanı ilerletince taban genişlemeye devam ediyor.',
      explanation: 'Geniş taban yüksek doğumu ve genç nüfusu, dar tepe kısa ortalama yaşam süresini ve düşük yaşlı oranını gösterir. "Yaşlı nüfus oranı yüksektir" söylenemez.',
      rule: 'Piramidin tabanı doğumu, tepesi yaşlı nüfusu ve yaşam süresini anlatır.' },
    { id: 'projeksiyon', title: 'Doğurganlık düşük kalırsa', exam: 'AYT', topic: 'Nüfus politikaları ve projeksiyonları',
      stem: 'Türkiye\'de toplam doğurganlık hızı uzun süre 1,6 düzeyinde kalırsa önümüzdeki 40 yılda nüfus piramidinde aşağıdaki değişimlerden hangisinin görülmesi beklenir?',
      choices: { A: 'Taban genişler, yaşlı nüfus oranı azalır.', B: 'Taban daralır, yaşlı nüfus oranı artar.', C: 'Piramidin biçimi değişmez.', D: 'Genç nüfus oranı artar.', E: 'Ortanca yaş düşer.' }, answer: 'B',
      setup: setup('turkiye'),
      build: 'Başlangıç: Türkiye, doğurganlık 1,6. "+5 yıl" ile 8 adım (2060) ilerlet ya da 50 yılı oynat.',
      look: '0–14 payı düşüyor, 65+ payı yükseliyor; piramit tipi "daralan"a dönüyor, medyan yaş artıyor.',
      explanation: 'Yenilenme düzeyinin (2,1) altındaki doğurganlık tabanı daraltır; uzayan yaşam süresiyle yaşlı payı artar ve ortanca yaş yükselir.',
      rule: 'Doğurganlık < 2,1 → taban daralır, nüfus yaşlanır; uzun vadede artış durur.' },
    { id: 'bagimli', title: 'Bağımlı nüfus oranı', exam: 'TYT', topic: 'Nüfus ve göç',
      stem: 'Bir ülkede nüfusun %20\'si 0–14, %65\'i 15–64 ve %15\'i 65 ve üzeri yaş grubundadır. Bu ülkenin bağımlı nüfus oranı yaklaşık kaçtır?',
      choices: { A: '35', B: '45', C: '54', D: '65', E: '100' }, answer: 'C',
      setup: setup('turkiye', { steps: 6 }),
      build: 'Başlangıç: Türkiye; 6 adım ilerlet (2050). "Bağımlı nüfus oranı" satırındaki formülü incele.',
      look: 'Formül: (0–14 + 65+) / (15–64) × 100. Laboratuvardaki değerlerle aynı işlemi sorudaki yüzdelere uygula.',
      explanation: '(20 + 15) / 65 × 100 ≈ 53,8 → yaklaşık 54.',
      rule: 'Bağımlı nüfus oranı: çalışmayan yaş gruplarının (0–14 ve 65+) çalışma çağındakilere oranı.' },
    { id: 'goc', title: '20–39 yaşta şişkinlik', exam: 'TYT', topic: 'Nüfus ve göç',
      stem: 'Bir şehrin nüfus piramidinde 20–39 yaş gruplarında, özellikle erkek nüfusta belirgin bir genişleme görülmektedir. Bu durumun en olası nedeni aşağıdakilerden hangisidir?',
      choices: { A: 'Doğum oranının yükselmesi', B: 'İş amaçlı göç alması', C: 'Savaş', D: 'Salgın hastalık', E: 'Yaşlı nüfusun artması' }, answer: 'B',
      setup: setup('goc'),
      build: 'Başlangıç: Göç alan sanayi şehri (net göç %4).',
      look: 'Piramidin orta kısmında erkek tarafı belirgin geniş. Göçü 0 yapıp zamanı ilerletince şişkinliğin yukarı kaydığını gör.',
      explanation: 'Sanayi ve hizmet işleri çalışma çağındaki genç nüfusu (çoğunlukla erkek) çeker; bu yaş gruplarında şişkinlik oluşur.',
      rule: 'Belirli yaşlarda ani genişleme göçü, daralma savaş/göç vermeyi düşündürür.' },
  ],
  tips: [
    { title: 'Piramit tipi', see: 'Geniş taban / dar taban / çan biçimi', look: 'Piramit tipi satırı ve başlangıç çerçevesi.', rule: 'Genişleyen: genç ve hızlı artan; durağan: dengeli; daralan: yaşlanan ve azalabilen nüfus.' },
    { title: 'Projeksiyon', see: '"… yıl sonra", "doğurganlık düşerse"', look: 'Zamanı ilerlet; yaş payları grafiği.', rule: 'Bugünkü doğum, 20 yıl sonraki işgücünü ve 65 yıl sonraki yaşlıları belirler.' },
    { title: 'Bağımlılık', see: '"bağımlı nüfus", "çalışma çağı"', look: 'Bağımlı nüfus oranı satırı.', rule: '(0–14 + 65+) / (15–64) × 100.' },
    { title: 'Göç izi', see: 'Belirli yaş gruplarında şişkinlik/çekilme', look: 'Göç kaydırıcısı.', rule: 'Göç alan yerlerde 20–39 yaş (erkek) şişer; göç veren yerlerde bu kısım çekilir, yaşlı ve çocuk payı artar.' },
  ],
};
