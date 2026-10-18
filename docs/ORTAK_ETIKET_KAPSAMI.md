# Ortak kaynak etiketleri — 14 Ekim 2026


> Güncel yapılacaklar yalnız [numaralı planda](plan/00_YOL_HARITASI.md), devam noktası [çalışma bağlamında](plan/00_CALISMA_BAGLAMI.md) tutulur. Bu belgedeki tarihli sonuçlar teknik kanıttır; uygulama sırası değildir.

PostgreSQL `learning_catalog.current_run` geçerli etiket sürümünü seçer. `current_categories`,
`current_items` ve `current_assignments` aynı sürümün konu kimliklerini ve kaynak bağlantılarını
sunar. `source_audits` fiziksel dosya denetimini ve müfredat referanslarının etiketlerini saklar.

API/öğretmen ekranı kategori tanımı ve PDF dahil makine etiketlerinde yalnız bu
DB sürümünü kullanır. Paketlenmiş katalog/sözlük dosyaları üretim ve özgün kaynak
kanıtıdır; çalışma anında DB adını/etiketini ezemez. Yeni soru başlığı sorgu
sırasında kategori kimliği üretmez. Kaynak/takip bağı `current_assignments` ile
sınanır; tarihsel ilişki yeni bağa yetmez. Çok sorgulu kaynak/öğretmen okumaları
tek `REPEATABLE_READ` anlık kaydında yapılır. Müfredat satırlarının görünen adı
aynı API metadatasından gelir; yerel yerleşim dosyası kayıtlı kimliği değiştirmez.
Öğretmenin kararları `content_reviews` / `content_review_history` içindedir; güncel kaynağa ve
kategori tanımına uyan karar, öğrenci filtresinde otomatik önerinin önüne geçer.

Kontrollü kategori tanımlarının tek bakım kaynağı
`backend/src/main/resources/content-taxonomy.json` dosyasıdır. İlk aktarım yayımlanmış
4.733 kimliği, 27 dinamik eski kaynak kimliğini ve genel/inceleme kapsamlarını korur;
4.766 tanım içerir. `scripts/content-taxonomy.mjs` ortak alias, kapsam ve ağaç
doğrulayıcısıdır; üreticiler kayıtlı olmayan yeni kimliği reddeder. `review-vocabulary.json`
konudan bağımsız zorluk/beceri/sınıf/içerik türü boyutlarını korur. Benzer başlıklar
otomatik kategori birleşmesi değildir. 19 `EXAM_COUNTERPART` ilişkisi TYT/AYT
kimliklerini birleştirmeden karşılıklarını gösterir.

Başlık düzeltmesinde aynı `id` tutulur, eski görünen terim `aliases` alanına eklenir.
Birleşme için açık `redirects` kaydı, öğretmen kararı ve ilerleme taşıma etkisi gerekir;
ilk aktarım hiçbir kimliği birleştirmez. Eski arşivdeki branş/başlık çelişkileri kimlikleriyle
inceleme raporunda kalır. `system.kapsam-incelemesi` başarı hesabından hariçtir;
dersi bilinen geçici ilişki `Dersin genel kapsamı`, düşük güven ve neden taşır.
`PRIMARY` doğrudan konu (birden fazla olabilir), `SECONDARY` eşlik eden içerik,
`PREREQUISITE` ön bilgidir. Üst konu sorgu genişlemesidir; sayım tekil `itemKey` kullanır.

`node scripts/content-taxonomy-check.mjs --project` yalnız küçük ön yüz kimlik/ad
projeksiyonunu üretir; tam sözlük tarayıcı paketine alınmaz. Normal denetim ve
`--check` eski kimlikleri/ağacı kontrol edip
`veri/content-labels/taxonomy/<taxonomyVersion>.json` kanıtını üretir.
`frontend/src/curriculum.js` kaydedilmiş kimlikleri bu projeksiyondan çözer;
grup düzeni mevcut müfredatta kalır. Build ve etiket üretim hattı projeksiyonu kullanır.

