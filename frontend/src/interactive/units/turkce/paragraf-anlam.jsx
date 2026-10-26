import { Choice, LabGrid, Note, Readouts, Steps } from '../../kit/controls.jsx';
import { highlightParts, overlap, splitSentences } from './textTools.js';

export const ITEMS = [
  { id: 'arilar', title: 'Arılar ve tozlaşma', type: 'değinilmemiştir', ask: 'Bu paragrafta aşağıdakilerin hangisine değinilmemiştir?',
    sentences: ['Arılar, çiçekten çiçeğe konarak bitkilerin tozlaşmasını sağlar.', 'Bu sayede meyve ve sebzelerin önemli bir bölümü oluşabilir.',
      'Son yıllarda tarım ilaçlarının yaygınlaşması ve yaşam alanlarının daralması, arı sayısında belirgin bir düşüşe yol açmıştır.',
      'Arıların azalması yalnızca bal üretimini değil, besin zincirinin tamamını etkileyecek bir sorundur.', 'Bu yüzden pek çok ülkede arıları korumaya yönelik projeler başlatılmıştır.'],
    options: {
      A: { text: 'Arıların bitkiler için önemine', verdict: 0, why: '1. cümle: tozlaşmayı sağlarlar.' },
      B: { text: 'Arı sayısının azalma nedenlerine', verdict: 2, why: '3. cümle: tarım ilaçları ve yaşam alanlarının daralması.' },
      C: { text: 'Arıların azalmasının olası sonuçlarına', verdict: 3, why: '4. cümle: besin zinciri etkilenir.' },
      D: { text: 'Bal üretiminin ülkelere göre dağılımına', verdict: 'yok', why: 'Bal üretiminden söz edilir ama ülkelere göre dağılım yoktur: değinilmemiş.' },
      E: { text: 'Arıları korumak için yapılan çalışmalara', verdict: 4, why: '5. cümle: koruma projeleri.' },
    }, answer: 'D' },
  { id: 'yuruyus', title: 'Yürüyüş', type: 'çıkarılamaz', ask: 'Bu paragraftan aşağıdakilerin hangisi çıkarılamaz?',
    sentences: ['Düzenli yürüyüş, kalp sağlığını korumanın en kolay yollarından biridir.', 'Özel bir donanım ya da spor salonu gerektirmediği için hemen herkes tarafından yapılabilir.',
      'Günde otuz dakikalık tempolu bir yürüyüşün kan basıncını düzenlemeye yardımcı olduğu bilinmektedir.', 'Ayrıca açık havada yürümek, zihni dinlendirerek stresi azaltır.'],
    options: {
      A: { text: 'Yürüyüş için pahalı malzemelere ihtiyaç yoktur.', verdict: 1, why: '2. cümle: özel donanım gerektirmez.' },
      B: { text: 'Kısa ama düzenli yürüyüşler sağlığa yararlıdır.', verdict: 2, why: '3. cümle: günde otuz dakika kan basıncını düzenler.' },
      C: { text: 'Yürüyüşün ruh sağlığına da etkisi vardır.', verdict: 3, why: '4. cümle: stresi azaltır.' },
      D: { text: 'Yürüyüş, kalp sağlığı için koşudan daha yararlıdır.', verdict: 'yok', why: 'Paragrafta koşuyla karşılaştırma yoktur; "en kolay" demek "en yararlı" demek değildir.' },
      E: { text: 'Yürüyüş, pek çok kişinin yapabileceği bir etkinliktir.', verdict: 1, why: '2. cümle: hemen herkes yapabilir.' },
    }, answer: 'D' },
  { id: 'ceviri', title: 'Çeviri', type: 'ana düşünce', ask: 'Bu paragrafta asıl anlatılmak istenen aşağıdakilerden hangisidir?',
    sentences: ['Bir metni başka bir dile aktarmak, sözcükleri tek tek karşılıklarıyla değiştirmekten ibaret değildir.', 'Her dilin kendine özgü deyimleri, söz dizimi ve çağrışımları vardır.',
      'İyi bir çevirmen, metnin anlamını ve havasını hedef dilin okuruna aynı etkiyle ulaştırmaya çalışır.', 'Bu yüzden çeviri, en az özgün metni yazmak kadar yaratıcılık isteyen bir iştir.'],
    options: {
      A: { text: 'Her dilin kendine özgü deyimleri vardır.', verdict: 1, why: '2. cümlede var ama yardımcı düşüncedir; asıl düşünceyi desteklemek için söylenir.' },
      B: { text: 'Çeviri, yaratıcılık gerektiren bir uğraştır.', verdict: 3, main: true, why: '4. cümle "Bu yüzden" ile sonucu, yani ana düşünceyi verir.' },
      C: { text: 'Çevirmenler sözcüklerin karşılıklarını iyi bilmelidir.', verdict: 'yok', why: 'Paragraf tam tersine sözcük karşılığının yetmediğini söyler.' },
      D: { text: 'Özgün metin yazmak çeviriden daha zordur.', verdict: 'çelişki', why: '"En az … kadar" denir; özgün metnin daha zor olduğu söylenmez.' },
      E: { text: 'Çeviriyi iki dili bilen herkes yapabilir.', verdict: 'çelişki', why: 'Paragraf çevirinin yaratıcılık istediğini, basit bir aktarma olmadığını söyler.' },
    }, answer: 'B' },
];

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const own = s.mode === 'kendi';
  const item = ITEMS.find((x) => x.id === s.item) ?? ITEMS[0];
  const sentences = own ? splitSentences(s.ownText) : item.sentences;
  const options = own ? Object.fromEntries(s.ownOptions.split('\n').map((line) => line.trim()).filter(Boolean).map((line, i) => [String.fromCharCode(65 + i), { text: line.replace(/^[A-E][).]\s*/, '') }])) : item.options;
  const focusText = options[s.focus]?.text ?? '';
  const keys = focusText ? sentences.map((sentence) => overlap(focusText, sentence)) : sentences.map(() => []);
  const verdictOf = (key) => s.links[key];
  const isRight = (key) => {
    const truth = item.options[key].verdict;
    const mine = verdictOf(key);
    return mine !== undefined && String(mine) === String(truth);
  };
  return <LabGrid top={<div className="kit-row">
    <Choice options={[{ value: 'ornek', label: 'Örnek sorular' }, { value: 'kendi', label: 'Kendi sorunu yapıştır' }]} value={s.mode} onChange={(mode) => set({ mode, checked: false, focus: null })} />
    {!own && <label className="field"><span className="field-label">Soru</span>
      <select value={item.id} onChange={(e) => set({ item: e.target.value, links: {}, checked: false, focus: null })}>{ITEMS.map((x) => <option key={x.id} value={x.id}>{x.title} ({x.type})</option>)}</select></label>}
  </div>} visual={<>
    {own && <div className="kit-row tx-own">
      <label className="kit-text wide"><span>Paragraf</span><textarea className="tx-area" rows={5} value={s.ownText} onChange={(e) => set({ ownText: e.target.value })} /></label>
      <label className="kit-text wide"><span>Şıklar (her satıra bir şık)</span><textarea className="tx-area" rows={5} value={s.ownOptions} onChange={(e) => set({ ownOptions: e.target.value })} /></label>
    </div>}
    <section className="kit-panel">
      <h4>Paragraf {s.focus && `— ${s.focus} şıkkıyla ortak sözcükler vurgulu`}</h4>
      <ol className="tx-list plain">{sentences.map((sentence, i) => <li key={i} className={keys[i].length ? 'hit' : ''}>
        <span className="tx-roman">{i + 1}</span>
        <span className="tx-sentence">{highlightParts(sentence, keys[i]).map((part, k) => (part.hit ? <mark key={k} className="tx-mark" style={{ '--tone': 'var(--warn)' }}>{part.text}</mark> : <span key={k}>{part.text}</span>))}</span>
        {keys[i].length > 0 && <span className="badge badge-warn">ortak: {keys[i].length}</span>}
      </li>)}</ol>
    </section>
    <section className="kit-panel">
      <h4>{own ? 'Şıklar: her birini paragrafta ara' : item.ask}</h4>
      <div className="tx-options">{Object.entries(options).map(([key, option]) => {
        const checked = s.checked && !own;
        return <div key={key} className={`tx-option${s.focus === key ? ' focus' : ''}${checked ? (isRight(key) ? ' ok' : ' bad') : ''}`}>
          <button type="button" className="tx-option-text" onClick={() => set({ focus: s.focus === key ? null : key })} aria-pressed={s.focus === key}><strong>{key})</strong> {option.text}</button>
          {!own && <select value={verdictOf(key) ?? ''} onChange={(e) => set({ links: { ...s.links, [key]: e.target.value }, checked: false })} aria-label={`${key} şıkkının kanıtı`}>
            <option value="">Kanıt?</option>{sentences.map((_, i) => <option key={i} value={i}>{i + 1}. cümlede var</option>)}
            <option value="yok">Paragrafta yok</option><option value="çelişki">Paragrafla çelişiyor</option></select>}
          {checked && <small className="tx-why">{isRight(key) ? '✓ ' : '✗ '}{option.why}</small>}
        </div>;
      })}</div>
      {!own && <div className="kit-chips"><button type="button" className="btn btn-primary btn-sm" onClick={() => set({ checked: true })}>Kontrol et</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ links: {}, checked: false })}>Temizle</button></div>}
      {s.checked && !own && <p className="st-ok">Sorunun cevabı: <strong>{item.answer}) {item.options[item.answer].text}</strong> — {item.type === 'ana düşünce' ? 'paragrafın sonuç cümlesinde verilen düşünce.' : 'paragrafta karşılığı olmayan şık.'}</p>}
    </section>
  </>} side={<>
    <Readouts title="Soru kökü → ne arıyorsun?" items={[
      ['değinilmemiştir', 'Paragrafta hiç söz edilmeyen konuyu (dört şık bir cümleye bağlanır, biri boşta kalır)'],
      ['çıkarılamaz', 'Paragrafın söylemediği ya da tersini söylediği yargıyı'],
      ['ana düşünce', 'Paragrafın vermek istediği asıl mesajı (çoğu zaman sonuç cümlesi)'],
      ['yardımcı düşünce', 'Ana düşünceyi destekleyen ayrıntıları'],
    ]} />
    <Steps title="Kanıt yöntemi" lines={['Şıkka tıkla: ortak sözcükler paragrafta yanar.', 'Yanan cümleyi oku: şık aynı şeyi mi söylüyor, daha fazlasını mı, tersini mi?', 'Her şıkkı bir cümleye bağla; bağlanamayan şık "değinilmemiş"tir.', 'Ortak sözcük yetmez: anlamı karşılaştır ("en kolay" ≠ "en yararlı").']} />
    {own && <Note>Kendi sorunda cevap anahtarı yok; araç her şık için en çok ortak sözcük içeren cümleleri gösterir, kararı sen verirsin.</Note>}
  </>} />;
}

