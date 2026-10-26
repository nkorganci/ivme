import { Choice, LabGrid, Note, Readouts, Steps } from '../../kit/controls.jsx';

export const ROLES = {
  Y: { name: 'Yüklem', tone: 'var(--pen-red)', q: 'Cümlenin yargısını bildiren öge (iş, oluş, durum)' },
  O: { name: 'Özne', tone: 'var(--pen-blue)', q: 'Kim? / Ne? + yüklem' },
  N: { name: 'Nesne', tone: 'var(--pen-green)', q: 'Neyi? Kimi? (belirtili) / Ne? (belirtisiz) + yüklem' },
  D: { name: 'Dolaylı tümleç', tone: 'var(--warn)', q: 'Nereye? Nerede? Nereden? Kime? Kimde? Kimden? + yüklem' },
  Z: { name: 'Zarf tümleci', tone: 'var(--navy)', q: 'Nasıl? Ne zaman? Niçin? Ne kadar? + yüklem' },
  C: { name: 'Cümle dışı', tone: 'var(--pen-black)', q: 'Ünlem, seslenme, bağlaç: ögeye girmez' },
};

const c = (text, role, ask) => ({ text, role, ask });
export const SENTENCES = [
  { id: 's1', chunks: [c('Dün akşam', 'Z', 'Ne zaman yaptı?'), c('annem', 'O', 'Kim yaptı?'), c('bize', 'D', 'Kime yaptı?'), c('güzel bir kek', 'N', 'Ne yaptı? (belirtisiz)'), c('yaptı', 'Y')], note: '' },
  { id: 's2', chunks: [c('Öğrenciler', 'O', 'Kim bekliyor?'), c('sınav sonuçlarını', 'N', 'Neyi bekliyor? (belirtili)'), c('heyecanla', 'Z', 'Nasıl bekliyor?'), c('bekliyor', 'Y')], note: '' },
  { id: 's3', chunks: [c('Kitabı', 'N', 'Neyi bırakmış?'), c('masanın üstüne', 'D', 'Nereye bırakmış?'), c('bırakmış', 'Y')], note: 'Örtülü (gizli) özne: "o" — yüklemin kişi ekinden anlaşılır.' },
  { id: 's4', chunks: [c('Bu yaz', 'Z', 'Ne zaman gideceğiz?'), c('köyümüze', 'D', 'Nereye gideceğiz?'), c('gideceğiz', 'Y')], note: 'Örtülü özne: "biz" (-iz kişi eki).' },
  { id: 's5', chunks: [c('Yağmur', 'O', 'Ne yağıyor?'), c('sabahtan beri', 'Z', 'Ne zamandan beri yağıyor?'), c('durmadan', 'Z', 'Nasıl yağıyor?'), c('yağıyor', 'Y')], note: '' },
  { id: 's6', chunks: [c('Ali', 'O', 'Kim (en iyi arkadaşım)?'), c('en iyi arkadaşım', 'Y')], note: 'İsim cümlesi: yüklem bir isim soylu sözcük (arkadaşım).' },
  { id: 's7', chunks: [c('Eyvah', 'C'), c('otobüsü', 'N', 'Neyi kaçırdık?'), c('kaçırdık', 'Y')], note: 'Ünlem cümle dışı unsurdur. Örtülü özne: "biz".' },
  { id: 's8', chunks: [c('Mektup', 'O', 'Ne gönderildi?'), c('dün', 'Z', 'Ne zaman gönderildi?'), c('postayla', 'Z', 'Nasıl/neyle gönderildi?'), c('gönderildi', 'Y')], note: 'Edilgen yüklem: "mektup" sözde öznedir (işi yapan değil, işten etkilenen).' },
  { id: 's9', chunks: [c('Dedem', 'O', 'Kim yetiştiriyor?'), c('bahçede', 'D', 'Nerede yetiştiriyor?'), c('domates', 'N', 'Ne yetiştiriyor? (belirtisiz)'), c('yetiştiriyor', 'Y')], note: '' },
];
const sentenceText = (s) => `${s.chunks.map((x) => x.text).join(' ')}.`.replace(/^Eyvah /, 'Eyvah, ');

