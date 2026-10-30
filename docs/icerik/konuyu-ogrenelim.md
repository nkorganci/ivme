# Konuyu Öğrenelim: öğretim ve uygulama sözleşmesi

Uygulama `/konuyu-ogrenelim` altındadır. Kullanıcının önceliği, hiç bilmeyen öğrencinin
mantığı kavraması ve örneklerden sonra gerçek sorularda doğru yöntemi hızlı seçebilmesidir.
Kalıcı beklentiler [AGENTS.md](../../AGENTS.md) içinde, etkin devam noktası
[docs/devam.md](../devam.md) içindedir. Claude aynı kuralları `CLAUDE.md` üzerinden okur.

## Kaynaklar ve dosya haritası

| Yer | Görev |
|---|---|
| `frontend/src/learn/content/dersler/*.ders` | Elle yazılan ders kaynağı; sabit ders/bölüm/soru kimlikleri korunur |
| `content/parser.js` | `.ders` ayrıştırıcısı; tarayıcı ve Node denetimleri aynı kodu kullanır |
| `content/explorations.js` | Mevcut 33 matematik dersinin giriş keşifleri; bölüm keşifleri de bu kayıt üzerinden çözülür |
| `content/division-explorations.js`, `lesson/division-models.js`, `lesson/DivisionDiagram.jsx` | Yalnız bölünebilme pilotu: basamak katkısı, ortak koşul ve kalan döngüsü keşifleri, sayısal modelleri ve SVG çizimleri |
| `lesson/models.js` | 33 dersin sınırlı, deterministik sayısal modelleri ve kontrol aralıkları; `eval` yok |
| `lesson/Exploration.jsx` | Görerek anla → birlikte çöz → kendin dene akışı; deneme puanlanmaz |
| `lesson/learning-experience.css` | Okunur ders yüzeyi, bölüm yolu, mobil düzen, model ve büyük görsel görünümü |
| `lesson/Blocks.jsx` | Ortak ders blokları; çözümlü örnekler sırayla açılır, gerekçeleri görünür |
| `lesson/DailyInquiry.jsx` | `::sorgula` bloğu: günlük durum → seçim → seçeneğe özel geri bildirim → gerekçe ve sınavdaki karşılığı → “Sen de sorgula”; puan/olay üretmez |
| `lesson/FigureZoom.jsx` | Klavye/Escape ile kapanan büyük görsel penceresi |
| `content/worked-exams.js` | Özgün görselleri okunmuş sekiz gerçek sınav sorusunun açıklamalı çözümü ve koşullu kısa yolu |
| `lesson/GuidedExam.jsx` | Özgün soru görseli → adımlı çözüm → kısa yol → sağlama; puan üretmez |
| `components/QuestionImage.jsx` (ön yüz kökü) | `readingWidth` ile ders örneklerini ekran altına düştüğünde küçültmeden okunur genişlikte gösterir; diğer soru ekranlarının sığdırma tercihi korunur |
| `scripts/konu-ogrenme-banka.mjs` | DB'yi yalnız okuyarak soru kimliği/konu bağlarını üretir; öğrenci cevabı veya DB içeriği değiştirmez |
| `frontend/src/learn/bank/*.json` | Betik çıktısı; elle düzenlenmez. Cevap anahtarı içermez; gerçek cevap değerlendirmesi API'dedir |
| `pages/LessonPage.jsx` | İsteğe bağlı ön test, anlatım düzeyi, bölüm yolu, kontrol soruları, son test ve tamamlanma |
| `engine/`, `LearnContext.jsx`, `api.js` | Plan/tekrar/ustalık ve kullanıcı olayları; mevcut geçmiş korunur |

Yukarıdaki kısaltılmış `content/`, `lesson/`, `pages/` yolları `frontend/src/learn/` altındadır.
Yüklenen tasarım PDF'si `C:/Users/nkorg/Downloads/learning-engine-spec.md.pdf` (13 sayfa)
öğrenme motoru referansıdır. PDF içindeki öneriler, kullanıcının güncel talimatlarının
ve mevcut React/Spring/PostgreSQL mimarisinin yerine geçmez; yeniden IndexedDB uygulaması kurma.

