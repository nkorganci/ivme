# 15. Adım — MEBİ Soru Çöz & Pratik 2

**Durum: SURUYOR / 15.02 yeniden açıldı.** Bu plan, yalnız `D:\workspace\mebi-yks` içindeki
kaynaklardan ikinci, bağımsız soru bankasını üretir. Dosyanın yazılması aktarım
yetkisi veya tamamlanma anlamına gelmez.

## Genel yürütme kuralı — tamamlanana kadar devam

Kullanıcı bu planın 15.01–15.07 zincirini uygulamayı yetkilendirdi. Her alt
parti sonunda tekrar “devam et” talimatı beklenmez; kabul kapıları geçtikçe
sonraki işe aynı çalışma içinde devam edilir. Ara raporlar commentary'de ve
kanıt dosyalarında tutulur. Final yanıt yalnız plan tamamlandığında, kullanıcı
durdurduğunda veya yeni kullanıcı kararı/yetkisi gerektiren somut engelde
verilir. Bir arka plan işleminin çalışması, sonraki aşamaların otomatik
yapıldığı anlamına gelmez. Her adım gerçek kabulü geçince başlığı/durumu
`— BITTI`, 15.01–15.07 bütünü geçince bu planın ana başlığı da `— BITTI`
olarak güncellenir. Pilot veya yalnız teknik keşif tam kabul sayılmaz.

## Amaç ve sınır

Hedef, yan menüde mevcut **Soru Çöz & Pratik** yanında görünen **Soru Çöz &
Pratik 2** bankasıdır. Aynı soru iki bankada bulunabilir. Bu bankadaki her
görünen soru; özgün soru görseli, resmî cevabı, cevap kanıtı, TYT/AYT-ders-
ünite-konu bağı ve kaynak konumuyla birlikte saklanır.

