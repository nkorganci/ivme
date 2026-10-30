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
| `content/explorations.js` | Mevcut 33 matematik dersi için özgün yaşam bağlamı, terimler, deney, gerekçeli örnek, aktarım sorusu, kısa yol, tuzak ve ileri açıklama |
| `lesson/models.js` | 33 dersin sınırlı, deterministik sayısal modelleri ve kontrol aralıkları; `eval` yok |
| `lesson/Exploration.jsx` | Görerek anla → birlikte çöz → kendin dene akışı; deneme puanlanmaz |
| `lesson/learning-experience.css` | Okunur ders yüzeyi, bölüm yolu, mobil düzen, model ve büyük görsel görünümü |
| `lesson/Blocks.jsx` | Ortak ders blokları; çözümlü örnekler sırayla açılır, gerekçeleri görünür |
| `lesson/FigureZoom.jsx` | Klavye/Escape ile kapanan büyük görsel penceresi |
| `content/worked-exams.js` | Özgün görselleri okunmuş altı gerçek sınav sorusunun açıklamalı çözümü ve koşullu kısa yolu |
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
3. `MODEL_CONTROLS` ve `calculateModel` kaydı yaz. Genel bir grafik her konuya zorla
   uygulanmaz: kesirde eş parça; denklemde denge; kökte alan; harekette kapanan mesafe;
   koşullu olasılıkta daralan örnek uzay gibi kavramın kendisini temsil et.
4. Modelde bütün kontrol değerleri için metin, sayı ve şekil tutarlı olsun. Klavye,
   dar ekran, alternatif açıklama ve hareket azaltma tercihini destekle. Büyütme
   penceresi dar ekranda yatay kaydırılabilir; sayfanın kendisi taşmamalı.
5. `::duzey` L1/L2/L3, `::ornek`, `::tamamla`, `::strateji`, `::yanilgi` ve kontrol
   sorularını ilgili bölümde kullan. `::ornek` adımında `||` sonrası işlemin gerekçesidir;
   `?1.` biçimindeki adım öğrencinin önce düşünüp yazacağı gizli adımdır.
6. Gerçek soruyu kaynak görüntüsünden incele. Çözümü yazılmış örneği `::cikmis KOD tip=...`
   ile doğru bölümde bağla; `WORKED_EXAMS` kayıtları banka üretiminde elle incelenmiş
   eşleme olarak önceliklidir. `practiceIds` otomatik oluşur ve ustalık seçiminden çıkarılır.
7. Yeni içeriği aşağıdaki denetimlerden geçir. Bir dosyanın varlığı pedagojik doğrulama
   veya öğretmen onayı değildir; kimlik/biçim/hesap testleri bu sınırla raporlanır.

Varsayılan anlatım **L1 / Temelden**. L2 **Bağlantıları kur**, L3 **Derinleş**. Öğrencinin
önceden seçtiği düzey korunur. İki yanlış kontrol L1 önerisini açar. Ön testi atlayan
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

TYT-0541 önce temel kavramlar içinden açılmaya çalışılıyor ama başka ders bankasına ait
olduğundan görünmüyordu; rasyonel sayılardaki kesir bölümüne bağlandı. TYT-0653 otomatik
olarak oran/orantıya eşlenmişti; görsel okumayla sayı basamaklarına taşındı. Diğer otomatik
banka eşlemelerini bu altı örnekle aynı doğrulama seviyesinde kabul etme. Görsel okuma
kapsamını genişletirken her yeni sorunun kodu, konu, çözüm gerekçesi ve kaynak hash'ini koru.

## Tekrarlanabilir denetimler

```powershell
node --test testler/konu-ogrenme-icerik.test.mjs testler/konu-ogrenme-motor.test.mjs testler/konu-ogrenme-kesif.test.mjs
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