Ortak kaynak sözleşmesi [learning-resource-v2 şemasında](plan/sema/learning-resource-v2.schema.json)
ve [temsili örneklerde](plan/sema/learning-resource-v2.ornek.json) tanımlıdır.
`scripts/learning-resource-contract.mjs` üretim sırasında her kaydı doğrular;
`scripts/learning-resource-check.mjs` bütün aday sürümü yayın öncesi kontrol eder.
V38'in dört kolonlu ilişki kimlik indeksi korunur. Konuya özel kanıt/konum/güven
aynı sürümlü `items.data.automaticLabels.assignments` içinde saklanır;
V42'nin `current_relation_details` görünümü bu alanları SQL sorgularına açar.
Paralel katalog veya kayıp geçmiş oluşturulmaz.

`relationKey` kaynak–kategori çiftinin kalıcı kimliğidir; `sourceVersion` ve
`categoryFingerprint` sürümü ayırır. Her ilişki aday/kesin kapsam, gerekçeli
`LOW/MEDIUM/HIGH` güven, kaynak sürümlü kanıt, konum durumu ve ayrı inceleme taşır.
`ITEM_ONLY` eski kaynak kanıtıdır; konuya özgü `RELATION` kanıtı veya içerik okuması
sayılmaz. `readability=NOT_MEASURED` OCR kalitesi iddiası değildir. Soru kodu/not
bölümünün `VERIFIED` olması destek PDF'sinin veya konu etiketinin öğretmen onayı değildir.
Üretilen bütün incelemeler `PENDING` kalır; gerçek öğretmen kararları mevcut
`content_reviews/content_review_history` akışında ayrı korunur.

PDF aralıkları fiziksel, 1 tabanlı ve iki ucu dahil; video aralıkları başlangıç dahil,
bitiş hariç saniyelerdir. Doğrulayıcı PDF sayfa sayısını ve video süresini aşan aralığı,
boş ana etiketi, yanlış konum durumunu ve kaynağı/kategorisi değişmiş onayı reddeder.
Kesintili aralıklar ayrı kaydedilir; bilinmeyen aralık `MISSING` ve neden taşır.
`legacyNoteReference`/`legacyHintReference` v1 not/ipucu kaynaklarını yeni alanlara
eşler; orijinal v1 şemalar değişmez. Uyarlanan PDF konumu kabulden önce gerçek
katalogdan `pageCount` ile tamamlanmalıdır; v1 not bölümünü destek sayfasıyla karıştırmaz.

`originalTitle/originalFilename` korunur, `displayTitle` kontrollü kategorilerden
üretilir. `frontend/src/resourceMetadata.js` zaman/sayfa gösterimi ve derin bağlantı
kuralını paylaşır. Öğrenci API'si görünen adı etkin öğretmen etiketleriyle yeniden
hesaplar; yalnız güven/konum gösterimi için gereken ilişki alanlarını açar. İç kanıt
metni, dosya yolu, cevap ve öğretmen kimliği öğrenci kaydına eklenmez.

`scripts/plan-check.py` açık görev kimliklerini, adım numarası/başlığını, devam
noktasını, somut sözlük/kanıt yollarını ve yerel Markdown bağlantılarını kontrol eder.
`veri/content-labels/plan-check.json` sonucu tutar; iş/insan onayı kararı vermez.
`testler/plan-check-test.py` kapanmış göreve devam, silinmiş belge bağlantısı ve
yinelenen kimlik hatalarını bağımsız küçük planlarla doğrular.

