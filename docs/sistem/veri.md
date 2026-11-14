# Veri, kimlikler ve soru süzgeçleri

Çalışan sistemin kalıcı veri kuralları. Sayısal durum belgeye yazılmaz: sürüm `python scripts/ivme.py durum`, seçilebilir kategori `GET /api/learning-resources/metadata` ile okunur.

## Tek kaynak tablosu

| Bilgi | Kaynak | Sınır |
|---|---|---|
| Ders, ünite, konu, soru dağılımı | `Kaynaklar/mufredat/YKS_TYT_AYT_Konu_Soru_Dagilimi_2018-2026.xlsx` ilk `KONULAR` sayfası → `content-taxonomy.json` → `learning_catalog.current_categories.definition` | Başka sayfa veya eski liste seçilebilir başlık üretmez; ikinci çalışma zamanı sözlüğü açılmaz |
| Etkin etiket sürümü | PostgreSQL `learning_catalog.current_run` (`current_items`, `current_categories`, `current_assignments`) | `veri/content-labels/labels.json` üretilmiş adaydır, elle düzeltilmez |
| Zorluk, beceri, tür, ilişki değerleri | `backend/src/main/resources/review-vocabulary.json` | Konu kimliğinden ayrı boyuttur |
| Öğretmen kararı | `content_reviews`, `content_review_history` | Kaynak/görsel/kategori değişimi onayı eskitebilir; otomatik yayın kararı değiştirmez |
| Soru, cevap, öğrenci geçmişi | Soru/çalışma/sınav tabloları | Etiket üretimi bunlara yazmaz |
| PDF kimliği, sayfalar, soru kapsamı | `learning_catalog.pdf_sources` + `pdf_source_files`, `pdf_source_catalog`, `pdf_source_pages`, `pdf_question_occurrences` | Aynı SHA-256 tek dosyadır; katalog kopyası ve farklı PDF'deki aynı soru tekil toplama eklenmez |
| Sınav hedefleri | Flyway `V79__exam_tracks.sql` → `exam_tracks` (`sections`, `ready_features`), seçim `user_exam_tracks`, `GET /api/exam-tracks` | Tek menü; yalnız `ACTIVE` sınavın `ready_features` bölümleri açılır |
| KPSS referansı | `Kaynaklar/KPPS/<Sınav>/Mufredat/*-konular.json` ve `Cikmis Sorular/siniflandirma/<yıl>.tsv` → `veri-hatti/<sınav>/derle.py` → `scripts/kpss-yayinla.py` | KPSS ders kimliği (`kpss-turkce`…) KPSS kategorilerinden çözülür; kategori `exam` alanı `sections[].examId` |
| Görev ve devam noktası | `docs/plan/` ve `docs/devam.md` | Başka eksik/yapılan listesi açılmaz |

`content-review-catalog.json`, `pdf-review-labels.json`, `content-label-categories.json` ve ön yüz kimlik dosyası projeksiyondur; üreticisini çalıştırmadan elle düzeltme sonraki build'de kaybolur. Branş CSV'leri ve eski kaynak başlıkları kanıt girdisidir, sözlük değildir.

## Çalışma anında DB tek doğruluk kaynağıdır

- `ReviewCatalog.categories()` yalnız `current_categories` ve DB'deki `taxonomy_nodes` boyutlarını sunar; paketlenmiş JSON ezmez, soru başlığından kategori üretmez. Yayımlanmamış kategori karar veya takip bağında seçilemez; eksik DB kaydı dosyadan tamamlanmış gösterilmez. `taxonomy:<nodeId>` korunmuş soru tipi/beceri kimliğidir, yeni sözlük değildir.
- Öğretmen ekranındaki PDF dahil otomatik etiketler `current_items`'tan gelir; DB etiketi yoksa otomatik onay/etiket üretilmez. Test DB örneklerini yalnız test altyapısı ekler.
- Ortak kaynak ve öğretmen okumaları `REPEATABLE_READ` anlık kaydı kullanır. Özel ders kaynağı `current_assignments` ile doğrulanır; yalnız geçmiş sürümdeki ilişki yeni bağ için kabul edilmez.
- Görünen konu/alt konu adı API metadata'sından gelir; ad değişse kategori, ilerleme ve video kimliği korunur. `curriculumReference.js` yalnız DB metadata'sının sunum projeksiyonudur.

## Müfredat içe aktarma ve kimlikler

