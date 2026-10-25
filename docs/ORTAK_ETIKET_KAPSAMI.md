# Ortak kaynak etiketleri

Bu belge ortak etiket kataloğunun nasıl üretildiğini, yayımlandığını ve denetlendiğini
anlatır. Sistemin genel kuralları [sistem rehberinde](plan/00_SISTEM_REHBERI.md) tutulur. Sayılar bu
belgeye yazılmaz; güncel değer her zaman DB'den, `python scripts/ivme.py durum` çıktısından
veya üretim raporundan okunur.

## Çalışma anındaki tek kaynak

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

Ders/ünite/konu yapısı Excel'in ilk KONULAR sayfasından gelir
([tek kaynak kuralları](plan/rehber/02_tek-kaynak.md)); KPSS sınavları aynı kataloğa kendi
sınav kimlikleriyle eklenir ([14. adım](plan/14_KPSS.md)).

## Kontrollü sözlük

Kontrollü kategori tanımlarının tek bakım kaynağı
`backend/src/main/resources/content-taxonomy.json` dosyasıdır. `scripts/content-taxonomy.mjs`
ortak alias, kapsam ve ağaç doğrulayıcısıdır; üreticiler kayıtlı olmayan yeni kimliği reddeder.
`review-vocabulary.json` konudan bağımsız zorluk/beceri/sınıf/içerik türü boyutlarını korur.
Benzer başlıklar otomatik kategori birleşmesi değildir. `EXAM_COUNTERPART` ilişkileri TYT/AYT
kimliklerini birleştirmeden karşılıklarını gösterir.

Başlık düzeltmesinde aynı `id` tutulur, eski görünen terim `aliases` alanına eklenir.
Birleşme için açık `redirects` kaydı, öğretmen kararı ve ilerleme taşıma etkisi gerekir.
Branş/başlık çelişkileri kimlikleriyle inceleme raporunda kalır.
`system.kapsam-incelemesi` başarı hesabından hariçtir; dersi bilinen geçici ilişki
`Dersin genel kapsamı`, düşük güven ve neden taşır. `PRIMARY` doğrudan konu (birden fazla
olabilir), `SECONDARY` eşlik eden içerik, `PREREQUISITE` ön bilgidir. Üst konu sorgu
genişlemesidir; sayım tekil `itemKey` kullanır.

`node scripts/content-taxonomy-check.mjs --project` yalnız küçük ön yüz kimlik/ad
projeksiyonunu üretir; tam sözlük tarayıcı paketine alınmaz. Normal denetim ve
`--check` kimlikleri/ağacı kontrol edip `veri/content-labels/taxonomy/<taxonomyVersion>.json`
kanıtını üretir. `frontend/src/curriculum.js` kaydedilmiş kimlikleri bu projeksiyondan çözer.

## Kaynak sözleşmesi ve ilişkiler

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
Üretilen bütün incelemeler `PENDING` kalır; gerçek öğretmen kararları
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

## Kaynak türlerine göre kapsam kuralları

- **Soru:** soru konumu basılı numarayı, ham kayıt ve görsel referansını korur. Konu
  ilişkisine yalnız ilgili kanıt bağlanır; karma kartın bir soru parçası diğer bütün
  etiketlere kanıt olarak kopyalanmaz. Model etiketi düşük güven taşır. Ham envanterde
  ortak soru başlığı olan fazladan görseller `audit.json` içindeki `coveredBy` ile
  birleşik karta bağlanır. `question-label-check.py` soru girdi sürümünü, branş arşivi
  projeksiyonlarını, araştırma kanıtlarını ve not–asıl soru referanslarını salt okunur denetler.
- **PDF:** sayfa çıkarımı metin katmanını kontrol eder; metin ve OCR'da gözlenen başlık
  sayfaları tahmini aralık olarak eklenir. Tam anlatım aralığı veya içerik onayı iddia
  edilmez. Sayfa önbelleği kaynak hash'i, sayfa, çıkarıcı ve OCR model hash'ine bağlıdır.
  OCR çıktısı içerik veya formül onayı değildir. Aynı dosyayı gösteren katalog kayıtları
  kaynak kimlikleri kaybolmasın diye korunur; dosyası olmayan veya yalnız video olarak
  bulunan kayıtlar durumlarıyla kalır. Eksik dosyanın yerine başka belge konmaz
  (`external-source-check.json`).
- **Video:** OGM'nin PDF/video referansları aynı sağlayıcı kimliğinde birleştirilir; tekil
  video ve oynatma listeleri VIDEO kayıtlarına bağlanır. Altyazı izi zamanlı metnin
  okunması sayılmaz; oynatma listesine tek video süresi verilmez. Öğrenci erişim filtresi
  doğrulanamayan kaynağı açıldığı kesinmiş gibi saymaz.
- **Ders notu:** not destek sayfası, asıl örnek sorusu ve mini sorunun not bölümü ayrı
  referanslardır; not bağlantısı ders ve kalıbı `konu`/`kalip` parametreleriyle seçer.
- **Diğer dosyalar:** müfredat/dağılım referans dosyaları konu kimliklerine bağlanır ama
  konu anlatımı olarak sunulmaz. HTML çözüm dizinleri ders kapsamı ve sınıfıyla etiketlenir;
  cevapları öğrenci listesine taşınmaz. ZIP içindeki PDF'ler byte özetiyle mevcut PDF'lerle
  eşleştirilir. Kişisel dosyalar eğitim içeriği sayılmaz. Rehberlik PDF'leri ikincil
  çalışma rehberidir; resmî müfredat onayı sayılmaz. `Kaynaklar` klasöründe kapsam dışında
  sessizce bırakılan dosya olmaz.

