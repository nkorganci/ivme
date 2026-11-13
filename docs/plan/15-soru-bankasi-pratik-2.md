# 15. Adım — MEBİ Soru Çöz & Pratik 2

**Durum: KISMI / doğrulanmış1.103 soru yayında; tam arşiv çalışması sürüyor.** Bu plan, yalnız `D:\workspace\mebi-yks` içindeki
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

**Tam arşiv uygulama kuralı:**557 kabul edilmiş soruda durulmaz. Henüz
çıkarıcısı uygulanmamış PDF düzenleri için bölüm/test/adım bağlamını koruyan
ayrı çıkarıcı hazırlanır; yalnız ilk anahtar sözcük eşleşmesinin başarısızlığı
kaynağın tamamını hatalı saydırmaz. Gerçek gövde/cevap/konu kusurları gerekçeli
inceleme kuyruğunda kalır. Tamamlanmış kanıt tekrar üretilmez; yeni düzen veya
yeni konu eşleştirme aşaması kendi sürümlü makbuzunu taşır.

**İkinci aktarım BITTI:** `expanded-chapter-evidence/chapter-packages.json`,34
basılı kaynak başlığını ana tablodaki mevcut konulara bağladı;546 ek sorunun
gövde/piksel/iki cevap/konu kontrolü tamamlandı. Geometri41 adayda incelemeye
ayrıldı; bunlar yeni546'nın dışındadır. Yerel görsel modelin gerçek E seçeneği
çıkarılmış6 negatif kontrolü6/6 PASS (`negative-calibration-v2/report.json`).
546 INSERT/0 UPDATE/0 hata, tekrar0 INSERT; katalog
`labels-v1-85fe6e011ef60045831b9c54`. `verified-source-batch-002/bank-acceptance.json`
PASS; önceki86.592 soru aynı. Toplam1.103/602TYT/501AYT, canlı masaüstü/mobil
sayaç ve9 örnek ders/görsel hash'i PASS. Öğretmen kararı üretilmedi.
`mebi_pratik2_arsiv_partisi.py` sonraki kabul manifestlerinde hazırlık→ön
izleme→atomik INSERT_ONLY→tekrar0→katalog→canlı kabulü sırayla yürütür.

**3 Adım düzeni:**16 kitapta konu×adım×A/B varyantı×soru kimliği korunan
11.969 native bağlama adayı (`three-step-discovery-v3/`) bulundu. Ana konu
eşlemesi ve ilk geometri kapılarıyla3.102 özgün gövde hazırlandı;741'inde
beş tekil seçenek/tam native satırlar/ortak bağlam ve grafik yokluğu mekanik
olarak kanıtlıdır. Diğerlerinde yerel görsel inceleme gerekir. Her iki yol da
ayrı basılı cevap satırının bağımsız görsel okumasını bekler; yayın değildir.
`three-step-crops/native-proof-v3.json`, `three-step-acceptance/` kanıtlarıdır.
Adım A/B ayrımı, eksik gövde ve grafik/altçizgi ayrımı4 regresyon testi PASS.
`mebi_pratik2_uc_adim_kabul.py`317 cevap grubunu bağımsız okur;12 grupluk
pilot11 uyuşma/1 inceleme verdi. Uyuşmayan grup yeniden çağrılmaz.3.102 gövde
için kaynak kabulü çalışıyor; `verified-source-batch-003` yürütücüsü sonucu
bekliyor ve ikinci parti kabulüne bağlı.1.103'te durulmaz.

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

**Durum: BITTI.** 4.816 kaynak tam SHA-256 ile doğrulandı; 631 soru dosyası adayı,
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

**Durum: KISMI.** Önceki 546 PDF taraması toplam 1.573 PDF'nin
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

Güncel tam keşif: `all-pdf-native-observations/report.json` bütün1.573 PDF/
27.614 sayfayı indeksledi;102.185 numaralı gövde işareti ve49.567 olası anahtar
hücresi ham gözlemdir, gerçek/tekil soru sayısı değildir. SQLite tekilleştirilmiş
`native_signals` katmanı bunları kaynak/sayfa/konumla aratır.1399 PDF'nin
numara/test/anahtar bağı çözümlenmediği için bu adım tam kabul değildir.

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