16 Ekim v2 üretimi soru kaydını değiştirmeden 54.225 korunmuş PDF sayfa bağını ve
49 notun 150 destek sayfası referansını aktarır. PDF sayfa çıkarımı 59.586 sayfada
metin katmanını kontrol eder; metin ve OCR birlikte 878 ilişkiye gözlenen başlık sayfalarını
tahmini aralık olarak ekler. Tam anlatım aralığı veya içerik onayı iddia edilmez.
3.464 sayfanın yerel Türkçe OCR'ı tamamlandı; önbellek kontrolünde yeni OCR çağrısı
sıfır, 1.108 sayfa okunamayan/boş adayıdır. OCR çıktısı içerik veya formül onayı
değildir. Sayfa önbelleği kaynak hash'i, sayfa, çıkarıcı ve OCR model hash'ine
bağlıdır. PDF 2088'in özgün OGM URL'si tekrar HTTP 404 verdi;
yerine başka belge konmadı, `external-source-check.json` kanıtı korur.

Video üretimi fizik listesiyle sınırlı değildir. OGM'nin PDF/video referansları
aynı sağlayıcı kimliğinde birleştirilir; 640 tekil video ve 5 oynatma listesi
645 VIDEO kaydına bağlanır. Eski fizik kayıt kimlikleri korunur. 16 Ekim yeniden
denemesiyle 640 videonun süreleri alındı; 26 videoda açıklama bölümü ve 639 videoda
altyazı izi var. Önceki 273 HTTP 429 çözüldü; eski metadata hash'li geçmişte
korunur. Altyazı izi zamanlı metnin okunması sayılmaz. Oynatma listesine tek video süresi verilmez.
Öğrenci erişim filtresi doğrulanamayan kaynağı açıldığı kesinmiş gibi saymaz;
kaynak bağlantısı kullanıcının kendisinin denemesi için korunur.

`question-label-check.py` soru girdi sürümünü, 22 branş arşivinin 23 JSON
projeksiyonunu, eski araştırma kanıtlarını ve 425 not–asıl soru referansını
salt okunur denetler. Soru konumu basılı numarayı, ham kayıt ve görsel referansını
korur. Konu ilişkisine yalnız ilgili kanıt bağlanır; karma kartın bir soru parçası
diğer bütün etiketlere kanıt olarak kopyalanmaz. Önceki model etiketi düşük güven
taşır. Not destek sayfası, asıl örnek sorusu ve mini sorunun not bölümü ayrı
referanslardır; not bağlantısı ders ve kalıbı `konu`/`kalip` parametreleriyle seçer.

Üretim hattında `--dry-run`, `--check`, `--resume`, `--limit`, `--ocr-pages` ve yayın seçeneklerinin
anlamı [kalıcı sistem rehberinde](plan/00_SISTEM_REHBERI.md) açıklanır.
Önbellek bozulması ve girdi değişiminde devam davranışı `content-pipeline-test.py`,
video kimliği/oynatma listesi/süre/HTTP 429 ayrımı `video-inventory-test.py` ile
denetlenir. Kaynak kapsam denetimi eski kalite kuyruğunu yeni risklerle uzlaştırır;
etiket, güven, konum, kaynak erişimi ve insan doğrulaması ayrı sayaçlardır.

85.302 kaynak kaydının tümünde kontrollü konu kimliği ve kaynak dayanağı vardır:

- 81.598 soru kartı: 80.097 veritabanı kaydı ve öğrenci bankasına alınmamış 1.501 arşiv kartı.
- Ders notları içindeki 166 örnek soru ayrıca etiketlidir; toplam QUESTION kaydı 81.764'tür.
- 2.713 PDF katalog kaydı; bunlar 2.698 ayrı fiziksel PDF dosyasını kapsar. Aynı dosyayı
  gösteren katalog kayıtları kaynak kimlikleri kaybolmasın diye korunur. Dosyası olmayan
  1 kayıt ve yalnız video olarak bulunan 10 katalog kaydı da durumlarıyla korunur.
