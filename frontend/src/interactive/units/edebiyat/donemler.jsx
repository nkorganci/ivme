import { useMemo } from 'react';
import DataGrid from '../../../components/DataGrid.jsx';
import { Choice, LabGrid, Note, Panel, Readouts, Steps } from '../../kit/controls.jsx';

export const PERIODS = [
  { id: 'islamoncesi', name: 'İslamiyet öncesi', years: '— 10. yy', art: 'Toplumsal, sözlü gelenek (şölen, sığır, yuğ)', lang: 'Öz Türkçe', form: 'Hece ölçüsü, dörtlük, yarım uyak', genres: 'Koşuk, sagu, destan; Göktürk (Orhun) Yazıtları' },
  { id: 'gecis', name: 'Geçiş dönemi', years: '11.–13. yy', art: 'İslami etki, öğretici', lang: 'Türkçe (Arapça–Farsça etkisi başlıyor)', form: 'Hece ve aruz birlikte', genres: 'Kutadgu Bilig, Divanü Lügati\'t-Türk, Atabetü\'l-Hakayık, Divan-ı Hikmet' },
  { id: 'divan', name: 'Divan edebiyatı', years: '13.–19. yy', art: 'Sanat için sanat, mazmunlar, soyut güzellik', lang: 'Arapça–Farsça ağırlıklı Osmanlı Türkçesi', form: 'Aruz ölçüsü, beyit; gazel, kaside, mesnevi', genres: 'Gazel, kaside, mesnevi, şarkı, rubai' },
  { id: 'halk', name: 'Halk edebiyatı', years: '13.–19. yy', art: 'Halk için, içten ve sade', lang: 'Sade halk Türkçesi', form: 'Hece ölçüsü, dörtlük, yarım uyak', genres: 'Koşma, semai, mani, türkü; tekke şiiri (ilahi, nefes)' },
  { id: 'tanzimat1', name: 'Tanzimat I. kuşak', years: '1860–1876', art: '"Sanat toplum içindir"', lang: 'Dilde sadeleşme savunulur', form: 'Eski biçimler, yeni konular (vatan, hürriyet)', genres: 'İlk yerli tiyatro, ilk roman, gazete; makale' },
  { id: 'tanzimat2', name: 'Tanzimat II. kuşak', years: '1876–1896', art: '"Sanat sanat içindir"', lang: 'Ağırlaşan dil', form: 'Bireysel konular, romantizm', genres: 'Roman, şiir, tiyatro' },
  { id: 'servet', name: 'Servet-i Fünun', years: '1896–1901', art: '"Sanat sanat içindir"; bireysel, karamsar', lang: 'Ağır, sanatlı dil (Arapça–Farsça)', form: 'Aruz, serbest müstezat, sone', genres: 'Batılı teknikte roman ve hikâye; şiir' },
  { id: 'fecri', name: 'Fecr-i Âti', years: '1909–1912', art: '"Sanat şahsi ve muhteremdir"', lang: 'Ağır dil sürer', form: 'Sembolizm etkisi', genres: 'Şiir ağırlıklı' },
  { id: 'milli', name: 'Millî Edebiyat', years: '1911–1923', art: 'Toplum için sanat, milliyetçilik', lang: 'Sade, konuşulan Türkçe ("Yeni Lisan")', form: 'Hece ölçüsü öne çıkar', genres: 'Hikâye, roman, şiir; Anadolu ve Kurtuluş Savaşı konuları' },
  { id: 'garip', name: 'Garip (Birinci Yeni)', years: '1941–', art: 'Şiirde her türlü kuralı reddetme, sıradan insan', lang: 'Konuşma dili', form: 'Ölçü ve uyak yok, şairanelik karşıtı', genres: 'Şiir' },
  { id: 'ikinciyeni', name: 'İkinci Yeni', years: '1950\'ler', art: 'Anlamdan kaçış, imge ve çağrışım', lang: 'Kapalı, soyut dil', form: 'Serbest, imgeci', genres: 'Şiir' },
];