**Durum: KISMI / 557 soru kırpımının kabulü BITTI, tam arşiv açık.** 5.485 özgün sayfa görüntüsü
üretildi; bunlar tekil soru kırpımı veya doğrulanmış cevap kanıtı sayılmaz.
Test/bölüm eşlemesi ve kırpım bütünlüğü doğrulanmadan kabul yoktur.

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
okuması3.305/3.305 tamamlandı;557 gövdenin yerel görsel kontrolü de tamam.
Özgün PDF'den yeniden render edilen557 gövde/anahtar çifti kayıtlı pikselle
aynı; bu557 kabul edildi ve yayımlandı. Öğretmen onayı oluşturulmadı.

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

**Durum: KISMI / 557 kanıtlı paket BITTI.**557 soru30 kontrollü konuya ve
9 TYT/AYT-ders grubuna bağlandı.2.748 güncel adayın belirsizlik nedenleri ve
kanıtları `teacher-review-export/question-candidates.csv/json` içinde;
önceki4.354 kaynak kanıtı ayrı, bunlar tekil soru toplamı diye birleştirilmez.

1. Önce MEBİ katalog/klasör/PDF başlıklarını kullanarak TYT/AYT, ders, ünite
   ve konu kimliğini bağla.
2. Başlık yetmezse yerel görsel model yalnız aday konu önersin; kaynak kanıtı
olmayan öneri kabul edilmesin.
3. Her kabul edilmiş soru için değişmez paket oluştur: kaynak hash’i, gövde ve
anahtar görseli, cevap, ders/ünite/konu, kanıtlar ve `MEBI_PRACTICE_2` bankı.

**Kabul:** boş/uydurulmuş konu yok; eski Pratik kimlikleriyle birleşme veya
UPSERT yoktur.

### 15.05 — Temsilî pilot ve arayüz — BITTI

**Durum: BITTI / yalıtılmış pilot ve canlı kabul.** `MEBI_PRACTICE_2` banka
kimliği, `/pratik-2` yan menü rotası ve mevcut soru listesi/pratik bileşeni
eklendi. Varsayılan eski havuz yeni bankayı ancak açık seçimde içerir.
Ön yüz derlemesi PASS; `PracticeSourceSelectionTest,ExamTrackFlowTest` 7/7
PASS. Gerçek 21 soru görseli/cevabını kullanan `MebiPractice2PilotTest`
INSERT_ONLY/ikinci çalışma/geri alma/API denetimini yalnız geçici DB'de yapar.
Pilot sırasında yeni banka kaynak kodunun ortak SQL seçiminde çözülmediği
bulundu; `V101` eski SQL korumalarını tutarak MEBI2 kaynak eşlemesini ekler.
Geçici DB'de pilot testleri ve masaüstü/mobil görünüm geçti.

Yalıtılmış pilot alt kabulü **BITTI**: gerçek 21 sorunun INSERT_ONLY ilk
aktarımı/ikinci aktarım0/bozuk cevapta tüm parti reddi/transaction geri alma/
kategori API'si/eski havuz ayrımı birlikte sınandı; 9 backend testi PASS.
Masaüstü ve mobil UI PASS (`pilot-ui-report.json`). Ön yüz derlemesi PASS.
Kullanıcı yetkisiyle OPERATOR oluşturuldu; 21 pilot soru alındı ve katalog
`labels-v1-405c39f335571c60f5750250` sürümünde yayımlandı. API21 soruyu ve
kontrollü konu bağını döndürüyor. Canlı UI kabulü doğrudan `/pratik-2`
açılışında sunucu SPA yönlendirmesinin eksik olduğunu yakaladı; yönlendirme
eklendi. `MebiPractice2PilotTest` yeni doğrudan açılış testi dahil4/4 PASS
(yalnız geçici DB). Yerel izleyici19:28:11'de yayımladı; canlı masaüstü/mobil
pilot **BITTI / PASS**, cevap sızıntısı0/taşma0 (`pilot-live-read-report.json`).

1. Her TYT/AYT ders türünden küçük kanıtlı parti seç.
2. `Soru Çöz & Pratik 2` filtresini mevcut Pratik akışıyla aynı soru, cevap
kontrolü, konu filtresi ve görsel görünümüyle aç.
3. Test DB’sinde INSERT_ONLY, ikinci çalıştırma sıfır delta, hatalı cevabın tüm
partiyi geri alması ve öğrenci geçmişinin değişmemesini kanıtla.

**Kabul:** gerçek öğrenci DB’sine test yazılmaz; doğru cevap öğrenci API’sinde
ifşa edilmez.