/** Kendi cümlesi için ipucu: son parça yüklem; ek biçimlerine göre olası öge. */
export function guessRole(word, isLast) {
  const w = word.toLocaleLowerCase('tr');
  if (isLast) return 'Y';
  if (/(ı|i|u|ü|yı|yi|yu|yü|nı|ni|nu|nü)$/.test(w) && w.length > 3) return 'N';
  if (/(a|e|ya|ye|na|ne|da|de|ta|te|dan|den|tan|ten|nda|nde|ndan|nden)$/.test(w)) return 'D';
  if (/(ca|ce|ça|çe|arak|erek|ken|ınca|ince|unca|ünce|la|le|yla|yle)$/.test(w)) return 'Z';
  return null;
}

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const own = s.mode === 'kendi';
  const sentence = SENTENCES.find((x) => x.id === s.sentence) ?? SENTENCES[0];
  const ownWords = s.ownText.replace(/[.!?]/g, '').split(/\s+/).filter(Boolean);
  const ownChunks = [];
  ownWords.forEach((word, i) => { if (i === 0 || s.ownBreaks.includes(i)) ownChunks.push([word]); else ownChunks[ownChunks.length - 1].push(word); });
  const chunks = own ? ownChunks.map((words) => ({ text: words.join(' ') })) : sentence.chunks;
  const assigned = s.assign;
  const yIndex = chunks.findIndex((_, i) => assigned[i] === 'Y');
  const verb = yIndex >= 0 ? chunks[yIndex].text : null;
  const allDone = !own && chunks.every((_, i) => assigned[i]);
  const correctCount = !own ? chunks.filter((chunk, i) => assigned[i] === chunk.role).length : 0;
  const order = chunks.map((chunk, i) => (assigned[i] ? ROLES[assigned[i]].name : '?')).filter((name) => name !== 'Cümle dışı');
  const assign = (i) => { if (!s.role) return; set({ assign: { ...assigned, [i]: s.role }, checked: false }); };
  return <LabGrid top={<div className="kit-row">
    <Choice options={[{ value: 'ornek', label: 'Örnek cümleler' }, { value: 'kendi', label: 'Kendi cümlen' }]} value={s.mode} onChange={(mode) => set({ mode, assign: {}, checked: false })} />
    {!own && <label className="field"><span className="field-label">Cümle</span>
      <select value={sentence.id} onChange={(e) => set({ sentence: e.target.value, assign: {}, checked: false })}>{SENTENCES.map((x) => <option key={x.id} value={x.id}>{sentenceText(x)}</option>)}</select></label>}
  </div>} visual={<>
    {own && <section className="kit-panel">
      <label className="kit-text wide"><span>Cümleni yaz</span><input value={s.ownText} onChange={(e) => set({ ownText: e.target.value, ownBreaks: [], assign: {} })} /></label>
      <p className="muted small">Sözcüklerin arasına tıklayarak öge sınırlarını belirle (aynı ögedeki sözcükler birlikte kalır).</p>
      <div className="og-words">{ownWords.map((word, i) => <span key={i} className="og-word-wrap">
        {i > 0 && <button type="button" className={`og-gap${s.ownBreaks.includes(i) ? ' on' : ''}`} onClick={() => set({ ownBreaks: s.ownBreaks.includes(i) ? s.ownBreaks.filter((b) => b !== i) : [...s.ownBreaks, i], assign: {} })} aria-label={`${i}. sözcükten sonra sınır`}>|</button>}
        <span className="og-word">{word}</span></span>)}</div>
    </section>}
    <section className="kit-panel">
      <h4>1 · Öge türünü seç, 2 · parçaya tıkla</h4>
      <div className="kit-chips">{Object.entries(ROLES).map(([key, r]) => <button key={key} type="button" className={`og-role${s.role === key ? ' on' : ''}`} style={{ '--tone': r.tone }} onClick={() => set({ role: key })}>{r.name}</button>)}</div>
      <div className="og-sentence">{chunks.map((chunk, i) => {
        const role = assigned[i];
        const wrong = s.checked && !own && role !== chunk.role;
        return <button key={i} type="button" className={`og-chunk${role ? ' set' : ''}${wrong ? ' wrong' : ''}${s.checked && !own && !wrong ? ' right' : ''}`} style={{ '--tone': role ? ROLES[role].tone : 'var(--line)' }} onClick={() => assign(i)}>
          <span>{chunk.text}</span>
          <small>{role ? ROLES[role].name : 'öge?'}{wrong ? ` → ${ROLES[chunk.role].name}` : ''}</small>
          {own && !role && guessRole(chunk.text.split(' ').at(-1), i === chunks.length - 1) && <small className="og-guess">ipucu: {ROLES[guessRole(chunk.text.split(' ').at(-1), i === chunks.length - 1)].name}?</small>}
        </button>;
      })}</div>
      {verb && <div className="og-questions">{Object.entries(ROLES).filter(([k]) => !['Y', 'C'].includes(k)).map(([k, r]) => <span key={k} style={{ '--tone': r.tone }}><strong>{r.name}:</strong> {r.q.replace('+ yüklem', `+ "${verb}"?`)}</span>)}</div>}
      {!own && <div className="kit-chips"><button type="button" className="btn btn-primary btn-sm" disabled={!allDone} onClick={() => set({ checked: true })}>{allDone ? 'Kontrol et' : 'Önce bütün parçaları işaretle'}</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ assign: {}, checked: false })}>Temizle</button></div>}
      {s.checked && !own && <p className={correctCount === chunks.length ? 'st-ok' : 'st-bad'}>{correctCount} / {chunks.length} öge doğru.</p>}
      {s.checked && !own && <ul className="og-answers">{sentence.chunks.map((chunk, i) => <li key={i}><strong style={{ color: ROLES[chunk.role].tone }}>{chunk.text}</strong> → {ROLES[chunk.role].name}{chunk.ask ? ` (${chunk.ask})` : ''}</li>)}</ul>}
    </section>
  </>} side={<>
    <Readouts title="Öge dizilişi (canlı)" items={[
      ['Diziliş', order.join(' + ') || '—'],
      ['Özne', chunks.some((_, i) => assigned[i] === 'O') ? 'açık özne' : verb ? 'işaretli özne yok → örtülü (gizli) özne ya da özne yok' : '—'],
      !own && sentence.note && ['Not', s.checked ? sentence.note : 'Kontrol ettikten sonra açılır.'],
    ]} />
    <Steps title="Yöntem" lines={['Önce yüklemi bul: yargı bildiren, genellikle sondaki öge.', 'Özne: "kim/ne + yüklem?" Nesne: "neyi/kimi/ne + yüklem?"', 'Dolaylı tümleç: -e, -de, -den hâl ekli; "nereye/nerede/nereden".', 'Zarf tümleci: "nasıl/ne zaman/niçin/ne kadar".', 'Edilgen yüklemde özne sözde öznedir; kişi ekinden anlaşılan özne örtülü öznedir.']} />
    {own && <Note>Kendi cümlende cevap anahtarı yok; ipuçları ek biçimine bakar ve yanılabilir. Soru sorma yöntemiyle karar ver.</Note>}
  </>} />;
}