const card = (id, label, kind, period, note = '') => ({ id, label, kind, period, note });
export const CARDS = [
  card('orhun', 'Göktürk (Orhun) Yazıtları', 'eser', 'islamoncesi'),
  card('kutadgu', 'Kutadgu Bilig — Yusuf Has Hacip', 'eser', 'gecis', 'İlk siyasetname örneği.'),
  card('dlt', 'Divanü Lügati\'t-Türk — Kaşgarlı Mahmud', 'eser', 'gecis'),
  card('hikmet', 'Divan-ı Hikmet — Hoca Ahmet Yesevi', 'eser', 'gecis'),
  card('fuzuli', 'Fuzûlî (Su Kasidesi, Leylâ ile Mecnun)', 'yazar', 'divan'),
  card('baki', 'Bâkî', 'yazar', 'divan', 'Sultanüşşuara (şairler sultanı).'),
  card('nedim', 'Nedîm', 'yazar', 'divan', 'Lale Devri şairi; mahallîleşme, şarkı.'),
  card('galip', 'Şeyh Gâlip (Hüsn ü Aşk)', 'yazar', 'divan'),
  card('yunus', 'Yunus Emre', 'yazar', 'halk', 'Tekke (tasavvuf) şiiri.'),
  card('karacaoglan', 'Karacaoğlan', 'yazar', 'halk', 'Âşık tarzı; koşma.'),
  card('pirsultan', 'Pir Sultan Abdal', 'yazar', 'halk'),
  card('sinasi', 'Şinasi (Şair Evlenmesi)', 'yazar', 'tanzimat1', 'İlk yerli tiyatro (1860); Tercüman-ı Ahvâl.'),
  card('namik', 'Namık Kemal (İntibah, Vatan yahut Silistre)', 'yazar', 'tanzimat1', 'İntibah: ilk edebî roman.'),
  card('samipasa', 'Şemsettin Sami (Taaşşuk-ı Talat ve Fitnat)', 'yazar', 'tanzimat1', 'İlk yerli roman (1872).'),
  card('ahmetmithat', 'Ahmet Mithat Efendi (Felatun Bey ile Rakım Efendi)', 'yazar', 'tanzimat1'),
  card('ziyapasa', 'Ziya Paşa (Terkib-i Bend)', 'yazar', 'tanzimat1'),
  card('ekrem', 'Recaizade Mahmut Ekrem (Araba Sevdası)', 'yazar', 'tanzimat2', 'İlk realist roman denemesi.'),
  card('hamit', 'Abdülhak Hâmit Tarhan (Makber)', 'yazar', 'tanzimat2'),
  card('sezai', 'Sami Paşazade Sezai (Sergüzeşt)', 'yazar', 'tanzimat2'),
  card('nabizade', 'Nabizade Nâzım (Karabibik)', 'yazar', 'tanzimat2', 'İlk köy romanı (uzun hikâye).'),
  card('fikret', 'Tevfik Fikret (Rübab-ı Şikeste, Sis)', 'yazar', 'servet'),
  card('halitziya', 'Halit Ziya Uşaklıgil (Mai ve Siyah, Aşk-ı Memnu)', 'yazar', 'servet'),
  card('rauf', 'Mehmet Rauf (Eylül)', 'yazar', 'servet', 'İlk psikolojik roman.'),
  card('cenap', 'Cenap Şahabettin', 'yazar', 'servet'),
  card('hasim', 'Ahmet Haşim (Göl Saatleri)', 'yazar', 'fecri', 'Fecr-i Âti\'nin en önemli şairi; sembolizm.'),
  card('omerseyfettin', 'Ömer Seyfettin (Kaşağı, Forsa)', 'yazar', 'milli', 'Genç Kalemler, "Yeni Lisan".'),
  card('gokalp', 'Ziya Gökalp (Türkçülüğün Esasları)', 'yazar', 'milli'),
  card('mehmetemin', 'Mehmet Emin Yurdakul (Türkçe Şiirler)', 'yazar', 'milli'),
  card('halide', 'Halide Edib Adıvar (Ateşten Gömlek)', 'yazar', 'milli'),
  card('resat', 'Reşat Nuri Güntekin (Çalıkuşu)', 'yazar', 'milli'),
  card('orhanveli', 'Orhan Veli Kanık', 'yazar', 'garip'),
  card('oktay', 'Oktay Rifat', 'yazar', 'garip'),
  card('melih', 'Melih Cevdet Anday', 'yazar', 'garip'),
  card('cemal', 'Cemal Süreya', 'yazar', 'ikinciyeni'),
  card('edip', 'Edip Cansever', 'yazar', 'ikinciyeni'),
  card('turgut', 'Turgut Uyar', 'yazar', 'ikinciyeni'),
];
const nameOf = (id) => PERIODS.find((p) => p.id === id)?.name ?? id;
const pick = (seed, n) => { const out = [...CARDS]; let x = seed; for (let i = out.length - 1; i > 0; i -= 1) { x = (x * 48271) % 2147483647; const j = x % (i + 1); [out[i], out[j]] = [out[j], out[i]]; } return out.slice(0, n).map((c) => c.id); };
const COLUMNS = [
  { field: 'label', headerName: 'Özellik', pinned: 'left', width: 140 },
  { field: 'a', headerName: 'A', width: 320, wrapText: true, autoHeight: true },
  { field: 'b', headerName: 'B', width: 320, wrapText: true, autoHeight: true },
];

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const deck = s.deck.map((id) => CARDS.find((c) => c.id === id)).filter(Boolean);
  const score = deck.filter((c) => s.answers[c.id] === c.period).length;
  const period = PERIODS.find((p) => p.id === s.period) ?? PERIODS[0];
  const members = CARDS.filter((c) => c.period === period.id);
  const A = PERIODS.find((p) => p.id === s.compareA) ?? PERIODS[4];
  const B = PERIODS.find((p) => p.id === s.compareB) ?? PERIODS[6];
  const rows = useMemo(() => [['Yıllar', 'years'], ['Sanat anlayışı', 'art'], ['Dil', 'lang'], ['Biçim / ölçü', 'form'], ['Türler', 'genres']].map(([label, key]) => ({ id: key, label, a: A[key], b: B[key] }))
    .concat([{ id: 'people', label: 'Temsilciler', a: CARDS.filter((c) => c.period === A.id).map((c) => c.label.split(' (')[0].split(' — ')[0]).join(', '), b: CARDS.filter((c) => c.period === B.id).map((c) => c.label.split(' (')[0].split(' — ')[0]).join(', ') }]), [A, B]);
  return <LabGrid top={<div className="kit-row">
    <Choice options={[{ value: 'siniflandir', label: 'Sınıflandır' }, { value: 'kesfet', label: 'Dönemleri keşfet' }, { value: 'karsilastir', label: 'İki dönemi karşılaştır' }]} value={s.mode} onChange={(mode) => set({ mode })} />
  </div>} visual={<>
    {s.mode === 'siniflandir' && <section className="kit-panel">
      <h4>Her kartı dönemine yerleştir</h4>
      <div className="ed-cards">{deck.map((c) => {
        const answered = s.answers[c.id];
        const state = s.checked ? (answered === c.period ? 'ok' : 'bad') : '';
        return <div key={c.id} className={`ed-card ${state}`}>
          <strong>{c.label}</strong>
          <select value={answered ?? ''} onChange={(e) => set({ answers: { ...s.answers, [c.id]: e.target.value }, checked: false })} aria-label={`${c.label} dönemi`}>
            <option value="">Dönem seç…</option>{PERIODS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          {s.checked && <small>{answered === c.period ? '✓ ' : `✗ Doğrusu: ${nameOf(c.period)}. `}{c.note}</small>}
        </div>;
      })}</div>
      <div className="kit-chips"><button type="button" className="btn btn-primary btn-sm" onClick={() => set({ checked: true })}>Kontrol et</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ deck: pick(Date.now() % 100000 + 1, 8), answers: {}, checked: false })}>Yeni kartlar</button></div>
      {s.checked && <p className={score === deck.length ? 'st-ok' : 'st-bad'}>{score} / {deck.length} doğru.</p>}
    </section>}
    {s.mode === 'kesfet' && <>
      <div className="ed-band" role="list">{PERIODS.map((p) => <button key={p.id} type="button" role="listitem" className={`ed-band-item${p.id === period.id ? ' on' : ''}`} onClick={() => set({ period: p.id })}>
        <small>{p.years}</small><strong>{p.name}</strong></button>)}</div>
      <Readouts title={`${period.name} (${period.years})`} items={[['Sanat anlayışı', period.art], ['Dil', period.lang], ['Biçim / ölçü', period.form], ['Türler ve eserler', period.genres],
        ['Temsilciler', members.map((c) => c.label).join(' · ') || '—']]} />
    </>}
    {s.mode === 'karsilastir' && <>
      <div className="kit-row">
        <label className="field"><span className="field-label">A dönemi</span><select value={A.id} onChange={(e) => set({ compareA: e.target.value })}>{PERIODS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="field"><span className="field-label">B dönemi</span><select value={B.id} onChange={(e) => set({ compareB: e.target.value })}>{PERIODS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      </div>
      <DataGrid mode="compact" rowData={rows} columnDefs={COLUMNS.map((col) => (col.field === 'a' ? { ...col, headerName: A.name } : col.field === 'b' ? { ...col, headerName: B.name } : col))} rowKey={(row) => row.id} />
    </>}
  </>} side={<>
    <Steps title="Ayırt edici ipuçları" lines={['Toplum için sanat: Tanzimat I, Millî Edebiyat. Sanat için sanat: Tanzimat II, Servet-i Fünun, Divan.', '"Sanat şahsi ve muhteremdir": Fecr-i Âti.', 'Dilde sadelik: Tanzimat I (savunur), Millî Edebiyat (uygular), Garip (konuşma dili).', 'İlkler: ilk yerli tiyatro Şair Evlenmesi, ilk yerli roman Taaşşuk-ı Talat ve Fitnat, ilk edebî roman İntibah, ilk psikolojik roman Eylül.']} />
    <Note>Bazı yazarlar birden çok dönemde eser vermiştir; kartlar en çok tanındıkları döneme göre yerleştirildi.</Note>
  </>} />;
}

