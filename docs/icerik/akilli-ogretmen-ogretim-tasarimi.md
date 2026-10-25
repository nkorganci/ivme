# Akıllı Öğretmen öğretim tasarımı

Bu belge, bir soruya ait Akıllı Öğretmen içeriğinin **nasıl yazılacağını** anlatır: hangi
katman neden var, öğrenci onu ne zaman görür ve iyi bir benzetme, "aaa" cümlesi, radar
ya da animasyon nasıl kurulur. Alanların biçimi [şemada](../semalar/ogretim-icerigi-v1.schema.json),
komutlar [işlem tarifinde](../islemler/ogretim-icerigi.md), API kartları
[API belgesindedir](../sozlesmeler/api.md#akıllı-öğretmen). `generation.promptVersion`
değeri `ogretim-kavrayis-v2` olan içerik bu rehberin kurallarına göre yazılmıştır.
Örnek dosyalar: `ornek-veri/ogretim-pilotu/fizik/TYT-0959.json` (kırılma, geometri
animasyonu), `fizik/AYT_Sayisal-0370.json` (gerçek zamanlı hareket), `matematik/TYT-0557.json`
(şerit model).

## Hedef

Öğrenci çözümü ezberlemesin; soruyu gördüğünde **türünü tanısın**, **ilk hamleyi bilsin**,
**nedenini görsün** ve çözünce "aaa, sebebi buymuş, ne kadar kolaymış" desin. Bunun için
içerik yardımı azalan bir döngü kurar: önce dene → ipucu → hatanı anla → neden? → mantığını
gör → ikiz soruda yardımsız uygula. Dayandığı ilkeler: önce deneme ve geri çağırma, kademeli
ipucu, çözümlü örnek ve kendini açıklama, yapısal eşlemeli benzetme (benzetmenin sınırı
söylenerek), tahmin et → izle → açıkla, karşıt durum ("ne zaman değil"), aynı derin yapının
farklı yüzeye aktarımı ve aralıklı tekrar.

## Katmanlar ve açılma zamanı

| Katman | Alan | Öğrenci ne zaman görür |
|---|---|---|
| Kalıp kartı | `pattern` (büyük fikir, ne zaman, nasıl, ne zaman değil, sınav ipucu) | "Büyük fikir" ve özet |
| Kavrayış (cevapsız) | `insight.analogy`, `mindset`, `radar`, `targetSeconds` | "Büyük fikir" ve özet |
| İlk hamle | `strategyChoice` | İlk denemeden önce |
| İpuçları | `hints` (kavram → strateji → ilk adım) | İstedikçe, tek tek |
| Yanılgı teşhisi | `misconceptions` | Yanlış şık seçilince |
| Çözüm | `solution.steps` + `selfExplain` | Adım adım ya da doğru cevaptan sonra |
| Kavrayış (cevaplı) | `insight.aha`, `sanityCheck` | Doğru cevap kartında ve özette |
| Anlatım seviyeleri | `solution.levels` (sezgi, kısayol) | Çözümden sonra |
| Görsel / animasyon | `visual` + `predict` | Gerekçe sorusundan sonra (`POST`) |
| İkiz soru | `twin` | En son, yardımsız |

Çözümden önce açılan hiçbir alan sonucu, doğru şıkkın harfini ya da metnini içermez;
doğrulayıcı bunu tarar (`ANSWER_VALUE`, `LETTER_REFERENCE`, `ANSWER_TEXT`).

## Kavrayış katmanı yazımı

**Benzetme (`analogy`).** Öğrencinin zaten bildiği gündelik bir durum seç ve yapıyı açıkça
eşle: "göz = izi dümdüz süren dedektif", "taşan su = kaldırma kuvvetinin faturası",
"bırakılan ceviz = trende bırakılan elma". Süs değil, sorunun kilit ilişkisini taşımalı.
`breaks` zorunludur: benzetmenin nerede yanılttığını tek cümleyle söyle (ör. "fatura yalnız
suyun içindeki kısım için kesilir"). Tek benzetme yeter; ikinci benzetmeyi `levels.sezgi`
kullanabilir.

**Usta gözü (`mindset`).** Kalıbı bilen birinin ilk 10 saniyede kendine sorduğu bir iki soru:
hesap değil karar ("Süre kimden gelir? Düşeyden."). Cevap yok.

**Radar (`radar`).** 2–4 "bunu görünce → bunu düşün" çifti. `see`, soru metninde gözle
yakalanan bir işarettir (kelime, şekil, şık yapısı: "'kesinlikle' sorusu", "şıklarda 2 gibi
katsayılar"); `think`, bir ilke ya da ilk adımdır. Sayı ve sonuç yazılmaz; aynı kalıptaki
başka sorulara da uymalıdır.

**Aha (`aha`).** "Aaa: …-mış/-miş!" ile başlayan bir iki cümle. Sorunun gizli basitliğini
söyler: neyin gereksiz olduğu (başlangıç konumu, uzun yol), neyin sadeleştiği (x²'ler gider)
ya da hangi sezginin tersine döndüğü. Sonucu içerebilir.

**Sağlama (`sanityCheck`).** 5 saniyelik bağımsız kontrol: ters işlem, uç durum, birim, şık
eleme, karşı örnek ya da günlük hayat ("havuzun dibi sığ görünür").

**Hedef süre (`targetSeconds`).** Kalıbı tanıyan öğrencinin süresi; TYT'de çoğu soru 25–60,
AYT'de 45–90 saniye.

## Görsel ve animasyon

Görsel yalnız anlamaya katkı veriyorsa yazılır (`recommended: false` geçerli bir karardır).
Kurallar:

- 3–6 kare; her kare tek fikir. Alt yazı en çok iki cümledir ve "ne görüyorsun + neden"
  söyler. Otomatik oynatmada kare süresi alt yazı uzunluğuna göre uzar.
- Yeni öğe ilk göründüğü karede `focus` listesine girer: belirerek gelir ve iki kez parlar.
  Kesiksiz çizgiler kalemle çiziliyormuş gibi gelir; kesikli çizgiler (uzantı, normal) bu
  etkiden muaftır. Animasyon `prefers-reduced-motion` tercihinde kapanır.
- Fizik çizimleri fiziksel olarak doğru olmalı: ışın açıları kırılma yasasıyla, yörüngeler
  hareket denklemleriyle hesaplanır (TYT-0959'da 37°/53° ve görüntüler M′, B′).
- `predict`, sorunun kendisini değil, aynı ilkeyi taşıyan günlük bir durumu sorar
  ("havuzun dibi sığ mı görünür?").

| Konu | Şablon |
|---|---|
| Doğrusal hareket, atış, bağıl hareket | `motion` (zaman kaydırıcılı, gerçek zamanlı) |
| Optik, kuvvet okları, kaplar, geometrik şekiller | `geometry` |
| Fonksiyon, limit, V–I grafiği | `plot` |
| Eşitsizlik, işaret tablosu | `number-line` |
| Sayma, olasılık, dizilim | `grid` |
| Para, oran, yüzde, parça–bütün | `bar-model` |
| Devre | `circuit` |

Şablon parametreleri ön yüzdeki doğrulayıcıyla (`frontend/src/tutor/visualSpec.js`) aktarımdan
önce denetlenir; tarayıcıda çizilemeyecek görsel `VISUAL_INVALID` sert sorunu verir.

## Diğer alanlar için kısa kurallar

- **İpuçları** cevabı söylemez; üçüncü kademe yalnız ilk somut adımı verir.
- **Yanılgılar**: her yanlış şık için bir düşünce. Sayısal şıklarda `check: choice` ile o şıkkı
  üreten yanlış hesap yazılır; sözel şıklar demet olarak kodlanabilir (`Tuple(1, 0, 0)`).
- **Kendini açıklama** en az bir adımda; yanlış seçenekler gerçek öğrenci yanılgılarıdır.
- **İkiz soru** aynı derin yapıyı farklı yüzeyde sorar. Kısa bir ezber kuralının ("hep yukarı")
  yetmediği bir yüzey seçmek kalıbın anlaşıldığını ölçer (TYT-0959 ikizi: düşey akvaryum camı).
- **Kalıp kartı** aynı `pattern.key` ile her soruda birebir aynıdır (`PATTERN_DRIFT`);
  kavrayış katmanı soruya aittir, benzetme ve radar aynı kalıpta yeniden kullanılabilir.

## Toplu üretim ve kontrol listesi

1. Soruyu veritabanı anahtarı ve görselle doğrula; okunamayan bilgi uydurulmaz.
2. İçeriği bu rehber ve şemayla yaz; hesap adımlarına SymPy `check` ekle.
3. `python scripts/ivme.py ogretim dogrula --offline`: şema, hesaplar, sızıntı, görsel.
   Kavrayış katmanı eksikse `NO_INSIGHT` uyarısı çıkar.
4. `ogretim dogrula` (DB bağlarıyla), `ogretim aktar`, ardından ekranı aç.
5. Öğretmen incelemesi (`/akilli-ogretmen-inceleme`) kavrayış katmanını ayrı bölümde gösterir.
   Onay öncesi sor: benzetme doğru eşleşiyor ve sınırı söyleniyor mu? Radar başka sorulara da
   uyuyor mu? Aha cümlesi gerçekten "neden kolay" diyor mu? Görsel karesi tek fikir mi?