const initial = { mode: 'ornek', item: 'arilar', links: {}, checked: false, focus: null,
  ownText: 'Paragrafı buraya yapıştır. Her cümle ayrı satıra ayrılacak.', ownOptions: 'A) Birinci şık\nB) İkinci şık\nC) Üçüncü şık\nD) Dördüncü şık\nE) Beşinci şık' };
const stemOf = (item) => `${item.sentences.join(' ')}`;

export default {
  Lab,
  initial,
  intro: 'Her şıkkı paragraftaki bir cümleye bağla: şıkka tıklayınca ortak sözcükler paragrafta yanar. "Değinilmemiştir", "çıkarılamaz" ve "ana düşünce" sorularında hangi şıkkın boşta kaldığını kanıtla gör. Kendi sorunu da yapıştırabilirsin.',
  questions: ITEMS.map((item) => ({
    id: item.id, title: item.title, exam: 'TYT', topic: `Paragrafta anlam (${item.type})`,
    stem: stemOf(item), ask: item.ask,
    choices: Object.fromEntries(Object.entries(item.options).map(([k, o]) => [k, o.text])), answer: item.answer,
    setup: { mode: 'ornek', item: item.id, links: {}, checked: false, focus: null },
    build: `Örnek sorular → "${item.title}". Her şık için kanıt cümlesini seç.`,
    look: 'Şıklara tek tek tıkla, yanan cümleleri oku. Kanıtı bulunamayan (ya da paragrafla çelişen) şık hangisi?',
    explanation: Object.entries(item.options).map(([k, o]) => `${k}) ${o.why}`).join('\n'),
    rule: item.type === 'ana düşünce' ? 'Ana düşünce çoğu zaman "bu yüzden, demek ki" ile gelen sonuç cümlesidir; doğru ama ayrıntı olan şıklar yardımcı düşüncedir.' : 'Her şıkkı bir cümleyle eşleştir; eşleşmeyen ya da paragrafın söylediğinden fazlasını/tersini söyleyen şık cevaptır.',
  })),
  tips: [
    { title: 'Değinilmemiştir', see: '"… hangisine değinilmemiştir?"', look: 'Her şıkkı bir cümleye bağla.', rule: 'Dört şık bir cümleye bağlanır; boşta kalan cevaptır.', trap: 'Paragrafta geçen bir sözcük (bal) şıkkın tamamının paragrafta olduğu anlamına gelmez.' },
    { title: 'Çıkarılamaz', see: '"… hangisi çıkarılamaz / söylenemez?"', look: 'Kanıt + anlam karşılaştırması.', rule: 'Paragrafın söylemediği (karşılaştırma, genelleme) ya da tersini söylediği yargı.', trap: '"En kolay", "en etkili", "daha" gibi kıyaslamalar paragrafta yoksa çıkarılamaz.' },
    { title: 'Ana düşünce', see: '"asıl anlatılmak istenen", "ana düşünce"', look: 'Sonuç cümlesine bağlanan şık.', rule: 'Ana düşünce paragrafın tamamını kapsar; tek cümledeki ayrıntı yardımcı düşüncedir.' },
  ],
};
