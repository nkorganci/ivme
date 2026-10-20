import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAsync, useFilterRows, usePageTitle } from '../hooks.js';
import { Alert, Loading } from '../components/States.jsx';
import { GUIDE_QUIZ, GUIDE_TOPICS, gradeGuideQuiz, gradeGuideQuizByTopic } from '../coachingGuide.js';
import { STUDY_LABEL } from '../config.js';

const SOURCES = [
  ['Dunlosky ve ark. · çalışma teknikleri incelemesi', 'https://www.psychologicalscience.org/publications/journals/pspi/learning-techniques.html'],
  ['Karpicke ve Roediger · geri çağırma deneyi', 'https://www.science.org/doi/10.1126/science.1152408'],
  ['Cepeda ve ark. · aralıklı tekrar meta analizi', 'https://pubmed.ncbi.nlm.nih.gov/16719566/'],
  ['Rohrer ve Taylor · matematikte karışık alıştırma', 'https://doi.org/10.1007/s11251-007-9015-8'],
  ['Wisniewski ve ark. · geri bildirim meta analizi', 'https://pubmed.ncbi.nlm.nih.gov/32038429/'],
  ['Çözülmüş örnek ve yeni başlayanlar', 'https://pubmed.ncbi.nlm.nih.gov/31465546/'],
  ['CDC · ergenlerde uyku', 'https://www.cdc.gov/healthy-schools/sleep/index.html'],
  ['DSÖ · fiziksel etkinlik kılavuzu', 'https://www.who.int/publications/i/item/9789240015128'],
  ['DSÖ · sağlıklı beslenme', 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet'],
  ['AAP · çocuklarda kafein', 'https://www.healthychildren.org/English/healthy-living/nutrition/Pages/the-effects-of-caffeine-on-kids-a-parents-guide.aspx'],
  ['UNICEF · ergenle çatışmada iletişim', 'https://www.unicef.org/parenting/child-care/how-support-your-teen-during-stressful-times'],
  ['Özerklik desteği ve motivasyon meta analizi', 'https://pubmed.ncbi.nlm.nih.gov/35330866/'],
  ['“Eğer–o zaman” planı ve akademik başarı deneyi', 'https://pubmed.ncbi.nlm.nih.gov/25068007/'],
  ['Esnek ve sabit molaları karşılaştıran çalışma', 'https://pubmed.ncbi.nlm.nih.gov/42510279/'],
  ['Çoklu görev ve öğrenme deneyi', 'https://pure.athabascau.ca/en/publications/laptop-multitasking-hinders-classroom-learning-for-both-users-and/'],
  ['Kahvaltı ve biliş incelemesi', 'https://pubmed.ncbi.nlm.nih.gov/27184287/'],
  ['DSÖ · ergen ruh sağlığında yardım arama işaretleri', 'https://platform.who.int/docs/default-source/mca-documents/policy-documents/operational-guidance/NAM-AD-17-01-OPERATIONAL-GUIDANCE-2018-eng-WHO-Job-Aid.pdf'],
];

const SECTIONS = [
  ['yontem', 'Öğrenme yöntemi'], ['dersler', 'Derslere göre'], ['program', 'Günlük/haftalık plan'],
  ['faydali', 'İşe yarayanlar'], ['takip', 'İlerleme takibi'], ['koc', 'Koçun yaklaşımı'],
  ['zor-gun', 'Zor günler'], ['yasam', 'Hareket/beslenme'], ['test', 'Bilgi testi'],
];

function Evidence({ ids }) {
  return <span className="coach-evidence" aria-label="Bilimsel kaynaklar">{ids.map((id) =>
    <a key={id} href={SOURCES[id - 1][1]} target="_blank" rel="noopener noreferrer"
      aria-label={`Kaynak ${id}: ${SOURCES[id - 1][0]}`}>[{id}]</a>)}</span>;
}

function Tip({ children }) {
  return <p className="coach-tip"><strong>Hemen dene</strong> {children}</p>;
}

const SUBJECTS = [
  { icon: '∑', title: 'Matematik', lead: 'Yöntemi tanı → kendin çöz → ayırt et.',
    steps: ['Yeni konuda açıklamalı örnekte her işlemin nedenini bul.', 'Benzer soruyu çözüme bakmadan çöz; takıldığın adımı yaz.', 'Temel oturduğunda eski ve yeni soru tiplerini karıştır.'], refs: [4, 6] },
  { icon: '¶', title: 'Türkçe', lead: 'Paragrafı kanıtıyla çöz.',
    steps: ['Ana düşünceyi kaynağı kapatarak bir cümlede söyle.', 'Yanlış şık için metindeki çelişkiyi bul.', 'Dil bilgisi kuralını yalnız okumak yerine örnek üzerinde uygula.'], refs: [1, 2] },
  { icon: '◷', title: 'Sosyal bilgiler', lead: 'Olayları ilişkilendir ve hatırla.',
    steps: ['Tarih için kısa zaman çizelgesi ve neden–sonuç zinciri kur.', 'Coğrafyada harita/veri üzerinden “neden burada?” diye sor.', 'Kavramları kapalı kitap kısa sorularla farklı günlerde hatırla.'], refs: [1, 3] },
  { icon: '⚗', title: 'Fen bilgisi', lead: 'Formülün arkasındaki mekanizmayı anlat.',
    steps: ['Fizik/kimyada işlemden önce sonucu tahmin et; birim ve grafiği kontrol et.', 'Biyolojide süreci kendi sözlerinle açıkla, sonra şemayı yeniden çiz.', 'Farklı ünitelerden soruları karıştırıp gerekli ilkeyi seç.'], refs: [1, 4, 5] },
  { icon: 'A', title: 'Yabancı dil', lead: 'Tanımayı üretime çevir.',
    steps: ['Kelimeyi iki yönde hatırla: yabancı dil → Türkçe ve Türkçe → yabancı dil.', 'Yeni kelimeyle cümle kur; okuma/dinlemede yeniden bul.', 'Kartları günlere yay ve doğru bildiklerini de ara sıra yokla.'], refs: [2, 3] },
];

const DAY = [
  ['07.30–09.00', 'Uyan, kahvaltı et, kısa yürüyüş yap ve günün iki önceliğini seç.'],
  ['09.00–10.00', '1. odak bloğu: en zor TYT/AYT konusu, örnek ve bağımsız çözüm.'],
  ['10.15–11.15', '2. odak bloğu: farklı ders, kapalı kitap hatırlama ve soru.'],
  ['11.15–13.00', 'Öğle yemeği, hareket ve gerçek mola.'],
  ['13.00–14.00', '3. odak bloğu: yeni konu veya zayıf kazanım.'],
  ['14.20–15.20', '4. odak bloğu: karışık soru/branş testi ve geri bildirim.'],
  ['15.20–16.00', 'Yanlış nedenlerini yaz, yarının ilk görevini seç.'],
  ['Akşam', 'Spor, sosyal zaman, yemek ve dinlenme; eksik diye tüm akşamı doldurma.'],
  ['23.00–07.30', 'Örnek uyku aralığı: 8,5 saat; kişisel saate ve yaşa göre ayarla.'],
];

const WEEK = [
  ['Pazartesi', 'TYT matematik + Türkçe; haftanın iki somut hedefini yaz.'],
  ['Salı', 'AYT alan dersi + önceki haftadan kısa geri çağırma.'],
  ['Çarşamba', 'TYT fen/sosyal veya YDT dil + matematikten karışık sorular.'],
  ['Perşembe', 'AYT alan dersi + paragraf/dil uygulaması.'],
  ['Cuma', 'En çok hata yapılan konu + kısa branş testi; öğrenmeyi yeniden yokla.'],
  ['Cumartesi', 'Uygun düzeyde TYT/AYT denemesi; yanlış/boşları nedenine göre ayır.'],
  ['Pazar', 'Tek zayıf kazanımı çalış, haftayı değerlendir; kalan zamanı dinlenmeye ayır.'],
];

export default function Recommendations() {
  usePageTitle('Çalışma önerileri');
  return <div className="coach-page">
    <header className="coach-hero card">
      <span className="coach-kicker">TYT / AYT · öğrenci ve eğitim koçu için</span>
      <h1>Çalışma önerileri</h1>
      <p>İyi bir çalışma günü, sonunda neyi <strong>hatırlayabildiğini</strong> gösterir. Bir yöntem seç, bugün küçük bir deneme yap, hafta sonunda sonucu kontrol et.</p>
      <div className="coach-hero-actions"><a className="btn btn-primary" href="#yontem">Rehbere başla</a><a className="btn btn-secondary" href="#test">Kendini test et</a></div>
    </header>

    <nav className="coach-jump" aria-label="Çalışma önerileri bölümleri">
      {SECTIONS.map(([id, label], index) => <a href={`#${id}`} key={id}><span>{String(index + 1).padStart(2, '0')}</span>{label}</a>)}
    </nav>

    <section id="yontem" className="coach-section">
      <div className="coach-heading"><span>01 / öğrenme</span><h2>Öğrenmenin dört hamlesi</h2></div>
      <p className="muted">Araştırmalarda en tutarlı destek, kendini sınama ve çalışmayı zamana yayma için bulunuyor. Açıklayıcı geri bildirim döngüyü tamamlıyor. <Evidence ids={[1, 2, 3, 5]} /></p>
      <div className="coach-cards coach-four">
        <article className="card"><b>1 · Yokla</b><h3>Önce ne bildiğini gör</h3><p>Konuya başlamadan 2–3 kısa soru dene. Boşlar bugünün hedefi olsun.</p></article>
        <article className="card"><b>2 · Kur</b><h3>Yöntemi anla</h3><p>Yeni konuda açıklamalı örneği incele; her adım için “neden?” diye sor. <Evidence ids={[6]} /></p></article>
        <article className="card"><b>3 · Hatırla</b><h3>Kaynağı kapat</h3><p>Çözüme bakmadan anlat, yaz veya soru çöz. Yanıtı kontrol edip hatayı düzelt. <Evidence ids={[2, 5]} /></p></article>
        <article className="card"><b>4 · Geri dön</b><h3>Başka gün yeniden dene</h3><p>Kısa yoklamaları günlere yay. Aralıkları hatırlama güçlüğüne göre ayarla. <Evidence ids={[3]} /></p></article>
      </div>
      <Tip>Bugün çalıştığın konudan kaynak kapalı üç soru çöz; birkaç gün sonra aynı beceriyi yeni soruyla yokla.</Tip>
    </section>

    <section id="dersler" className="coach-section">
      <div className="coach-heading"><span>02 / dersler</span><h2>Her derse kendi kapısından gir</h2></div>
      <p className="muted">Bu TYT/AYT örnekleri genel öğrenme bulgularının derslere uygulanmasıdır; her taktik YKS öğrencileri üzerinde ayrı ayrı sınanmış bir reçete değildir.</p>
      <div className="coach-cards coach-subjects">{SUBJECTS.map((item) => <article className="card coach-subject" key={item.title}>
        <span className="coach-subject-icon" aria-hidden="true">{item.icon}</span><h3>{item.title}</h3><strong>{item.lead}</strong>
        <ol>{item.steps.map((step) => <li key={step}>{step}</li>)}</ol><Evidence ids={item.refs} />
      </article>)}</div>
    </section>

    <section id="program" className="coach-section">
      <div className="coach-heading"><span>03 / plan</span><h2>Takvim, hayatına sığsın</h2></div>
      <p>Bu örnek <strong>okula devam etmeyen, gününü sınava hazırlığa ayıran</strong> öğrenci içindir. Dört odak bloğu bir başlangıç şablonudur; saatleri, blok sayısını ve molaları dikkatine, sağlık durumuna ve ev koşullarına göre ayarla. Uzun süre masada oturmak yerine blok sonunda ne öğrendiğini yokla. Herkese uyan zorunlu bir 25/5 kuralı gösterilmiş değildir. <Evidence ids={[1, 14]} /></p>
      <div className="coach-plan-grid">
        <article className="card"><h3>Evde tam zamanlı bir gün</h3><ol className="coach-timeline">{DAY.map(([time, task]) => <li key={time}><strong>{time}</strong><span>{task}</span></li>)}</ol></article>
        <article className="card"><h3>Evde bir hafta</h3><ol className="coach-timeline">{WEEK.map(([time, task]) => <li key={time}><strong>{time}</strong><span>{task}</span></li>)}</ol></article>
      </div>
      <p className="muted small">AYT alan dersi, hedefe göre matematik/fen, edebiyat-sosyal veya YDT dil olabilir. Sabah daha geç başlıyorsan bütün saatleri kaydır. Deneme sıklığını mevcut düzeye ve toparlanmana göre ayarla; boş saatleri zorunlu çalışma borcu sayma.</p>
      <p className="coach-callout"><strong>Çalışma ortamı:</strong> Masada o bloğun malzemesi dursun; telefonu sessize alıp erişim dışına koy. Çoklu görev öğrenmeyi zorlaştırabilir. Dikkatin dağılıyorsa bloğu kısalt. <Evidence ids={[15]} /></p>
      <p className="coach-callout"><strong>Uyku çıpası:</strong> 13–18 yaşta hedef 8–10 saat uykudur. Düzenli yatış/kalkış saati planın parçası olsun. <Evidence ids={[7]} /></p>
    </section>

    <section id="faydali" className="coach-section">
      <div className="coach-heading"><span>04 / yöntem seçimi</span><h2>Emek nereye gidiyor?</h2></div>
      <div className="coach-compare">
        <article className="card coach-good"><h3>Yapmaya değer</h3><ul>
          <li><strong>Aktif geri çağırma:</strong> çöz, anlat, boş kâğıda yaz.</li>
          <li><strong>Aralıklı tekrar:</strong> beceriyi farklı günlerde yokla.</li>
          <li><strong>Geri bildirim:</strong> yanlışın nedenini incele.</li>
          <li><strong>Karışık alıştırma:</strong> temel kurulduktan sonra soru tipini seçmeyi öğren.</li>
        </ul><Evidence ids={[1, 2, 3, 4, 5]} /></article>
        <article className="card coach-caution"><h3>Tek başına sınırlı</h3><ul>
          <li><strong>Tekrar tekrar okuma/alt çizme:</strong> sonra kaynağı kapatıp kendini yokla.</li>
          <li><strong>Aralıksız maraton:</strong> uykuyu ve sürdürülebilirliği koru.</li>
          <li><strong>Çözümü hemen izleme:</strong> önce bağımsız dene.</li>
          <li><strong>Çalışırken mesajlaşma:</strong> dikkati iki işe böler.</li>
        </ul><Evidence ids={[1, 2, 7, 15]} /></article>
      </div>
      <p className="muted small">“Sınırlı” yöntemler her kullanımda yararsız değildir. İlk okuma yön bulmaya yardım edebilir; öğrenme kontrolü için tek başına yeterli değildir.</p>
    </section>

    <section id="takip" className="coach-section">
      <div className="coach-heading"><span>05 / takip</span><h2>Koçun baktığı pano</h2></div>
      <p>Haftanın başında başlangıç düzeyini belirle. Her denemeden sonra netin yanında <strong>ders/konu, ilk denemede doğruluk, boşlar, süre ve hata nedeni</strong> kaydet. Tek bir kötü denemeden hüküm verme; birkaç denemedeki örüntüye göre sonraki hedefi seç. Açıklayıcı geri bildirim neyin değişeceğini gösterir. <Evidence ids={[5]} /></p>
      <div className="coach-cards coach-three">
        <article className="card"><b>1 · Gözlem</b><p>“Problemlerde 12 sorunun 5’i yanlış; 3’ü denklem kurma.”</p></article>
        <article className="card"><b>2 · Müdahale</b><p>“İki çözülmüş örnek, ardından aynı beceriden 6 bağımsız soru.”</p></article>
        <article className="card"><b>3 · Yeniden ölçüm</b><p>“Bir hafta sonra yeni sorularla doğruluk ve süreyi karşılaştır.”</p></article>
      </div>
      <p className="coach-links"><Link className="btn btn-secondary" to="/gecmis?tab=progress">İlerlememi gör</Link><Link className="btn btn-secondary" to="/calisma/yeni">{STUDY_LABEL}</Link></p>
      <Tip>Koç görüşmesini “Hangi hata azaldı, hangisi kaldı, gelecek haftanın tek önceliği ne?” ile bitir.</Tip>
    </section>

    <section id="koc" className="coach-section">
      <div className="coach-heading"><span>06 / ilişki</span><h2>Öfke veya küskünlükte ilişkiyi koru</h2></div>
      <p>Öğrenci sertleştiğinde ya da konuşmak istemediğinde “naz yapıyor” etiketiyle başlamayın. Sakinleşmek için ara verin; sonra “En zor gelen neydi?” diye sorun. Cevabı özetleyin, sınırı sakince koyun ve iki gerçek seçenek sunun. Ergenlerle sakin iletişim ve özerklik desteği iş birliğine uygun bir zemin sağlar. <Evidence ids={[11, 12]} /></p>
      <div className="coach-dialogue card"><span>Koç cümlesi</span><p>“Bugün denemeyi konuşmaya hazır değilsen 10 dakika ara verelim. Sonra ister ilk üç yanlışı, ister tek bir konuyu birlikte inceleyelim.”</p></div>
      <p className="muted small">Aşağılama, tehdit ve herkesin önünde kıyaslama kullanmayın. Süren işlev kaybı, yoğun umutsuzluk veya güvenlik endişesinde aileyi ve uygun sağlık uzmanını sürece katın. <Evidence ids={[11, 17]} /></p>
    </section>

    <section id="zor-gun" className="coach-section">
      <div className="coach-heading"><span>07 / zor gün</span><h2>İlerleme yavaşsa planı araştır</h2></div>
      <p>“Hangi engel var?” diye sor: uyku, aşırı yük, eksik ön bilgi, zor kaynak, kaygı veya belirsiz hedef. Koç haftalık veriyi ve öğrencinin anlatımını birlikte kullanır; gerekiyorsa hedefi küçültür. “Eğer saat 17.00’de masaya oturursam, 10 dakika paragraf çözerim” gibi belirli bir başlangıç planı denenebilir. <Evidence ids={[12, 13]} /></p>
      <div className="coach-cards coach-three">
        <article className="card"><b>Enerji düşük</b><p>Uykuyu ve yükü kontrol et. Bugün küçük görev + kısa hareketle başla.</p></article>
        <article className="card"><b>Net yerinde sayıyor</b><p>Hata nedenini ayır; aynı türden yeni soruyla yeniden ölç.</p></article>
        <article className="card"><b>İyi oluş bozuluyor</b><p>Dinle; belirtiler sürüyor ve günlük yaşamı etkiliyorsa profesyonel destek ara.</p></article>
      </div>
      <Tip>“Bir sonraki 10 dakikada hangi tek soruya başlayabilirim?” diye sor.</Tip>
    </section>

    <section id="yasam" className="coach-section">
      <div className="coach-heading"><span>08 / beden</span><h2>Hareket ve yemek de planın içinde</h2></div>
      <div className="coach-compare">
        <article className="card"><h3>Hareket</h3><p>DSÖ, 5–17 yaş için hafta geneline yayılan günde ortalama en az 60 dakika orta/yoğun hareket ve haftada en az 3 gün kas/kemik güçlendiren etkinlik önerir. Yürüyüş, bisiklet, oyun veya sevdiğin sporu seç; hareketsiz başlıyorsan yavaş artır. 18 yaş ve üzerinde yetişkin önerileri geçerlidir. <Evidence ids={[8]} /></p>
          <ul><li>Sabah veya öğlen tempolu yürüyüş ya da bisiklet.</li><li>Haftada birkaç gün yaşa uygun, kontrollü kuvvet ve zıplama/oyun etkinliği.</li><li>Çalışma aralarında ayağa kalkıp kısa yürüyüş.</li></ul>
          <Tip>Sevdiğin hareketi ders programına da yaz.</Tip></article>
        <article className="card"><h3>Beslenme</h3><p>Yeterli ve çeşitli öğünler kur: sebze/meyve, tam tahıl, baklagil, uygun protein kaynakları ve su. “Mucize sınav yiyeceği” arama; kısıtlayıcı diyet uygulama. Kahvaltı bazı biliş görevlerinde kısa süreli yarar gösterebilir, ancak ideal bileşimi için kanıt kesin değildir. Enerji içeceği/kafeinle uykuyu telafi etmeye çalışma. <Evidence ids={[9, 10, 16]} /></p>
          <ul><li>Örnek kahvaltı: yumurta veya peynir, tam tahıllı ekmek, sebze/meyve.</li><li>Örnek ana öğün: mercimek/nohut, bulgur ve salata; ihtiyacına uygun alternatif seç.</li><li>Evde masanın yakınına su ve erişilebilir bir meyve/yoğurt/kuruyemiş koy.</li></ul>
          <Tip>Uzun çalışma öncesi erişilebilir bir öğün ve su hazırla.</Tip></article>
      </div>
      <p className="muted small">Bu bölüm genel eğitim bilgisidir. Sağlık durumu veya özel beslenme gereksinimi varsa hekim/diyetisyen önerisini izle.</p>
    </section>

    <PersonalizedSuggestions />

    <section className="coach-section coach-sources" aria-labelledby="kaynaklar">
      <div className="coach-heading"><span>kaynaklar</span><h2 id="kaynaklar">Bilimsel dayanak</h2></div>
      <p className="muted small">Kaynakların bir bölümü genel öğrenci gruplarından gelir. Ders örnekleri ve program şablonu bu bulguların TYT/AYT için uyarlamasıdır.</p>
      <ol>{SOURCES.map(([label, url]) => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{label}</a></li>)}</ol>
    </section>

    <GuideQuiz />
  </div>;
}

function PersonalizedSuggestions() {
  const [open, setOpen] = useState(false);
  const rows = useFilterRows();
  const subjects = useMemo(() => [...new Set(rows.map((row) => row.subject).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'tr')), [rows]);
  const subjectKey = subjects.join('|');
  const result = useAsync(() => open && subjects.length
    ? Promise.allSettled(subjects.map((subject) => api.get('/api/recommendations' + qs({ subject }))))
    : Promise.resolve([]), [open, subjectKey]);
  const suggestions = (result.data ?? []).flatMap((entry, index) => entry.status === 'fulfilled'
    ? (entry.value?.suggestions ?? []).map((suggestion) => ({ ...suggestion, subject: subjects[index] })) : []);
  const failed = (result.data ?? []).filter((entry) => entry.status === 'rejected').length;
  const [reportId, setReportId] = useState(null);
  const [reportText, setReportText] = useState('');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const report = async (event, suggestion) => {
    event.preventDefault(); setNotice(null); setBusy(true);
    try {
      await api.post('/api/feedback', {
        category: 'QUESTION_ISSUE', questionId: suggestion.exampleQuestionId,
        message: `Önerideki soru tipi etiketi (${suggestion.questionTypeCode}) için inceleme: ${reportText.trim()}`,
      });
      setReportId(null); setReportText(''); setNotice({ type: 'success', text: 'Etiket bildirimin alındı.' });
    } catch (error) { setNotice({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };

  return <section className="coach-section" aria-labelledby="kisisel-rota">
    <div className="coach-heading"><span>uygulamadaki verilerim</span><h2 id="kisisel-rota">Kişisel soru rotam</h2></div>
    <p className="muted">Onaylı soru tipi etiketli ilk cevaplarından öneri çıkarır. Kesin tanı veya başarı tahmini değildir.</p>
    <button type="button" className="btn btn-secondary" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      {open ? 'Kişisel önerileri gizle' : 'Kişisel önerilerimi göster'}
    </button>
    {open && <div className="coach-personal">
      {result.loading && <Loading text="Kişisel öneriler yükleniyor…" />}
      {result.error && <Alert type="error">Öneriler yüklenemedi. Yeniden dene.</Alert>}
      {!result.loading && !result.error && failed > 0 && <Alert type="warn">Bazı derslerin önerileri alınamadı; daha sonra tekrar deneyebilirsin.</Alert>}
      {!result.loading && !result.error && !suggestions.length && <Alert type="info">Henüz yeterli ve çeşitli onaylı ilk deneme yok ya da belirgin zorlanma alanı görünmüyor.</Alert>}
      {notice && <Alert type={notice.type}>{notice.text}</Alert>}
      {suggestions.map((suggestion) => <article className="card recommendation-card" key={`${suggestion.subject}:${suggestion.questionTypeCode}`}>
        <h3>{suggestion.subject} · {suggestion.questionType}</h3><p>{suggestion.subtopic} · {suggestion.skill}</p>
        <p>{suggestion.questions} ilk denemede {suggestion.correct} doğru, {suggestion.wrong} yanlış.</p>
        <details><summary>Neden öneriyoruz?</summary><p>Son 90 gündeki onaylı soru tipi etiketleri kullanıldı; son 30 gündeki yanıtlar iki kat ağırlıklı. Ağırlıklı ilk deneme başarısı %{suggestion.recentWeightedSuccess}.</p>
          {suggestion.averageActiveSeconds != null && <p>Ölçülen ortalama aktif süre: yaklaşık {suggestion.averageActiveSeconds} saniye.{suggestion.slowerThanSubject ? ' Bu, ders ortalamasından belirgin uzun.' : ''}</p>}
          {suggestion.prerequisite && <p>Önce göz atılabilecek alt konu: {suggestion.prerequisite}.</p>}</details>
        <div className="goal-actions"><Link className="btn btn-primary" to={`/soru/${encodeURIComponent(suggestion.exampleQuestionCode)}`}>Şimdi çalış</Link>
          <button type="button" className="btn btn-secondary" onClick={() => { setReportId(suggestion.exampleQuestionId); setReportText(''); setNotice(null); }}>Etiket hatası bildir</button></div>
        {reportId === suggestion.exampleQuestionId && <form onSubmit={(event) => report(event, suggestion)}>
          <label className="field"><span className="field-label">Etiketteki sorunu anlat</span><textarea minLength="5" maxLength="1500" required value={reportText} onChange={(event) => setReportText(event.target.value)} /></label>
          <div className="goal-actions"><button className="btn btn-primary" disabled={busy}>Bildir</button><button type="button" className="btn btn-secondary" onClick={() => setReportId(null)}>Vazgeç</button></div>
        </form>}
      </article>)}
    </div>}
  </section>;
}

function GuideQuiz() {
  const [answers, setAnswers] = useState({});
  const [page, setPage] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const scoreRef = useRef(null);
  const pageSize = 5;
  const start = page * pageSize;
  const visible = GUIDE_QUIZ.slice(start, start + pageSize);
  const pageComplete = visible.every((_, offset) => Number.isInteger(answers[start + offset]));
  const complete = GUIDE_QUIZ.every((_, index) => Number.isInteger(answers[index]));
  const score = submitted ? gradeGuideQuiz(answers) : null;
  const byTopic = submitted ? gradeGuideQuizByTopic(answers) : [];
  const retry = () => { setAnswers({}); setPage(0); setSubmitted(false); setSaveError(''); };
  useEffect(() => {
    let active = true;
    api.get('/api/self-checks/latest?kind=GUIDE_QUIZ&itemKey=coaching-guide-v1')
      .then((attempt) => {
        if (!active || !attempt) return;
        setAnswers(Object.fromEntries(attempt.answers.map((answer, index) => [index, answer])));
        setSubmitted(true);
      })
      .catch((error) => { if (active) setSaveError(`Önceki test sonucu okunamadı: ${error.message}`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const advance = async (event) => {
    event.preventDefault();
    if (!pageComplete || busy || loading) return;
    if (page < GUIDE_TOPICS.length - 1) { setPage(page + 1); return; }
    if (!complete) return;
    setBusy(true); setSaveError('');
    try {
      await api.post('/api/self-checks', {
        kind: 'GUIDE_QUIZ', itemKey: 'coaching-guide-v1',
        answers: GUIDE_QUIZ.map((_, index) => answers[index]),
      });
      setSubmitted(true);
    } catch (error) { setSaveError(`Test sonucu kaydedilemedi: ${error.message}`); }
    finally { setBusy(false); }
  };
  useEffect(() => { if (submitted) scoreRef.current?.scrollIntoView({ block: 'start' }); }, [submitted]);

  return <section id="test" className="coach-section coach-quiz" aria-labelledby="test-baslik">
    <div className="coach-heading"><span>son durak / bilgi testi</span><h2 id="test-baslik">Koç ve öğrenci: öğrendik mi?</h2></div>
    <p>40 zorlayıcı durum sorusu, 8 bölüm. Benzer görünen seçenekler arasında <strong>en iyi kararı</strong> seç. Sonuçta konu puanlarını, doğru cevapları ve gerekçeleri göreceksin.</p>
    {saveError && <Alert type="error">{saveError}</Alert>}
    {!submitted && <form onSubmit={advance}>
      <div className="coach-quiz-progress"><div><strong>{page + 1} / {GUIDE_TOPICS.length} · {GUIDE_TOPICS[page]}</strong><span>{Object.keys(answers).length} / {GUIDE_QUIZ.length} yanıtlandı</span></div>
        <div className="coach-progress-track" role="progressbar" aria-label="Yanıtlanan soru oranı" aria-valuenow={Object.keys(answers).length} aria-valuemin="0" aria-valuemax={GUIDE_QUIZ.length}><span style={{ width: `${Object.keys(answers).length / GUIDE_QUIZ.length * 100}%` }} /></div></div>
      {visible.map((question, offset) => { const index = start + offset; return <fieldset className="card coach-question" key={question.prompt} disabled={loading || busy}>
        <legend><span>{String(index + 1).padStart(2, '0')}</span>{question.prompt}</legend>
        {question.options.map((option, optionIndex) => <label key={option} className="coach-option">
          <input type="radio" name={`guide-question-${index}`} value={optionIndex} checked={answers[index] === optionIndex}
            onChange={() => setAnswers((current) => ({ ...current, [index]: optionIndex }))} /><span>{option}</span>
        </label>)}
      </fieldset>; })}
      <div className="coach-quiz-actions">
        {page > 0 && <button type="button" className="btn btn-secondary" onClick={() => setPage(page - 1)}>Önceki 5 soru</button>}
        <button type="submit" className="btn btn-primary btn-lg" disabled={!pageComplete || busy || loading}>{loading ? 'Önceki sonuç yükleniyor…' : busy ? 'Kaydediliyor…' : page === GUIDE_TOPICS.length - 1 ? 'Sonucumu kaydet ve göster' : 'Sonraki 5 soru'}</button>
        {!pageComplete && <span className="muted">Devam etmek için bu bölümdeki 5 soruyu yanıtla.</span>}
      </div>
    </form>}
    {submitted && <div className="card coach-score" role="status" aria-live="polite" ref={scoreRef}>
      <span>TEST SONUCUN</span><strong>{score} / {GUIDE_QUIZ.length}</strong>
      <p>{score >= 32 ? 'Güçlü kararlar! Bu yöntemleri kendi haftana uygula.' : score >= 22
        ? 'İyi başlangıç. Kaçırdığın konuların gerekçelerine dön.'
        : 'Temeli birlikte güçlendirelim. Rehberdeki dört hamleden yeniden başla.'}</p>
      <button type="button" className="btn btn-secondary" onClick={retry}>Testi yeniden çöz</button>
    </div>}
    {submitted && <div className="coach-quiz-review"><h3>Konu sonuçları ve cevap anahtarı</h3>
      <p className="muted">Her bölümü açarak kendi cevabını, en iyi cevabı ve kaynaklı açıklamasını incele.</p>
      {byTopic.map(({ topic, total, correct }, topicIndex) => <details className="card coach-review-topic" key={topic}>
        <summary><strong>{topic}</strong><span>{correct} / {total}</span></summary>
        {GUIDE_QUIZ.slice(topicIndex * pageSize, (topicIndex + 1) * pageSize).map((question, offset) => {
          const index = topicIndex * pageSize + offset;
          return <div className="coach-review-answer" key={question.prompt}>
            <strong>{index + 1}. {question.prompt}</strong>
            <p className={answers[index] === question.answer ? 'coach-answer-correct' : 'coach-answer-wrong'}>Senin yanıtın: {question.options[answers[index]]}</p>
            {answers[index] !== question.answer && <p>En iyi yanıt: {question.options[question.answer]}</p>}
            <p>{question.explanation} <Evidence ids={question.refs} /></p>
          </div>;
        })}
      </details>)}
    </div>}
  </section>;
}