- 49 ders notu, 377 video ve 399 konu/alt konu kaydı.
- 18 müfredat/dağılım referans dosyası ayrıca konu kimliklerine bağlanır; bunlar konu anlatımı
  olarak sunulmaz. Kaynak klasöründeki iki kişisel fotoğraf eğitim içeriği sayılmaz.

Kaynaklar klasörünün 2.773 dosyasının tamamı denetlenir. Ek olarak 51 HTML çözüm dizini
ders kapsamı ve sınıfıyla etiketlenir; cevapları öğrenci listesine taşınmaz. İki ZIP içindeki
dört PDF'nin byte özetleri, zaten etiketli PDF'lerle birebir eşleştirilir. Bir README dosyası
depo dokümantasyonu, ICINDEKILER.md kaynak dizini olarak kaydedilir. Kapsam dışında sessizce
bırakılan kaynak dosyası yoktur.

Ham soru envanterindeki iki fazladan görsel yalnız ortak soru başlığıdır. Soruların tamamı
sonraki birleşik kartta vardır; `audit.json` içindeki `coveredBy` alanı bu ilişkiyi saklar.
Fonksiyonlar karma PDF'sinin 16 sayfası OCR ile okundu; 1–15. sayfalar test, 16. sayfa cevap
anahtarıdır. Rehberlik PDF'leri ikincil çalışma rehberi olarak işaretlenir; resmî müfredat
onayı veya güncel sınav kapsamı doğrulaması sayılmaz.

Etiket bulunması, içerik doğruluğunun öğretmen tarafından doğrulandığı anlamına gelmez.
Öğretmen onayı uydurulmaz; bağımsız doğruluk yüzdesi henüz ölçülmemiştir. Geniş kapsamlı
302 belgeye dar bir konu tahmin edilmez. Önceki model etiketleri, görsel sorular ve yalnız
başlığa dayanan eşlemeler denetimde görünür kalır. 27.589 risk işaretli kayıt için
`quality-review-queue.jsonl` üretilir; ilk 24 kayıtta eksik kaynak, bozuk soru kırpması veya
kaynak branşı çatışması vardır. Kuyruk dışındaki sıradan etiketlerden de tabakalı örnekler
`audit.json` içinde seçilir. İki bozuk kırpmanın Kaynak Kütüphanesi bağlantısı kapalıdır;
orijinal soru/görsel, cevaplar ve öğrenci geçmişi değiştirilmez.

Üretilmiş sürümü yeniden etiketleme veya yayın yapmadan etkin sistemle karşılaştırmak:

```powershell
..\.venv\Scripts\python.exe -X utf8 -B scripts/content-label-reconcile.py --dev-login
..\.venv\Scripts\python.exe -X utf8 -B testler/content-label-reconcile-test.py
```

Başarılı uzlaştırmadan sonra `scripts/content-label-workset.py`, aynı etiket sürümünün
tekil kimlik envanterini ve 4–7. aşamalara ait veri kuyruğunu
`veri/content-labels/inventory/<runKey>-<UTC>/` altında üretir. `resources.jsonl`
kaynak rolünü, özgün kimliği/sürümü, erişim durumunu ve etiket referansını korur.
PDF hash'i ve video sağlayıcı kimliği konu/katalog referansından ayrılır; eşit byte'lar
katalog kimliklerini birleştirmez. Video katalog kaydı erişim onayı değildir.
`gaps.jsonl` ilişki bazlı güven, kanıt ve konum eksiklerini de içerir; `report.json`
tür/branş ölçümlerini, çıktı hash'lerini ve hariç tutulan kişisel dosyaları gösterir.
`testler/content-label-workset-test.py` kimlik/rol, mükerrer referans, eksik konum,
eskimiş karar ve bilinmeyen kategori senaryolarını doğrular.

