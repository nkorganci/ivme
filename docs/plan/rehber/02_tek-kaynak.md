# Sistem rehberi — Hangi bilginin tek kaynağı var?

[Rehber dizini](../00_SISTEM_REHBERI.md) · Ne zaman okunur: Yeni veri/sözlük/kayıt eklemeden önce; tekrar ve ikinci liste önleme.

## Hangi bilginin tek kaynağı var?

| Bilgi | Bakım/üretim kaynağı | Tüketim ve sınır |
|---|---|---|
| Ders, ünite, konu ve soru dağılımı | `Kaynaklar/mufredat/YKS_TYT_AYT_Konu_Soru_Dagilimi_2018-2026.xlsx` dosyasının yalnız ilk `KONULAR` sayfası → üretilmiş `content-taxonomy.json` | Çalışma anında tek kayıt `learning_catalog.current_categories.definition`; diğer sayfalar ve eski müfredat listeleri seçilebilir başlık üretmez |
| Seçilebilir konular ve ünite grupları | Aynı DB kategori kaydında `canonicalUnit=true`, `unitId`, `unit`, `excelRowId` | 453 kaynak satırı, 12 özgün ders grubu → 14 ayrı ders, 146 ünite; kapsam işaretlerine göre 178 TYT / 352 AYT kimliği. `canonicalUnit` eski API alanıdır ve seçilebilir konu satırını belirtir |
| Zorluk, beceri, içerik türü, ilişki ve inceleme değerleri | `backend/src/main/resources/review-vocabulary.json` | Konu kimliğinden ayrı boyutlardır |
| Etkin yayımlanmış etiket sürümü | PostgreSQL `learning_catalog.current_run` | Aynı sürümün `current_items`, `current_categories`, `current_assignments` görünümleri |
| Yerel üretim adayı | `veri/content-labels/labels.json` ve `report.json` | Üretilmiş çıktı; elle düzeltilmez, yayımlanmış sürümle aynı olduğu varsayılmaz |
| Öğretmen kararı | `content_reviews` ve `content_review_history` | Kaynak/görsel/kategori değişimi onayı eskitebilir; otomatik etiket yayını kararı değiştirmez |
| Soru, cevap ve öğrenci geçmişi | İlgili soru/çalışma/sınav tabloları | Etiket üretimi bu verileri değiştirmez; ilk deneme ve anlık kayıt korunur |
| Görev ve devam noktası | Açık numaralı adımlar ve `00_DEVAM.md` | Başka bir eksikler veya yapılanlar listesi açılmaz |
| Sınav hedefleri (YKS, KPSS türleri) ve öğrencinin sınavı | Flyway `V79__exam_tracks.sql` tohum kaydı `exam_tracks`; durum, not, `sections` (test, ders soru sayısı, dakika) ve `ready_features` yeni göçle değişir | `GET /api/exam-tracks`; seçim `user_exam_tracks`. Menü tek; `ACTIVE` sınavın yalnız `ready_features` bölümleri açılır (boş liste: hepsi) |
| KPSS sınavının ders/ünite/konu referansı ve çıkmış soru konu kararları | `Kaynaklar/KPPS/<Sınav>/Mufredat/*-konular.json` ve `Cikmis Sorular/siniflandirma/<yıl>.tsv` → `veri-hatti/<sınav>/derle.py` | `scripts/kpss-yayinla.py` ile `questions`, `exam_archive_positions` ve ortak katalog (`kpss-*` kategorileri). İşleme etiketi `ISLEME_DURUMU.json` |

`content-review-catalog.json`, `pdf-review-labels.json`, `content-label-categories.json`
ve ön yüz kimlik dosyası projeksiyondur. İlgili üreticileri çalıştırmadan bu dosyaları
elle düzeltmek sonraki build'de değişikliği kaybettirir veya sürüm farkı yaratır.
Branş CSV'leri ve eski kaynak başlıkları kanıt girdisidir; ikinci bir kontrollü sözlük değildir.

