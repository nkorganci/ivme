// Konu paketi v2 · TYT Fizik · Hareket (16.04, öğretmen denetimi bekleyen pilot).
// KonuV2 ekranına katalog üzerinden bağlıdır; v1 yeniden kullanılan içeriğin kaynağı olarak korunur.
// Harita: fizik-hareket.harita.md. Yöntem: docs/plan/16-ogrenme-kalitesi.md "Fizik öğretim yöntemi".
// Öğretmen onayı yoktur.
//
// v1'den değişmeden alınan bloklar `al()` ile bağlanır (v1 kaldırılırken buraya gömülür; mekanik iş).
//
// Yeni alanlar
//   blok.basamak   0–7; merdivendeki yeri (0 ön koşul, 1 sezgi, 2 kavram dili, 3 temsiller, 4 nicel, 5 soru tipleri)
//   blok.yanilgi   bu bloğun ortaya çıkardığı yanılgının kodu (katalog: fizik-hareket.v2.olcme.js)
//   ornek.ciz      "Çiz" adımında öğrencinin kâğıda çizeceği şey
//   ornek.asamalar adımlarla aynı uzunlukta; her adımın protokoldeki yeri: anla | ciz | ilke | coz | kontrol
// Yeni blok türleri
//   { tur: 'yanilgi', kod }                                        katalogdaki ortaya çıkar → yüzleştir → çöz döngüsü
//   { tur: 'sinifla', soru, kutular, ogeler: [{ metin, kutular: [...], neden }] }
//   { tur: 'ceviri', gecis, bicim: 'eslestir', soru, verilen, secenekler: [{ g, dogru?, neden }] }
//   { tur: 'ceviri', gecis, bicim: 'hata', soru, verilen, cumleler: [{ metin, dogru, neden }] }   tam bir yanlış cümle
//   { tur: 'turet', baslik, adimlar: [{ ne, neden }], sonuc, kosul, birim, dene? }
// Grafik belirtimi (g, verilen, gorsel): parça parça doğrusal; düğümler [zaman, değer]. Aynı zamanda iki düğüm = sıçrama.
//   { tur: 'xt' | 'vt' | 'at', n: [[t, değer], ...], ad? }          tek çizgi
//   { tur: 'xt', cizgiler: [{ ad, n }, ...] }                       birden çok cisim
//   { tur: 'harita', x: [x0, x1, ...] }                             eşit zaman aralıklarında konumlar (hareket haritası)
//   { tur: 'tablo', basliklar: [...], satirlar: [[...], ...] }
// Yeni deney kimlikleri (hareket stüdyosundan kurulacak): 'karsilasma' (iki cisim + aradaki uzaklık sayacı),
//   'uc-grafik' (x–t, v–t, a–t alt alta + ilk hız kaydırıcısı).

import v1 from './fizik-hareket.js';
import kavramKontrolleri from './fizik-hareket.kavram.js';
import { tahminGerekceleri } from './fizik-hareket.gerekce.js';
import nicelKontrolleri from './fizik-hareket.nicel.js';
import { yanilgilar, kavramTesti, karma, tekrar, sinavSeti, tipCalismalari } from './fizik-hareket.v2.olcme.js';

const durakV1 = (id) => v1.duraklar.find((d) => d.id === id);
const al = (durak, tur, n = 0) => durakV1(durak).bloklar.filter((b) => b.tur === tur)[n];
const sinaOgesi = (durak, n) => al(durak, 'sina').ogeler[n];
const ornek = (durak, n, ciz, asamalar) => ({ ...al(durak, 'ornek', n), basamak: 4, ciz, asamalar });
const tip = (id) => v1.tipler.find((t) => t.id === id);

const YENI_TIPLER = [
  { id: 'yon-degistirme', ad: 'Grafikten yön değiştirme anı ve sayısı', banka: null, osym: [],
    gor: ['"kaç kez yön değiştirmiştir", "hangi anda yön değiştirir"', 'Aynı soruda biri konum–zaman, diğeri hız–zaman grafiği'],
    ilkHamle: 'Önce grafiğin türünü oku. Konum–zaman ise **tepe ve çukurları** say; hız–zaman ise çizginin zaman eksenini kaç kez **kestiğini** say.',
    kural: 'Yön değiştirme, hızın işaret değiştirmesidir: konum–zamanda eğimin, hız–zamanda değerin işareti değişir.',
    kosul: 'Hız–zaman çizgisi eksene değip aynı tarafa dönüyorsa cisim bir an durmuş ama yön değiştirmemiştir.',
    tuzak: 'Hız–zaman grafiğindeki tepeyi yön değiştirme saymak. Orada yalnız süratlenme yavaşlamaya döner; cisim aynı yöne gitmeyi sürdürür.',
    sorular: [] }, // banka görselleri taranınca dolacak (şimdi xt-grafik ve vt-grafik listelerinin içinde)
  { id: 'at-grafik', ad: 'İvme–zaman grafiği: alan ve ilk hız', banka: null, osym: [],
    gor: ['Düşey eksende "İvme"', '"hızı kaç m/s olur", "hız–zaman grafiği nasıl olur", ilk hız bilgisi'],
    ilkHamle: 'İlk hızı bul ve kenara yaz. Sonra ivme–zaman alanını hesapla: bu, hızdaki **değişimdir**; hızın kendisi değil.',
    kural: 'Son hız = ilk hız + ivme–zaman alanı. İvme–zamanda yatay çizgi sabit ivmedir; hız–zamanda düz, eğik bir doğru demektir.',
    kosul: 'İlk hız verilmemişse hız bulunamaz; yalnız hız değişimi ve "yapıyor olabilir" yargıları söylenir.',
    tuzak: 'Artı ivmeyi "hızlanıyor" diye okumak. Eksi yönde giden cisim artı ivmeyle yavaşlar.',
    sorular: [] }, // banka görselleri taranınca dolacak (şimdi ivme listesinin içinde)
];