## İçerik sırası ve yeni ders ekleme

1. `.ders` dosyasında mevcut `@ders`, `@tip`, `@ustalik`, `@oturum`, `@ontest`, `@bolum`,
   `@kartlar`, `@ozet`, `@pratik`, `@aciklama`, `@havuz` biçimini kullan. Kaynak ve katalog
   kategorisini ver; başka bir dersin kimliklerini kopyalama.
2. İlk bölüm `::kesfet <ders-kimliği>` ile başlar. `EXPLORATIONS` kaydı gerçek bir günlük
   ihtiyaç, sıfırdan terim açıklaması, somut deney, en az üç gerekçeli çözüm adımı,
   farklı sayılarla aktarım sorusu ve cevap gerekçesi içerir. Pratik yol örnekten sonra,
   geçerlilik koşulu ve tipik hata ile birlikte verilir. İleri açıklama da anlam kurar.
   Sonraki bölümler ayrı keşif kimliği kullanabilir; kaydın `lessonId` alanı sahibi olan
   derse eşit olmalıdır. Doğrulayıcı, bütün bölüm keşiflerinin metnini ve formüllerini tarar.
3. `MODEL_CONTROLS` ve `calculateModel` kaydı yaz. Genel bir grafik her konuya zorla
   uygulanmaz: kesirde eş parça; denklemde denge; kökte alan; harekette kapanan mesafe;
   koşullu olasılıkta daralan örnek uzay gibi kavramın kendisini temsil et.
4. Modelde bütün kontrol değerleri için metin, sayı ve şekil tutarlı olsun. Klavye,
   dar ekran, alternatif açıklama ve hareket azaltma tercihini destekle. Büyütme
   penceresi dar ekranda yatay kaydırılabilir; sayfanın kendisi taşmamalı.
5. `::duzey` L1/L2/L3, `::sorgula`, `::ornek`, `::tamamla`, `::strateji`, `::yanilgi` ve kontrol
   sorularını ilgili bölümde kullan. Yeni standartta **her bölümde** bir `::duzey` (üç düzey de dolu)
   ve en az bir `::sorgula` bulunur; aksi hâlde üstteki “Anlatımı seç” o bölümde hiçbir şeyi değiştirmez.
   `::sorgula` alanları: `durum:`, `soru:`, `A)`–`E)` seçenekleri (`+` doğru, `||` gerekçe), `neden:`,
   `sinav:`, isteğe bağlı `dusun:`/`yanit:` ve sayısal cevapta `kontrol:` (doğru seçeneğin ilk sayısını vermeli).
   Dönüştürülen ders `testler/konu-ogrenme-bicim.test.mjs` içindeki `YENI_BICIM` listesine eklenir; test her
   bölümde düzey, sorgulama, en az iki gerekçeli çözümlü örnek ve her adımda gerekçe arar. `::ornek` adımında `||` sonrası işlemin gerekçesidir;
   `?1.` biçimindeki adım öğrencinin önce düşünüp yazacağı gizli adımdır.
6. Gerçek soruyu kaynak görüntüsünden incele. Çözümü yazılmış örneği `::cikmis KOD tip=...`
   ile doğru bölümde bağla; `WORKED_EXAMS` kayıtları banka üretiminde elle incelenmiş
   eşleme olarak önceliklidir. `practiceIds` otomatik oluşur ve ustalık seçiminden çıkarılır.
7. Yeni içeriği aşağıdaki denetimlerden geçir. Bir dosyanın varlığı pedagojik doğrulama
   veya öğretmen onayı değildir; kimlik/biçim/hesap testleri bu sınırla raporlanır.