Veritabanı bağlantısı salt okunur çalışır; yayımlanmış sürüm, kaynak kayıtları, kategori
tanımları, ilişkiler ve Flyway geçmişi tek `REPEATABLE READ READ ONLY` anlık görüntüsünden
karşılaştırılır. Yerel kaynak parmak izleri ve tekil fiziksel PDF dosyalarının SHA-256
özetleri denetlenir; OCR/AI, göç veya yayın yapılmaz. `--dev-login` yalnız yerel geliştirme
öğrenci oturumu açar ve uygulama normal bir `LOGIN` olayı ekleyebilir. Var olan oturum
`IVME_AUDIT_COOKIE` ortam değişkeninden verilirse bu seçenek gerekmez; çerez/parola
rapora yazılmaz. İçerik API'sine yalnız `GET` gönderilir. Oturum yoksa `401/403`
doğrulanmamış olarak raporlanır; eşleşme sayılmaz.

Sonuç `veri/content-labels/reconciliation/<runKey>-<UTC-zamanı>.json` adıyla, var olan
raporun üzerine yazmadan saklanır. Çıkış kodu `0` karşılaştırılan kapsamın eşleştiğini,
`1` fark veya tamamlanamayan doğrulama olduğunu belirtir. Önceden eksik PDF ve yalnız
video kayıtları korunur; yeniden silinmiş kaynak gibi sayılmaz. API'nin ek dinamik
kategorileri yayımlanmış kategorilerden ayrı listelenir. Rapor içerik doğruluğunu,
uzak videolara erişimi veya henüz kaydedilmemiş bütün kaynakların kapsamını onaylamaz.

Öğrenci ekranı `/kaynak-kutuphanesi`: soru, PDF, video, ders notu; TYT/AYT, ders, konu,
alt konu ve herhangi/hepsi eşleşmesiyle aranabilir. Yalnız öğretmenin doğruladıkları ve
yalnız açılabilen kaynaklar filtreleri vardır. Sonuçlardaki sınav/ders/konu, filtrede kullanılan
etkin etiketlerle aynıdır. Cevap anahtarı soru listesi API'sine eklenmez.

Yeniden üretmek ve denetlemek:

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/content-label-refresh.py
```

Denetimden geçen sürümü tek işlemde PostgreSQL'e almak:

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/content-label-refresh.py --publish
```

Kesinti halinde tekrar çalıştırılabilir; PDF/OCR envanterleri kaynak hash'lerini ve
önbelleği kullanır. Kaynak metni veya görseli değişmiş bir AI önerisi sessizce yeniden
kullanılmaz. Yeni, henüz kapsamı okunmamış ek PDF işlemi durdurur. Tam denetimin sonucu
`veri/content-labels/audit.json`, özet `report.json`, sürüm girdileri `labels.json` içindedir.
Bu büyük çıktılar Git dışındadır; veritabanı ve kaynak PDF/görseller ayrı yedeklenmelidir.

Eksik PDF 2088'in katalogdaki OGM adresi bu turda yeniden denendi; HTTP 404 döndü.
Belge uydurulmadı veya başka bir PDF ile sessizce değiştirilmedi.

Son doğrulamada 80.097 etkin soru görselinin dosyası bulundu; eksik görsel dosyası sıfırdır.
Bu dosya varlığı kontrolü görselin içerik doğruluğu onayı değildir. 15 arka yüz testi;
öğretmen kararının önceliği, sınav/branş düzeltmesinin filtre ve gösterime yansıması,
yanlış kaynak branşındaki önerinin ilgili öğretmene görünmesi, kaynak değişikliğinde
onayın düşmesi, PDF dosya özeti/yol denetimi ve doğrudan sayfa açılışını doğruladı.
Gerçek PostgreSQL/API ve ayrı öğrenci tarayıcı oturumuyla kaynak türleri, TYT/AYT
matematik/geometri, PDF açılışı, arama/geri gezinme, onay filtresi ve 1440/390 piksel
görünümleri kontrol edildi. Bu kontrollerde soru cevabı veya öğretmen kararı gönderilmedi.