const paket = {
  ...v1,
  surum: 2,
  yanilgilar, kavramTesti, karma, tekrar, sinavSeti, tipCalismalari, kavramKontrolleri, nicelKontrolleri,
  kazanimlar: ['9.3.1.1', '9.3.1.2', '9.3.1.3', '9.3.1.4', '9.3.1.5', '9.3.1.6'],
  sure: 'Yaklaşık 2,5 saat · 8 durak · istediğin yerde bırak, kaldığın yerden sürer',
  giris: 'Sıfırdan başlıyoruz. Her durakta önce **tahmin edeceksin**, sonra deneyip göreceksin; formül en son gelecek ve nereden çıktığını sen bulacaksın.',

  // Basamak 0: konu başında sorulur. Doğru cevap mikro dersi atlatır; yanlış cevap araç kutusundaki dersi açar.
  onkosul: ['AK-1', 'AK-2', 'AK-3', 'AK-4', 'AK-5', 'AK-6', 'AK-7'],

  tipler: [...v1.tipler, ...YENI_TIPLER],

  duraklar: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: 'kime-gore', baslik: 'Hareket: kime göre, nerede?', tipler: ['hareket-turu', 'referans', 'skaler-vektor'],
      kaynak: ['ogm-07', 'ogm-10'], onkosul: ['AK-2', 'AK-3'],
      bloklar: [
        { ...al('kime-gore', 'neden'), basamak: 1, yanilgi: 'Y1' },
        { ...al('kime-gore', 'model'), basamak: 1 },
        { tur: 'yanilgi', kod: 'Y2', basamak: 1 },
        { tur: 'sinifla', basamak: 2, soru: 'Her hareketi uygun kutuya koy. Bazıları iki kutuya birden girer.', kutular: ['Öteleme', 'Dönme', 'Titreşim'], ogeler: [
          { metin: 'Düz rayda ilerleyen tren', kutular: ['Öteleme'], neden: 'Trenin bütün noktaları aynı yöne aynı kadar ilerler.' },
          { metin: 'Çalınan gitar telinin hareketi', kutular: ['Titreşim'], neden: 'Tel iki uç konum arasında gidip gelir.' },
          { metin: 'Dönme dolabın ana çarkının hareketi (kabinler değil)', kutular: ['Dönme'], neden: 'Dolap sabit bir eksen etrafında döner; ekseni yer değiştirmez.' },
          { metin: 'Yolda ilerleyen arabanın tekerleği', kutular: ['Öteleme', 'Dönme'], neden: 'Tekerlek kendi ekseni etrafında dönerken arabayla birlikte ilerler.' },
          { metin: 'Salıncağın denge konumu çevresinde gidip gelmesi', kutular: ['Titreşim'], neden: 'Salıncak iki uç nokta arasında gidip gelir.' },
          { metin: 'Lobutlara doğru yuvarlanan bovling topu', kutular: ['Öteleme', 'Dönme'], neden: 'Top hem ilerler hem kendi çevresinde döner. "Yalnızca öteleme" demek eksiktir.' },
        ] },
        al('kime-gore', 'fikir'),
        { tur: 'fikir', basamak: 2, baslik: 'Konum: sıfıra göre yönlü uzaklık',
          metin: 'Bir cismin nerede olduğunu söylemek için üç karar verirsin: **sıfır neresi** (referans noktası), **hangi yön artı**, **birim ne**. Bu kararlardan sonra her yerin bir adı olur: +3 m, sıfırın artı tarafında 3 m; −4 m, eksi tarafında 4 m.\n\n**Konum** bu yönlü uzaklıktır; vektöreldir. Referanstan cisme doğru çizilen oka **konum vektörü** denir.\n\nSıfırı başka yere koyarsan bütün konumlar değişir, ama cisimler arasındaki uzaklıklar ve cismin ne kadar yer değiştirdiği değişmez. Referans seçimi yalnız **adlandırmayı** değiştirir, olayı değil.',
          derin: 'Konum "ne kadar gittin" sorusuna cevap vermez. −4 m konumundaki cisim oraya 4 m yürüyerek de gelmiş olabilir, 400 m dolaşarak da. Konum bir fotoğraftır; alınan yol ise filmin tamamıdır.' },
        { tur: 'ceviri', basamak: 3, gecis: 'söz → sayı doğrusu', bicim: 'eslestir',
          soru: 'A noktası sıfır alındığında K cisminin konumu +3 m\'dir. Sıfır, A\'nın 2 m artı tarafındaki B noktasına taşınırsa K\'nin konumu ne olur?',
          verilen: { tur: 'sayi-dogrusu', aralik: [-1, 5], noktalar: [{ x: 0, ad: 'A' }, { x: 2, ad: 'B' }, { x: 3, ad: 'K' }] },
          secenekler: [
            { metin: '+1 m', dogru: true, neden: 'K, B\'nin 1 m artı tarafındadır. Cisim yerinden kıpırdamadı; yalnız sıfır değişti.' },
            { metin: '+5 m', neden: 'Sıfır artı yöne kaydıysa cisim sıfıra yaklaşmış olur; konum büyümez, küçülür.' },
            { metin: '+3 m', neden: 'Konum referansa göre söylenir. Referans değişince sayı da değişir, cisim yerinde dursa bile.' },
          ] },
        ornek('kime-gore', 0, 'Peronu, treni ve yolcuyu çiz. İki hız okunu aynı yöne koy; her okun altına kime göre olduğunu yaz.', ['anla', 'ilke', 'coz']),
        { ...al('kime-gore', 'puf'), basamak: 5 },
        { tur: 'tipler', basamak: 5 },
        al('kime-gore', 'sina'),
      ],
    },
    // ───────────────────────── 2 ─────────────────────────
    {
      id: 'yol-yer', baslik: 'Yol ile yer değiştirme aynı şey değil', tipler: ['yol-yer'], kaynak: ['ogm-07'], onkosul: ['AK-2', 'AK-7'],
      bloklar: [
        { ...al('yol-yer', 'neden'), basamak: 1, yanilgi: 'Y3' },
        { ...al('yol-yer', 'model'), basamak: 1 },
        { tur: 'sinifla', basamak: 2, soru: 'Her durumda alınan yol ile yer değiştirmenin büyüklüğü nasıl ilişkilidir? Bir durum birden çok kutuya girebilir; doğru olan bütün ilişkileri işaretle.', kutular: ['Yol = yer değiştirme', 'Yol > yer değiştirme', 'Yer değiştirme = 0'], ogeler: [
          { metin: 'Düz pistte 100 m koşan atlet', kutular: ['Yol = yer değiştirme'], neden: 'Yol düz ve atlet geri dönmüyor: tek eşitlik durumu.' },
          { metin: 'Havuzun bir ucundan öbürüne yüzüp geri dönen yüzücü', kutular: ['Yol > yer değiştirme', 'Yer değiştirme = 0'], neden: 'Başladığı yere döndü: ok yok. Ama iki havuz boyu yüzdü.' },
          { metin: 'Virajlı yoldan komşu köye giden araba', kutular: ['Yol > yer değiştirme'], neden: 'Eğri yolun uzunluğu, uçlarını birleştiren düz oktan büyüktür.' },
          { metin: 'Pistte tam bir tur atan koşucu', kutular: ['Yol > yer değiştirme', 'Yer değiştirme = 0'], neden: 'Tam turda başlangıca dönülür; yol ise bir çevre kadardır.' },
          { metin: 'Asansörle zeminden beşinci kata çıkan kişi', kutular: ['Yol = yer değiştirme'], neden: 'Hareket düşey bir doğru üzerinde ve tek yönde. Doğrunun yatay olması gerekmez.' },
        ] },
        al('yol-yer', 'fikir'),
        { tur: 'ceviri', basamak: 3, gecis: 'kroki → ok', bicim: 'eslestir',
          soru: 'Kareli düzlemde bir karınca 3 birim sağa, sonra 4 birim yukarı yürüyor. Aldığı yol ve yer değiştirmesinin büyüklüğü kaç birimdir?',
          verilen: { tur: 'kroki', yol: [[0, 0], [3, 0], [3, 4]] },
          secenekler: [
            { metin: 'Yol 7, yer değiştirme 5', dogru: true, neden: 'Yol yürünen çizgi: 3 + 4. Yer değiştirme baştan sona düz ok: 3–4–5 üçgeninin uzun kenarı.' },
            { metin: 'Yol 7, yer değiştirme 7', neden: 'Karınca köşeden döndü. Düz ok, iki kenarın toplamından kısadır.' },
            { metin: 'Yol 5, yer değiştirme 5', neden: 'Karınca çapraz yürümedi; kenarlar boyunca 3 + 4 birim yürüdü.' },
            { metin: 'Yol 7, yer değiştirme 1', neden: 'Çıkarma yalnız aynı doğru üzerinde zıt yönlere gidilince yapılır; burada yönler birbirine dik.' },
          ] },
        { tur: 'turet', basamak: 4, baslik: 'Yer değiştirme neden "son − ilk"?',
          adimlar: [
            { ne: 'Sayı doğrusunda ilk konum +2 m, son konum +7 m: cisim artı yöne 5 m gitmiştir.', neden: 'İki nokta arasındaki ok 2\'den 7\'ye uzanır; uzunluğu 5, yönü artıdır.' },
            { ne: '7 − 2 = +5. Son konumdan ilk konumu çıkarmak hem uzunluğu hem yönü tek sayıda verir.', neden: 'İşaret yönü taşır: sonuç artıysa artı yöne, eksiyse eksi yöne gidilmiştir.' },
            { ne: 'Ters gidişte: ilk +7, son +2 → 2 − 7 = −5.', neden: 'Aynı işlem bu kez eksi verdi; cisim eksi yöne 5 m gitti. Kural yön için ayrıca düşünmeni gerektirmez.' },
          ],
          sonuc: 'Δx = x_son − x_ilk', kosul: 'Bir doğru üzerinde ve yön seçilmişse. Aradaki güzergâh işleme girmez; yalnız iki uç nokta.', birim: 'metre; işareti yönü söyler',
          dene: { soru: 'Cisim −6 m\'den −1 m\'ye geliyor. Yer değiştirmesi?', secenekler: [
            { metin: '+5 m', dogru: true, neden: '−1 − (−6) = +5. Cisim eksi tarafta ama artı yöne doğru gitti.' },
            { metin: '−5 m', neden: 'Cisim eksi bölgede olsa da sıfıra yaklaştı, yani artı yöne gitti. Yer değiştirmenin işareti konumun değil gidişin yönüdür.' },
            { metin: '−7 m', neden: 'İki konumu topladın. Değişim son − ilk\'tir: −1 − (−6).' },
          ] } },
        ornek('yol-yer', 0, 'Sayı doğrusu çiz; −3, +5 ve −1 noktalarını işaretle. Gidişi iki ayrı okla, yer değiştirmeyi üçüncü bir okla göster.', ['coz', 'coz', 'coz', 'coz']),
        { ...al('yol-yer', 'puf'), basamak: 5 },
        { ...al('yol-yer', 'cikmis'), basamak: 5 },
        { tur: 'tipler', basamak: 5 },
        al('yol-yer', 'sina'),
      ],
    },
    // ───────────────────────── 3 ─────────────────────────
    {
      id: 'hiz-surat', baslik: 'Sürat ile hız: aynı birim, farklı soru', tipler: ['ort-hiz-surat'], kaynak: ['ogm-07', 'ogm-10', 'mebi-hareket'], onkosul: ['AK-1', 'AK-6'],
      bloklar: [
        { ...al('hiz-surat', 'neden'), basamak: 1, yanilgi: 'Y3' },
        { ...al('hiz-surat', 'model'), basamak: 1 },
        { tur: 'yanilgi', kod: 'Y4', basamak: 1 },
        al('hiz-surat', 'fikir'),
        { tur: 'fikir', basamak: 2, baslik: 'Ortalama ve anlık: yolculuğun tamamı ile tek bir an',
          metin: '**Ortalama** sürat ve hız yolculuğun tamamını tek sayıyla özetler: arada durdun mu, hızlandın mı, bilmez.\n\n**Anlık** sürat ve hız ise tek bir andaki değerdir. Arabanın göstergesi anlık **sürati** gösterir: bir sayı verir, yön vermez. Anlık hızın büyüklüğü anlık sürate eşittir; hız buna yönü de ekler.\n\nTrafikteki "yeşil dalga" levhaları ortalama süratle çalışır: levhadaki değerle gidersen sonraki ışıklara yeşilde varırsın. Arada biraz hızlanıp yavaşlaman fark etmez; ışıklar arası yolu o ortalamayla bitirmen yeter.',
          derin: 'Ortalama sürat hiçbir zaman ortalama hızın büyüklüğünden küçük olamaz, çünkü yol hiçbir zaman yer değiştirmeden kısa değildir. İkisi yalnız doğrusal ve tek yönlü gidişte eşittir. Anlık değerlerde bu fark kaybolur: çok kısa bir anda cisim dönmeye fırsat bulamaz.' },
        { tur: 'yanilgi', kod: 'Y5', basamak: 1 },
        { tur: 'turet', basamak: 4, baslik: 'Eşit yollar, farklı süratler: ortalama neden ortada değil?',
          adimlar: [
            { ne: 'Yolun yarısı v₁, diğer yarısı v₂ süratiyle gidiliyor. Her yarıya d diyelim: toplam yol 2d.', neden: 'Ortalama sürat toplam yolun toplam süreye oranıdır; önce ikisini ayrı ayrı yazmak gerekir.' },
            { ne: 'Süreler: t₁ = d / v₁ ve t₂ = d / v₂. Toplam süre t₁ + t₂.', neden: 'Yollar eşit ama süreler eşit değil: yavaş gidilen yarıda daha çok zaman geçer.' },
            { ne: 'Ortalama sürat = 2d / (d/v₁ + d/v₂) = 2·v₁·v₂ / (v₁ + v₂).', neden: 'd sadeleşir: sonuç yolun uzunluğuna bağlı değildir. Bu yüzden soruda yola istediğin uzunluğu verebilirsin.' },
            { ne: 'Süreler eşit olsaydı (yarı süre v₁, yarı süre v₂): yol v₁·t + v₂·t, süre 2t → ortalama (v₁ + v₂) / 2.', neden: 'Aritmetik ortalama yalnız iki sürat **eşit süre** kullanıldığında doğrudur.' },
          ],
          sonuc: 'Eşit yollarda: 2·v₁·v₂ / (v₁ + v₂) · Eşit sürelerde: (v₁ + v₂) / 2',
          kosul: 'Formülü ezberleme; koşulunu ezberle. Emin değilsen yola bir uzunluk ver, süreleri bul, toplam yolu toplam süreye böl: her durumda çalışır.', birim: 'm/s ya da km/h',
          dene: { soru: 'Bir araç yolculuğun ilk yarı süresinde 60 km/h, kalan yarı süresinde 20 km/h süratle gidiyor. Ortalama sürati kaç km/h\'tir?', secenekler: [
            { metin: '40', dogru: true, neden: 'Süreler eşit: 1 saat 60 km, 1 saat 20 km → 80 km / 2 saat = 40 km/h. Burada aritmetik ortalama doğrudur.' },
            { metin: '30', neden: '30, yollar eşit olsaydı çıkardı. Soruda eşit olan süreler; kökü yeniden oku.' },
            { metin: '80', neden: 'Bu iki saatte gidilen toplam yol; süreye bölmeyi unuttun.' },
          ] } },
        ornek('hiz-surat', 0, 'A ve B\'yi bir doğrunun iki ucuna koy. Gidiş okunun üstüne 30, dönüş okunun üstüne 50 yaz; altlarına süreleri yazacağın yer bırak.', ['anla', 'coz', 'coz', 'coz']),
        { tur: 'ornek', basamak: 4, soru: 'Bir bisikletli doğrusal yolda A\'dan B\'ye 10 m/s sabit hızla 5 saniyede gidiyor, B\'de 25 saniye dinleniyor, sonra aynı yönde B\'den C\'ye 7 m/s sabit hızla 50 saniyede gidiyor. Bütün hareket için ortalama sürati ve ortalama hızının büyüklüğü nedir?',
          ciz: 'Bir doğru üzerine A, B, C noktalarını sırayla koy. Her parçanın altına sürati ve süreyi, B\'nin altına bekleme süresini yaz.',
          asamalar: ['anla', 'coz', 'coz', 'coz'],
          adimlar: [
            { ne: 'Yollar: AB = 10 × 5 = 50 m, BC = 7 × 50 = 350 m. Toplam yol 400 m.', neden: 'Her parçada sürat sabit olduğu için yol sürat ile sürenin çarpımıdır.' },
            { ne: 'Toplam süre = 5 + 25 + 50 = 80 s.', neden: 'Dinlenme süresi de harekete ayrılan toplam süreye girer; saat o sırada durmaz.' },
            { ne: 'Ortalama sürat = 400 / 80 = 5 m/s.', neden: 'Toplam yolun toplam süreye oranı. Bekleme yüzünden iki süratten de küçük çıktı.' },
            { ne: 'Yol doğrusal ve bisikletli hiç geri dönmedi: yer değiştirme de 400 m. Ortalama hızın büyüklüğü 5 m/s.', neden: 'Yol ile yer değiştirmenin eşit olduğu tek durum bu; iki ortalama eşit çıkar.' },
          ], gizli: 2, kontrol: 'Bekleme olmasaydı ortalama 400 / 55 ≈ 7,3 m/s olurdu; 7 ile 10 arasında. Bekleme ortalamayı düşürdü: 5 m/s anlamlı.' },
        { ...al('hiz-surat', 'puf'), basamak: 5, sinav: 'ÖSYM bu ayrımı 2019 ve 2025\'te sordu. İkisi de sınav setinde seni bekliyor; orada yardımsız çözeceksin.' },
        { tur: 'tipler', basamak: 5 },
        al('hiz-surat', 'sina'),
      ],
    },
    // ───────────────────────── 4 ─────────────────────────
    {
      id: 'xt', baslik: 'Sabit hız ve konum–zaman grafiği', tipler: ['xt-grafik'], kaynak: ['ogm-08', 'mebi-hareket'], onkosul: ['AK-4'],
      bloklar: [
        { ...al('xt', 'neden'), basamak: 1, yanilgi: 'Y6' },
        { ...al('xt', 'model'), basamak: 1 },
        al('xt', 'fikir'),
        { tur: 'ceviri', basamak: 3, gecis: 'hareket haritası → konum–zaman', bicim: 'eslestir',
          soru: 'Bir cismin birer saniye arayla çekilen fotoğrafları üst üste konmuş: noktalar eşit aralıklı. Bu cismin konum–zaman grafiği hangisidir?',
          verilen: { tur: 'harita', x: [0, 2, 4, 6, 8] },
          secenekler: [
            { g: { tur: 'xt', n: [[0, 0], [4, 8]] }, dogru: true, neden: 'Eşit sürede eşit yer değiştirme: konum düzgün artar, grafik eğik düz bir doğrudur.' },
            { g: { tur: 'xt', n: [[0, 4], [4, 4]] }, neden: 'Yatay çizgi konumun değişmediğini, yani cismin durduğunu söyler. "Sabit hız = yatay çizgi" hız–zaman grafiği için doğrudur.' },
            { g: { tur: 'xt', n: [[0, 0], [1, 0.5], [2, 2], [3, 4.5], [4, 8]] }, neden: 'Bu eğride eğim giderek artıyor: cisim süratleniyor. O zaman noktaların arası da giderek açılırdı.' },
          ] },
        { tur: 'ceviri', basamak: 3, gecis: 'söz → konum–zaman', bicim: 'eslestir',
          soru: 'Mehmet evinden çıkıp 2 dakikada 150 m uzaktaki çeşmeye yürüyor, 3 dakika su dolduruyor, sonra 1 dakikada evine dönüyor. Ev sıfır alınırsa konum–zaman grafiği hangisidir?',
          secenekler: [
            { g: { tur: 'xt', n: [[0, 0], [2, 150], [5, 150], [6, 0]] }, dogru: true, neden: 'Gidiş: konum artar. Bekleme: konum değişmez, çizgi yatay. Dönüş: konum sıfıra iner; kısa sürdüğü için çizgi daha dik.' },
            { g: { tur: 'xt', n: [[0, 0], [2, 150], [5, 150], [6, 300]] }, neden: 'Bu, alınan yolun grafiği olurdu: yol hep artar. Konum ise eve dönünce sıfıra iner.' },
            { g: { tur: 'xt', n: [[0, 0], [2, 150], [5, 0], [6, 0]] }, neden: 'Bu grafikte Mehmet çeşmede beklemiyor, hemen yavaş yavaş dönüyor ve son dakikayı evde geçiriyor.' },
          ] },
        { tur: 'ceviri', basamak: 3, gecis: 'konum–zaman → söz', bicim: 'hata',
          soru: 'Grafiğe bakarak yazılmış üç cümleden biri yanlış. Hangisi?',
          verilen: { tur: 'xt', n: [[0, 0], [3, 6], [5, 6], [8, 0]] },
          cumleler: [
            { metin: 'İlk 3 saniyede artı yönde 2 m/s hızla gitmiştir.', dogru: true, neden: 'Eğim 6 / 3 = +2 m/s.' },
            { metin: '(3–5) s aralığında sabit hızla ilerlemiştir.', dogru: false, neden: 'Çizgi yatay: konum değişmiyor, cisim duruyor. Yatay çizgi "sabit hızla gitme" anlamını yalnız hız–zaman grafiğinde taşır.' },
            { metin: '(5–8) s aralığında 2 m/s süratle başlangıç noktasına dönmüştür.', dogru: true, neden: 'Eğim (0 − 6) / 3 = −2 m/s: eksi yönde, sürati 2 m/s; 8. saniyede konum sıfır.' },
          ] },
        { tur: 'turet', basamak: 4, baslik: 'Sabit hızda konum: x = x₀ + v·t',
          adimlar: [
            { ne: 'Hız sabit ve v ise cisim her saniye v metre yer değiştirir; t saniyede v·t metre.', neden: 'Sabit hız "eşit sürede eşit yer değiştirme" demektir; süre kaç katına çıkarsa yer değiştirme o kadar katına çıkar.' },
            { ne: 'Yer değiştirme son − ilk konumdur: x − x₀ = v·t.', neden: 'Cisim sıfırdan başlamak zorunda değil; başladığı yere x₀ diyoruz.' },
            { ne: 'x = x₀ + v·t. Grafikte x₀ çizginin başladığı yükseklik, v çizginin eğimidir.', neden: 'Bu bir doğru denklemidir: konum–zaman grafiğinin sabit hızda düz çıkmasının nedeni budur.' },
          ],
          sonuc: 'x = x₀ + v·t', kosul: 'Yalnız hız sabitken. Hız değişiyorsa her parça için ayrı uygulanır ya da hız–zaman alanına geçilir.', birim: 'm = m + (m/s)·s',
          dene: { soru: 'Bir cisim −4 m konumundan +3 m/s sabit hızla harekete başlıyor. 5 saniye sonra konumu nedir?', secenekler: [
            { metin: '+11 m', dogru: true, neden: 'x = −4 + 3 × 5 = +11 m. Cisim 15 m yer değiştirdi ama −4\'ten başladı.' },
            { metin: '+15 m', neden: 'Bu yer değiştirme. Konum için başlangıç konumunu (−4 m) eklemelisin.' },
            { metin: '+19 m', neden: 'Başlangıç konumunun işaretini kaçırdın: −4 + 15.' },
          ] } },
        ornek('xt', 0, 'Konum–zaman eksenlerini çiz; (0, 0), (3, 6) ve (5, 2) noktalarını işaretleyip birleştir.', ['coz', 'coz', 'coz', 'coz']),
        { tur: 'puf', basamak: 5, kural: 'Konum–zaman grafiğinde ilk iş **eksen adlarını okumak**. Sonra tek şeye bak: eğim.', kosul: 'Eğim = hız yalnız konum–zaman grafiğinde. Düz doğru sabit hız, yatay çizgi duran cisim demektir.', tuzak: 'Grafiği yolun resmi sanmak ve hızı yükseklikten okumak. Hız yükseklikte değil **diklikte**dir.', sinav: 'Yargılarda üç sözcüğü ara: "yön değiştirmiştir" → tepe ya da çukur var mı; "yan yanadır" → çizgiler kesişiyor mu; "sürati büyüktür" → hangisi daha dik.' },
        { tur: 'tipler', basamak: 5 },
        { tur: 'sina', ogeler: [
          sinaOgesi('xt', 0),
          { tur: 'secim', soru: 'Aynı yolda giden K ve L araçlarının konum–zaman doğruları t anında kesişiyor; K\'nin doğrusu daha dik. t anı için hangisi doğrudur?', secenekler: [
            { metin: 'Araçlar aynı konumdadır; K daha hızlıdır.', dogru: true, neden: 'Kesişme aynı konum demektir. Hız eğimden okunur: daha dik olan K daha hızlıdır.' },
            { metin: 'Araçların hızları eşittir.', neden: 'Kesişen çizgilerin eşit olan değeri düşey eksendeki büyüklüktür; burada o konum. Hızlar eşit olsaydı doğrular paralel olurdu.' },
            { metin: 'K, L\'nin önündedir.', neden: 'Kesişme anında ikisi aynı yerdedir. K daha hızlı olduğu için bu andan sonra öne geçer.' },
          ] },
        ] },
      ],
    },
    // ───────────────────────── 5 ─────────────────────────
    {
      id: 'vt', baslik: 'Hız–zaman grafiği ve grafik çevirisi', tipler: ['vt-grafik', 'grafik-donusum', 'yon-degistirme'], kaynak: ['ogm-08', 'ogm-10', 'mebi-hareket'], onkosul: ['AK-5'],
      bloklar: [
        { ...al('vt', 'neden'), basamak: 1, yanilgi: 'Y7' },
        { ...al('vt', 'model'), basamak: 1 },
        { tur: 'yanilgi', kod: 'Y8', basamak: 1 },
        al('vt', 'fikir'),
        { tur: 'turet', basamak: 4, baslik: 'Alan neden yer değiştirmedir?',
          adimlar: [
            { ne: 'Hız v\'de sabit, süre t: yer değiştirme v·t.', neden: 'Önceki duraktan: sabit hızda her saniye v metre.' },
            { ne: 'Hız–zaman grafiğinde bu hareket, yüksekliği v ve tabanı t olan bir dikdörtgendir; alanı v·t.', neden: 'Çarpma işleminin resmi alandır: aynı sayıyı grafikten de okuyabilirsin.' },
            { ne: 'Hız değişiyorsa süreyi kısa dilimlere böl: her dilim ince bir dikdörtgen, toplamları çizginin altındaki alan.', neden: 'Çok kısa bir sürede hız neredeyse sabittir; kural her dilimde geçerli kalır. Üçgen ve yamuk bu yüzden işe yarar.' },
            { ne: 'Çizgi eksenin altındaysa hız eksidir: o dilimin yer değiştirmesi de eksi.', neden: 'v·t çarpımında v eksi; cisim o sürede geri gitmiştir.' },
          ],
          sonuc: 'Yer değiştirme = hız–zaman çizgisi ile zaman ekseni arasındaki işaretli alan', kosul: 'Her harekette geçerli. Yol için aynı alanların büyüklükleri toplanır.', birim: '(m/s) × s = m' },
        { tur: 'yanilgi', kod: 'Y9', basamak: 1 },
        { tur: 'ceviri', basamak: 3, gecis: 'tablo → sürat–zaman', bicim: 'eslestir',
          soru: 'Bir hareketlinin aldığı yol tabloda verilmiştir. Sürat–zaman grafiği hangisidir?',
          verilen: { tur: 'tablo', basliklar: ['Zaman (s)', 'Yol (m)'], satirlar: [[0, 0], [1, 4], [2, 8], [3, 12]] },
          secenekler: [
            { g: { tur: 'vt', n: [[0, 4], [3, 4]] }, dogru: true, neden: 'Her saniyede yol 4 m artıyor: sürat 4 m/s\'de sabit, grafik yatay.' },
            { g: { tur: 'vt', n: [[0, 0], [3, 12]] }, neden: 'Tablodaki sayıları aynen taşıdın; bu yol–zaman grafiği. Sürat, yolun saniyede ne kadar arttığıdır.' },
            { g: { tur: 'vt', n: [[0, 4], [1, 4], [1, 8], [2, 8], [2, 12], [3, 12]] }, neden: 'Sürat her saniye artsaydı yoldaki artışlar da büyürdü (4, 8, 12 gibi). Tabloda artış hep 4 m.' },
          ] },
        { tur: 'ceviri', basamak: 3, gecis: 'konum–zaman → hız–zaman', bicim: 'eslestir',
          soru: 'Konum–zaman grafiği verilen cismin hız–zaman grafiği hangisidir?',
          verilen: { tur: 'xt', n: [[0, 0], [2, 8], [4, 8], [6, 0]] },
          secenekler: [
            { g: { tur: 'vt', n: [[0, 4], [2, 4], [2, 0], [4, 0], [4, -4], [6, -4]] }, dogru: true, neden: 'Eğimler: 8/2 = +4, sonra 0, sonra −8/2 = −4. Her parçanın eğimi hız–zamanda bir basamaktır.' },
            { g: { tur: 'vt', n: [[0, 4], [2, 4], [2, 0], [4, 0], [4, 4], [6, 4]] }, neden: 'Son parçada konum azalıyor: eğim eksi, hız da eksi olmalı. Sürati çizdin, hızı değil.' },
            { g: { tur: 'vt', n: [[0, 0], [2, 8], [4, 8], [6, 0]] }, neden: 'Grafiğin biçimini aynen taşıdın. Hız, konum–zamanın kendisi değil eğimidir.' },
          ] },
        { tur: 'ceviri', basamak: 3, gecis: 'hız–zaman → konum–zaman', bicim: 'eslestir',
          soru: 'Hız–zaman grafiği verilen cisim t = 0 anında +10 m konumundadır. Konum–zaman grafiği hangisidir?',
          verilen: { tur: 'vt', n: [[0, 5], [2, 5], [2, -5], [4, -5]] },
          secenekler: [
            { g: { tur: 'xt', n: [[0, 10], [2, 20], [4, 10]] }, dogru: true, neden: 'Alanlar: +10 m, sonra −10 m. Konum 10\'dan 20\'ye çıkar, sonra 10\'a döner.' },
            { g: { tur: 'xt', n: [[0, 0], [2, 10], [4, 0]] }, neden: 'Biçim doğru ama başlangıç konumunu unuttun. Alan yalnız değişimi verir; nereden başladığını soru söyler.' },
            { g: { tur: 'xt', n: [[0, 10], [2, 20], [4, 30]] }, neden: 'Eksenin altındaki alanı da artı saydın. Eksi hız geri gidiştir: konum azalır.' },
          ] },
        ornek('vt', 0, 'Hız–zaman eksenlerini çiz; üç basamağı yerleştir. Eksenin altında kalan dikdörtgeni farklı tara.', ['coz', 'coz', 'coz']),
        { ...al('vt', 'puf'), basamak: 5 },
        { ...al('vt', 'cikmis'), basamak: 5 },
        { tur: 'tipler', basamak: 5 },
        al('vt', 'sina'),
      ],
    },
    // ───────────────────────── 6 (yeni) ─────────────────────────
    {
      id: 'iki-hareketli', baslik: 'İki hareketli: karşılaşma, yetişme, tren', tipler: ['sabit-hiz'], kaynak: ['ogm-10'], onkosul: ['AK-1', 'AK-6'],
      bloklar: [
        { tur: 'neden', basamak: 1, metin: 'İki arkadaş 300 m\'lik düz bir yolun iki ucundan aynı anda birbirine doğru yürümeye başlıyor. Biri saniyede 2 m, diğeri saniyede 1 m gidiyor. Formül aramadan önce şunu düşün: aralarındaki uzaklık her saniye ne kadar kısalır?',
          tahmin: { soru: 'Birbirine doğru 2 m/s ve 1 m/s ile yürüyen iki kişinin arasındaki uzaklık saniyede kaç metre kısalır?', secenekler: [
            { metin: '3 m', dogru: true, neden: 'İkisi de aradaki uzaklığı kendi ucundan kısaltır: biri 2 m, diğeri 1 m. Ara saniyede 3 m kapanır, 300 m de 100 saniyede biter.' },
            { metin: '1 m', neden: 'Hızların farkı, ikisi aynı yöne yürüseydi doğru olurdu. Burada birbirlerine doğru geliyorlar.' },
            { metin: '2 m', neden: 'Yalnız hızlı yürüyeni saydın; diğeri de aynı aralığı öbür ucundan kısaltıyor.' },
          ] } },
        { tur: 'model', basamak: 1, deney: 'karsilasma', gorev: 'Araçlara değil, aradaki uzaklık sayacına bak. Önce araçları birbirine doğru, sonra aynı yöne gönder. Sayaç saniyede kaç metre değişiyor? Bu sayı iki hızla nasıl ilişkili?' },
        { tur: 'fikir', basamak: 2, baslik: 'Tek soru: ara saniyede ne kadar kapanıyor?',
          metin: 'İki hareketli sorularında izleyeceğin şey araçlar değil, **aralarındaki uzaklıktır**.\n\nBirbirine doğru geliyorlarsa ikisi de arayı kendi ucundan kısaltır: ara saniyede **v₁ + v₂** kadar kapanır. Aynı yöne gidiyorlarsa arkadaki yaklaşırken öndeki kaçar: ara saniyede yalnız **v₁ − v₂** kadar kapanır.\n\nSüre her iki durumda aynı cümledir: **kapanacak uzaklık / saniyede kapanan uzaklık.**\n\nBoyu olan cisimlerde (tren, köprü, tünel) değişen tek şey kapanacak uzaklıktır: tren bir tüneli tamamen geçecekse ön ucu **tünel boyu + kendi boyu** kadar gitmelidir.',
          derin: 'Bu aslında gözlemci değiştirmektir (durak 1). Öndeki araca binersen kendini durgun, arkadaki aracı v₁ − v₂ hızıyla yaklaşıyor görürsün. Konum–zaman grafiğinde aynı olay iki doğrunun kesişmesidir: kesişim anı buluşma anını, kesişim yüksekliği buluşma yerini verir.' },
        { tur: 'ceviri', basamak: 3, gecis: 'iki cisim → konum–zaman', bicim: 'hata',
          soru: 'K ve L araçlarının konum–zaman grafiğine bakarak yazılmış üç cümleden biri yanlış. Hangisi?',
          verilen: { tur: 'xt', cizgiler: [{ ad: 'K', n: [[0, 0], [10, 60]] }, { ad: 'L', n: [[0, 40], [10, 60]] }] },
          cumleler: [
            { metin: 'K, L\'nin 40 m gerisinden harekete başlamıştır.', dogru: true, neden: 't = 0 anında K 0 m\'de, L +40 m\'dedir.' },
            { metin: 'K, 10. saniyede L\'ye yetişmiştir.', dogru: true, neden: 'Çizgiler 10. saniyede +60 m\'de kesişiyor: aynı anda aynı yerdeler. Hesapla da tutar: 40 / (6 − 2) = 10 s.' },
            { metin: '10. saniyede iki aracın hızı eşittir.', dogru: false, neden: 'Kesişme aynı **konum** demektir. Hız eğimdir: K 6 m/s, L 2 m/s ile gidiyor ve doğrular paralel değil.' },
          ] },
        { tur: 'turet', basamak: 4, baslik: 'Karşılaşma ve yetişme süresi',
          adimlar: [
            { ne: 'Aradaki uzaklık d, hızlar v₁ ve v₂; araçlar birbirine doğru geliyor.', neden: 'Önce neyin kapanacağını ve onu kimlerin kapattığını yaz; formül bundan sonra gelir.' },
            { ne: 'Bir saniyede biri v₁, diğeri v₂ metre yaklaşır: ara v₁ + v₂ metre kısalır.', neden: 'İkisi aynı aralığı iki ucundan kısaltıyor; katkıları toplanır.' },
            { ne: 't = d / (v₁ + v₂).', neden: 'd metrelik ara saniyede (v₁ + v₂) metre kapanıyorsa bölüm kaç saniye sürdüğünü verir.' },
            { ne: 'Aynı yönde, arkadaki v₁ ve öndeki v₂ ise ara saniyede v₁ − v₂ kısalır: t = d / (v₁ − v₂).', neden: 'Öndeki araç her saniye v₂ metre kaçtığı için arkadakinin yaklaşması o kadar azalır.' },
          ],
          sonuc: 'Karşılaşma: t = d / (v₁ + v₂) · Yetişme: t = d / (v₁ − v₂)',
          kosul: 'Hızlar sabit olmalı ve araçlar aynı anda harekete başlamalı. Biri önce çıktıysa önce o sürede açılan ya da kapanan arayı hesapla. Arkadaki daha yavaşsa hiç yetişemez.', birim: 'm / (m/s) = s' },
        { ...ornek('xt', 1, 'Bir doğrunun iki ucuna araçları koy; hız oklarını birbirine doğru çiz, aralarına 300 m yaz.', ['anla', 'ilke', 'coz']) },
        { tur: 'ornek', basamak: 4, soru: 'Aynı yönde sabit hızlarla giden K ve L araçlarından K, L\'nin 300 m gerisindedir. L\'nin hızı 15 m/s\'dir ve K, L\'ye 20 saniyede yetişiyor. K\'nin hızı kaç m/s\'dir?',
          ciz: 'Bir doğru çiz; K\'yi arkaya, L\'yi 300 m öne koy. İki hız okunu aynı yöne çiz.',
          asamalar: ['anla', 'ilke', 'coz', 'coz'],
          adimlar: [
            { ne: 'Kapanan uzaklık 300 m, süre 20 s.', neden: 'Yetişme, aradaki 300 m\'nin sıfıra inmesidir; önce neyin kapandığını yaz.' },
            { ne: 'Ara saniyede 300 / 20 = 15 m kapanmıştır.', neden: 'Kapanan uzaklığı süreye bölmek, saniyede kapanan miktarı verir.' },
            { ne: 'Araçlar aynı yönde gittiği için bu sayı hızların farkıdır: v_K − 15 = 15.', neden: 'Öndeki araç da ilerlediği için ara, hızların toplamıyla değil farkıyla kapanır.' },
            { ne: 'v_K = 30 m/s.', neden: 'K hem 15 m/s ile kaçan L\'ye ayak uydurmalı hem de saniyede 15 m yaklaşmalıdır.' },
          ], gizli: 2, kontrol: '20 saniyede K 600 m, L 300 m gider. K 300 m geriden başladığı için ikisi aynı noktadadır. Tutuyor.' },
        { tur: 'puf', basamak: 5, kural: 'Araçları değil **arayı** izle: kapanacak uzaklık / saniyede kapanan uzaklık.', kosul: 'Zıt yönde hızları topla, aynı yönde çıkar. Yalnız sabit hızda ve aynı anda başlayan araçlarda.', tuzak: '"Tamamen geçer" denmişse kapanacak uzaklığa trenin boyunu ekle. Bir de birim: km/h ile metreyi aynı işleme sokma.', sinav: 'Kitaplarda ve denemelerde sık çıkar; ÖSYM eski sınavlarda tren boyları ve dur–kalk problemleri olarak sordu. Çoğu soru şekli çizince tek bölmeye iner.' },
        { tur: 'tipler', basamak: 5 },
        { tur: 'sina', ogeler: [
          sinaOgesi('xt', 1),
          sinaOgesi('xt', 2),
          { tur: 'yargi', kok: 'Aynı noktadan aynı anda aynı yöne sabit hızlarla yola çıkan K (10 m/s) ve L (6 m/s) araçları için yargıları değerlendir.', yargilar: [
            { metin: 'Aralarındaki uzaklık her saniye 4 m artar.', dogru: true, neden: 'Aynı yönde gidiyorlar: ara hızların farkı kadar, saniyede 10 − 6 = 4 m açılır.' },
            { metin: '5 saniye sonra aralarında 80 m vardır.', dogru: false, neden: '80 m hızları toplayınca çıkar (16 × 5). Aynı yönde ara 4 × 5 = 20 m açılır.' },
            { metin: 'L\'deki yolcu K\'yi 4 m/s hızla uzaklaşıyor görür.', dogru: true, neden: 'L kendini durgun sayar; K ondan saniyede 4 m uzaklaşmaktadır.' },
          ] },
        ] },
      ],
    },
    // ───────────────────────── 7 ─────────────────────────
    {
      id: 'ivme', baslik: 'İvme: hız nasıl değişiyor?', tipler: ['ivme'], kaynak: ['ogm-10', 'ogm-11', 'mebi-ivme'], onkosul: ['AK-2', 'AK-4'],
      bloklar: [
        { ...al('ivme', 'neden'), basamak: 1, yanilgi: 'Y12' },
        { ...al('ivme', 'model'), basamak: 1 },
        { tur: 'yanilgi', kod: 'Y10', basamak: 1 },
        { tur: 'ceviri', basamak: 3, gecis: 'hareket haritası → söz', bicim: 'eslestir',
          soru: 'Artı yönde giden bir cismin birer saniye arayla çekilen fotoğraflarında noktaların arası giderek açılıyor. Cisim ne yapıyor?',
          verilen: { tur: 'harita', x: [0, 1, 3, 6, 10] },
          secenekler: [
            { metin: 'Artı yönde süratleniyor.', dogru: true, neden: 'Her saniyede öncekinden daha çok yol alıyor (1, 2, 3, 4 m): sürati artıyor.' },
            { metin: 'Sabit hızla gidiyor.', neden: 'Sabit hızda noktalar eşit aralıklı olurdu.' },
            { metin: 'Yavaşlıyor.', neden: 'Yavaşlayan cismin noktaları giderek sıklaşır; burada açılıyor.' },
          ] },
        al('ivme', 'fikir'),
        { tur: 'sinifla', basamak: 2, soru: 'Her durumda cismin süratine ne olur? İşaretleri yan yana yazıp karar ver.', kutular: ['Süratlenir', 'Yavaşlar', 'Sürati değişmez'], ogeler: [
          { metin: 'Hız +8 m/s, ivme +2 m/s²', kutular: ['Süratlenir'], neden: 'Aynı işaret: ivme hızı gittiği yönde büyütür.' },
          { metin: 'Hız +8 m/s, ivme −2 m/s²', kutular: ['Yavaşlar'], neden: 'Zıt işaret: ivme hıza karşı çalışır, sürat azalır.' },
          { metin: 'Hız −8 m/s, ivme −2 m/s²', kutular: ['Süratlenir'], neden: 'İkisi de eksi: aynı yönlüler. Cisim eksi yönde giderek daha süratli gider. Eksi ivme burada yavaşlama değildir.' },
          { metin: 'Hız −8 m/s, ivme +2 m/s²', kutular: ['Yavaşlar'], neden: 'Zıt işaret: cisim eksi yönde giderken sürati azalır.' },
          { metin: 'Hız −8 m/s, ivme 0', kutular: ['Sürati değişmez'], neden: 'İvme sıfırsa hız değişmez: cisim durmaz, eksi yönde 8 m/s ile gitmeyi sürdürür.' },
        ] },
        { tur: 'ceviri', basamak: 3, gecis: 'hız–zaman → söz', bicim: 'eslestir',
          soru: 'Hız–zaman grafiğinde çizgi −6 m/s\'den başlayıp 3. saniyede sıfıra çıkıyor. Bu aralıkta cisim ne yapıyor?',
          verilen: { tur: 'vt', n: [[0, -6], [3, 0]] },
          secenekler: [
            { metin: 'Eksi yönde giderken yavaşlıyor.', dogru: true, neden: 'Hız eksi: cisim eksi yönde gidiyor. Çizgi eksene yaklaşıyor: sürat 6\'dan 0\'a iniyor.' },
            { metin: 'Artı yönde hızlanıyor.', neden: 'Çizgi yukarı çıkıyor diye böyle düşündün. Yukarı çıkan çizgi ivmenin artı olduğunu söyler; gidiş yönünü değerin işareti söyler.' },
            { metin: 'Eksi yönde hızlanıyor.', neden: 'Hızlansaydı çizgi eksenden uzaklaşırdı; burada eksene yaklaşıyor.' },
          ] },
        { tur: 'turet', basamak: 4, baslik: 'İvme: saniyede kaç m/s?',
          adimlar: [
            { ne: 'Hız 2 saniyede 4 m/s\'den 10 m/s\'ye çıkıyor: değişim 10 − 4 = 6 m/s.', neden: 'İvme hızın kendisiyle değil değişimiyle ilgilidir; önce son − ilk.' },
            { ne: 'Bu değişim 2 saniyede oldu: saniyede 6 / 2 = 3 m/s.', neden: 'Değişimi süreye bölmek, bir saniyede ne kadar değiştiğini verir.' },
            { ne: 'a = Δv / Δt = 3 m/s². Hız–zaman grafiğinde bu, doğrunun eğimidir.', neden: 'Dikey değişim (hız) bölü yatay değişim (süre): eğimin tanımı.' },
          ],
          sonuc: 'a = (v_son − v_ilk) / Δt', kosul: 'Bu ortalama ivmedir. İvme sabitse her an aynıdır ve hız–zaman grafiği düz bir doğrudur.', birim: '(m/s) / s = m/s²: hızın her saniye kaç m/s değiştiği',
          dene: { soru: 'Bir cismin hızı 4 saniyede +2 m/s\'den −6 m/s\'ye geliyor. Ortalama ivmesi kaç m/s²\'dir?', secenekler: [
            { metin: '−2', dogru: true, neden: 'Δv = −6 − 2 = −8 m/s. a = −8 / 4 = −2 m/s².' },
            { metin: '−1', neden: 'Değişimi 4 m/s aldın. +2\'den −6\'ya 8 m/s vardır: önce 2 m/s sıfıra, sonra 6 m/s daha.' },
            { metin: '−1,5', neden: 'Son hızı süreye böldün. İvme hızın değil hız değişiminin süreye oranıdır.' },
          ] } },
        ornek('ivme', 0, 'Hız–zaman eksenlerini çiz; −6\'dan başlayan, her saniye 3 yükselen doğruyu çiz. Ekseni kestiği anı işaretle.', ['coz', 'coz', 'coz']),
        { tur: 'ornek', basamak: 4, soru: '72 km/h hızla giden tren düzgün yavaşlayarak 20 saniyede duruyor. İvmesi ve durana kadar aldığı yol nedir?',
          ciz: 'Hız–zaman eksenlerini çiz: 20 m/s\'den başlayıp 20. saniyede sıfıra inen düz doğru.',
          asamalar: ['anla', 'ciz', 'coz', 'coz'],
          adimlar: [
            { ne: 'Birimleri eşitle: 72 km/h = 20 m/s. İlk hız +20 m/s, son hız 0, süre 20 s.', neden: 'Süre saniye verildiği için hız m/s olmalı. Gidiş yönünü artı seçtik.' },
            { ne: 'Hız–zaman grafiği 20\'den sıfıra inen düz bir doğrudur.', neden: 'Düzgün yavaşlama sabit ivme demektir; bu grafik iki soruyu birden cevaplar.' },
            { ne: 'İvme = eğim = (0 − 20) / 20 = −1 m/s².', neden: 'İvme hız değişiminin süreye oranıdır. Eksi çıktı çünkü hız artı, ivme ona zıt yönlü.' },
            { ne: 'Yol = üçgenin alanı = 20 × 20 / 2 = 200 m.', neden: 'Hız–zaman altındaki alan yer değiştirmedir; tren yön değiştirmediği için yola eşittir.' },
          ], gizli: 2, kontrol: 'Tren hiç yavaşlamasaydı 20 × 20 = 400 m giderdi; yavaşlayarak bunun yarısını gitmesi anlamlı. Ortalama hız 10 m/s, 20 saniyede yine 200 m eder.' },
        { tur: 'yanilgi', kod: 'Y11', basamak: 1 },
        { ...al('ivme', 'puf'), basamak: 5 },
        { tur: 'tipler', basamak: 5 },
        al('ivme', 'sina'),
      ],
    },
    // ───────────────────────── 8 (yeni) ─────────────────────────
    {
      id: 'uc-grafik', baslik: 'Üç grafik zinciri: konum, hız, ivme', tipler: ['at-grafik'], kaynak: ['ogm-10', 'ogm-11', 'mebi-ivme'], onkosul: ['AK-4', 'AK-5'],
      bloklar: [
        { tur: 'neden', basamak: 1, yanilgi: 'Y13', metin: 'İki araba aynı anda gaza basıyor ve ikisinin de ivme–zaman grafiği aynı: 3 saniye boyunca +2 m/s². Biri duruyordu, diğeri zaten 10 m/s ile gidiyordu. Grafikleri aynı diye hızları da aynı mı olur?',
          tahmin: { soru: 'İvme–zaman grafikleri aynı (3 saniye boyunca +2 m/s²) olan iki arabadan biri durgun, diğeri 10 m/s hızla başlıyor. 3 saniye sonunda hızları kaç m/s olur?', secenekler: [
            { metin: '6 ve 16', dogru: true, neden: 'İvme–zaman alanı 2 × 3 = 6 m/s hız **değişimidir**. İkisinin de hızı 6 m/s artar: 0 + 6 ve 10 + 6.' },
            { metin: '6 ve 6', neden: 'Alan hızın kendisi olsaydı öyle olurdu. Alan yalnız değişimi verir; ikinci araba 10 m/s ile başladı.' },
            { metin: '2 ve 12', neden: '2 m/s² bir saniyedeki artıştır; hareket 3 saniye sürdü.' },
          ] } },
        { tur: 'model', basamak: 1, deney: 'uc-grafik', gorev: 'İvmeyi sabit tut, ilk hız kaydırıcısını oynat. Üç grafikten hangisi hiç değişmiyor, hangisi yukarı aşağı kayıyor, hangisinin biçimi değişiyor?' },
        { tur: 'fikir', basamak: 2, baslik: 'Merdiven: inerken eğim, çıkarken alan',
          metin: 'Üç grafik bir merdivenin basamaklarıdır: **konum–zaman → hız–zaman → ivme–zaman.**\n\n**Aşağı inerken eğim alırsın:** konum–zamanın eğimi hızdır, hız–zamanın eğimi ivmedir.\n**Yukarı çıkarken alan alırsın:** ivme–zamanın alanı hız değişimidir, hız–zamanın alanı yer değiştirmedir.\n\nİnerken bir bilgi kaybolur: eğim, grafiğin nereden başladığını bilmez. Bu yüzden yukarı çıkarken o bilgiyi geri istemek zorundasın: ivme–zamandan hıza çıkmak için **ilk hız**, hız–zamandan konuma çıkmak için **ilk konum** gerekir. Alan yalnız "ne kadar değişti"yi söyler.',
          derin: 'Durgun hâlden sabit ivmeyle kalkan cismin hız–zaman grafiği orijinden çıkan bir doğrudur. Altındaki üçgeni eşit sürelere böl: ilk dilim bir küçük üçgen, ikinci dilim üç, üçüncü dilim beş küçük üçgen eder. Yani ardışık eşit sürelerde alınan yollar **x, 3x, 5x** diye gider. Bu oran yalnız ilk hız sıfırken geçerlidir. AYT\'de aynı üçgenden x = ½·a·t² bağıntısı çıkar.' },
        { tur: 'ceviri', basamak: 3, gecis: 'hız–zaman → ivme–zaman', bicim: 'eslestir',
          soru: 'Hız–zaman grafiği verilen cismin ivme–zaman grafiği hangisidir?',
          verilen: { tur: 'vt', n: [[0, 0], [2, 8], [5, 8], [7, 0]] },
          secenekler: [
            { g: { tur: 'at', n: [[0, 4], [2, 4], [2, 0], [5, 0], [5, -4], [7, -4]] }, dogru: true, neden: 'Eğimler: 8/2 = +4, sonra 0, sonra −8/2 = −4. Her düz parça ivme–zamanda bir basamaktır.' },
            { g: { tur: 'at', n: [[0, 4], [2, 4], [2, 0], [5, 0], [5, 4], [7, 4]] }, neden: 'Son parçada hız azalıyor: eğim eksi, ivme de eksi olmalı.' },
            { g: { tur: 'at', n: [[0, 0], [2, 8], [5, 8], [7, 0]] }, neden: 'Grafiğin biçimini aynen taşıdın. İvme, hız–zamanın kendisi değil eğimidir.' },
          ] },
        { tur: 'ceviri', basamak: 3, gecis: 'ivme–zaman → hız–zaman', bicim: 'eslestir',
          soru: 'İvme–zaman grafiği verilen cismin ilk hızı +8 m/s\'dir. Hız–zaman grafiği hangisidir?',
          verilen: { tur: 'at', n: [[0, -2], [4, -2]] },
          secenekler: [
            { g: { tur: 'vt', n: [[0, 8], [4, 0]] }, dogru: true, neden: 'Alan −2 × 4 = −8 m/s: hız 8\'den başlayıp 4 saniyede sıfıra iner. Eğim her yerde −2.' },
            { g: { tur: 'vt', n: [[0, 0], [4, -8]] }, neden: 'Eğim doğru ama ilk hızı unuttun; çizgi +8\'den başlamalı. Alan yalnız değişimi verir.' },
            { g: { tur: 'vt', n: [[0, -2], [4, -2]] }, neden: 'Grafiği aynen taşıdın. Sabit ivme hız–zamanda yatay değil eğik bir doğrudur.' },
          ] },
        { tur: 'ceviri', basamak: 3, gecis: 'ivme–zaman → söz', bicim: 'hata',
          soru: 'Durgun hâlden harekete başlayan cismin ivme–zaman grafiğine bakarak yazılmış üç cümleden biri yanlış. Hangisi?',
          verilen: { tur: 'at', n: [[0, 3], [2, 3], [2, 0], [5, 0]] },
          cumleler: [
            { metin: '(0–2) s aralığında hız 6 m/s artmıştır.', dogru: true, neden: 'Alan 3 × 2 = 6 m/s.' },
            { metin: '(2–5) s aralığında cisim durmuştur.', dogru: false, neden: 'İvmenin sıfır olması hızın değişmemesi demektir. Cisim 2. saniyede ulaştığı 6 m/s hızla gitmeyi sürdürür.' },
            { metin: '5. saniyede cismin hızı 6 m/s\'dir.', dogru: true, neden: 'İlk hız 0, toplam alan 6 m/s; son üç saniyede hız değişmedi.' },
          ] },
        { tur: 'turet', basamak: 4, baslik: 'İvme–zaman alanı neden hız değişimidir?',
          adimlar: [
            { ne: 'İvme a sabit: hız her saniye a kadar değişir.', neden: 'İvmenin tanımı: saniyede kaç m/s.' },
            { ne: 'Δt saniyede değişim a·Δt olur. Grafikte bu, yüksekliği a ve tabanı Δt olan dikdörtgenin alanıdır.', neden: 'Hız–zaman grafiğindeki alan fikrinin aynısı, bir basamak aşağıda.' },
            { ne: 'v_son = v_ilk + a·Δt.', neden: 'Alan değişimi verir; son hızı bulmak için başladığın hıza eklersin.' },
          ],
          sonuc: 'Δv = ivme–zaman altındaki işaretli alan · v_son = v_ilk + Δv', kosul: 'İlk hız ayrıca bilinmelidir. İvme parça parça değişiyorsa her parçanın alanı işaretiyle toplanır.', birim: '(m/s²) × s = m/s' },
        { tur: 'ornek', basamak: 4, soru: 'İlk hızı +12 m/s olan cismin ivmesi (0–3) s aralığında −2 m/s², (3–5) s aralığında +1 m/s²\'dir. 3. ve 5. saniyedeki hızı nedir? Cisim yön değiştirmiş midir?',
          ciz: 'İvme–zaman eksenlerini çiz: eksenin altında 3 saniyelik, üstünde 2 saniyelik birer dikdörtgen. Kenara "v₀ = +12" yaz.',
          asamalar: ['anla', 'coz', 'coz', 'kontrol'],
          adimlar: [
            { ne: 'İlk hızı kenara yaz: v₀ = +12 m/s. Aranan: iki andaki hız.', neden: 'İvme–zaman alanı yalnız değişimi verir; başlangıç değeri olmadan hız bulunamaz.' },
            { ne: 'İlk alan: −2 × 3 = −6 m/s. v(3) = 12 − 6 = +6 m/s.', neden: 'Eksenin altındaki alan eksidir: hız 6 m/s azalır.' },
            { ne: 'İkinci alan: +1 × 2 = +2 m/s. v(5) = 6 + 2 = +8 m/s.', neden: 'Her parça bir öncekinin bittiği hızdan devam eder.' },
            { ne: 'Hız 12 → 6 → 8: işareti hiç değişmedi. Cisim yön değiştirmemiştir.', neden: 'Yön değiştirme hızın işaret değiştirmesidir; ivmenin işaret değiştirmesi yetmez.' },
          ], gizli: 2, kontrol: 'İlk aralıkta hız artı, ivme eksiydi: cisim yavaşladı ama geri dönmedi. Hız–zaman grafiğini çizersen çizgi hep eksenin üstünde kalır.' },
        { tur: 'ornek', basamak: 4, soru: 'Durgun hâlden +2 m/s² sabit ivmeyle harekete geçen araç 1., 2. ve 3. saniyelerin her birinde kaç metre yol alır?',
          ciz: 'Hız–zaman eksenlerini çiz: orijinden başlayıp 1., 2., 3. saniyede 2, 4, 6 m/s\'den geçen doğru. Altını birer saniyelik dilimlere böl.',
          asamalar: ['ciz', 'coz', 'coz', 'coz'],
          adimlar: [
            { ne: 'Hız–zaman grafiği orijinden başlar; hız her saniye 2 m/s artar: 2, 4, 6 m/s.', neden: 'İlk hız sıfır ve ivme sabit; grafik düz bir doğrudur.' },
            { ne: '1. saniye: üçgenin alanı 1 × 2 / 2 = 1 m.', neden: 'Yol hız–zaman altındaki alandır; ilk dilim bir üçgendir.' },
            { ne: '2. saniye: yamuğun alanı (2 + 4) / 2 × 1 = 3 m.', neden: 'Dilimin iki kenarı o saniyenin başındaki ve sonundaki hızlardır.' },
            { ne: '3. saniye: (4 + 6) / 2 × 1 = 5 m. Yollar 1, 3 ve 5 m\'dir.', neden: 'Hız her saniye arttığı için aynı sürede alınan yol da artar; oran 1 : 3 : 5.' },
          ], gizli: 2, kontrol: 'İlk 3 saniyenin toplamı 1 + 3 + 5 = 9 m. Büyük üçgenin alanı da 3 × 6 / 2 = 9 m. Tutuyor.' },
        { tur: 'puf', basamak: 5, kural: 'İvme–zaman grafiği görünce önce **ilk hızı** ara, sonra alanı hesapla: son hız = ilk hız + alan.', kosul: 'x, 3x, 5x oranı yalnız durgun hâlden ve sabit ivmeyle başlayan harekette geçerlidir.', tuzak: 'İvme–zaman alanını hız sanmak; ivmenin sıfır olduğu aralıkta cismi durmuş saymak. İvme sıfırsa hız **değişmez**, sıfır olmaz.', sinav: '"Hız–zaman grafiği nasıl olur?" ve "hangi hareketleri yapıyor olabilir?" biçiminde gelir. İkincisinde ilk hız verilmez; her olasılığı ayrı düşünmen beklenir.' },
        { tur: 'tipler', basamak: 5 },
        { tur: 'sina', ogeler: [
          { tur: 'yargi', kok: 'Bir otomobilin ivme–zaman grafiği artı tarafta yatay bir çizgidir. İlk hız verilmemiştir. Otomobil aşağıdaki hareketleri yapıyor **olabilir** mi?', yargilar: [
            { metin: 'Artı yönde süratlenen hareket', dogru: true, neden: 'Hız da artıysa hız ile ivme aynı yönlüdür: sürat artar.' },
            { metin: 'Eksi yönde yavaşlayan hareket', dogru: true, neden: 'Hız eksi, ivme artıysa zıt yönlüdürler: sürat azalır.' },
            { metin: 'Artı yönde yavaşlayan hareket', dogru: false, neden: 'Bunun için hız artı, ivme eksi olmalıydı; grafikte ivme pozitif.' },
          ] },
          { tur: 'secim', soru: 'İlk hızı 3 m/s olan aracın ivmesi (0–2) s aralığında +4 m/s², (2–5) s aralığında −2 m/s²\'dir. 5. saniyenin sonunda hızı kaç m/s\'dir?', secenekler: [
            { metin: '5', dogru: true, neden: 'Alanlar +8 ve −6 m/s. v = 3 + 8 − 6 = 5 m/s.' },
            { metin: '2', neden: 'Alanları doğru topladın (8 − 6) ama ilk hızı eklemedin. Alan değişimdir.' },
            { metin: '17', neden: 'Eksenin altındaki alanı da artı saydın. Eksi ivme hızı azaltır: 3 + 8 − 6.' },
            { metin: '11', neden: 'Bu 2. saniyedeki hız (3 + 8). Sonraki üç saniyede hız 6 m/s azalır.' },
          ] },
          { tur: 'hata', soru: 'Öğrencinin çözümü: "Durgun hâlden sabit ivmeyle kalkan araç ilk 2 saniyede 4 m yol alıyor. Sonraki 2 saniyede ne kadar yol alır?"', adimlar: [
            { metin: 'Araç durgun başlıyor ve ivmesi sabit.' },
            { metin: 'Eşit sürelerde eşit yol alır: sonraki 2 saniyede de 4 m.', hatali: true, neden: 'Eşit sürede eşit yol sabit hızda olur. Burada hız artıyor: durgundan sabit ivmede ardışık eşit sürelerdeki yollar x, 3x, 5x diye gider. İkinci 2 saniyede 12 m alır.' },
            { metin: 'İlk 4 saniyede toplam 8 m yol almıştır.' },
          ] },
        ] },
      ],
    },
  ],

  kaynaklar: [
    ...v1.kaynaklar,
    // Görselleri henüz üretilmedi (kod adımı): kaynak sayfası `frontend/public/ogren/fizik/hareket-kuvvet/` altına konacak.
    { id: 'mebi-hareket', ad: 'MEBİ Konu Özeti · Hareket Kavramları', sayfa: 3, gorsel: null },
    { id: 'mebi-ivme', ad: 'MEBİ Konu Özeti · İvme Kavramı', sayfa: 1, gorsel: null },
  ],
};

// A1: her durağın açılış tahminine kendi gerekçe sorusu bağlanır (yanlış seçenekler gerçekten yanlış akıl yürütmelerdir).
paket.duraklar = paket.duraklar.map((d) => ({ ...d, bloklar: d.bloklar.map((b) => (b.tur === 'neden' && b.tahmin ? { ...b, tahmin: { ...b.tahmin, gerekce: tahminGerekceleri[d.id] } } : b)) }));

export default paket;
export { tip };