Varsayılan anlatım **L1 / Temelden**. L2 **Bağlantıları kur**, L3 **Derinleş**. Öğrencinin
önceden seçtiği düzey korunur. Bölüm üstündeki seçici düzeyi değiştirir, bölümdeki düzeyli kutuya
kaydırıp vurgular ve neyin değiştiğini yazar; keşifte L1 kelime açıklamasını, L3 “Bir adım ileri”
notunu açık getirir. Çözümlü örneklerin gerekçeleri düzeyden bağımsız hep görünür. İki yanlış
kontrol L1 önerisini, bölümdeki bütün kontrollerin doğru ve “Eminim” olması bir üst düzey önerisini açar. Ön testi atlayan
öğrenciye yapılmamış bir ön testle karşılaştırma gösterilmez. Bölüm tamamlama, doğru
cevap zorunluluğu yerine kontrol sorularına cevap verilmesini ister. Görsel keşif ve
rehberli gerçek örnekler ustalık/puan olayı üretmez.

## Kaynak görseli incelenmiş gerçek örnekler

Görsel yolu: `veri/resimler-pilot/kirpilmis/TYT/matematik/<kod>.webp`.
Görüntüdeki metin/şekil/seçenekler okunarak çözüm yazılmıştır; bağımsız öğretmen onayı yoktur.
İncelenen görüntünün SHA-256 değeri, değiştiğinde yeniden kontrol gerekip gerekmediğini gösterir.

| Kod | Ders / çözüm fikri | Hesap sonucu | Görsel SHA-256 |
|---|---|---|---|
| TYT-0541 | Rasyonel sayılar; parçanın parçası | D, 1/12 | `217d21de95eac8910085a1bf3a761be5b4856d39197cec4ba6195917c57aee1b` |
| TYT-0551 | Sayı basamakları; genişlik ve sıfır koşulu | A, 70 | `7a1effc66cf9ba1c12d9ffe84e19b2c8037420baa715c821089c25358c80783f` |
| TYT-0653 | Sayı basamakları; tuş konumu dönüşümü | D, 107 | `d144ea4708f67cccd81966349b98e75a33e26142d4be981c66be84843ec81d6e` |
| TYT-0662 | Yüzde; ortak bütünden kapasite | E, 13 kg | `d19e022a7bbb4939af4a8dc450c13a0ad2013eb0e963f95df1c00bf050675f7f` |
| TYT-0666 | Hareket; süre farkından yol | B, 75 km/sa | `769e8ec2c72d2896934b68b876673c8221136ca7079b7b0eb5b781eff22be99e` |
| TYT-0621 | Mutlak değer; orta noktalarla yakınlık | B, 5 | `302135a347dacda32a544be739f7286278347bbe523647e00f7099b4ce8d66b4` |
| AYT_Sayisal-0014 | Bölme; basamak açılımı ve bölme eşitliği | D, 11 | `4223c87a90dd86fc2f9e4a855d5684f6c90bb38f955cf0e821cb56d39e951209` |
| TYT-0593 | Bölünebilme; iki durum, 5/9/12 koşullarını birleştirme | A, 7 | `9e127ed9096c20e7c64d884dd2173d607bbce3d090cc7459ad346b1417482593` |

AYT_Sayisal-0014 görseli `veri/resimler-pilot/kirpilmis/AYT/matematik/` altındadır.
İki bölünebilme çözümü tüm rakam çiftlerinin bağımsız taramasıyla ve mevcut DB cevap
anahtarıyla karşılaştırılmıştır. TYT-0593'ün eski otomatik `bolme-algoritmasi` eşlemesi,
görsel inceleme sonucu `bilesik-kural` olarak düzeltilmiştir; banka betikle üretilir.

TYT-0541 önce temel kavramlar içinden açılmaya çalışılıyor ama başka ders bankasına ait
olduğundan görünmüyordu; rasyonel sayılardaki kesir bölümüne bağlandı. TYT-0653 otomatik
olarak oran/orantıya eşlenmişti; görsel okumayla sayı basamaklarına taşındı. Diğer otomatik
banka eşlemelerini bu altı örnekle aynı doğrulama seviyesinde kabul etme. Görsel okuma
kapsamını genişletirken her yeni sorunun kodu, konu, çözüm gerekçesi ve kaynak hash'ini koru.