Mevcut soru bankası, soru kimlikleri, öğrenci/öğretmen geçmişi ve
`D:\workspace\ivme\Kaynaklar\` arşivi değiştirilmez. Pratik 2 yalnız
`MEBI_PRACTICE_2` bankı altında INSERT_ONLY kayıtlar oluşturur.

**Kabul kuralı:** soru gövdesi + resmî cevap + cevap anahtarı kanıtı + özgün
kaynak/sayfa + en az bir TYT/AYT konu kimliği birlikte yoksa kayıt
`EXCLUDE_NO_RETRY` olur. Model cevabı resmî cevap yerine geçmez. Belirsiz,
bozuk veya cevapsız içerik öğrenciye görünmez; onarım, tekrar OCR veya yeniden
model çağrısı yapılmaz.

**Karar kuyruğu zorunluluğu:** Hiçbir soru sessizce kaybolmaz. Kabul edilmeyen
her soru adayı `MEBI_PRACTICE_2_REVIEW_QUEUE` altında tekil bir kayıt alır:
kaynak hash’i/yolu, sayfa-kırpım, varsa okunan cevap, aday ders-konu, karar
durumu ve neden. Durumlar `CEVAP_YOK`, `CEVAP_UYUSMUYOR`, `GOVDE_EKSIK`,
`NUMARA_BELIRSIZ`, `KONU_BELIRSIZ`, `KAYNAK_BOZUK` ve `INSAN_INCELEMESI`
olabilir. Bu kuyruk öğrenci/pratik API’sinde görünmez; ileride yalnız özgün
kanıt, ikinci bir AI incelemesi veya öğretmen kararıyla yeniden değerlendirilir.
Öğretmen veya AI kararı resmî cevap kanıtı olmadan yayına dönüştürmez.

## Çalışma sırası

### 15.01 — Salt-okunur kaynak envanteri

**Durum: BITTI.** 4.816 kaynak tam SHA-256 ile doğrulandı; 631 soru adayı,
14 cevap anahtarı adayı ve 2.068 öğrenciye kapalı karar kuyruğu kaydı üretildi.
Kanıt: `veri/mebi-pratik-2/20261111-source-inventory/`.

1. `D:\workspace\mebi-yks` altındaki PDF, HTML, görsel, video, ses, ZIP ve
   cevap/çözüm dosyalarını tam yol, SHA-256, bayt, tür ve sayfa sayısıyla kaydet.
2. MEBİ klasör/katalog başlığından TYT/AYT, ders, ünite ve konu adaylarını çıkar.
3. Her kaynak için `SoruGövdesi`, `CevapAnahtarı`, `İkisiBirlikte`,
   `Cevapsız` veya `KapsamDışı` durumunu ver.
4. Soru barındırma ihtimali olup da ilk sınıflamada kabul edilmeyen her dosyayı
   karar kuyruğuna neden koduyla yaz.

**Kabul:** tüm dosyalar tek kez sayılmış; dışarıdaki hiçbir kök taranmamış;
hiçbir dosya taşınmamış/silinmemiştir.

### 15.02 — Sayfa ve cevap kapsama matrisi

**Durum: YENIDEN_ACILDI.** Önceki 546 PDF taraması toplam 1.573 PDF'nin
1.027'sini kapsamıyordu. 14.688 bağlama adayı ve 122.081 kuyruk gözlemi ham
işaretlerdir; soru sayısı veya doğrulanmış cevap çelişkisi sayılmaz. Belge
benzerliği ile eşlenen anahtarlar ve farklı testlerde tekrarlanan numaralar
kabul kanıtı değildir. `mebi_pratik2_tam_pdf_tarama.py` bütün PDF'lerde özgün
satır/koordinat önbelleği oluşturur; ardından test/bölüm ve anahtar geometrisi
doğrulanır. ZIP/HTML kapsamı da kapanmadan bu adım BITTI olmaz.

Tam PDF metin/koordinat taraması tamam: **1.573 PDF / 27.614 sayfa**;
421 sayfa görsel okuma gerektiriyor. ZIP/HTML içerik keşfi de tamam:
**78 ZIP / 1.048 HTML** güvenli biçimde okundu; 4.817 oturum gerektiren quiz
bağlantısı soru gövdesi yerelde bulunmadığı için ayrı karar kaydı aldı.
Kanıt `full-pdf-coverage.json`, `package-content-report.json`,
`package-content/`. Bu kayıtlar soru veya cevap kabulü değildir; sıradaki
iş test/bölüm kimliğiyle anahtar eşleme ve tekil gövde sınırıdır.

Tek-test bağlama alt işi: `single-test-bindings.json` içinde aynı kaynakta
tek test kimliği, kesintisiz ve tekil gövde/anahtar numaraları eşleşen
174 PDF / 3.305 aday var. Bunlar piksel ve konu kabulü bekler. Çoklu test,
tekrar eden numara veya farklı gövde/anahtar kümeleri otomatik kabul edilmez.
`testler/mebi-pratik2-binding-test.py` dört regresyon testi PASS.

1. PDF gömülü metnini al; gerekirse yalnız yerel OCR ile sayfa görüntüsü üret.
2. Her sayfayı soru gövdesi, anahtar, ikisi veya hiçbiri olarak işaretle.
3. Test/deneme ile anahtarın aynı belge/kitapçık/sürüm olduğuna dair bağ kur.
4. Sayfa ve dosya işleme imlecini kaydet; hiç taranmayan sayfa kalmadığını ölç.
5. Her belirsiz sayfa/soru adayını görünmeyen karar kuyruğunda kırpım ve neden
   koduyla tut.

**Kabul:** her kabul edilmiş cevap, özgün anahtar sayfası ve basılı/kanıtlı
soru numarasıyla bağlıdır.

### 15.03 — Özgün soru ve cevap kırpımları

**Durum: KISMI / 15.02 kabulü bekleniyor.** 5.485 özgün sayfa görüntüsü
üretildi; bunlar tekil soru kırpımı veya doğrulanmış cevap kanıtı sayılmaz.
Test/bölüm eşlemesi ve kırpım bütünlüğü doğrulanmadan kabul yoktur.

İlk tek-test pilotunda 21 özgün soru/anahtar PNG çifti hazır:
`single-test-crop-pilot/manifest.json`. Biyoloji AYT Tarama-7 soru1 ve
basılı 1.C anahtarı doğrudan görsel okundu; bu yalnız iki görüntünün
kontrolüdür, diğer 20 soru veya 3.305 aday için toplu kabul değildir.

Son pilot görsel incelemesi tamam: 21 gövde ve 21 basılı anahtar kırpımı
doğrudan okundu; görünür kesilme yok. Bağımsız ajan anahtar dizisi
`C D A A A C E D E A B B B A D B E D E C E` kayıtlı. Ana tablo kategori bağı
`excel.ayt.biyoloji.03fef08f029e99373ac8` ile
`single-test-crop-pilot/reviewed-package.json` hazır. Bu yalnız 21 soruluk
pilot kaynak paketidir; tam arşiv veya DB aktarımı kabulü değildir.

Pilot bağımsız yerel görsel okuması da **21/21 PASS**:
`single-test-crop-pilot/second-reading/report.json`. 174 belgedeki 3.305
aday için 6.610 kırpım hazır (`single-test-crops/manifest.json`). Geometri
denetimi 3.210 adayda kesilen native satır bulmadı ve beş tekil seçenek gördü;
95 aday incelemede. Bu geometrik kontrol şekil/konu kabulü değildir.
30 belge için basılı ilk sayfa başlığı kontrollü konu adıyla tam eşleşti;
144 belge konu incelemesinde (`topic-candidates.json`). Bağımsız yerel anahtar
okuması `mebi_pratik2_pilot_ikinci_okuma.py --full` ile sürer; 5 dakika veya
%10 ilerlemede `single-test-crops/second-reading/progress.jsonl` güncellenir.

Önceki YKS kaynak kanıtları yeniden üretim yerine uzlaştırıldı:
`prior-source-proof-reuse.json` içinde güncel MEBİ gövde/anahtar dosyaları ve
özgün kırpım/piksel kanıtı hash'leri eşleşen **4.354** kaynak adayı var;
MEBİ dışı 29 kayıt bu bankanın dışında tutuldu. Yeni bankada yenilik/eskide
bulunmama şartı yoktur; eski alım kararları taşınmaz, konu kabulü hâlâ gerekir.

1. Her soru için tam gövdeyi; şekil, tablo ve devam metnini kesmeden görüntüle.
2. Ayrı cevap anahtarı kırpımı, PDF hash’i, fiziksel sayfa, koordinat ve
   numara kaydını üret.
3. Görsel hash’i ile kaynağın aynı pikselden türetildiğini doğrula.

**Kabul:** kırpım satır/şekil kesmiyor; cevap kırpımı aynı testin anahtarından
geliyor; bütün başarısız gövdeler dışlanıyor.

### 15.04 — Konu kimliği ve paketleme

1. Önce MEBİ katalog/klasör/PDF başlıklarını kullanarak TYT/AYT, ders, ünite
   ve konu kimliğini bağla.
2. Başlık yetmezse yerel görsel model yalnız aday konu önersin; kaynak kanıtı
olmayan öneri kabul edilmesin.
3. Her kabul edilmiş soru için değişmez paket oluştur: kaynak hash’i, gövde ve
anahtar görseli, cevap, ders/ünite/konu, kanıtlar ve `MEBI_PRACTICE_2` bankı.

**Kabul:** boş/uydurulmuş konu yok; eski Pratik kimlikleriyle birleşme veya
UPSERT yoktur.

### 15.05 — Temsilî pilot ve arayüz

**Durum: KISMI / yalıtılmış pilot doğrulaması.** `MEBI_PRACTICE_2` banka
kimliği, `/pratik-2` yan menü rotası ve mevcut soru listesi/pratik bileşeni
eklendi. Varsayılan eski havuz yeni bankayı ancak açık seçimde içerir.
Ön yüz derlemesi PASS; `PracticeSourceSelectionTest,ExamTrackFlowTest` 7/7
PASS. Gerçek 21 soru görseli/cevabını kullanan `MebiPractice2PilotTest`
INSERT_ONLY/ikinci çalışma/geri alma/API denetimini yalnız geçici DB'de yapar.
Pilot sırasında yeni banka kaynak kodunun ortak SQL seçiminde çözülmediği
bulundu; `V101` eski SQL korumalarını tutarak MEBI2 kaynak eşlemesini ekler.
Tam 15.05 kabulü bu testin ve masaüstü/mobil görünümün geçmesine bağlıdır.

Yalıtılmış pilot alt kabulü **BITTI**: gerçek 21 sorunun INSERT_ONLY ilk
aktarımı/ikinci aktarım0/bozuk cevapta tüm parti reddi/transaction geri alma/
kategori API'si/eski havuz ayrımı birlikte sınandı; 9 backend testi PASS.
Masaüstü ve mobil UI PASS (`pilot-ui-report.json`). Ön yüz derlemesi PASS.
Kullanıcı yetkisiyle OPERATOR oluşturuldu; 21 pilot soru alındı ve katalog
`labels-v1-405c39f335571c60f5750250` sürümünde yayımlandı. API21 soruyu ve
kontrollü konu bağını döndürüyor. Canlı UI kabulü doğrudan `/pratik-2`
açılışında sunucu SPA yönlendirmesinin eksik olduğunu yakaladı; yönlendirme
eklendi. `MebiPractice2PilotTest` yeni doğrudan açılış testi dahil4/4 PASS
(yalnız geçici DB). Yeni yerel sürüm ve canlı UI tekrarı geçmeden536 soruluk
sonraki parti başlatılmaz.

1. Her TYT/AYT ders türünden küçük kanıtlı parti seç.
2. `Soru Çöz & Pratik 2` filtresini mevcut Pratik akışıyla aynı soru, cevap
kontrolü, konu filtresi ve görsel görünümüyle aç.
3. Test DB’sinde INSERT_ONLY, ikinci çalıştırma sıfır delta, hatalı cevabın tüm
partiyi geri alması ve öğrenci geçmişinin değişmemesini kanıtla.

**Kabul:** gerçek öğrenci DB’sine test yazılmaz; doğru cevap öğrenci API’sinde
ifşa edilmez.

### 15.06 — Kademeli tam aktarım

1. Güncel banka snapshot’ı al; parti içi ve Pratik 2 içi tekrarları engelle.
2. Yalnız 15.04 kanıt paketlerini küçük atomik INSERT_ONLY partilerle aktar.
3. Her partide beklenen/gerçek soru, cevap, görsel ve konu ilişkisi deltalarını
karşılaştır; başarısız partiyi geri al.

**Kabul:** tekrar çalıştırma sıfır yeni kayıt üretir; dışlanan kayıtlar görünmez.

### 15.07 — Tam kapsama kapanışı

1. Kaynak envanterindeki her dosyayı `aktarılmış`, `cevapsız`, `belirsiz`,
`bozuk` veya `kapsam dışı` sonucu ile kapat.
2. Soru/cevap/kırpım/kategori sayıları ve dışlama nedenleri yayın raporunda yer
alsın.
3. Arayüz, filtre, pratik havuzu, kaynak erişimi ve öğrenci geçmişi tekrar
doğrulansın.

**Kabul:** işlenmemiş dosya/sayfa kalmaz. “Cevabı olan bütün sorular” hedefi,
bu kapsam matrisiyle ölçülür; kanıtı eksik olanlar sayılır, karar kuyruğunda
görünür biçimde tutulur ama yayımlanmaz.

## Model ve maliyet politikası

Güncel erişim kararı: kullanıcı, mevcut hesap yoksa bu iş için operatör
oluşturulmasını açıkça yetkilendirdi. `ivmeoperator` yalnız OPERATOR rolüyle
oluşturuldu; mevcut kullanıcı rolleri değişmedi. Rastgele parola yayımlanmadı
ve düz metin saklanmadı; yerel giriş uygulamanın dev loopback yolunu kullanır.
`local-operator-created.json` ve kullanıcı kayıt denetimi oluşturma kanıtıdır.

Canlı 21 soruluk pilot INSERT_ONLY aktarımı **BITTI**:21 INSERT/0 UPDATE;
ikinci ön izleme0 INSERT/0 UPDATE/21 SKIP. Kanıtlar
`publication-preparation/import-result.json`, `repeat-check-result.json`.
Bu soruların sürümlü katalog yayını **BITTI**; eski kayıtların içerik
özetleri aynı kaldı (`publication-preparation/publication-result.json`).
Canlı görünüm kontrolü geçmeden canlı pilot kabulü BITTI sayılmaz.
557 teknik adayın tamamı henüz yayımlanmadı.

Bağımsız inceleme alt işi **BITTI**: 557 gövde model okuması tamamlandı;
`single-test-crops/technical-packages.json` 557 teknik kanıt paketini ve
2.748 kalan inceleme adayını içerir. Bu kayıtlar öğretmen onayı veya canlı
aktarım değildir. Tam DB yedeği de doğrulandı: 1.239.025.903 bayt / 558
restore-list girdisi (`publication-preparation/report.json`). Canlı soru
aktarımı önceki ölçümde0 idi; güncel ölçüm yukarıdaki 21 INSERT'tir. Bütün
plan hâlâ KISMI.

Özgün kaynak kabulü alt işi **BITTI**: 557 gövde ve 557 cevap kırpımı güncel
PDF'den yeniden render edilip kayıtlı görüntülerle piksel piksel eşleşti.
Basılı sınav/ders başlığı ve kontrollü konu kimliği de doğrulandı;
`single-test-crops/source-pixel-acceptance.json`:557 kabul/0 yeni hata.
Bu kabul öğretmen onayı değildir. 3.305 adayın diğer 2.748'i açık nedenlerle
`review-index.sqlite3/candidate_decisions` içinde tutulur; öğrenciye açılmaz.
Pilot21 katalog yayını tamamlanınca kalan536 aynı INSERT_ONLY hattına girer.

Yayın performans bulgusu: yeni snapshot henüz istatistik taşımadığından
EXISTS denetimi yaklaşık90bin×90bin iç içe karşılaştırma seçti. İki
tamamlanmamış transaction geri alındı; eski canlı pointer ve21 soru korundu.
Güncel yayın, indeksli/ANALYZE edilmiş geçici içerik özetlerini COUNT ile
karşılaştırır; kanıt `publication-preparation/nested-loop-retry.json`.
Bu işlem uygulama hizmetinin durdurulması veya soru silinmesi değildir.

| İş | Araç/model | Kural |
|---|---|---|
| Envanter, hash, sayfa sayımı, MEBİ yol başlığı | Python; model yok | Deterministik ve tekrar çalıştırılabilir |
| Metin PDF | Gömülü metin, gerekirse yerel OCR | OCR tek başına cevap kanıtı değildir |
| Görsel/kırpım | PDF render + koordinat denetimi | Model görüntü üretmez/değiştirmez |
| Numaralı cevap anahtarı | OCR + kural denetimi | Uyuşmazlık doğrudan dışlanır |
| Karmaşık iki sütun/şekil sayfası | Ollama’daki en iyi görsel model | Yalnız aday okuma; özgün piksel kanıtı şart |
| Zor konu sınıflaması | Önce MEBİ başlığı, sonra yerel model | Kanıtsız model sonucu kabul edilmez |
| Az sayıda ihtilaflı örnek | ChatGPT görsel/mantık incelemesi | Toplu OCR için kullanılmaz; ikinci görüş olarak kalır |

ChatGPT kullanılacaksa en güçlü görsel akıl yürütme modeli yalnız karmaşık
örneklerin ikinci incelemesinde seçilir; toplu işlem yerel araçlarla yapılır.
OpenAI’nin güncel model açıklamalarında görsel akıl yürütme için Terra, daha
ağır incelemeler için Sol/Astra konumlanır. API/ChatGPT çıktısı hiçbir zaman
resmî cevap anahtarının yerine geçmez.

## Kanıt dizini ve durum güncellemesi

Tüm geçici/kalıcı kanıtlar `uygulama/veri/mebi-pratik-2/<run-id>/` altında
tutulur. Her alt adım; girdi hash’i, imleç, dışlama sayıları ve doğrulama
çıktısıyla devam edebilir olmalıdır.

- Her önemli parti sonunda `docs/gorev-durumu.md` güncellenir.
- Karar kuyruğu ayrı manifest, sayaç ve neden dağılımıyla güncellenir; kabul
  dışı hiçbir aday yalnız logda veya kayıtsız kalmaz.
- Açık kalan tek somut iş `docs/devam.md` içine yazılır.
- Bir alt adımın tüm kabul koşulları geçerse başlığına `— BITTI` eklenir.
- 15.01–15.07 tamamı geçince bu belgenin başlığı **`— BITTI`** olur ve görev
  tablosuna `TAMAMLANDI — BITTI` kanıt yolu ile yazılır.
- Pilot, model çıktısı veya yalnız dosya varlığı BITTI sayılmaz.
