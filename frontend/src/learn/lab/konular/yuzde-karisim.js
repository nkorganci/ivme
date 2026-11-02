// Yüzde ve Karışım laboratuvarı: ardışık yüzdelerde değişen taban, bütün değişince parçanın yüzdesi, karışımda madde
// korunumu, ağırlıklı ortalama. `real` görselleri okunup CSV cevaplarıyla karşılaştırıldı.
import { fmt } from '../sayi.js';

export const near = (a, b) => Math.abs(a - b) < 1e-9;
export const POLL = { total: 20, edirne: 7 };
export const MIX = { a: 20, pa: 0.1, pb: 0.4 };
export const CLASS = { na: 20, ma: 60, mb: 80 };

export default {
  conceptId: 'yuzde-karisim',
  title: 'Yüzde ve Karışım Problemleri',
  exam: 'TYT + AYT',
  hero: { title: 'Yüzde neyin yüzdesi?', text: 'Tabanı her adımda yeniden oku, bütün değişince yüzdenin değiştiğini gör, karışımda korunan maddeyi izle.', art: ['%20', '×', 'taban'] },
  goals: [
    {
      id: 'taban', label: 'Ardışık yüzde', short: 'Çarpanlar çarpılır',
      objective: 'Ardışık zam/indirim ve kayıplarda her yüzdenin yeni tabana uygulandığını gösterip çarpanları birleştirir; geriye doğru başlangıcı bulur.',
      misconception: '%20 zam ve %20 indirimin birbirini götürdüğünü sanmak; yüzdeleri toplamak.',
      story: 'Bir ayakkabıya önce %20 zam geldi, bir ay sonra %20 indirim yapıldı. Satıcı “fiyat eskisi gibi” diyor. Doğru mu?',
      predict: {
        question: 'Bir ürüne önce %20 zam, sonra %20 indirim yapılıyor. Son fiyat başlangıca göre nasıldır?',
        options: ['%4 daha ucuz', 'Başlangıçla aynı', '%4 daha pahalı'],
        insight: [
          'Doğru: $1{,}2\\cdot0{,}8=0{,}96$.',
          'İndirim zamlı (daha büyük) fiyattan hesaplandığı için daha çok düşürür.',
          'Çarpım 1’den küçük; fiyat düşer.',
        ],
      },
      experiment: {
        prompt: 'İki değişimi seç; 100 TL’lik ürün sonunda 96 TL olsun.',
        view: 'steps', visualLabel: 'Fiyat çubukları: her adım yeni taban',
        controls: [{ key: 'p', label: '1. değişim (%)', min: -50, max: 50, step: 10 }, { key: 'q', label: '2. değişim (%)', min: -50, max: 50, step: 10 }],
        initial: { p: 20, q: -10 },
        compute: ({ p, q }) => { const mid = 100 * (1 + p / 100), end = mid * (1 + q / 100); return { p, q, mid, end }; },
        readout: (_, r) => [['1. adımdan sonra', fmt(r.mid, 2)], ['Son fiyat', fmt(r.end, 2)], ['Çarpan', `${fmt(1 + r.p / 100, 2)} × ${fmt(1 + r.q / 100, 2)}`]],
        target: { text: 'Hedef: son fiyat 96 TL.', test: (_, r) => near(r.end, 96), example: { p: 20, q: -20 }, hint: '$0{,}96$’yı iki çarpanın çarpımı olarak yaz: $1{,}2\\times?$' },
        diagnose: (_, r) => `Son fiyat ${fmt(r.end, 2)} TL. Yüzdeler toplanmaz: $${fmt(1 + r.p / 100, 2)}\\times${fmt(1 + r.q / 100, 2)}$.`,
        success: '$100\\times1{,}2\\times0{,}8=96$: zam ve aynı oranda indirim fiyatı düşürür.',
      },
      reasons: [
        {
          question: 'Neden %4 düşük?',
          options: ['İndirim zamlı fiyattan hesaplanır: $1{,}2\\cdot0{,}8=0{,}96$.', '$20-20=0$, sonra yuvarlama hatası.', 'İndirim her zaman zamdan büyüktür.'],
          answer: 0,
          feedback: ['', 'Yuvarlama değil; tam hesap 96.', 'Oranlar eşit; fark, indirimin daha büyük tabana uygulanmasından.'],
        },
        {
          question: 'Ardışık yüzdeler nasıl birleşir?',
          options: ['Çarpanlar çarpılır: $(1+p)(1+q)$.', 'Yüzdeler toplanır: $p+q$.', 'Büyük olan geçerlidir.'],
          answer: 0,
          feedback: ['', '$+20$ ve $-20$ toplamı 0 ama sonuç %4 düşüş.', 'İki değişimin ikisi de etkiler.'],
        },
      ],
      proof: 'Her adımda yeni değer eski değerin $(1+r)$ katıdır; $n$ adımda $\\prod(1+r_i)$. $(1+r)(1-r)=1-r^2<1$: aynı oranda zam–indirim her zaman düşürür.',
      rule: 'Değişim çarpanı $1\\pm\\tfrac p{100}$; ardışık değişimlerde çarpanları çarp. Başlangıç = son ÷ çarpanlar.',
      condition: 'Her yüzde bir önceki değerin yüzdesiyse. “Başlangıç fiyatının %20’si kadar” deniyorsa taban sabittir.',
      trap: 'Yüzdeleri toplamak; geri hesapta çarpanla bölmek yerine yüzde çıkarmak.',
      transfer: [
        {
          id: 'tb-yakin', level: 'Yakın alıştırma', text: 'Bir fiyata art arda iki kez %10 zam yapılırsa toplam artış yüzde kaçtır?',
          options: ['%21', '%20', '%11'], answer: 0,
          hints: ['$1{,}1\\cdot1{,}1$.', '$1{,}21$.', '%21.'],
          feedback: ['İkinci zam zamlı fiyattan.', 'Yüzdeler toplanmaz; ikinci zam 110’un %10’u.', 'İlk zamdan sonraki taban 110.'],
        },
        {
          id: 'tb-kuru', level: 'Kayıp ve geri hesap', text: 'Bir meyve kurutulunca ağırlığının %75’ini kaybediyor. 2 kg kuru meyve için kaç kg taze meyve gerekir?',
          options: ['$8$', '$2{,}5$', '$2{,}67$'], answer: 0,
          hints: ['Kalan çarpan $0{,}25$.', '$x\\cdot0{,}25=2$.', '$x=8$.'],
          feedback: ['$8\\cdot0{,}25=2$.', '$2\\cdot1{,}25$: kaybı yanlış tabana uyguladın.', '$2\\div0{,}75$: kalan değil kaybedilen kullanıldı.'],
        },
        {
          id: 'tb-fazla', level: 'Ters yüzde', text: 'Bir sayının %30 fazlası 78’dir. Sayı kaçtır?',
          options: ['$60$', '$54{,}6$', '$48$'], answer: 0,
          hints: ['$1{,}3x=78$.', '$78\\div1{,}3$.', '60.'],
          feedback: ['$60\\cdot1{,}3=78$.', '$78\\cdot0{,}7$: %30’u 78’den aldın.', '$78-30$: yüzde, sayıdan çıkarılan bir miktar değil.'],
        },
      ],
      real: [
        { code: 'TYT-0654', answer: 'A', why: 'İki ardışık kayıp: $x\\cdot0{,}8\\cdot0{,}9=720$; gerçek oranla $1000\\cdot0{,}7\\cdot0{,}9$.' },
        { code: 'TYT-0686', answer: 'E', why: '9 TL, internet fiyatının %15’i: taban 60; ödenen $60-9$.' },
        { code: 'TYT-0697', answer: 'E', why: 'Sayfa $q$ soru: $q+3$, $6q$’nun %20’si; tabanı sorunun toplamı yap.' },
      ],
    },
    {
      id: 'parca-butun', label: 'Bütün değişince', short: 'Eklenen parça bütünü de büyütür',
      objective: 'Parçaya eklenen miktarın bütünü de büyüttüğünü hesaba katarak yeni yüzdeyi ve gereken eklemeyi bulur.',
      misconception: 'Parçaya ekleme yaparken toplamı sabit sanmak (%35’ten %50’ye 3 oy yeter sanmak); yüzde puanı ile yüzde değişimini karıştırmak.',
      story: 'Bir ankette 20 oyun 7’si Edirne’ye (%35). Edirne taraftarları arkadaşlarını çağırıyor. Kaç yeni oyla %50’ye ulaşırlar?',
      predict: {
        question: '20 oyun 7’si Edirne’ye. Yalnız Edirne’ye kaç oy daha eklenirse Edirne %50’ye ulaşır?',
        options: ['$6$', '$3$', '$15$'],
        insight: [
          'Doğru: $13/26=\\%50$.',
          '3 oyla $10/23\\approx\\%43$; toplam da büyüdü.',
          '15 yüzde puanı farkı; oy sayısı değil.',
        ],
      },
      experiment: {
        prompt: 'Edirne’ye eklenen oyu seç; Edirne’nin payı %50 olsun.',
        view: 'poll', visualLabel: 'Oy çubuğu: Edirne ve diğerleri',
        controls: [{ key: 'x', label: 'Eklenen oy', min: 0, max: 12, step: 1 }],
        initial: { x: 3 },
        compute: ({ x }) => { const e = POLL.edirne + x, t = POLL.total + x; return { x, e, t, pct: (100 * e) / t }; },
        readout: (_, r) => [['Edirne', `${r.e}/${r.t}`], ['Pay', `%${fmt(r.pct, 1)}`]],
        target: { text: 'Hedef: %50.', test: (_, r) => near(r.pct, 50), example: { x: 6 }, hint: 'Diğerleri 13 oy ve değişmiyor; Edirne onlara eşit olmalı.' },
        diagnose: (_, r) => `Edirne %${fmt(r.pct, 1)}. Diğerleri 13 oy; Edirne ${r.e}.`,
        success: '$7+6=13$, diğerleri 13: yarı yarıya.',
      },
      reasons: [
        {
          question: 'Neden 3 oy yetmez?',
          options: ['Eklenen oy toplamı da büyütür: $10/23\\approx\\%43$.', '3 oy %15’e eşit olduğu için yeter.', 'Yuvarlama yüzünden.'],
          answer: 0,
          feedback: ['', '3 oy, 20 oyun %15’i; ama toplam 23 olur.', 'Yuvarlama değil; taban değişti.'],
        },
        {
          question: 'Yüzdenin tabanı nedir?',
          options: ['Toplam oy (bütün); değişince yüzde de değişir.', 'Yalnız Edirne’nin oyu.', 'Başlangıçtaki 20, her zaman.'],
          answer: 0,
          feedback: ['', 'Parça tabanın bir kısmıdır, taban değil.', 'Yeni oylarla taban da değişti.'],
        },
      ],
      proof: '$\\tfrac{7+x}{20+x}=\\tfrac12\\Rightarrow14+2x=20+x\\Rightarrow x=6$. Değişmeyen “diğerleri” (13) üzerinden düşünmek daha hızlıdır.',
      rule: 'Değişmeyen kısmı bul; yeni bütün = değişmeyen ÷ onun yeni yüzdesi.',
      condition: 'Yalnız bir parçaya ekleme/çıkarma yapılıyorsa. İki parça birden değişiyorsa iki bilinmeyenle kur.',
      trap: 'Toplamı sabit sanmak; yüzde puanını oy sayısına çevirmek.',
      transfer: [
        {
          id: 'pb-yakin', level: 'Yakın alıştırma', text: '40 kişilik bir sınıfın %25’i gözlüklü. Sınıfa 10 gözlüklü öğrenci katılırsa gözlüklülerin oranı yüzde kaç olur?',
          options: ['%40', '%50', '%35'], answer: 0,
          hints: ['Gözlüklü 10 → 20.', 'Toplam 50.', '$20/50$.'],
          feedback: ['$20/50=\\%40$.', '$20/40$: toplamı güncellemedin.', '%25 + %10 toplandı; yeni bütün 50 kişi.'],
        },
        {
          id: 'pb-buhar', level: 'Değişmeyen kısım', text: '50 kg bir karışımın %60’ı su. Kaç kg su buharlaşırsa su oranı %50 olur?',
          options: ['$10$', '$5$', '$15$'], answer: 0,
          hints: ['Su olmayan kısım 20 kg değişmez.', 'Yeni toplamın %50’si 20 → toplam 40.', '$50-40$.'],
          feedback: ['Su 30 → 20.', '%10 puanı 5 kg sanıldı.', '15 kg buharlaşırsa su %42,9’a iner; fazla.'],
        },
        {
          id: 'pb-sinif', level: 'Denklem', text: 'Bir sınıfta kızların oranı %40. 6 kız katılınca oran %50 oluyor. Başta kaç öğrenci vardı?',
          options: ['$30$', '$60$', '$24$'], answer: 0,
          hints: ['Erkekler değişmiyor: başta %60.', 'Sonra erkekler %50.', '$0{,}6n=0{,}5(n+6)$.'],
          feedback: ['12 kız, 18 erkek → 18/36.', '60 ile 24 kız, 36 erkek: 30/66 %50 değil.', '24 ile 9,6 kız olurdu.'],
        },
      ],
      real: [
        { code: 'TYT-0709', answer: 'E', why: 'Önce %25’in 5 oy olduğunu bul (toplam 20); 5 oy eklenince toplam da değişir.' },
        { code: 'TYT-0719', answer: 'B', why: 'Dünkü yüzdelerden toplamı bul; iki günün toplamına göre %24’ü kur.' },
        { code: 'TYT-0675', answer: 'D', why: 'Yıkılan 3 katlı bina sayısını bul; azalma yüzdesinin tabanı başlangıçtaki 3 katlılar.' },
        { code: 'TYT-0728', answer: 'C', why: 'Gönderilen ve basılan oranlar iç içe: %20’nin %60’ı, sonra %80’in %80’i.' },
        { code: 'TYT-0688', answer: 'C', why: 'Soğuk ve sıcak içecek aralıklarından ikisini alanların yüzde aralığı; içecek almayanları da hesaba kat.' },
      ],
    },
    {
      id: 'karisim', label: 'Karışım', short: 'Madde korunur, oran korunmaz',
      objective: 'Karışımlarda saf madde miktarını toplayıp yeni oranı bulur; ağırlıklı ortalamayı yüzde ortalamasından ayırır.',
      misconception: 'İki karışımın yüzdelerinin ortalamasını almak; su eklenince madde miktarının da değiştiğini sanmak.',
      story: '20 kg %10 tuzlu suya %40 tuzlu su ekleyerek %20’lik turşu suyu hazırlayacaksın. Ne kadar eklemelisin?',
      predict: {
        question: '20 kg %10 tuzlu suya kaç kg %40 tuzlu su eklenirse karışım %20 tuzlu olur?',
        options: ['$10$', '$20$', '$5$'],
        insight: [
          'Doğru: tuz $2+4=6$ kg, toplam 30 kg: %20.',
          '20 kg eklenince %25 olur; eşit miktarda ortalama.',
          '5 kg ile tuz 4 kg / 25 kg = %16.',
        ],
      },
      experiment: {
        prompt: 'Eklenecek %40’lık miktarı seç; karışım %20 olsun.',
        view: 'beakers', visualLabel: 'Kaplar: tuz miktarı koyu',
        controls: [{ key: 'x', label: '%40’lık (kg)', min: 0, max: 40, step: 5 }],
        initial: { x: 20 },
        compute: ({ x }) => { const salt = MIX.a * MIX.pa + x * MIX.pb, total = MIX.a + x; return { x, salt, total, pct: (100 * salt) / total }; },
        readout: (_, r) => [['Tuz', `${fmt(r.salt, 1)} kg`], ['Toplam', `${r.total} kg`], ['Oran', `%${fmt(r.pct, 1)}`]],
        target: { text: 'Hedef: %20.', test: (_, r) => near(r.pct, 20), example: { x: 10 }, hint: 'Tuz: $2+0{,}4x$; toplam $20+x$; oranı 0,2’ye eşitle.' },
        diagnose: (_, r) => `%${fmt(r.pct, 1)}: ${r.pct > 20 ? 'fazla tuzlu; daha az ekle' : 'az tuzlu; daha çok ekle'}.`,
        success: '$\\tfrac{2+4}{30}=\\%20$.',
      },
      reasons: [
        {
          question: 'Neden yüzdelerin ortalaması (%25) değil?',
          options: ['Miktarlar farklı; tuz kütlelerini toplayıp toplam kütleye bölmek gerekir.', 'Yüzdeler hiçbir zaman ortalanmaz.', '%40’lık daha ağır olduğu için.'],
          answer: 0,
          feedback: ['', 'Eşit miktarlarda karışınca ortalama doğrudur; burada miktarlar farklı.', 'Ağırlık değil, miktar oranı belirler.'],
        },
        {
          question: 'Karışımda korunan nedir?',
          options: ['Tuz miktarı (kg): parçaların tuzu toplanır.', 'Tuz oranı.', 'Su miktarı.'],
          answer: 0,
          feedback: ['', 'Oran değişir; korunmaz.', 'Su da toplanır ama soru tuzu izliyor.'],
        },
      ],
      proof: '$0{,}1\\cdot20+0{,}4x=0{,}2(20+x)\\Rightarrow2+0{,}4x=4+0{,}2x\\Rightarrow x=10$. Ağırlıklı ortalama: $\\tfrac{20\\cdot10+10\\cdot40}{30}=20$.',
      rule: 'Madde = oran × miktar; karışımda maddeler ve miktarlar ayrı ayrı toplanır.',
      condition: 'Birim aynı olmalı (kg/kg ya da L/L). Su eklemek maddeyi değiştirmez; buharlaşma da yalnız suyu azaltır.',
      trap: 'Yüzde ortalaması almak.',
      transfer: [
        {
          id: 'kr-yakin', level: 'Yakın alıştırma', text: '40 L %30 şekerli suya 20 L su eklenirse şeker oranı yüzde kaç olur?',
          options: ['%20', '%15', '%30'], answer: 0,
          hints: ['Şeker 12 L.', 'Toplam 60 L.', '$12/60$.'],
          feedback: ['%20.', 'Şekeri de yarıya indirdin.', 'Su eklenince oran düşer.'],
        },
        {
          id: 'kr-buhar', level: 'Buharlaşma', text: '60 L %25 alkollü karışımdan kaç litre su buharlaşırsa alkol oranı %30 olur?',
          options: ['$10$', '$5$', '$12$'], answer: 0,
          hints: ['Alkol 15 L sabit.', 'Yeni toplam $15/0{,}3=50$.', '$60-50$.'],
          feedback: ['50 L’de %30.', '%5 puanı 5 L sanıldı.', '12 L buharlaşırsa oran %31,25 olur; fazla.'],
        },
        {
          id: 'kr-dok', level: 'Dökme ve doldurma', text: '%20 limonlu bir sürahinin yarısı dökülüp yerine saf su konuyor. Yeni limon oranı yüzde kaçtır?',
          options: ['%10', '%20', '%15'], answer: 0,
          hints: ['Limon da yarıya iner.', 'Toplam aynı.', '%10.'],
          feedback: ['Limon yarıya, toplam aynı.', 'Dökülen kısımda limon da gitti.', 'Ortalama $\\tfrac{20+10}2$ değil.'],
        },
      ],
      real: [
        { code: 'TYT-0739', answer: 'E', why: 'Kalan tuz $0{,}8\\cdot0{,}84$, kalan karabiber $0{,}96p$: kalan madde miktarlarını eşitle.' },
      ],
    },
    {
      id: 'ortalama', label: 'Ağırlıklı ortalama', short: 'Kalabalık olana yakın',
      objective: 'Farklı büyüklükteki grupların ortalamasını toplam/toplam ile birleştirir; grafik yüzdelerinden bütünü ve eksik parçayı bulur.',
      misconception: 'Grup ortalamalarının basit ortalamasını almak; yüzde dilimlerini toplamadan bütüne ulaşmak.',
      story: 'İki şubenin sınav ortalamaları 60 ve 80. Okul ortalaması 72 açıklandı. Bu, şubelerin büyüklüğü hakkında ne söylüyor?',
      predict: {
        question: '20 kişilik A sınıfının ortalaması 60, B’ninki 80. Genel ortalama 72 ise B kaç kişidir?',
        options: ['$30$', '$20$', '$40$'],
        insight: [
          'Doğru: $\\tfrac{1200+2400}{50}=72$.',
          'Eşit olsaydı ortalama 70 olurdu.',
          '40 ile $\\tfrac{1200+3200}{60}\\approx73{,}3$.',
        ],
      },
      experiment: {
        prompt: 'B sınıfının mevcudunu seç; genel ortalama 72 olsun.',
        view: 'avg', visualLabel: 'Ortalama terazisi',
        controls: [{ key: 'n', label: 'B sınıfı mevcudu', min: 5, max: 50, step: 5 }],
        initial: { n: 20 },
        compute: ({ n }) => ({ n, mean: (CLASS.na * CLASS.ma + n * CLASS.mb) / (CLASS.na + n) }),
        readout: (_, r) => [['Toplam puan', `${CLASS.na * CLASS.ma} + ${r.n * CLASS.mb}`], ['Genel ortalama', fmt(r.mean, 2)]],
        target: { text: 'Hedef: 72.', test: (_, r) => near(r.mean, 72), example: { n: 30 }, hint: '72, 60’a 12, 80’e 8 uzaklıkta: mevcutlar uzaklıklarla ters orantılı.' },
        diagnose: (_, r) => `Ortalama ${fmt(r.mean, 2)}; ${r.mean < 72 ? 'B büyümeli' : 'B küçülmeli'}.`,
        success: '$20\\cdot12=30\\cdot8$: terazi dengede.',
      },
      reasons: [
        {
          question: 'Genel ortalama neden 70 değil?',
          options: ['Kişi sayıları farklı; toplam puan ÷ toplam kişi alınır.', 'Ortalamalar hiçbir zaman toplanmaz.', 'Sınavlar farklı olduğu için.'],
          answer: 0,
          feedback: ['', 'Eşit gruplarda basit ortalama doğrudur.', 'Aynı sınav; fark grup büyüklüğünden.'],
        },
        {
          question: 'Genel ortalama hangi gruba daha yakındır?',
          options: ['Kalabalık olana.', 'Ortalaması büyük olana.', 'Her zaman tam ortada.'],
          answer: 0,
          feedback: ['', 'Büyük ortalama değil, büyük grup çeker.', 'Yalnız gruplar eşitse ortada.'],
        },
      ],
      proof: '$\\tfrac{20\\cdot60+n\\cdot80}{20+n}=72\\Rightarrow1200+80n=1440+72n\\Rightarrow n=30$. Denge: $20(72-60)=n(80-72)$.',
      rule: 'Genel ortalama = Σ(mevcut × ortalama) ÷ Σ mevcut; uzaklıklar mevcutla ters orantılı.',
      condition: 'Grupların ortalaması ve mevcutları bilinmeli. Yüzde grafikte bütün %100’dür.',
      trap: 'Basit ortalama almak.',
      transfer: [
        {
          id: 'ort-yakin', level: 'Yakın alıştırma', text: 'Bir sınıfın %30’u erkek. Erkeklerin not ortalaması 70, kızlarınki 80. Sınıf ortalaması kaçtır?',
          options: ['$77$', '$75$', '$73$'], answer: 0,
          hints: ['$0{,}3\\cdot70+0{,}7\\cdot80$.', '$21+56$.', '77.'],
          feedback: ['Kızlar çok, 80’e yakın.', 'Basit ortalama; kızlar daha kalabalık.', 'Ağırlıklar ters alındı.'],
        },
        {
          id: 'ort-eksik', level: 'Eksik değer', text: 'Bir öğrencinin 4 sınavın ortalaması 70. Ortalamasının 74 olması için 5. sınavdan kaç alması gerekir?',
          options: ['$90$', '$78$', '$74$'], answer: 0,
          hints: ['Toplam 280.', 'Gereken 370.', '$370-280$.'],
          feedback: ['$370-280=90$.', '$74+4$: her sınava 4 eklemeyi unuttun.', '74 ortalama olur; 5. sınav daha yüksek olmalı.'],
        },
        {
          id: 'ort-grafik', level: 'Grafikten bütün', text: 'Harcamaların %40’ı kira, %25’i gıda, %15’i ulaşım, kalan 600 TL diğer giderler. Toplam harcama kaç TL?',
          options: ['$3000$', '$2400$', '$1500$'], answer: 0,
          hints: ['Diğer giderler %20.', '%20 = 600.', '$600\\cdot5$.'],
          feedback: ['%20 = 600.', '600’ü %25 sandın; kalan dilim %20.', '600’ü %40 sandın; kalan dilim %20.'],
        },
      ],
      real: [
        { code: 'TYT-0716', answer: 'E', why: 'Daire grafikte dilimlerin toplamı %100: eksik dilim $100-(15{,}6+8{,}2+12{,}8+43{,}4)$.' },
      ],
    },
  ],
};
