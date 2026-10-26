import DataGrid from '../../../components/DataGrid.jsx';
import { Choice, LabGrid, Note, Panel, Readouts, Steps, Toggle } from '../../kit/controls.jsx';

export const TREATIES = [
  { id: 'mondros', name: 'Mondros Ateşkes Antlaşması', date: '30 Ekim 1918', order: 1, side: 'Osmanlı', kind: 'Ateşkes', parties: 'Osmanlı Devleti – İtilaf Devletleri (İngiltere temsil etti)',
    land: 'İtilaf devletleri güvenliklerini tehdit eden her stratejik noktayı işgal edebilecek (7. madde); Vilayât-ı Sitte\'de karışıklıkta işgal (24. madde).',
    capitulation: '—', straits: 'Boğazlar İtilaf gemilerine açılacak.', army: 'Ordu terhis edilecek.',
    importance: 'Osmanlı fiilen sona erdi; işgallerin hukuki zemini oldu.', topics: ['bogazlar', 'isgal'] },
  { id: 'sevr', name: 'Sevr Antlaşması', date: '10 Ağustos 1920', order: 2, side: 'Osmanlı', kind: 'Barış (yürürlüğe girmedi)', parties: 'Osmanlı (İstanbul Hükümeti) – İtilaf Devletleri',
    land: 'Doğu\'da Ermeni devleti, Güneydoğu\'da özerk bölge; İzmir Yunan yönetimine, Doğu Trakya Yunanistan\'a.', capitulation: 'Genişletildi.', straits: 'Uluslararası komisyon yönetecek.',
    army: '50.700 kişiyle sınırlı.', importance: 'Mebusan Meclisi kapalı olduğundan onaylanamadı; TBMM tanımadı ("ölü doğmuş").', topics: ['kapitulasyon', 'bogazlar', 'bati', 'dogu'] },
  { id: 'gumru', name: 'Gümrü Antlaşması', date: '3 Aralık 1920', order: 3, side: 'TBMM', kind: 'Barış', parties: 'TBMM – Ermenistan',
    land: 'Kars ve çevresi TBMM\'ye bırakıldı; Ermenistan Sevr\'den vazgeçti.', capitulation: '—', straits: '—', army: '—',
    importance: 'TBMM\'nin uluslararası alanda imzaladığı ilk antlaşma; ilk askerî ve siyasi başarı; Doğu Cephesi kapandı.', topics: ['dogu', 'ilk'] },
  { id: 'moskova', name: 'Moskova Antlaşması', date: '16 Mart 1921', order: 4, side: 'TBMM', kind: 'Dostluk', parties: 'TBMM – Sovyet Rusya',
    land: 'Batum Gürcistan\'a bırakıldı; Kars, Ardahan, Artvin Türkiye\'de kaldı.', capitulation: 'Rusya kapitülasyonların kaldırılmasını tanıdı.', straits: 'Boğazların statüsü kıyı devletlerinin katılacağı konferansa bırakıldı.',
    army: '—', importance: 'Misak-ı Millî\'yi tanıyan ilk Avrupa devleti (Sovyet Rusya); doğu sınırı büyük ölçüde belirlendi.', topics: ['dogu', 'kapitulasyon', 'ilk'] },
  { id: 'kars', name: 'Kars Antlaşması', date: '13 Ekim 1921', order: 5, side: 'TBMM', kind: 'Dostluk', parties: 'TBMM – Ermenistan, Gürcistan, Azerbaycan (Sovyet Rusya aracılığıyla)',
    land: 'Moskova Antlaşması\'ndaki sınır Kafkas cumhuriyetlerince onaylandı.', capitulation: '—', straits: '—', army: '—',
    importance: 'Doğu sınırı kesinleşti.', topics: ['dogu'] },
  { id: 'ankara', name: 'Ankara Antlaşması', date: '20 Ekim 1921', order: 6, side: 'TBMM', kind: 'Barış', parties: 'TBMM – Fransa',
    land: 'Hatay dışındaki güney sınırı çizildi; Hatay\'a özel yönetim verildi.', capitulation: '—', straits: '—', army: '—',
    importance: 'TBMM\'yi tanıyan ilk İtilaf devleti; Güney Cephesi kapandı; İtilaf bloğunda çatlak.', topics: ['guney', 'ilk'] },
  { id: 'mudanya', name: 'Mudanya Ateşkes Antlaşması', date: '11 Ekim 1922', order: 7, side: 'TBMM', kind: 'Ateşkes', parties: 'TBMM – İngiltere, Fransa, İtalya (Yunanistan sonradan katıldı)',
    land: 'Doğu Trakya ve Edirne savaş yapılmadan TBMM\'ye bırakıldı.', capitulation: '—', straits: 'İstanbul ve Boğazlar TBMM yönetimine bırakıldı (İtilaf askerleri barışa kadar kalacak).',
    army: '—', importance: 'Silahlı mücadele sona erdi; İstanbul Hükümeti\'nin hukuken sona erdiği kabul edilir.', topics: ['bati', 'bogazlar'] },
  { id: 'lozan', name: 'Lozan Barış Antlaşması', date: '24 Temmuz 1923', order: 8, side: 'TBMM', kind: 'Barış', parties: 'TBMM – İngiltere, Fransa, İtalya, Yunanistan, Japonya ve diğerleri',
    land: 'Batı Trakya Yunanistan\'da; Musul İngiltere ile görüşmeye bırakıldı; Hatay sınırı Ankara Antlaşması\'ndaki gibi.', capitulation: 'Tamamen kaldırıldı.',
    straits: 'Başkanı Türk olan uluslararası komisyona bırakıldı (1936 Montrö ile Türkiye\'ye geçti).', army: 'Boğazlar bölgesi askerden arındırılacak.',
    importance: 'Yeni Türk devletinin bağımsızlığı uluslararası alanda tanındı; borçlar paylaştırıldı; nüfus mübadelesi.', topics: ['kapitulasyon', 'bogazlar', 'bati', 'guney'] },
];
const TOPICS = { kapitulasyon: 'Kapitülasyonlar', bogazlar: 'Boğazlar', dogu: 'Doğu sınırı', guney: 'Güney sınırı', bati: 'Batı (Trakya, Ege)', ilk: 'İlkler / tanınma', isgal: 'İşgal' };
const COLUMNS = [
  { field: 'name', headerName: 'Antlaşma', pinned: 'left', width: 170, wrapText: true, autoHeight: true },
  { field: 'date', headerName: 'Tarih', width: 120 },
  { field: 'side', headerName: 'Türk tarafı', width: 110 },
  { field: 'kind', headerName: 'Türü', width: 130, wrapText: true, autoHeight: true },
  { field: 'parties', headerName: 'Taraflar', width: 220, wrapText: true, autoHeight: true },
  { field: 'land', headerName: 'Toprak / sınır', width: 300, wrapText: true, autoHeight: true },
  { field: 'capitulation', headerName: 'Kapitülasyonlar', width: 170, wrapText: true, autoHeight: true },
  { field: 'straits', headerName: 'Boğazlar', width: 220, wrapText: true, autoHeight: true },
  { field: 'importance', headerName: 'Önemi', width: 300, wrapText: true, autoHeight: true },
];

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const chosen = TREATIES.filter((t) => s.chosen.includes(t.id) && (!s.topic || s.topic === 'all' || t.topics.includes(s.topic)));
  const quizItems = TREATIES.map((t) => ({ t, side: s.quiz[t.id]?.side, kind: s.quiz[t.id]?.kind }));
  const kindOf = (t) => (t.kind.startsWith('Ateşkes') ? 'Ateşkes' : 'Barış/dostluk');
  const score = s.checked ? quizItems.filter(({ t, side, kind }) => side === t.side && kind === kindOf(t)).length : 0;
  return <LabGrid top={<div className="kit-row">
    <Choice options={[{ value: 'karsilastir', label: 'Karşılaştır' }, { value: 'siniflandir', label: 'Sınıflandır (alıştırma)' }]} value={s.mode} onChange={(mode) => set({ mode })} />
    {s.mode === 'karsilastir' && <label className="field"><span className="field-label">Konuya göre süz</span>
      <select value={s.topic} onChange={(e) => set({ topic: e.target.value })}><option value="all">Hepsi</option>{Object.entries(TOPICS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>}
  </div>} visual={s.mode === 'karsilastir' ? <>
    <div className="tr-strip" aria-label="Antlaşmaların sırası">{TREATIES.map((t) => <button key={t.id} type="button" className={`tr-chip${s.chosen.includes(t.id) ? ' on' : ''}${t.side === 'TBMM' ? ' tbmm' : ''}`}
      onClick={() => set({ chosen: s.chosen.includes(t.id) ? s.chosen.filter((x) => x !== t.id) : [...s.chosen, t.id] })} aria-pressed={s.chosen.includes(t.id)}>
      <small>{t.date}</small><strong>{t.name.replace(' Antlaşması', '').replace(' Ateşkes', ' (ateşkes)').replace(' Barış', '')}</strong></button>)}</div>
    <p className="muted small">Kartlara tıklayarak karşılaştırmaya ekle/çıkar. Mavi çerçeve: TBMM'nin imzaladıkları.</p>
    {chosen.length ? <DataGrid mode="compact" rowData={chosen.sort((p, q) => p.order - q.order)} columnDefs={COLUMNS} rowKey={(row) => row.id} className="tr-grid" />
      : <Note>Bu süzgeçte seçili antlaşma yok.</Note>}
  </> : <section className="kit-panel">
    <h4>Her antlaşma için iki soruyu yanıtla</h4>
    <div className="tr-quiz">{quizItems.map(({ t, side, kind }) => {
      const ok = s.checked && side === t.side && kind === kindOf(t);
      return <div key={t.id} className={`tr-quiz-row${s.checked ? (ok ? ' ok' : ' bad') : ''}`}>
        <span><strong>{t.name}</strong>{s.checked && !ok && <small> — doğrusu: {t.side}, {kindOf(t)}</small>}</span>
        <Choice options={[{ value: 'Osmanlı', label: 'Osmanlı' }, { value: 'TBMM', label: 'TBMM' }]} value={side} onChange={(v) => set({ quiz: { ...s.quiz, [t.id]: { ...s.quiz[t.id], side: v } }, checked: false })} />
        <Choice options={[{ value: 'Ateşkes', label: 'Ateşkes' }, { value: 'Barış/dostluk', label: 'Barış / dostluk' }]} value={kind} onChange={(v) => set({ quiz: { ...s.quiz, [t.id]: { ...s.quiz[t.id], kind: v } }, checked: false })} />
      </div>;
    })}</div>
    <div className="kit-chips"><button type="button" className="btn btn-primary btn-sm" onClick={() => set({ checked: true })}>Kontrol et</button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ quiz: {}, checked: false })}>Temizle</button></div>
    {s.checked && <p className={score === TREATIES.length ? 'st-ok' : 'st-bad'}>{score} / {TREATIES.length} doğru.</p>}
  </section>} side={<>
    {s.mode === 'karsilastir' && <Readouts title="Konuya göre özet" items={Object.entries(TOPICS).map(([k, v]) => [v, TREATIES.filter((t) => t.topics.includes(k)).map((t) => t.name.replace(' Antlaşması', '').replace(' Ateşkes', '').replace(' Barış', '')).join(', ')])} />}
    <Steps title="Ayırt edici bilgiler" lines={['Osmanlı\'nın imzaladıkları: Mondros (ateşkes), Sevr (barış, yürürlüğe girmedi).', 'TBMM\'nin ilk antlaşması Gümrü; Misak-ı Millî\'yi tanıyan ilk Avrupa devleti Rusya (Moskova); ilk İtilaf devleti Fransa (Ankara).', 'Kapitülasyonları tamamen kaldıran Lozan; Boğazları Türkiye\'ye geçiren 1936 Montrö.', 'Ateşkesler: Mondros, Mudanya. Diğerleri barış/dostluk antlaşması.']} />
  </>} />;
}