Sınavlar (YKS, KPSS) için menü veya sayfa kopyalanmaz. Öğrenci sol menüdeki
“Sınavım” seçicisiyle sınavını seçer; seçim `user_exam_tracks` tablosundadır.
`ExamTrackGate` her rotayı bir bölüme eşler (`curriculum`, `past-questions`, `study`,
`statistics`, `question-bank`...). Sınav `ACTIVE` değilse veya bölüm o sınavın
`ready_features` listesinde yoksa, sayfanın yerinde aynı yerde “hazırlanıyor / henüz hazır
değil” bilgisi görünür. Kayıt detayları (pratik, sınav sonucu, soru, PDF) ve haftalık
program her sınavda açık kalır. `PLANNED` sınav listede “henüz hazır değil” notuyla
görünür, seçilemez. Sınav değişince sayfa sorgu parametreleri temizlenir ve sayfa
yeniden kurulur. Ekranlar test listesini, kaynakları ve etiketleri `useExamTrack()`
(`exams`, `questionSources`, `examLabel`, `bankName`) üzerinden okur; sabit TYT/AYT
listesi yalnız YKS'e özel sayfalarda kalır.
Sunucuda `ExamTrackService.scope` her soru süzgecini seçili sınavın testleriyle sınırlar.
Liste, sayım, pratik ve deneme bu kapsamı kullanır. Deneme ve oturumlar `track_id` ile
kaydedilir; geçmiş ve özetler sınava göre ayrılır. KPSS ders ağırlıkları ve süreleri
`exam_tracks.sections` kaydından okunur. Yeni sınavın ders/konu kayıtları aynı ortak
katalogda, kategori `exam` alanı o sınavın `sections[].examId` değeriyle (ör.
`KPSS_OO_GY`, `KPSS_OO_GK`) yayımlanır; ikinci sözlük açılmaz. KPSS ders adları YKS
ile çakışır (Türkçe, Tarih); KPSS ders kimliği (`kpss-turkce`...) yayımlanmış KPSS
kategorilerinden çözülür ([14. adım](../14_KPSS.md)).

Çalışma anında kategori kimliği, tercih edilen ad ve ortak kaynak etiketi için
tek doğruluk kaynağı PostgreSQL'dir. `ReviewCatalog.categories()` yalnız
`current_categories` tanımlarını ve DB'deki mevcut `taxonomy_nodes` boyutlarını
sunar; paketlenmiş JSON bunları ezmez, soru başlığından yeni kategori üretmez.
`taxonomy:<nodeId>` eski soru tipi/beceri boyutunun korunmuş DB kimliğidir;
aynı konu için yeni dosya sözlüğü değildir. Henüz yayımlanmamış kategori bir
öğretmen kararında veya takip bağında seçilemez. Yeni kurulumda önce ortak
katalog yayınlanır; eksik DB kaydı dosyadan tamamlanmış gibi gösterilmez.

Öğretmen ekranındaki PDF dahil otomatik etiketler de aynı `current_items`
kaynağından gelir. Paketlenmiş kaynak içeriği/orijinal künye kanıt olarak
gösterilebilir; DB etiketi yoksa otomatik onay veya etiket üretilmez. Öğretmen
dışa aktarımı aynı güncel etiketleri kullanır. Ayrı test DB'sindeki paket
örnekleri test altyapısı tarafından açıkça eklenir; uygulama servisi eklemez.