const initial = { mode: 'ornek', sentence: 's1', role: 'Y', assign: {}, checked: false, ownText: 'Kardeşim her sabah okula bisikletle gidiyor', ownBreaks: [1, 3, 4, 5] };

export default {
  Lab,
  initial,
  intro: 'Önce yüklemi bul, sonra yüklemle soru sorarak ögeleri işaretle: öge türünü seç ve parçaya tıkla. Öge dizilişi canlı oluşur; örtülü ve sözde özne gibi incelikler kontrolden sonra açıklanır. Kendi cümleni de parçalara ayırıp çalışabilirsin.',
  questions: [
    { id: 'dizilis', title: 'Öge dizilişi', exam: 'TYT', topic: 'Cümlenin ögeleri',
      stem: '"Dün akşam annem bize güzel bir kek yaptı." cümlesinin öge dizilişi aşağıdakilerden hangisidir?',
      choices: { A: 'Zarf T. – Özne – Dolaylı T. – Nesne – Yüklem', B: 'Özne – Zarf T. – Dolaylı T. – Nesne – Yüklem', C: 'Zarf T. – Özne – Nesne – Dolaylı T. – Yüklem', D: 'Zarf T. – Özne – Dolaylı T. – Zarf T. – Yüklem', E: 'Özne – Özne – Dolaylı T. – Nesne – Yüklem' }, answer: 'A',
      setup: { mode: 'ornek', sentence: 's1', role: 'Y', assign: {} },
      build: 'Örnek cümle: "Dün akşam annem bize güzel bir kek yaptı." Önce yüklemi işaretle.',
      look: 'Yüklem "yaptı"; sonra soru şablonlarını kullan: Ne zaman? Kim? Kime? Ne?',
      explanation: 'Dün akşam (ne zaman? → zarf T.), annem (kim? → özne), bize (kime? → dolaylı T.), güzel bir kek (ne? → belirtisiz nesne), yaptı (yüklem).',
      rule: 'Önce yüklem, sonra soru sor; "güzel bir kek" gibi sıfat tamlamaları tek ögedir.' },
    { id: 'ortulu', title: 'Özne nerede?', exam: 'TYT', topic: 'Cümlenin ögeleri',
      stem: '"Kitabı masanın üstüne bırakmış." cümlesinin öznesi aşağıdakilerden hangisidir?',
      choices: { A: 'Kitabı', B: 'masanın üstüne', C: 'Örtülü (gizli) özne: o', D: 'bırakmış', E: 'Cümlede özne yoktur.' }, answer: 'C',
      setup: { mode: 'ornek', sentence: 's3', role: 'Y', assign: {} },
      build: 'Örnek cümle: "Kitabı masanın üstüne bırakmış." Parçaları işaretle.',
      look: '"Kitabı" -ı hâl ekli: neyi? → nesne. "Kim bırakmış?" sorusunun cevabı cümlede yazılı değil; yüklemin kişisinden anlaşılır.',
      explanation: 'Kitabı (neyi? → belirtili nesne), masanın üstüne (nereye? → dolaylı T.), bırakmış (yüklem). Kim bırakmış? → "o": örtülü özne.',
      rule: 'Özne cümlede yazılı değilse yüklemin kişi ekinden çıkarılır: örtülü (gizli) özne.' },
    { id: 'dolayli', title: 'Dolaylı tümleç yok', exam: 'TYT', topic: 'Cümlenin ögeleri',
      stem: 'Aşağıdaki cümlelerin hangisinde dolaylı tümleç yoktur?',
      choices: { A: 'Bu yaz köyümüze gideceğiz.', B: 'Kitabı masanın üstüne bırakmış.', C: 'Öğrenciler sınav sonuçlarını heyecanla bekliyor.', D: 'Dün akşam annem bize güzel bir kek yaptı.', E: 'Dedem bahçede domates yetiştiriyor.' }, answer: 'C',
      setup: { mode: 'ornek', sentence: 's2', role: 'D', assign: {} },
      build: 'Her şıkkı "Cümle" listesinden seç ve ögelerini işaretle (başlangıçta C şıkkı açık).',
      look: '-e, -de, -den hâl ekli parçaları ara: köyümüze, masanın üstüne, bize, bahçede. C şıkkında yok.',
      explanation: 'A: köyümüze (nereye?), B: masanın üstüne (nereye?), D: bize (kime?), E: bahçede (nerede?) dolaylı tümleçtir. C\'de "sınav sonuçlarını" nesne, "heyecanla" zarf tümlecidir.',
      rule: 'Dolaylı tümleç -e, -de, -den hâl eklerinden birini alır ve "nereye, nerede, nereden, kime…" sorusunu cevaplar.' },
    { id: 'sozde', title: 'Sözde özne', exam: 'TYT', topic: 'Cümlenin ögeleri',
      stem: '"Mektup dün postayla gönderildi." cümlesindeki "mektup" sözcüğü için aşağıdakilerden hangisi doğrudur?',
      choices: { A: 'Gerçek öznedir.', B: 'Sözde öznedir.', C: 'Belirtili nesnedir.', D: 'Dolaylı tümleçtir.', E: 'Zarf tümlecidir.' }, answer: 'B',
      setup: { mode: 'ornek', sentence: 's8', role: 'Y', assign: {} },
      build: 'Örnek cümle: "Mektup dün postayla gönderildi."',
      look: 'Yüklem edilgen (gönder-il-di): işi yapan belli değil. "Ne gönderildi?" → mektup.',
      explanation: 'Edilgen yüklemli cümlede işi yapan değil, işten etkilenen özne konumundadır: "mektup" sözde öznedir.',
      rule: 'Yüklem edilgense (-ıl, -ın) özne sözde öznedir.' },
  ],
  tips: [
    { title: 'Önce yüklem', see: 'Her öge sorusu', look: 'Yüklem rolünü önce işaretle; soru şablonları açılır.', rule: 'Yüklem cümlenin yargısıdır; soru sorma yöntemi yüklemle yapılır.' },
    { title: 'Özne – nesne karışması', see: '"kim/ne" ile "neyi/ne"', look: 'Soru şablonları.', rule: 'Kim/ne + yüklem → özne; neyi/kimi/ne + yüklem → nesne.', trap: 'Belirtisiz nesne de "ne?" sorusunu cevaplar: "ne yaptı? → kek". Önce özneyi bul.' },
    { title: 'Hâl ekleri', see: '-ı, -e, -de, -den ekli sözcükler', look: 'Kendi cümlen ipuçları.', rule: '-ı → belirtili nesne; -e, -de, -den → dolaylı tümleç.' },
    { title: 'Özel özne türleri', see: 'Kişi ekli yüklem, edilgen yüklem', look: 'Kontrol sonrası not.', rule: 'Yazılı değil ama ekten anlaşılan: örtülü özne. Edilgen yüklem: sözde özne.' },
  ],
};
