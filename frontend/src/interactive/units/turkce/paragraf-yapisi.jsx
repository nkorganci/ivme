import { Choice, LabGrid, Note, Panel, Readouts, Steps } from '../../kit/controls.jsx';
import { canBeIntro, connectorsIn, splitSentences } from './textTools.js';

export const PARAGRAPHS = [
  { id: 'okuma', title: 'Okuma alışkanlığı',
    sentences: ['Okuma alışkanlığı, çocuklukta kazanılan ve ömür boyu süren bir beceridir.', 'Bu becerinin temelleri, çoğu zaman evde ailenin kitapla kurduğu ilişkiyle atılır.',
      'Kitapların el altında olduğu, büyüklerin okurken görüldüğü evlerde çocuk okumayı doğal bir etkinlik olarak benimser.', 'Ancak bu ortamı bulamayan çocuklar için okul kütüphaneleri büyük bir fırsat sunar.',
      'Bu nedenle okul kütüphanelerinin zenginleştirilmesi, okuma alışkanlığı kazandırmanın en etkili yollarından biridir.'],
    intruder: { at: 3, text: 'Günümüzde kâğıt fiyatlarındaki artış, yayınevlerini zor durumda bırakmaktadır.', why: 'Paragraf okuma alışkanlığının kazanılmasını anlatıyor; kâğıt fiyatları ve yayınevlerinin sorunları bu düşünce akışının dışında.' } },
  { id: 'bilim', title: 'Bilim ve yanılma',
    sentences: ['Bilim, kesin doğrulara ulaşmış bir bilgiler yığını değil, sürekli sınanan bir düşünme yoludur.', 'Bir bilim insanı, ortaya attığı düşüncenin yanlışlanabileceğini kabul ederek işe başlar.',
      'Deneyler ve gözlemler bu düşünceyi desteklemezse onu düzeltmekten ya da bırakmaktan çekinmez.', 'Örneğin uzun süre doğru kabul edilen pek çok kuram, yeni gözlemler karşısında yerini daha kapsamlı açıklamalara bırakmıştır.',
      'Demek ki bilimi güçlü kılan, yanılmazlığı değil, yanılgılarını düzeltebilmesidir.'],
    intruder: { at: 2, text: 'Bilim insanlarının çoğu, çalışmalarını uzun yıllar boyunca aynı laboratuvarda sürdürür.', why: 'Konu, bilimin kendini düzelten bir yöntem olması; bilim insanlarının nerede çalıştığı bu akışa katkı vermiyor.' } },
  { id: 'sehir', title: 'Şehirler: dün ve bugün', split: 3,
    sentences: ['Eskiden şehirler, yürüyerek gezilebilecek büyüklükteydi.', 'Çarşı, okul ve evler birbirine yakın kurulur; insanlar gün içinde birbirleriyle sık sık karşılaşırdı.',
      'Bu yakınlık, komşuluk ilişkilerini de güçlendirirdi.', 'Günümüzde ise şehirler, otomobile göre planlanan geniş alanlara yayılmaktadır.',
      'İş yeri, ev ve alışveriş merkezleri arasındaki uzaklık arttıkça insanlar zamanlarının büyük bölümünü yolda geçirmektedir.', 'Bu durum, hem çevreyi kirletmekte hem de insanların birbirine ayırabildiği zamanı azaltmaktadır.'] },
  { id: 'dil', title: 'Dil ve düşünce', labels: ['II', 'IV', 'I', 'V', 'III'],
    sentences: ['Dil, düşüncenin hem aracı hem de sınırıdır.', 'Bildiğimiz kelimeler arttıkça kavrayabildiğimiz ve ayırt edebildiğimiz kavramlar da çoğalır.',
      'Kelime hazinesi zengin olan kişi, düşüncelerini daha açık ve ayrıntılı anlatabilir.', 'Kelimesi az olan ise duygularını bile çoğu zaman "iyi" ya da "kötü" gibi genel sözlerle geçiştirir.',
      'Bu nedenle kelime öğrenmek, yalnızca dil dersinin değil, bütün öğrenmenin temelidir.'] },
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const TONE = { sonuç: 'var(--pen-green)', karşıtlık: 'var(--pen-red)', örnek: 'var(--pen-blue)', ekleme: 'var(--navy)', neden: 'var(--warn)', gönderim: 'var(--pen-black)', karşılaştırma: 'var(--pen-red)' };
const labelOf = (para, idx) => para.labels?.[idx] ?? ROMAN[idx];
const scramble = (n, seed) => { const out = Array.from({ length: n }, (_, i) => i); let x = seed; for (let i = n - 1; i > 0; i -= 1) { x = (x * 48271) % 2147483647; const j = x % (i + 1); [out[i], out[j]] = [out[j], out[i]]; } return out.every((v, i) => v === i) ? out.reverse() : out; };

function Marked({ sentence }) {
  const found = connectorsIn(sentence);
  if (!found.length) return <>{sentence}</>;
  const lower = sentence.toLocaleLowerCase('tr');
  const marks = found.map((f) => { const idx = lower.search(new RegExp(`(^|[^a-zçğıöşü])${f.word}([^a-zçğıöşü]|$)`, 'u')); const start = idx < 0 ? -1 : idx + (idx === 0 && lower.startsWith(f.word) ? 0 : 1); return { ...f, start }; })
    .filter((m) => m.start >= 0).sort((p, q) => p.start - q.start);
  const parts = []; let pos = 0;
  for (const m of marks) {
    if (m.start < pos) continue;
    parts.push(sentence.slice(pos, m.start));
    parts.push(<mark key={m.start} className="tx-mark" style={{ '--tone': TONE[m.kind] }} title={m.text}>{sentence.slice(m.start, m.start + m.word.length)}</mark>);
    pos = m.start + m.word.length;
  }
  parts.push(sentence.slice(pos));
  return <>{parts}</>;
}

function Lab({ value: s, onChange }) {
  const set = (patch) => onChange({ ...s, ...patch });
  const para = PARAGRAPHS.find((p) => p.id === s.para) ?? PARAGRAPHS[0];
  const order = s.order.length === para.sentences.length ? s.order : scramble(para.sentences.length, 7);
  const sequence = s.mode === 'akis' && para.intruder ? [...para.sentences.slice(0, para.intruder.at), para.intruder.text, ...para.sentences.slice(para.intruder.at)] : para.sentences;
  const move = (i, dir) => { const next = [...order]; const j = i + dir; if (j < 0 || j >= next.length) return; [next[i], next[j]] = [next[j], next[i]]; set({ order: next, checked: false }); };
  const sorted = order.every((v, i) => v === i);
  const own = s.mode === 'kendi' ? splitSentences(s.ownText) : [];
  const modes = [{ value: 'sirala', label: 'Sırala' }, { value: 'akis', label: 'Akışı bozan' }, { value: 'bol', label: 'İkiye böl' }, { value: 'kendi', label: 'Kendi metnin' }];
  return <LabGrid top={<div className="kit-row">
    <Choice options={modes} value={s.mode} onChange={(mode) => set({ mode, checked: false, pick: null })} />
    {s.mode !== 'kendi' && <label className="field"><span className="field-label">Paragraf</span>
      <select value={para.id} onChange={(e) => set({ para: e.target.value, order: [], checked: false, pick: null })}>
        {PARAGRAPHS.filter((p) => (s.mode === 'akis' ? p.intruder : s.mode === 'bol' ? p.split : true)).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>}
  </div>} visual={<>
    {s.mode === 'sirala' && <section className="kit-panel">
      <h4>Cümleleri anlamlı bir paragraf olacak biçimde sırala</h4>
      <ol className="tx-list">{order.map((idx, i) => {
        const sentence = para.sentences[idx];
        const ok = s.checked && idx === i;
        return <li key={idx} className={`${s.checked ? (ok ? 'ok' : 'bad') : ''}`}>
          <span className="tx-roman">{labelOf(para, idx)}</span>
          <span className="tx-sentence">{s.hints ? <Marked sentence={sentence} /> : sentence}
            {s.hints && i === 0 && !canBeIntro(sentence) && <small className="tx-warn"> Bu cümle bir bağlayıcıyla başlıyor: giriş cümlesi olamaz.</small>}</span>
          <span className="tl-quiz-buttons"><button type="button" className="btn btn-secondary btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Yukarı">▲</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label="Aşağı">▼</button></span>
        </li>;
      })}</ol>
      <div className="kit-chips">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => set({ order, checked: true })}>Kontrol et</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ hints: !s.hints })}>{s.hints ? 'Bağlantı ipuçlarını gizle' : 'Bağlantı ipuçlarını göster'}</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ order: scramble(para.sentences.length, Date.now() % 100000), checked: false })}>Karıştır</button>
      </div>
      {s.checked && <p className={sorted ? 'st-ok' : 'st-bad'}>{sorted ? `Doğru sıra: ${para.sentences.map((_, i) => labelOf(para, i)).join(' – ')}` : 'Bazı cümleler yanlış yerde. İpuçlarını açıp gönderim sözcüklerinin neyi gösterdiğine bak.'}</p>}
    </section>}
    {s.mode === 'akis' && <section className="kit-panel">
      <h4>Düşüncenin akışını bozan cümleyi bul (tıkla)</h4>
      <ol className="tx-list plain">{sequence.map((sentence, i) => {
        const isIntruder = para.intruder && i === para.intruder.at;
        const state = s.pick === i ? (isIntruder ? 'ok' : 'bad') : s.pick !== null && isIntruder ? 'ok' : '';
        return <li key={i} className={state}><button type="button" className="tx-pick" onClick={() => set({ pick: i })}><span className="tx-roman">{ROMAN[i]}</span> {sentence}</button></li>;
      })}</ol>
      {s.pick !== null && <p className={s.pick === para.intruder.at ? 'st-ok' : 'st-bad'}>{s.pick === para.intruder.at ? `Doğru: ${ROMAN[para.intruder.at]}. ${para.intruder.why}` : 'Bu cümle konuya bağlı. Paragrafın ana konusunu bir cümleyle söyle; o konudan sapan cümleyi ara.'}</p>}
    </section>}
    {s.mode === 'bol' && <section className="kit-panel">
      <h4>Paragraf ikiye bölünecek: ikinci paragraf hangi cümleyle başlar?</h4>
      <ol className="tx-list plain">{para.sentences.map((sentence, i) => <li key={i} className={s.pick === i ? (i === para.split ? 'ok' : 'bad') : s.pick !== null && i === para.split ? 'ok' : ''}>
        <button type="button" className="tx-pick" onClick={() => set({ pick: i })}><span className="tx-roman">{ROMAN[i]}</span> {s.hints ? <Marked sentence={sentence} /> : sentence}</button></li>)}</ol>
      {s.pick !== null && <p className={s.pick === para.split ? 'st-ok' : 'st-bad'}>{s.pick === para.split ? `Doğru: ${ROMAN[para.split]}. Konu geçmişten bugüne geçiyor ("ise" karşılaştırması); yeni paragraf yeni bir bakış açısıyla başlar.` : 'Konunun ya da bakış açısının değiştiği ilk cümleyi ara.'}</p>}
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ hints: !s.hints })}>{s.hints ? 'İpuçlarını gizle' : 'İpuçlarını göster'}</button>
    </section>}
    {s.mode === 'kendi' && <section className="kit-panel">
      <h4>Kendi paragrafını ya da şıklarını yapıştır</h4>
      <textarea className="tx-area" rows={6} value={s.ownText} onChange={(e) => set({ ownText: e.target.value })} placeholder="Paragrafı ya da cümleleri buraya yapıştır…" />
      <ol className="tx-list plain">{own.map((sentence, i) => <li key={i} className={canBeIntro(sentence) ? '' : 'warn'}>
        <span className="tx-roman">{ROMAN[i] ?? i + 1}</span> <span className="tx-sentence"><Marked sentence={sentence} />
          <small className={canBeIntro(sentence) ? 'muted' : 'tx-warn'}> {canBeIntro(sentence) ? '— giriş cümlesi olabilir' : `— giriş olamaz (${connectorsIn(sentence).filter((c) => c.initial).map((c) => c.word).join(', ')})`}</small></span></li>)}</ol>
    </section>}
  </>} side={<>
    <Readouts title="Bağlayıcı türleri" items={[
      ['Sonuç', 'bu yüzden, bu nedenle, kısacası, demek ki → genellikle son cümle'],
      ['Karşıtlık', 'ancak, fakat, oysa, ne var ki → önceki düşünceye karşı çıkar'],
      ['Örnek', 'örneğin, mesela → önceki genel yargıyı açar'],
      ['Ekleme', 'ayrıca, üstelik, hatta → önceki düşünceye ekler'],
      ['Gönderim', 'bu, bunu, böyle, onun → önceki cümleye bağlıdır'],
    ]} />
    <Steps title="Yöntem" lines={['Giriş cümlesi: genel bir yargıdır; bağlayıcı ya da gönderim sözüyle başlamaz.', 'Gönderim sözünün (bu, böyle) neyi gösterdiğini bul: hemen önüne o cümle gelir.', 'Sonuç cümlesi "bu yüzden, demek ki" ile kapanır.', 'İkiye bölmede konu/bakış açısı değişimini ara ("… ise", "günümüzde").']} />
    {s.mode === 'akis' && <Note>Akışı bozan cümle genellikle konuyla ilgili gibi görünür ama paragrafın anlattığı düşünceye katkı vermez.</Note>}
  </>} />;
}