## Tekrarlanabilir denetimler

```powershell
node --test testler/konu-ogrenme-icerik.test.mjs testler/konu-ogrenme-motor.test.mjs testler/konu-ogrenme-kesif.test.mjs testler/konu-ogrenme-bicim.test.mjs
```

İçerik/sayısal kontroller, keşif modellerinin bütün kontrol kombinasyonları, bilinen gerçek
soruların bağımsız hesapları ve örneklerin ustalık testinden çıkarılması denetlenir.

İzleyici `frontend/dist` klasörünü yeniden derleme sırasında değiştirebildiği için UI
denetimine ayrı paket üret; izleyiciyi kapatma ve gerçek DB'de test cevabı üretme:

```powershell
cd frontend
node node_modules/vite/bin/vite.js build --outDir ../veri/ui-denetim/konu-ogrenme-dist
cd ..
$env:IVME_TEST_DIST='D:\workspace\ivme\uygulama\veri\ui-denetim\konu-ogrenme-dist'
node testler/konu-ogrenme-ui.mjs --kesif
node testler/konu-ogrenme-ui.mjs --gercek-ornek
node testler/konu-ogrenme-ui.mjs rasyonel-sayilar
```

`--kesif`: bütün derslerin keşif, model kontrolleri, büyütme, gerekçeli örnek ve aktarım
denemesi; masaüstü ve mobil. `--gercek-ornek`: altı gerçek örneğin arayüzü, başlangıçta
cevabı saklama, sırayla çözüm açma, sonradan kısa yol, okunur görsel genişliği, alıştırma
bağı ve puan/deneme kaydı üretmeme; test görseli sahte API'dedir. Özgün görüntülerin
içerik okuması yukarıdaki hash kayıtlarıyla ayrıca yapılmıştır. Normal mod: bellekte sahte API ile ön test → bütün bölümler →
son test → tamamlanma → ustalık → diğer sayfalar. `--live`: yalnız okuma, servis edilen
sayfalarda gezinme. Ekranlar `veri/ui-denetim/konu-ogrenme/` altında. `IVME_TEST_DIST`
yalnız UI paketini seçer; gerçek kullanıcı verisini etkilemez.

Banka girdileri değişmişse `node scripts/konu-ogrenme-banka.mjs --rapor` ile kapsamı gör;
üretim gerekiyorsa `node scripts/konu-ogrenme-banka.mjs`. JSON'u elle düzeltme ve her
oturumda nedensiz yeniden üretme. Betik varsayılan eşlemelerde başlık/anahtar kelime kullanır;
bazı soru tiplerinde yeterli soru yoktur, bütün eşlemeler görsel olarak incelenmiş değildir.
Motorun mevcut yedek ders soruları ve eksik kapsam davranışı korunur.

Son aşama: `python scripts/ivme.py plan`, `python scripts/ivme.py kontrol`, yerel
izleyici/sunum kontrolü (`durum --hizli`, gerekirse `bekle`). Yerel commit yapılır; push ve
yeni dış dağıtım kullanıcı talimatı olmadan yapılmaz.

## Bölme ve bölünebilme pilotu

Kullanıcının seçtiği tek konu bu pilottur. Diğer matematik derslerine yayma kararı
kullanıcının örneği değerlendirmesinden sonra alınır. Sekiz bölümün kimlikleri
`s1, s1b, s2, s2b, s3, s3b, s4, s4b` şeklindedir. Eski dört bölüm kimliği ve mevcut
ön test/kontrol/havuz soru kimlikleri korunur. Yeni kontrol kimlikleri yalnız bu derse
aittir; öğrenci geçmişi silinmez. Dört oturum yaklaşık 35'er dakikalık planlama
tahminidir; öğrencinin örnekleri kendi hızında incelemesi beklenir.

