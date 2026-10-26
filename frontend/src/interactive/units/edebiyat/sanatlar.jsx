import { Choice, LabGrid, Note, Panel, Readouts, Steps, TextField, Toggle } from '../../kit/controls.jsx';
import { figureOf } from './figures.js';

export const BUILD_PRESETS = [
  { id: 'ay', benzeyen: 'yüzü', benzetilen: 'ay', yon: 'parlak', edat: 'gibi', ozellik: 'doğdu sokağımıza' },
  { id: 'aslan', benzeyen: 'asker', benzetilen: 'aslan', yon: 'cesur', edat: 'gibi', ozellik: 'kükredi' },
  { id: 'deniz', benzeyen: 'gözleri', benzetilen: 'deniz', yon: 'mavi', edat: 'gibi', ozellik: 'dalgalandı' },
  { id: 'bulut', benzeyen: 'bulutlar', benzetilen: 'insan', yon: 'hüzünlü', edat: 'gibi', ozellik: 'ağladı' },
];

const ARTS = {
  teshis: { name: 'Teşhis (kişileştirme)', q: 'İnsan dışındaki bir varlığa insana özgü bir özellik ya da davranış verilmiş mi?' },
  intak: { name: 'İntak (konuşturma)', q: 'İnsan dışındaki bir varlık konuşturulmuş mu? (Teşhisi de içerir.)' },
  tezat: { name: 'Tezat (karşıtlık)', q: 'Zıt kavramlar bir arada mı kullanılmış?' },
  mubalaga: { name: 'Mübalağa (abartma)', q: 'Bir durum olduğundan çok büyük ya da küçük mü gösterilmiş?' },
  tecahul: { name: 'Tecahül-i ârif (bilmezden gelme)', q: 'Bilinen bir şey bilinmiyormuş gibi mi soruluyor?' },
  husn: { name: 'Hüsn-i talil (güzel nedene bağlama)', q: 'Bir olay gerçek dışı, güzel bir nedene mi bağlanmış?' },
  kinaye: { name: 'Kinaye', q: 'Söz gerçek anlamıyla da düşünülebilir ama mecaz anlamı mı kastediliyor?' },
  mecaz: { name: 'Mecaz-ı mürsel (ad aktarması)', q: 'Benzetme olmadan bir söz başka bir söz yerine (yer–halk, parça–bütün) mi kullanılmış?' },
  tenasup: { name: 'Tenasüp (uygunluk)', q: 'Anlamca birbiriyle ilgili kavramlar bir arada mı?' },
  telmih: { name: 'Telmih (hatırlatma)', q: 'Bilinen bir olaya, kişiye ya da hikâyeye gönderme var mı?' },
};
export const LINES = [
  { id: 'l1', text: 'Rüzgâr pencereme gelip kapımı çaldı.', arts: ['teshis'], why: 'Kapı çalmak insana özgü bir davranış; rüzgâra verilmiş.' },
  { id: 'l2', text: 'Dağlar "Neden bu kadar sessizsin?" diye sordu bana.', arts: ['intak', 'teshis'], why: 'Dağlar konuşturulmuş (intak); konuşturma kişileştirmeyi de içerir.' },
  { id: 'l3', text: 'Gülen yüzün ardında ağlayan bir yürek vardı.', arts: ['tezat'], why: 'Gülmek ve ağlamak zıt kavramlar.' },
  { id: 'l4', text: 'Gözyaşlarım sel olup bütün şehri götürdü.', arts: ['mubalaga'], why: 'Gözyaşının şehri götürmesi aşırı abartı.' },
  { id: 'l5', text: 'Bilmem yanaklarımdaki yağmur mu, yoksa gözyaşı mı?', arts: ['tecahul'], why: 'Şair gözyaşı olduğunu bildiği hâlde bilmiyormuş gibi soruyor.' },
  { id: 'l6', text: 'Güneş, senin güzelliğini kıskandığı için bugün bulutların ardına saklandı.', arts: ['husn', 'teshis'], why: 'Güneşin bulutlanması gerçek dışı, güzel bir nedene (kıskançlık) bağlanmış; kıskanmak da güneşe insan özelliği vermek (teşhis).' },
  { id: 'l7', text: 'O evin ocağı yıllardır tütmüyor.', arts: ['kinaye'], why: 'Ocağın tütmemesi gerçek anlamıyla da düşünülebilir; kastedilen ailenin dağılması/geçimsizliktir.' },
  { id: 'l8', text: 'Bütün İstanbul onu alkışladı.', arts: ['mecaz'], why: '"İstanbul" denerek İstanbul halkı kastedilmiş (yer–halk ilişkisi); benzetme yok.' },
  { id: 'l9', text: 'Bahçede gül, bülbül ve diken bir aradaydı.', arts: ['tenasup'], why: 'Gül, bülbül, diken anlamca ilgili kavramlar.' },
  { id: 'l10', text: 'Ferhat gibi dağları delerim senin için.', arts: ['telmih'], why: 'Ferhat ile Şirin hikâyesine gönderme var (aynı zamanda bir benzetme).' },
];

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const fig = figureOf(s.parts, s.inc);
  const line = LINES.find((l) => l.id === s.line) ?? LINES[0];
  const chosen = s.answers[line.id] ?? [];
  const toggleArt = (key) => set({ answers: { ...s.answers, [line.id]: chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key] }, checked: false });
  const correct = s.checked && line.arts.every((a) => chosen.includes(a)) && chosen.every((a) => line.arts.includes(a));
  return <LabGrid top={<div className="kit-row">
    <Choice options={[{ value: 'kurucu', label: 'Benzetme kurucu' }, { value: 'bulucu', label: 'Sanat bulucu' }]} value={s.mode} onChange={(mode) => set({ mode })} />
  </div>} visual={s.mode === 'kurucu' ? <>
    <section className="kit-panel">
      <h4>Benzetmenin ögeleri</h4>
      <div className="kit-row">
        <TextField label="Benzeyen" value={s.parts.benzeyen} onChange={(v) => set({ parts: { ...s.parts, benzeyen: v } })} />
        <TextField label="Benzetilen" value={s.parts.benzetilen} onChange={(v) => set({ parts: { ...s.parts, benzetilen: v } })} />
        <TextField label="Benzetme yönü" value={s.parts.yon} onChange={(v) => set({ parts: { ...s.parts, yon: v } })} />
        <TextField label="Benzetme edatı" value={s.parts.edat} onChange={(v) => set({ parts: { ...s.parts, edat: v } })} />
      </div>
      <TextField label="Benzetilene ait özellik/eylem (istiare için)" value={s.parts.ozellik} onChange={(v) => set({ parts: { ...s.parts, ozellik: v } })} hint="ör. aslan → kükredi; ay → doğdu" />
      <div className="kit-chips">{['benzeyen', 'benzetilen', 'yon', 'edat'].map((k) => <Toggle key={k} label={`${{ benzeyen: 'Benzeyen', benzetilen: 'Benzetilen', yon: 'Yön', edat: 'Edat' }[k]} cümlede`} checked={s.inc[k]} onChange={(on) => set({ inc: { ...s.inc, [k]: on } })} />)}</div>
      <div className="kit-chips">{BUILD_PRESETS.map((p) => <button key={p.id} type="button" className="ml-event-chip" onClick={() => set({ parts: p })}>{p.benzeyen} → {p.benzetilen}</button>)}</div>
    </section>
    <section className={`kit-panel fig-result`}>
      <p className="fig-sentence">“{fig.sentence}”</p>
      <p><strong>{fig.name}</strong> — {fig.why}</p>
    </section>
    <div className="fig-ladder">{[
      ['Ayrıntılı teşbih', { benzeyen: true, benzetilen: true, yon: true, edat: true }],
      ['Yönsüz', { benzeyen: true, benzetilen: true, yon: false, edat: true }],
      ['Edatsız', { benzeyen: true, benzetilen: true, yon: true, edat: false }],
      ['Teşbih-i beliğ', { benzeyen: true, benzetilen: true, yon: false, edat: false }],
      ['Açık istiare', { benzeyen: false, benzetilen: true, yon: false, edat: false }],
      ['Kapalı istiare', { benzeyen: true, benzetilen: false, yon: false, edat: false }],
    ].map(([label, inc]) => { const f = figureOf(s.parts, inc); const on = JSON.stringify(inc) === JSON.stringify(s.inc);
      return <button key={label} type="button" className={`fig-step${on ? ' on' : ''}`} onClick={() => set({ inc })}><small>{label}</small><span>{f.sentence}</span></button>; })}</div>
  </> : <>
    <section className="kit-panel">
      <label className="field"><span className="field-label">Dize</span>
        <select value={line.id} onChange={(e) => set({ line: e.target.value, checked: false })}>{LINES.map((l) => <option key={l.id} value={l.id}>{l.text}</option>)}</select></label>
      <p className="fig-sentence">“{line.text}”</p>
      <h4>Karar soruları: evet dediklerini işaretle</h4>
      <div className="fig-questions">{Object.entries(ARTS).map(([key, art]) => <label key={key} className={`fig-q${chosen.includes(key) ? ' on' : ''}${s.checked ? (line.arts.includes(key) ? ' right' : chosen.includes(key) ? ' wrong' : '') : ''}`}>
        <input type="checkbox" checked={chosen.includes(key)} onChange={() => toggleArt(key)} />
        <span><strong>{art.name}</strong><small>{art.q}</small></span></label>)}</div>
      <div className="kit-chips"><button type="button" className="btn btn-primary btn-sm" onClick={() => set({ checked: true })}>Kontrol et</button></div>
      {s.checked && <p className={correct ? 'st-ok' : 'st-bad'}>{correct ? 'Doğru! ' : `Bu dizedeki sanat(lar): ${line.arts.map((a) => ARTS[a].name).join(', ')}. `}{line.why}</p>}
    </section>
  </>} side={<>
    <Readouts title="Benzetme ögeleri" items={[['Benzeyen', 'Benzetilen nitelikçe zayıf olan (yüzü)'], ['Benzetilen', 'Niteliği güçlü olan (ay)'], ['Benzetme yönü', 'Ortak nitelik (parlaklık)'], ['Benzetme edatı', 'gibi, kadar, sanki, misali']]} />
    <Steps title="Kural" lines={['Benzeyen ve benzetilen temel ögelerdir; ikisi varsa teşbihtir.', 'Yön ya da edat atılırsa kısaltılmış teşbih; ikisi birden atılırsa teşbih-i beliğ.', 'Temel ögelerden biri atılırsa istiare: benzetilen kalırsa açık, benzeyen kalırsa kapalı istiare.', 'Kapalı istiarede genellikle teşhis de vardır (bulutlar ağladı).']} />
    {s.mode === 'bulucu' && <Note>Bir dizede birden çok sanat olabilir; hepsini işaretle.</Note>}
  </>} />;
}