- İçe aktarıcı yalnız ilk sayfayı okur; 4. satır başlıklarını doğrular, 5–457 arası satırların ders, sınıf, ünite, konu, kapsam işareti, toplam, not ve 2018–2026 sayılarını aynen alır. `✓*`, boş hücre ve 0 ayrıdır; toplu başlıklara sayı dağıtılmaz. `unitReference.sha256` yalnız veri satırlarının hash'idir.
- Kullanıcı kararıyla Matematik+Geometri ve Türkçe/Edebiyat yalnız bu sayfadaki ünite/konuya göre ayrılır (üçgen, dörtgen, çokgen, analitik, uzay → Geometri; fonksiyon, trigonometri, türev, integral → Matematik; anlam ve dil bilgisi → Türkçe; edebiyat bilgisi, dönem, akım → Edebiyat). Aynı satır iki sınavda olsa tek derse aittir; özgün ad `sourceSubject` ve `distribution.subject`'te kalır.
- İlk kimlikler ders/ünite/konu bileşiminden deterministiktir; sonraki aktarımda mevcut satır ve ad eşleşmeleri korunur. Kaldırılan konu/sınav kimliği seçilemeyen tarihsel kayıt olur (`selectable=false`, `canonicalTopicIds` yönlendirmesi). `SOURCE_CURRICULUM` yalnız eski PDF/video çıkarımı içindir.
- Kayıpsız taşıma sırası: `excel-curriculum-snapshot.py` → `excel-curriculum-import.py` → `node --max-old-space-size=6144 scripts/excel-curriculum-relabel.mjs` → `learning-resource-check.mjs` → `excel-curriculum-audit.py` → `content-label-publish.py --database ivme`. Yalnız ders adı/kapsamı ayrılırken `relabel --refresh-definitions` kullanılır (konu/ünite kimliği, içerik, kaynak ve soru bağları korunur).
- Başlık düzeltmesinde `id` değişmez, eski terim `aliases`'e girer; kimlik birleştirmesi yönlendirme ve ilerleme taşıma değerlendirmesi ister.
- `categoryId` kategori, `itemKey` katalog kaydı, `canonicalAssetId`/`entityKey` fiziksel varlık, `relationKey` kaynak–kategori ilişkisidir. `PRIMARY` doğrudan, `SECONDARY` eşlik eden, `PREREQUISITE` ön bilgi konudur; üst/alt konu genişlemesi aynı kaynağı/olayı iki kez saydırmaz; genel toplam tekil soru/olay kimliğine dayanır.
- Video sağlayıcı kimliği konuya göre değişmez; playlist, video ve başlangıç zamanı ayrı bilgidir. Konu numarası (V74 `topicNumber`) yayımlanmış `categories.definition`'a yazılır.
- Ortak seçim sınırı 100'dür (bir ünite iki sınavda 26 konu kimliğine sahip olabilir); ünite seçimi kesilmez. İlerleme sınav başına kimlikle hesaplanır, tekil soru çoğalmaz. Eski tek hedefli tamamlanma yeni kimlikle gösterilebilir; birden çok konuya ayrılan eski tamamlanma tüm alt konuları bitmiş saymaz; geri alma eski bağları aynı işlemde kaldırır.

## Soru–konu bağı

- Soru/PDF/video ilişkileri yalnız Excel'in aynı sınav ve ders kapsamındaki konularına eşlenir. Başlıktan türeyen ilişki `CANDIDATE/LOW`; dar kanıt yoksa dersin seçilemeyen `system.*.konu-incelemesi` etiketiyle korunur. Öğretmen onayı, konuya özel konum veya dar konu başarısı uydurulmaz.
- Sorunun kaynak alt konusu (kazanım/elle/kitap başlığı; model tahmini değil), elle düzeltilmiş alt konusu veya test başlığı tek bir Excel konusunun adıyla aynıysa `excel-curriculum-relabel.mjs` soruyu yalnız o konuya bağlar (`HIGH`, yine `CANDIDATE`). Çok konulu ünite adı veya başka konuyu gösteren kanıt daraltmayı engeller; adım idempotenttir, tur listesi `veri/content-labels/source-subtopic-matches-from-<önceki run>.json`. Dar ad yoksa ünite geneli soru ünitenin tüm konularında sayılır. `questions.topic`, cevaplar ve olay anı etiketleri değişmez.
- Öğrenciye görünen her soru en az bir Excel konusuna bağlı olmalıdır. Konusuz sorular için `scripts/question-topic-completion.py` her soruya tek konu önerir (`veri/content-labels/question-topic-decisions.json`): yöntemler `EXACT_NAME`/`NAMED_UNIT`, `TEXT_MODEL` (TF-IDF doğrusal sınıflayıcı), `DUPLICATE`, `PRIOR`, `CONTENT_READ` (`question-topic-reviewed.json`, elle okuma; aynı metinli kopyaya `CONTENT_READ_COPY`). `question-topic-applied.json` önceki turda tamamlananları yeniden planlar, eğitimde etiket saymaz. Karşılığı olmayan konular en yakın Excel konusuna konur ve öğretmen onayı bekler (`PRIMARY/CANDIDATE`, `review.status=PENDING`, `TOPIC_APPROVAL_REQUIRED`, `QUESTION_TOPIC_COMPLETION`); mevcut Excel konusu olan soruya dokunulmaz. `examIds` kaynak sınavı da içerir; bu bağlar öğretmen onayı değildir.

## Sınav hedefleri ve ekran erişimi