const initial = { mode: 'sirala', para: 'okuma', order: [], checked: false, hints: false, pick: null, ownText: 'Bu nedenle erken yaşta başlamak önemlidir. Ayrıca düzenli tekrar da gereklidir. Yabancı dil öğrenmek, sabır ve süreklilik isteyen bir süreçtir. Örneğin her gün on kelime öğrenmek mümkündür. Çünkü dil, kullanılmadıkça unutulur.' };

export default {
  Lab,
  initial,
  intro: 'Cümleleri sürükleyip sırala, akışı bozan cümleyi bul, paragrafı ikiye böl ya da kendi metnini yapıştır. "Bağlantı ipuçları" bağlayıcı ve gönderim sözcüklerini renklendirir: hangi cümlenin hangisine bağlandığını görürsün.',
  questions: [
    { id: 'siralama', title: 'Numaralı cümleleri sırala', exam: 'TYT', topic: 'Paragrafın yapısı',
      stem: '(I) Kelime hazinesi zengin olan kişi, düşüncelerini daha açık ve ayrıntılı anlatabilir.\n(II) Dil, düşüncenin hem aracı hem de sınırıdır.\n(III) Bu nedenle kelime öğrenmek, yalnızca dil dersinin değil, bütün öğrenmenin temelidir.\n(IV) Bildiğimiz kelimeler arttıkça kavrayabildiğimiz ve ayırt edebildiğimiz kavramlar da çoğalır.\n(V) Kelimesi az olan ise duygularını bile çoğu zaman "iyi" ya da "kötü" gibi genel sözlerle geçiştirir.',
      ask: 'Numaralanmış cümlelerle anlamlı bir paragraf oluşturulduğunda sıralama nasıl olur?',
      choices: { A: 'II – IV – I – V – III', B: 'I – V – II – IV – III', C: 'II – I – IV – III – V', D: 'IV – I – V – II – III', E: 'II – III – I – V – IV' }, answer: 'A',
      setup: { mode: 'sirala', para: 'dil', order: [2, 0, 4, 1, 3], hints: true, checked: false },
      build: 'Sırala modu, paragraf "Dil ve düşünce"; bağlantı ipuçları açık.',
      look: 'Bağlayıcısız tek cümle (II) girişe uygun; "ise" (V) bir karşılaştırmanın ikinci yarısı, "Bu nedenle" (III) sonuç.',
      explanation: 'II genel yargı → IV kelime–kavram ilişkisi → I zengin kelime hazinesinin sonucu → V karşıtı ("kelimesi az olan ise") → III sonuç ("Bu nedenle"). Sıra: II – IV – I – V – III.',
      rule: 'Giriş: bağlayıcısız genel yargı; sonuç: "bu nedenle/demek ki"; "ise" karşılaştırmanın ikinci yarısıdır, eşini arar.' },
    { id: 'akis', title: 'Akışı bozan cümle', exam: 'TYT', topic: 'Paragrafın yapısı',
      stem: '(I) Bilim, kesin doğrulara ulaşmış bir bilgiler yığını değil, sürekli sınanan bir düşünme yoludur. (II) Bir bilim insanı, ortaya attığı düşüncenin yanlışlanabileceğini kabul ederek işe başlar. (III) Bilim insanlarının çoğu, çalışmalarını uzun yıllar boyunca aynı laboratuvarda sürdürür. (IV) Deneyler ve gözlemler bu düşünceyi desteklemezse onu düzeltmekten ya da bırakmaktan çekinmez. (V) Örneğin uzun süre doğru kabul edilen pek çok kuram, yeni gözlemler karşısında yerini daha kapsamlı açıklamalara bırakmıştır.',
      ask: 'Bu paragrafta numaralanmış cümlelerden hangisi düşüncenin akışını bozmaktadır?',
      choices: { A: 'I', B: 'II', C: 'III', D: 'IV', E: 'V' }, answer: 'C',
      setup: { mode: 'akis', para: 'bilim', pick: null },
      build: 'Akışı bozan modu, paragraf "Bilim ve yanılma".',
      look: 'Paragrafın konusu: bilimin kendini sınayıp düzeltmesi. IV\'teki "bu düşünce" II\'ye bağlanıyor; III bu bağı koparıyor.',
      explanation: 'II\'deki düşünce IV\'te "bu düşünce" diye sürdürülür. Araya giren III (bilim insanlarının çalışma yeri) konuya katkı vermez ve bu bağlantıyı koparır.',
      rule: 'Önce konuyu tek cümleyle söyle; gönderim sözlerinin (bu düşünce) bağlandığı cümleleri eşleştir; arada kalan yabancı cümle akışı bozar.' },
    { id: 'bolme', title: 'Paragrafı ikiye böl', exam: 'TYT', topic: 'Paragrafın yapısı',
      stem: '(I) Eskiden şehirler, yürüyerek gezilebilecek büyüklükteydi. (II) Çarşı, okul ve evler birbirine yakın kurulur; insanlar gün içinde birbirleriyle sık sık karşılaşırdı. (III) Bu yakınlık, komşuluk ilişkilerini de güçlendirirdi. (IV) Günümüzde ise şehirler, otomobile göre planlanan geniş alanlara yayılmaktadır. (V) İş yeri, ev ve alışveriş merkezleri arasındaki uzaklık arttıkça insanlar zamanlarının büyük bölümünü yolda geçirmektedir. (VI) Bu durum, hem çevreyi kirletmekte hem de insanların birbirine ayırabildiği zamanı azaltmaktadır.',
      ask: 'Bu paragraf iki paragrafa ayrılmak istense ikinci paragraf hangi cümleyle başlar?',
      choices: { A: 'II', B: 'III', C: 'IV', D: 'V', E: 'VI' }, answer: 'C',
      setup: { mode: 'bol', para: 'sehir', pick: null, hints: true },
      build: 'İkiye böl modu, paragraf "Şehirler: dün ve bugün"; ipuçları açık.',
      look: 'Zaman ve bakış değişimi: I–III geçmiş ("-dı, -ırdı"), IV\'ten itibaren bugün ("günümüzde ise").',
      explanation: 'I–III eski şehirleri anlatır. IV "Günümüzde ise" ile bugünkü şehirlere geçer; V ve VI bu durumun sonuçlarını açıklar. İkinci paragraf IV ile başlar.',
      rule: 'Bölme noktası: konu, zaman ya da bakış açısının değiştiği ilk cümle; çoğu zaman "ise, oysa, günümüzde" gibi bir geçişle başlar.' },
    { id: 'giris', title: 'Giriş cümlesi hangisi?', exam: 'TYT', topic: 'Paragrafın yapısı',
      stem: 'Aşağıdakilerden hangisi bir paragrafın giriş cümlesi olmaya en uygundur?',
      choices: { A: 'Bu nedenle erken yaşta başlamak önemlidir.', B: 'Ayrıca düzenli tekrar da gereklidir.', C: 'Yabancı dil öğrenmek, sabır ve süreklilik isteyen bir süreçtir.', D: 'Örneğin her gün on kelime öğrenmek mümkündür.', E: 'Çünkü dil, kullanılmadıkça unutulur.' }, answer: 'C',
      setup: { mode: 'kendi' },
      build: 'Kendi metnin modu: beş şık kutuya yapıştırılmış olarak gelir.',
      look: 'Araç, bağlayıcıyla başlayan cümleleri "giriş olamaz" diye işaretler; geriye tek aday kalır.',
      explanation: 'A (bu nedenle), B (ayrıca), D (örneğin) ve E (çünkü) önceki bir cümleye bağlanır. C bağımsız, genel bir yargıdır: giriş cümlesi.',
      rule: 'Giriş cümlesi kendi başına anlaşılır, genel bir yargıdır; bağlayıcı ya da gönderim sözüyle başlamaz.' },
  ],
  tips: [
    { title: 'Sıralama', see: 'Numaralı cümleler, "sıralama nasıl olmalıdır"', look: 'Sırala + bağlantı ipuçları.', rule: 'Girişi bul (bağlayıcısız), sonucu bul (bu nedenle/demek ki), gönderim sözlerini önceki cümleyle eşleştir.', trap: 'Şıklarda ilk cümlesi bağlayıcıyla başlayan sıralamalar baştan elenir.' },
    { title: 'Akışı bozan cümle', see: '"düşüncenin akışını bozan"', look: 'Akışı bozan modu.', rule: 'Konuya yakın ama ana düşünceye hizmet etmeyen, bağlantıyı koparan cümle.' },
    { title: 'İkiye bölme', see: '"ikinci paragraf hangi cümleyle başlar"', look: 'İkiye böl modu.', rule: 'Konu, zaman ya da bakış açısının değiştiği yer; geçiş sözleri: ise, oysa, günümüzde, öte yandan.' },
    { title: 'Giriş ve sonuç', see: '"giriş/sonuç cümlesi olabilir"', look: 'Kendi metnin modu.', rule: 'Giriş genel ve bağımsız; sonuç "bu yüzden, kısacası, demek ki" ile toparlar.' },
  ],
};