Ortak kaynak ve öğretmen okuma işlemleri `REPEATABLE_READ` anlık kaydı kullanır;
eşzamanlı atomik yayın bir yanıtta eski özetle yeni kategori/ilişkiyi karıştırmaz.
Bu tercih [PostgreSQL işlem yalıtımı](https://www.postgresql.org/docs/current/transaction-iso.html)
ve [Spring işlem sınırı](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html)
kurallarına dayanır. Özel ders kaynağı `current_assignments` ile doğrulanır;
yalnız geçmiş sürümde bulunan ilişki yeni bir bağ için kabul edilmez.
Müfredatın yerleşimi yereldir; görünen konu/alt konu adı API metadata'sından
alınır. Ad değişse de kayıtlı kategori, ilerleme ve video kimliği korunur.

Soru çıkarımında fiziksel sayfa, basılı soru numaraları, özgün görsel/kırpım
referansı ve ham kayıt yolu korunur. Bir kitap adı ile sayfa numarası, katalogda
doğrulanmış PDF dosyası yoksa PDF bağlantısı üretmez. Soru kökü ve seçenekler
ölçülen görevi belirler; parçada “sanat/ahlak” geçmesi tek başına felsefe etiketi
verdirmez. `content-source-analysis.py` önerileri metin/görsel hash'ine bağlıdır;
karma karttaki her kanıt yalnız desteklediği kategoriye bağlanır. Önceki model
etiketi, bağımsız içerik doğrulaması yapılana kadar düşük güvenlidir.

PDF banka eşleşmesi ile tam işlenme ayrı durumlardır. `pdf-bank-audit.json.gz`
özgün yol, SHA-256 ve canlı soru kodunu kanıtlar; eşleşen sorular PDF'deki bütün
soruların alındığını tek başına kanıtlamaz. Main'deki `veri/pdf-arsiv` ayrı bir
mantıksal arşivdir; özgün `Kaynaklar` dosyaları yalnız okunur ve taşınmaz.
Arşiv kaydı ancak tüm soru kodları ve kalan uygulama referansları doğrulanınca
`scripts/pdf-archive.py` üzerinden `learning_catalog.pdf_archive` içine yazılır.
Bu işlem paylaşılan özgün PDF'yi silmez; main'in normal PDF listesi ve dosya API'si
arşiv hash'ini gizler. Yeni PDF'ler `scripts/pdf-source-copy.py`
ile main'e ait `veri/pdf-gelen` klasörüne alınır; kopyalama öncesi kaynak,
arşiv ve gelen klasörlerindeki SHA-256 kimlikleri kontrol edilir. Aynı içerik
tekrar kopyalanmaz. Arşiv inceleme kuyruğu tek başına arşiv kaydı veya dosya
taşıma işlemi değildir.

`question-label-check.py` CSV–statik JSON projeksiyonunu, güncel ortak soru
kimliklerini, eski araştırmanın metin/görsel sürümünü ve not örneklerini salt
okunur karşılaştırır. Rapor `question-checks/<runKey>/` altında tutulur. Kimlik
ve sürüm tutarlılığının geçmesi anlamsal doğruluk onayı değildir; değişmiş kanıt
nedenleri `content-label-audit.py` ile aynı kalite kuyruğuna eklenir.

Notun destek PDF sayfası `SUPPORTING_LESSON_PAGE`, asıl örnek sorusu
`ORIGINAL_EXAMPLE_QUESTION`, not bölümü ise `NOTE` konumudur. Bunlar birbirinin
yerine kullanılamaz. Örnek soru tek `question:<code>` kaydına bağlanır; cevap ve
çözüm açıklaması genel kaynak metadatasına kopyalanmaz. Not ve mini soru URL'si
`konu=<lessonId>`, kalıp gerekiyorsa `kalip=<patternId>` ve bölüm çapasını taşır.
Destek sayfası bütün notun veya her konu ilişkisinin onayı sayılmaz.

`question-source-repair-preview.py` kırpım onarımını özgün PDF'nin doğrulanmış
sayfa/koordinatlarından ayrı aday PDF/PNG olarak hazırlar. İki sütuna yayılan soru
parçaları okuma sırasıyla yerleştirilir; metin/formül yeniden üretilmez. Manifest
eski görsel ve kaynak PDF hash'ini, parçaları ve aday hash'ini saklar. Aday
hazırlamak soru bankasındaki görseli, cevabı veya geçmişi değiştirmez; asıl veri
düzeltmesi eski dosyayı/sürümü koruyan ayrı işlemdir.