`ExamTrackGate` her rotayı bir bölüme eşler (`curriculum`, `past-questions`, `study`, `statistics`, `question-bank`…). Sınav `ACTIVE` değilse veya bölüm `ready_features`'ta yoksa sayfa yerinde "hazırlanıyor" bilgisi gösterir; kayıt ayrıntıları ve haftalık program her sınavda açıktır; `PLANNED` sınav seçilemez. Sınav değişince sorgu parametreleri temizlenir. Ekranlar `useExamTrack()` (`exams`, `questionSources`, `examLabel`, `bankName`) kullanır; sabit TYT/AYT listesi yalnız YKS sayfalarındadır. `ExamTrackService.scope` her soru süzgecini seçili sınava sınırlar; deneme ve oturumlar `track_id` ile kaydedilir; KPSS ağırlık ve süreleri `exam_tracks.sections`'tan okunur.

## Arayüz ve tablolar

- `originalTitle`/`originalFilename` korunur; `displayTitle` `Sınav | Branş | Konu | Alt konu | Kaynak/Hoca | Tür` biçiminde üretilir (boş alan atlanır, geniş kapsam "Karma konular", aday kapsam tahmin diye belirtilir). Dosya adı etiket değişti diye değişmez.
- Öğrenci API'si görünen adı etkin öğretmen etiketleriyle yeniden hesaplar; liste yanıtına iç analiz metni, dosya yolu, cevap anahtarı, öğretmen kimliği girmez. `frontend/src/resourceMetadata.js` sayfa/zaman gösterimini ve konumlu URL kurallarını paylaşır.
- Bütün tablolar `frontend/src/components/DataGrid.jsx` (AG Grid Community), renkler `theme.css` değişkenleri; başlık/hücre ortalı, grid alanı dolu (`fitContent=false`, `fitGridWidth` sürekli uyarlama, dar ekranda tablo içi kaydırma). `.xlsx` indirmesi yüklenmiş, süzülmüş ve sıralanmış tüm satırları alır, başka sayfa sorgulamaz.
- `Dersler` (`/dersler-ve-konular`): ders ve sınav seçimi tablo başlığında, solda yenilenen sıra numarası, hücre dikey dolgusu 4 px, satır aralığı 1,15 (tek satır 30 px, iki satır 46 px). Konu takibinde Soru bankası/Çıkmış soru hücreleri yalnız sayı; Çalış bağlantıları ve Bitti düğmesi tek satır. PDF envanteri sütunları dar, Kanıt düğmesi ayrıntıyı tablonun altında açar. Soru listesi `fitAllRows` ile ölçer, "Soruyu aç" sütunu sabit genişliktedir.

## Soru süzgeçleri ve etiket anlık kayıtları

- Konu sayımı `category_ids` dizisini açar (kanıt JSON'u okunmaz); öğretmen kararı dizinin önüne geçer; yalnız doğrulanmış istenirse `scopeStatus` denetlenir. Sayım ve sayfalama PostgreSQL'de, JPA yalnız gösterilecek kimlikleri alır. Çoklu sınav/ders ilişkisi toplamı çoğaltmaz; PDF/video için tanımlı ama banka sorusu olmayan konu öneriye girmez.
- Kütüphane `match` ve seçim `categoryMatch` aynı `ANY/ALL` anlamındadır. `SharedQuestionLabels` ve `learning_catalog.question_ids_for_labels` gerçek etkin banka sorularını etkin öğretmen kararıyla seçer; kaynak arşivi ve not örnekleri pratik havuzuna girmez; kaynak damgası değişen soru yeniden etiketlenene kadar eski kapsamla seçilmez. Sonuç geniş facet sorgularında `MATERIALIZED` ile bir kez çözülür.
- Aday kapsam tercihi yalnız seçili kategori ilişkisini daraltır (V52). Adaylar kapalıyken yalnız `CONFIRMED` veya güncel insan onaylı ilişki kullanılır; UI sıfırın nedenini söyler ve adayları dahil etmeyi açık eylemle sunar. İnsan onayı veya kaynak damgası uydurulmaz.
- V44 ortak etiket/pratik seçim anlık kaydı, V46 deneme anı onaylı alt konu/soru tipi; tarihsel boşluk bugünün etiketiyle doldurulmaz. V47 onaylı soru tiplerini kaynak damgasına bağlar (damgasız onay saklanır, güncel seçimde sayılmaz); `current_question_taxonomy` yalnız kaynağı eşleşen kararı sunar. V48 `questionTypeId` ve `teacherDifficulty` boyutlarını ekler (öğretmen zorluğu yalnız güncel `APPROVE` kararından). V49 güncel görünümleri tekil sürümle sınırlar.
- Soru listesi `resource` içinde kütüphaneyle aynı projeksiyonu taşır; `/items?key=…` en çok 100 kaynağı döndürür; müfredat soru sayıları `/coverage` `bankCounts` tekil değerini kullanır.