const initial = { mode: 'kurucu', parts: BUILD_PRESETS[0], inc: { benzeyen: true, benzetilen: true, yon: true, edat: true }, line: 'l1', answers: {}, checked: false };

export default {
  Lab,
  initial,
  intro: 'Benzetme kurucuda dört ögeyi yaz ve hangilerinin cümlede kalacağını seç: aynı benzetme ayrıntılı teşbihten teşbih-i beliğe, açık ve kapalı istiareye dönüşür. Sanat bulucuda karar sorularıyla dizedeki sanatları işaretle.',
  questions: [
    { id: 'belig', title: '"Yüzü bir ay."', exam: 'AYT', topic: 'Söz sanatları',
      stem: '"Yüzü bir ay." cümlesindeki söz sanatı aşağıdakilerden hangisidir?',
      choices: { A: 'Ayrıntılı teşbih', B: 'Kısaltılmış teşbih (yönsüz)', C: 'Teşbih-i beliğ', D: 'Açık istiare', E: 'Kapalı istiare' }, answer: 'C',
      setup: { mode: 'kurucu', parts: BUILD_PRESETS[0], inc: { benzeyen: true, benzetilen: true, yon: false, edat: false } },
      build: 'Benzetme kurucu: yüzü → ay. Yalnız benzeyen ve benzetilen cümlede kalsın.',
      look: 'Basamaklardan "Teşbih-i beliğ"e tıkla; sonra "Kapalı istiare" ve "Açık istiare"yi dene: hangi öge düşünce ad değişiyor?',
      explanation: 'Benzeyen (yüz) ve benzetilen (ay) var; yön (parlak) ve edat (gibi) yok → teşbih-i beliğ (güçlü benzetme).',
      rule: 'İki temel öge kalırsa teşbih-i beliğ; bir temel öge düşerse istiare.' },
    { id: 'kapali', title: '"Asker kükredi."', exam: 'AYT', topic: 'Söz sanatları',
      stem: '"Cephede asker kükredi." cümlesindeki söz sanatı aşağıdakilerden hangisidir?',
      choices: { A: 'Ayrıntılı teşbih', B: 'Teşbih-i beliğ', C: 'Açık istiare', D: 'Mübalağa', E: 'Kapalı istiare' }, answer: 'E',
      setup: { mode: 'kurucu', parts: BUILD_PRESETS[1], inc: { benzeyen: true, benzetilen: false, yon: false, edat: false } },
      build: 'Benzetme kurucu: asker → aslan, özellik "kükredi". Yalnız benzeyen cümlede kalsın.',
      look: 'Cümlede aslan yok ama aslana ait "kükremek" askere verilmiş.',
      explanation: 'Asker aslana benzetilmiş; benzetilen (aslan) söylenmemiş, ona ait özellik (kükremek) benzeyene (asker) verilmiş → kapalı istiare.',
      rule: 'Benzeyen kalır, benzetilenin özelliği gelir: kapalı istiare. Benzetilen kalırsa açık istiare.' },
    { id: 'mecaz', title: '"Bütün İstanbul…"', exam: 'AYT', topic: 'Söz sanatları',
      stem: '"Bütün İstanbul onu alkışladı." cümlesindeki söz sanatı aşağıdakilerden hangisidir?',
      choices: { A: 'Teşhis', B: 'Mecaz-ı mürsel', C: 'Tezat', D: 'Mübalağa', E: 'Telmih' }, answer: 'B',
      setup: { mode: 'bulucu', line: 'l8', answers: {}, checked: false },
      build: 'Sanat bulucu: "Bütün İstanbul onu alkışladı."',
      look: 'Karar sorularını sırayla yanıtla: benzetme var mı? İnsan özelliği verilmiş mi? Bir söz başka bir söz yerine mi kullanılmış?',
      explanation: '"İstanbul" (yer) söylenip İstanbul halkı kastedilmiştir; arada benzetme yoktur → mecaz-ı mürsel (ad aktarması).',
      rule: 'Benzetme amacı olmadan yer–halk, parça–bütün, içerik–kap ilişkisiyle ad aktarma: mecaz-ı mürsel.' },
    { id: 'husn', title: 'Kıskanan güneş', exam: 'AYT', topic: 'Söz sanatları',
      stem: '"Güneş, senin güzelliğini kıskandığı için bugün bulutların ardına saklandı." cümlesinde aşağıdaki söz sanatlarından hangileri birlikte kullanılmıştır?',
      choices: { A: 'Tezat – mübalağa', B: 'Hüsn-i talil – teşhis', C: 'Telmih – tenasüp', D: 'Kinaye – tezat', E: 'İntak – tecahül-i ârif' }, answer: 'B',
      setup: { mode: 'bulucu', line: 'l6', answers: {}, checked: false },
      build: 'Sanat bulucu: "Güneş, senin güzelliğini kıskandığı için…"',
      look: 'İki karar sorusuna "evet": olay güzel bir nedene bağlanmış mı? Güneşe insan özelliği verilmiş mi?',
      explanation: 'Güneşin bulutların ardında kalması gerçek dışı, güzel bir nedene (kıskançlık) bağlanmış → hüsn-i talil. Kıskanmak insana özgüdür → teşhis.',
      rule: 'Hüsn-i talil gerçek nedenin yerine güzel, hayalî bir neden koyar; çoğu zaman teşhisle birlikte gelir.' },
  ],
  tips: [
    { title: 'Teşbih basamakları', see: 'gibi, kadar, sanki; "… bir …"', look: 'Benzetme kurucu basamakları.', rule: '4 öge: ayrıntılı; yön ya da edat yok: kısaltılmış; ikisi de yok: teşbih-i beliğ.' },
    { title: 'İstiare', see: 'Benzetme var ama bir temel öge yok', look: 'Açık/kapalı istiare basamakları.', rule: 'Yalnız benzetilen: açık istiare. Yalnız benzeyen + benzetilenin özelliği: kapalı istiare.', trap: 'Kapalı istiarede teşhis de bulunur; soru "hangisi yoktur" ise dikkat.' },
    { title: 'Mecaz-ı mürsel – kinaye', see: '"İstanbul alkışladı", "ocağı tütmüyor"', look: 'Sanat bulucu.', rule: 'Mecaz-ı mürsel: benzetmesiz ad aktarma. Kinaye: gerçek anlamı da mümkün, mecazı kastedilen söz.' },
    { title: 'Diğer sanatlar', see: 'Zıtlık, abartı, soru, gönderme', look: 'Karar soruları.', rule: 'Tezat (zıtlık), mübalağa (abartı), tecahül-i ârif (bilmezden gelme), telmih (gönderme), tenasüp (ilgili kavramlar).' },
  ],
};