Her bölümde konuya özgü üç düzeyli bir anlatım kutusu ve bir “Günlük hayattan sorgula” vardır
(minibüs, yumurta kolisi, artık yıl, fiş tutarı, kilometre sayacı, masa düzeni, fırın saati,
nöbet listesi). Sorgulamada öğrenci önce seçer; yanlış seçimde gerekçe hemen verilmez, başka
seçeneği düşünmesi veya gerekçeyi istemesi beklenir. Senaryo sayıları pilot testinde bağımsız hesaplanır.

Akış: somut ihtiyaç → terimler → neden → gerekçeli örnek → koşullu kısa yol →
eksik adımı tamamlama / bağımsız deneme → gerçek soru. Tasarım,
[IES öğretim rehberinin](https://ies.ed.gov/ncee/wwc/PracticeGuide/1) çözümlü örneklerle
alıştırmayı dönüşümlü sunma, somut ve soyut gösterimleri bağlama, görseli açıklamayla
birleştirme ve açıklayıcı sorular sorma önerilerinden yararlanır. Bunun bir öğrencide
ölçülmüş öğrenme başarısı veya bağımsız öğretmen onayı olduğu iddia edilmez.

Kapsam: 24 çözümlü örnek, 3 adım tamamlama, 4 etkileşimli keşif, 4 yeni kısa kontrol,
8 düzeyli anlatım, 8 günlük hayat sorgulaması, 2 gerçek sınav çözümü. İlk bölümdeki kutu modeli korunur; üç yeni model yalnız bu
derse bağlanır. 11'de tam bölünme/işaretli kalan ayrımı, aralarında asal olma koşulu,
bölmede kalanları doğrudan bölememe ve kuvvetlerde döngünün başlangıcı açıkça öğretilir.
Temel gerekçeler düzey seçiminin arkasına gizlenmez.

Okunan PDF kaynakları (arşiv değiştirilmez):

- `../Kaynaklar/ogm-materyal/Matematik/TYT-AYT Ortak/Konu Ozetleri 9. Sinif/09 - KALANLI BOLME - BOLUNEBILME KURALLARI - I.pdf`, sayfa 1: bölme şeması, temel kurallar, rakam/kalan örnekleri.
- Aynı klasörde `10 - BOLUNEBILME KURALLARI-II.pdf`, sayfa 1: aralarında asal çarpanlar, kalanların toplamı/çarpımı; soru 1 ve 2 pilotta gerekçeli çözülür.
- PDF metin katmanı okunaksız olduğundan iki sayfa görüntülenerek incelenmiştir.
  ÖSYM soruları özgün kırpım/görsel ve kodlarıyla gösterilir.

Yalnız pilotu denetlemek için:

```powershell
node --test testler/bolme-pilot.test.mjs
cd frontend
node node_modules/vite/bin/vite.js build --outDir ../veri/ui-denetim/bolme-pilot-dist
cd ..
$env:IVME_TEST_DIST='D:/workspace/ivme/uygulama/veri/ui-denetim/bolme-pilot-dist'
node testler/konu-ogrenme-ui.mjs --kesif bolme-bolunebilme
node testler/konu-ogrenme-ui.mjs --gercek-ornek bolme-bolunebilme
node testler/konu-ogrenme-ui.mjs bolme-bolunebilme
node testler/konu-ogrenme-ui.mjs --duzey bolme-bolunebilme
```

`--duzey`: her bölümde üstteki seçiciyle üç düzeyin metninin gerçekten değiştiğini, kutunun
görünür alana geldiğini, sorgulamada yanlış → yeniden dene → doğru → gerekçe → karşılaştırma
akışını ve düzey dışında olay kaydı oluşmadığını masaüstü/mobilde sınar.

`--kesif` artık seçilen dersin bütün bölüm keşiflerini sınar. İsteğe bağlı ders
parametresi, gerçek örnek denetimini de aynı derse sınırlar. Pilot testleri sayısal
modellerin bütün girişlerini, rakam örneklerinin tüm adaylarını, gerçek soruların
cevaplarını ve ustalık dışlama bağlarını kontrol eder. UI testi sahte API ile çalışır.