Etiket bulunması içerik doğruluğunun öğretmen tarafından doğrulandığı anlamına gelmez.
Öğretmen onayı uydurulmaz. Geniş kapsamlı belgeye dar konu tahmin edilmez. Model
etiketleri, görsel sorular ve yalnız başlığa dayanan eşlemeler denetimde görünür kalır.
Risk işaretli kayıtlar `quality-review-queue.jsonl` kuyruğuna, kuyruk dışındaki sıradan
etiketlerden tabakalı örnekler `audit.json` içine yazılır.

## Üretim, yayın ve devam

Yeniden üretmek ve denetlemek; denetimden geçen sürümü tek işlemde PostgreSQL'e almak:

```powershell
..\.venv\Scripts\python.exe -X utf8 scripts/content-label-refresh.py
..\.venv\Scripts\python.exe -X utf8 scripts/content-label-refresh.py --publish
```

Kesinti halinde tekrar çalıştırılabilir; PDF/OCR envanterleri kaynak hash'lerini ve
önbelleği kullanır. Kaynak metni veya görseli değişmiş bir AI önerisi sessizce yeniden
kullanılmaz. Kapsamı henüz okunmamış yeni ek PDF işlemi durdurur. KPSS soruları bu hatta
atlanır ve her `icerik/data/kpss-*` sınavı `kpss-yayinla.py --katalog` ile yeniden eklenir.
Tam denetimin sonucu `veri/content-labels/audit.json`, özet `report.json`, sürüm girdileri
`labels.json` içindedir. Bu büyük çıktılar Git dışındadır; veritabanı ve kaynak
PDF/görseller ayrı yedeklenir.

Üretim hattında `--dry-run`, `--check`, `--resume`, `--limit`, `--ocr-pages` ve yayın
seçeneklerinin anlamı [üretim ve yeniden başlama](plan/rehber/05_uretim-ve-yeniden-baslama.md)
bölümündedir. Önbellek bozulması ve girdi değişiminde devam davranışı
`content-pipeline-test.py`, video kimliği/oynatma listesi/süre/HTTP 429 ayrımı
`video-inventory-test.py` ile denetlenir.

## Uzlaştırma ve kaynak envanteri

Üretilmiş sürümü yeniden etiketleme veya yayın yapmadan etkin sistemle karşılaştırmak:

```powershell
..\.venv\Scripts\python.exe -X utf8 -B scripts/content-label-reconcile.py --dev-login
..\.venv\Scripts\python.exe -X utf8 -B testler/content-label-reconcile-test.py
```

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
`1` fark veya tamamlanamayan doğrulama olduğunu belirtir. Eksik PDF ve yalnız video
kayıtları korunur; silinmiş kaynak gibi sayılmaz. API'nin ek dinamik kategorileri
yayımlanmış kategorilerden ayrı listelenir. Rapor içerik doğruluğunu, uzak videolara
erişimi veya kaydedilmemiş kaynakların kapsamını onaylamaz.

Başarılı uzlaştırmadan sonra `scripts/content-label-workset.py`, aynı etiket sürümünün
tekil kimlik envanterini ve iş kuyruğunu `veri/content-labels/inventory/<runKey>-<UTC>/`
altında üretir. `resources.jsonl` kaynak rolünü, özgün kimliği/sürümü, erişim durumunu ve
etiket referansını korur. PDF hash'i ve video sağlayıcı kimliği konu/katalog referansından
ayrılır; eşit byte'lar katalog kimliklerini birleştirmez. Video katalog kaydı erişim onayı
değildir. `gaps.jsonl` ilişki bazlı güven, kanıt ve konum eksiklerini içerir; `report.json`
tür/branş ölçümlerini, çıktı hash'lerini ve hariç tutulan kişisel dosyaları gösterir.
`testler/content-label-workset-test.py` kimlik/rol, mükerrer referans, eksik konum,
eskimiş karar ve bilinmeyen kategori senaryolarını doğrular.

## Öğrenci ekranı

`/konular-ve-kaynaklar` (eski `/kaynak-kutuphanesi` adresi buraya yönlenir): soru, PDF,
video, ders notu; TYT/AYT, ders, konu, alt konu ve herhangi/hepsi eşleşmesiyle aranabilir.
Yalnız öğretmenin doğruladıkları ve yalnız açılabilen kaynaklar filtreleri vardır.
Sonuçlardaki sınav/ders/konu, filtrede kullanılan etkin etiketlerle aynıdır. Cevap anahtarı
soru listesi API'sine eklenmez.

## Plan denetimi

`scripts/plan-check.py` açık görev kimliklerini, adım numarası/başlığını, devir dosyasındaki
etkin görevi, somut sözlük/kanıt yollarını ve yerel Markdown bağlantılarını kontrol eder.
`veri/content-labels/plan-check.json` sonucu tutar; iş/insan onayı kararı vermez.
`testler/plan-check-test.py` kapanmış göreve devam, silinmiş belge bağlantısı ve
yinelenen kimlik hatalarını bağımsız küçük planlarla doğrular.