const initial = { mode: 'karsilastir', chosen: TREATIES.map((t) => t.id), topic: 'all', quiz: {}, checked: false };

export default {
  Lab,
  initial,
  intro: 'Antlaşmaları tablo hâlinde karşılaştır: taraflar, toprak, kapitülasyonlar, Boğazlar ve önemi. Konuya göre süz ya da "Sınıflandır" alıştırmasıyla kendini sına.',
  questions: [
    { id: 'ilk', title: 'TBMM\'nin ilk antlaşması', exam: 'TYT', topic: 'Millî Mücadele',
      stem: 'TBMM\'nin uluslararası alanda imzaladığı ilk antlaşma aşağıdakilerden hangisidir?',
      choices: { A: 'Moskova Antlaşması', B: 'Gümrü Antlaşması', C: 'Kars Antlaşması', D: 'Ankara Antlaşması', E: 'Mudanya Ateşkes Antlaşması' }, answer: 'B',
      setup: { mode: 'karsilastir', topic: 'ilk', chosen: ['gumru', 'moskova', 'ankara'] },
      build: 'Karşılaştır; konu: İlkler / tanınma.',
      look: '"Türk tarafı" TBMM olanları tarih sırasıyla oku; "Önemi" sütununda "ilk" ifadeleri.',
      explanation: 'Gümrü Antlaşması (3 Aralık 1920) TBMM\'nin imzaladığı ilk uluslararası antlaşmadır; Moskova (Mart 1921) ve Ankara (Ekim 1921) daha sonradır.',
      rule: 'İlk antlaşma Gümrü (1920), ilk dostluk Moskova (1921).' },
    { id: 'kapitulasyon', title: 'Kapitülasyonların kaldırılması', exam: 'TYT', topic: 'Millî Mücadele',
      stem: 'Kapitülasyonların tamamen kaldırıldığı antlaşma aşağıdakilerden hangisidir?',
      choices: { A: 'Mondros', B: 'Sevr', C: 'Moskova', D: 'Mudanya', E: 'Lozan' }, answer: 'E',
      setup: { mode: 'karsilastir', topic: 'kapitulasyon' },
      build: 'Karşılaştır; konu: Kapitülasyonlar.',
      look: 'Sevr kapitülasyonları genişletiyor, Moskova\'da yalnız Rusya kaldırılmasını tanıyor, Lozan\'da tamamen kaldırılıyor.',
      explanation: 'Lozan Barış Antlaşması (1923) ile kapitülasyonlar tamamen kaldırıldı.',
      rule: 'Moskova: Rusya kabul etti. Lozan: bütün devletler için kaldırıldı.' },
    { id: 'itilaf', title: 'TBMM\'yi tanıyan ilk İtilaf devleti', exam: 'TYT', topic: 'Millî Mücadele',
      stem: 'TBMM\'yi tanıyan ilk İtilaf devletiyle imzalanan antlaşma aşağıdakilerden hangisidir?',
      choices: { A: 'Gümrü Antlaşması', B: 'Moskova Antlaşması', C: 'Ankara Antlaşması', D: 'Kars Antlaşması', E: 'Lozan Antlaşması' }, answer: 'C',
      setup: { mode: 'karsilastir', topic: 'guney' },
      build: 'Karşılaştır; konu: Güney sınırı.',
      look: 'Ankara Antlaşması\'nın tarafları ve "Önemi" sütunu.',
      explanation: 'Ankara Antlaşması (20 Ekim 1921) ile Fransa TBMM\'yi resmen tanıyan ilk İtilaf devleti oldu. (Sovyet Rusya İtilaf devleti değildir.)',
      rule: 'İtilaf devletleri: İngiltere, Fransa, İtalya, (Yunanistan). Rusya 1917\'de savaştan çekilmişti.' },
    { id: 'trakya', title: 'Doğu Trakya savaşsız', exam: 'TYT', topic: 'Millî Mücadele',
      stem: 'Doğu Trakya ve Edirne\'nin savaş yapılmadan Türk yönetimine bırakılmasını sağlayan antlaşma aşağıdakilerden hangisidir?',
      choices: { A: 'Mudanya Ateşkes Antlaşması', B: 'Lozan Barış Antlaşması', C: 'Mondros Ateşkes Antlaşması', D: 'Ankara Antlaşması', E: 'Sevr Antlaşması' }, answer: 'A',
      setup: { mode: 'karsilastir', topic: 'bati' },
      build: 'Karşılaştır; konu: Batı (Trakya, Ege).',
      look: '"Toprak / sınır" sütununda Doğu Trakya\'dan söz eden antlaşmalar: Sevr (Yunanistan\'a), Mudanya (TBMM\'ye).',
      explanation: 'Mudanya Ateşkesi (11 Ekim 1922) ile Doğu Trakya ve Edirne savaşsız olarak TBMM\'ye bırakıldı; Lozan bunu kesinleştirdi.',
      rule: 'Mudanya askerî sürecin sonu ve Doğu Trakya\'nın kurtuluşu; Lozan siyasi tanınma.' },
  ],
  tips: [
    { title: 'Kim imzaladı?', see: '"Osmanlı Devleti\'nin imzaladığı", "TBMM\'nin"', look: 'Türk tarafı sütunu; sınıflandırma alıştırması.', rule: 'Osmanlı: Mondros, Sevr. TBMM: Gümrü, Moskova, Kars, Ankara, Mudanya, Lozan.' },
    { title: 'Konu süzgeci', see: 'Kapitülasyon, Boğazlar, sınır soruları', look: 'Konuya göre süz.', rule: 'Kapitülasyon: Sevr (genişletti), Moskova (Rusya tanıdı), Lozan (kaldırdı). Boğazlar: Mondros, Sevr, Mudanya, Lozan, sonra Montrö.' },
    { title: 'İlkler', see: '"ilk", "tanıyan ilk"', look: 'Önemi sütunu.', rule: 'İlk antlaşma Gümrü; Misak-ı Millî\'yi tanıyan ilk Avrupa devleti Rusya; ilk İtilaf devleti Fransa.' },
  ],
};