const initial = { mode: 'siniflandir', deck: pick(17, 8), answers: {}, checked: false, period: 'servet', compareA: 'tanzimat1', compareB: 'servet' };

export default {
  Lab,
  initial,
  intro: 'Yazar ve eser kartlarını dönemlerine yerleştir, dönemlerin sanat anlayışını, dilini ve türlerini keşfet ya da iki dönemi yan yana karşılaştır. "Yeni kartlar" ile her seferinde farklı bir alıştırma gelir.',
  questions: [
    { id: 'servet', title: 'Servet-i Fünun eseri', exam: 'AYT', topic: 'Servet-i Fünun dönemi',
      stem: 'Aşağıdaki eserlerden hangisi Servet-i Fünun dönemine aittir?',
      choices: { A: 'İntibah', B: 'Mai ve Siyah', C: 'Ateşten Gömlek', D: 'Çalıkuşu', E: 'Hüsn ü Aşk' }, answer: 'B',
      setup: { mode: 'kesfet', period: 'servet' },
      build: 'Dönemleri keşfet → Servet-i Fünun.',
      look: 'Temsilciler: Halit Ziya Uşaklıgil (Mai ve Siyah, Aşk-ı Memnu). Diğer şıkları kartlardan bul: İntibah (Tanzimat I), Ateşten Gömlek ve Çalıkuşu (Millî), Hüsn ü Aşk (Divan).',
      explanation: 'Mai ve Siyah, Halit Ziya Uşaklıgil\'in Servet-i Fünun dönemi romanıdır.',
      rule: 'Eser → yazar → dönem zinciriyle düşün.' },
    { id: 'toplum', title: '"Sanat toplum içindir"', exam: 'AYT', topic: 'Tanzimat dönemi',
      stem: '"Sanat toplum içindir" anlayışını benimseyen, dilde sadeleşmeyi savunan ve gazeteyi bir eğitim aracı olarak kullanan kuşak aşağıdakilerden hangisidir?',
      choices: { A: 'Tanzimat I. kuşak', B: 'Tanzimat II. kuşak', C: 'Servet-i Fünun', D: 'Fecr-i Âti', E: 'Garip' }, answer: 'A',
      setup: { mode: 'karsilastir', compareA: 'tanzimat1', compareB: 'tanzimat2' },
      build: 'İki dönemi karşılaştır: Tanzimat I ve Tanzimat II.',
      look: 'Sanat anlayışı satırı: I. kuşak toplum için, II. kuşak sanat için.',
      explanation: 'Şinasi, Namık Kemal ve Ziya Paşa\'nın temsil ettiği Tanzimat I. kuşağı "sanat toplum içindir" anlayışıyla yazdı; dilde sadeleşmeyi savundu ve gazeteyi halkı eğitmek için kullandı.',
      rule: 'Tanzimat I: toplum için sanat; Tanzimat II: sanat için sanat.' },
    { id: 'ilk-roman', title: 'İlk yerli roman', exam: 'AYT', topic: 'Tanzimat dönemi',
      stem: 'Türk edebiyatının ilk yerli romanı kabul edilen eser aşağıdakilerden hangisidir?',
      choices: { A: 'İntibah', B: 'Taaşşuk-ı Talat ve Fitnat', C: 'Araba Sevdası', D: 'Sergüzeşt', E: 'Karabibik' }, answer: 'B',
      setup: { mode: 'kesfet', period: 'tanzimat1' },
      build: 'Dönemleri keşfet → Tanzimat I. kuşak.',
      look: 'Kart notları: Taaşşuk-ı Talat ve Fitnat ilk yerli roman (1872); İntibah ilk edebî roman.',
      explanation: 'Şemsettin Sami\'nin Taaşşuk-ı Talat ve Fitnat (1872) adlı eseri ilk yerli roman kabul edilir. İntibah ilk edebî roman, Araba Sevdası ilk realist roman denemesi, Karabibik ilk köy romanıdır.',
      rule: 'İlkleri bir arada öğren: ilk yerli tiyatro, ilk yerli roman, ilk edebî roman, ilk psikolojik roman.' },
    { id: 'garip', title: 'Garip şairi değil', exam: 'AYT', topic: 'Cumhuriyet dönemi',
      stem: 'Aşağıdaki şairlerden hangisi Garip akımının temsilcilerinden değildir?',
      choices: { A: 'Orhan Veli Kanık', B: 'Oktay Rifat', C: 'Melih Cevdet Anday', D: 'Cemal Süreya', E: 'Hepsi Garip şairidir.' }, answer: 'D',
      setup: { mode: 'karsilastir', compareA: 'garip', compareB: 'ikinciyeni' },
      build: 'İki dönemi karşılaştır: Garip ve İkinci Yeni.',
      look: 'Temsilciler satırı: Garip\'te Orhan Veli, Oktay Rifat, Melih Cevdet; İkinci Yeni\'de Cemal Süreya, Edip Cansever, Turgut Uyar.',
      explanation: 'Garip (Birinci Yeni) şiirini Orhan Veli, Oktay Rifat ve Melih Cevdet Anday kurdu. Cemal Süreya İkinci Yeni şairidir.',
      rule: 'Garip: konuşma dili, sıradan insan, kuralsızlık. İkinci Yeni: imge, anlam kapalılığı.' },
  ],
  tips: [
    { title: 'Yazar – eser – dönem', see: '"hangisi … dönemine aittir"', look: 'Sınıflandır ve keşfet.', rule: 'Önce eserin yazarını, sonra yazarın dönemini hatırla.' },
    { title: 'Sanat anlayışı', see: '"toplum için", "sanat için", "şahsi ve muhterem"', look: 'Karşılaştır: sanat anlayışı satırı.', rule: 'Toplum için: Tanzimat I, Millî. Sanat için: Tanzimat II, Servet-i Fünun. Şahsi ve muhterem: Fecr-i Âti.' },
    { title: 'İlkler', see: '"ilk yerli", "ilk edebî", "ilk psikolojik"', look: 'Kart notları.', rule: 'Şair Evlenmesi (tiyatro), Taaşşuk-ı Talat ve Fitnat (roman), İntibah (edebî roman), Eylül (psikolojik roman), Karabibik (köy).' },
    { title: 'Cumhuriyet toplulukları', see: 'Garip, İkinci Yeni', look: 'Karşılaştır.', rule: 'Garip: Orhan Veli, Oktay Rifat, Melih Cevdet. İkinci Yeni: Cemal Süreya, Edip Cansever, Turgut Uyar.' },
  ],
};