### 15.06 — Kademeli tam aktarım

**Doğrulanmış557 soru alt aktarımı BITTI; arşiv geneli KISMI.** İlk21'e
ek536 soru6 atomik partide (en çok100 satır) 7,89 saniyede alındı:
536 INSERT/0 UPDATE/0 hata; ikinci ön izleme0 INSERT/536 SKIP.
Kanıt `verified-source-batch-001/import-result.json`,
`import-progress.jsonl`, `repeat-check-result.json`. Son536 katalog yayını
**BITTI**: `labels-v1-f7955944c50013201fc387f0`. 557 cevap/görsel/konu
eşleşti; eski86.035 soru fingerprint'i aynı. İlk canlı denetim30 kategori ve
9 ders/sınav grubunun HTTP görsel hash'lerini doğruladı. Ekran görüntüsünde
TYT/AYT kutularının0 göstermesi ayrıca yakalandı: ortak facet SQL'i
`MEBI_PRACTICE_2_AYT` yerine gerçek kaynak kodu `MEBI2_AYT` kullanacak şekilde
düzeltildi. Görünen557/261TYT/296AYT sayaçları için canlı kabul tekrarlandı;
önceki makbuzlar `*-before-facet-fix.json` adıyla korunur. Son canlı tekrar
**PASS / BITTI**:557 toplam/261TYT/296AYT masaüstü ve mobilde doğru.
`verified-source-batch-001/live-bank-read-report.json`, `bank-acceptance.json`.

1. Güncel banka snapshot’ı al; parti içi ve Pratik 2 içi tekrarları engelle.
2. Yalnız 15.04 kanıt paketlerini küçük atomik INSERT_ONLY partilerle aktar.
3. Her partide beklenen/gerçek soru, cevap, görsel ve konu ilişkisi deltalarını
karşılaştır; başarısız partiyi geri al.

**Kabul:** tekrar çalıştırma sıfır yeni kayıt üretir; dışlanan kayıtlar görünmez.

### 15.07 — Tam kapsama kapanışı

**Durum: KISMI.**4.816 dosyanın durumu `source-decision-matrix.json` ve
`review-index.sqlite3/source_decisions` içinde kayıtlı; sınıfsız dosya0.
Bu, tüm soruların çıkarıldığı anlamına gelmez:1.399 PDF düzen/anahtar bağı,
421 görsel inceleme sayfası ve diğer belirsiz kaynaklar açık inceleme
kuyruğundadır. Bilinen557 kabulün aktarımı/yayını %100; arşivin gerçek soru
toplamı ve genel tamamlanma yüzdesi henüz bilinmiyor. Tahmini süre yoktur.

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

Canlı doğrulanmış557 soru INSERT_ONLY aktarımı/yayını **BITTI**:
261TYT/296AYT,0 UPDATE/0 hata; tekrar0 INSERT.21 pilot ve536 ek soru
makbuzları `publication-preparation/`, `verified-source-batch-001/` içinde.
Canlı masaüstü/mobil, görünen sınav sayaçları ve557 veri eşitliği PASS;
eski86.035 sorunun fingerprint'i aynı. Tam arşiv kabulü açık kalır.

Bağımsız inceleme alt işi **BITTI**: 557 gövde model okuması tamamlandı;
`single-test-crops/technical-packages.json` 557 teknik kanıt paketini ve
2.748 kalan inceleme adayını içerir. Bu kayıtlar öğretmen onayı veya canlı
aktarım değildir. Tam DB yedeği de doğrulandı: 1.239.025.903 bayt / 558
restore-list girdisi (`publication-preparation/report.json`). Teknik paket
hazırlığı ve canlı kabul ayrı makbuzlardır; bütün plan hâlâ KISMI.

Özgün kaynak kabulü alt işi **BITTI**: 557 gövde ve 557 cevap kırpımı güncel
PDF'den yeniden render edilip kayıtlı görüntülerle piksel piksel eşleşti.
Basılı sınav/ders başlığı ve kontrollü konu kimliği de doğrulandı;
`single-test-crops/source-pixel-acceptance.json`:557 kabul/0 yeni hata.
Bu kabul öğretmen onayı değildir. 3.305 adayın diğer 2.748'i açık nedenlerle
`review-index.sqlite3/candidate_decisions` içinde tutulur; öğrenciye açılmaz.
557 kabulün tamamı aynı INSERT_ONLY hattıyla yayımlandı.

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
