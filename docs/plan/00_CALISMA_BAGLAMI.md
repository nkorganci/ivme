# İvme — her oturumda okunacak çalışma bağlamı

Güncelleme: 18 Ekim 2026. Bu dosya kısa ve güncel tutulur; geçmiş işlerin dökümü veya ikinci bir yapılacaklar listesi değildir.

## Devam noktası

| Alan | Güncel değer |
|---|---|
| Çerçeve sürümü | `2026-10-18-uygulama-49` |
| Yerel ortamlar | Geliştirme `uygulama` / `feature/ivme-yol-haritasi` / 9091 / `ivme_dev`; yerel production `uygulama-main` / `main` / 9090 / `ivme`. Kaynaklar, build ve görsel/katalog kopyaları ayrıdır; iki izleyici `iki-ortami-baslat.ps1` ile açılır. Main tek HTTP portu açar; 5173 ek girişi kaldırıldı. Kullanıcı Cloudflare hedefini doğrudan `http://localhost:9090` yapar. `my-jenkins` durdurulmuş kalır. [Doğrudan port kabulü](../../veri/content-labels/integration/environment-direct-port-20261018/runtime-report.json); önceki [port testleri](../../veri/content-labels/integration/environment-ports-20261018/test-report.json) ve [ortam ayrımı kabulü](../../veri/content-labels/integration/environment-split-20261018/report.json) korunur. Git push yapılmaz |
| Kullanıcı yönetimi | Kullanıcının ek talimatları: tüm roller ve boş kategoriler; engelle/aç, geçmişi koruyan onaylı silme, açık oturum iptali ve self/son yönetici koruması. Eksik 2 production öğrencisi mevcut dev kayıtları korunarak alındı. Sonraki dev engelleme/silme durumları korunur, aktarım bunları geri açmaz. Her iş yerel commit edilir; feature geliştirmeden önce main kodunu alır. [Kabul](../../veri/content-labels/integration/account-management-20261018/report.json) |
| Kayıt onayı ve yerel test hesapları | Onaysız öğrenci/veli/öğretmen kaydı giriş yapamaz; yalnız site yöneticisi onay verir. Yerel dört rol tek tıkla değiştirilebilir. Feature test hesapları hazır. Migration, e2e/DB kabul kanıtı ve main hesap kurulumu merge ve iki yerel restart aşamasında: [kurulum kanıtı](../../veri/content-labels/integration/registration-approval-20261018/). Parola hashi BCrypt; ham parola yerel makinede tutulmaz. |
| Son dokümantasyon / kanıt | 18 Ekim 2026 — denemelerde öğrenci geçmişine göre ünite dengesi ve yıl seçimi: [19 backend testi](../../veri/content-labels/integration/exam-coverage-20261018/test-report.json), [arşiv/API](../../veri/content-labels/integration/exam-coverage-20261018/api-report.json), [sunulan sürüm ve açık izleyici](../../veri/content-labels/integration/exam-coverage-20261018/runtime-report.json). Matematik Geometriyi, AYT Felsefe Grubu dört ilgili branşı kapsar. 13. adımın kullanıcı yönetimi tasarım önerisi ve ayrıca uygulama talimatı gereği korunur |
| Eşzamanlı kullanıcı görevi | Bütün branşlar Ark referansındaki 237 üniteye bağlandı (106 TYT / 131 AYT). Biyoloji 25 ünite. Tahmini ünite/sınıf etiketleri ve öğretmen filtreleri etkin; alt başlıklar ayrı seçenek oluşturmaz |
| Aşama | DB'den ortak kategori/PDF etiket okuması, ekran/takip teknik kabulü ve aynı disk yedek/geri yükleme tamam. Açık işler 7 ve 12'de gerekçeli durum etiketleriyle korunur; bütün içerik/alan incelemesi tamamlanmış değildir |
| Etkin görev | `07.02` — teknik ünite geçişi tamam; tahmini ünite/sınıf ve kaynak kapsamları gerçek öğretmen kontrolünü bekler. Hiçbir soru/PDF etiketsiz değildir |
| Sıradaki görev | `07.02` — bütün branşlarda Tahmini etiketleri göster filtresiyle gerçek kaynak/ünite/sınıf kontrolünü yapmak; diğer 7/12 girdileri korunur |
| Son kapanan görev / kanıt | 237 ortak ünite — [tüm branşlar masaüstü/mobil](../../veri/content-labels/integration/units-20261017/live-report.json), [backend/JS ve kaynak kabulü](../../veri/content-labels/integration/units-20261017/test-report.json), [11 tablonun eski kayıtları ve eşzamanlı iki yeni pratik korundu](../../veri/content-labels/integration/units-20261017/protected-data-check.json). Önceki 46 fizik başlığı yeni ortak referansa yönlenir |
| Yarım iş / devam dosyası | Deneme kodu hazır; TYT'nin bütün yıllarındaki birleşik Türkçe kartları ve diğer eksik/iptalli arşivler `12.01` kapsamındadır, tam sınav gibi başlatılmaz. [Arşiv farkı](../../veri/content-labels/integration/exam-coverage-20261018/api-report.json). Öğretmen onayı otomatik yazılmadı; kaynak izleyicisi ve başlangıç kısayolu korunur. Git push veya yeni dış dağıtım yapılmadı |
| Plan doğrulaması | Uygulama sırasındaki açık adımlar 7 ve 12; 13 yalnız kullanıcı yönetimi tasarım önerisidir ve ayrıca uygulama talimatı bekler. Görev numaraları değişmedi. Gerçek ünite/sınıf kontrolü 07.02 kapsamındadır; mevcut uygulama sayacı `veri/content-labels/plan-check.json`, bu belge değişikliği için yeniden üretilmedi |
| Kaynak sürümü dayanağı | JSON/PostgreSQL `labels-v1-1db5fb96f9ac276a426fce1b`: 85.824 kayıt, 4.891 kategori, yalnız 237 seçilebilir ünite. 81.810 soru kaydı / 2.713 PDF etiketi; etiketsiz veya sınıf tahmini olmayan sıfır. 2.698 fiziksel PDF / 2.702 hash denetlendi. Eski kaynak kimlikleri ve 11 öğrenci/soru/inceleme tablosunun eski kayıtları korundu |
| Ortak sözlük/ad/konum sözleşmesi | Sözlük `taxonomy-v1-a12a9bbf6618ea6a8925477a`; `learning-resource-v2`. Bütün branşlar `canonicalUnit/canonicalTopicIds/order/selectable/estimatedGrades` alanlarıyla aynı sözlüktedir. `gradeStatus=ESTIMATED` öğretmen onayı değildir |
| Bekleyen dış girdi | Görev bazında ilgili adımda tutulur; burada ikinci kuyruk açılmaz |

Her çalışma oturumunun başında bu alanları gerçek dosya/rapor/API durumu ile karşılaştır. Tamamlandığı kanıtlanmayan işi kapanmış sayma. Yarım iş varsa yeni iş başlatmadan devam et; bağımsız işi yapmaya devam edebilirsin. Kullanıcının yeni talimatı önceliklidir.

Kullanıcının 16 Ekim ek talimatı: okunamayan/boş adayda alternatif çıkarım/OCR
yöntemini dene; sonuç alınamazsa kaynak ve sayfayı `Boş/okunamayan — manuel
inceleme` durumuyla koru. Bu kayıtlar otomasyonu veya sonraki entegrasyonları
bekletmez. İşleyen yöntem ve önbellek anahtarı sistem rehberinde kaydedilir.
İnsan incelemesi yapılmış gibi onay yazılmaz; manuel işaretli kaynak ile
tamamlanmış teknik işi ayırarak sıradaki işi uygula.

## Ortak referans kayıtları

| Bilgi | Şimdiki dayanak / kullanım |
|---|---|
| Genel sıra ve kapsam | [00_YOL_HARITASI.md](00_YOL_HARITASI.md) |
| İlerlemem konu/öğrenci istatistikleri | [Tek ders seçimi, yayımlanmış kimlik/hücre eşleşmesi](../../veri/content-labels/integration/topic-progress-20261017/live-report.json), [9 JS / 4 backend testi](../../veri/content-labels/integration/topic-progress-20261017/runtime-report.json). Tüm geçmişin ilk karşılaşmaları, çözülmemiş başlıklar sıfır, net = doğru − yanlış / 4 |
| Tablo genişliği ve duyarlı sütun dağılımı | [12 ekran / 24 görünüm / 34 grid kabulü](../../veri/content-labels/integration/grid-fill-20261017/live-report.json), [11 JS testi ve runtime](../../veri/content-labels/integration/grid-fill-20261017/runtime-report.json). DataGrid tam genişlikte kalır; yatay/dikey ortalama ve dar kontrollerin sınırları korunur; tercih AGENTS.md'de kalıcıdır |
| Çalışan sürüm ve otomatik güncelleme | [Runtime kabulü](../../veri/content-labels/integration/runtime-refresh-20261016/report.json): `/calisma/yeni` doğrudan açılış/yenileme, 13 bağımsız yönlendirme testi, tarayıcı yenilemesi, kaynak izleyicisi ve Windows başlangıç kısayolu |
| Soru filtresi API/ekran kabulü | [API](../../veri/content-labels/integration/question-filter-20261016/api-report.json): 59 gerçek istek, banka/TYT/AYT/ders/konu sayımları ve kategori seçilmeden aday tercihi tutarlı. [UI](../../veri/content-labels/integration/question-filter-20261016/ui-report.json): 1280/390 px kaynak/konu/yenileme, yerel/paylaşılan sürüm eşitliği; 33 backend ve 7 JS testi |
| Deneme oluşturucu sınav/banka kabulü | [Kaynak adları ve sınav kapsamı](../../veri/content-labels/integration/full-exam-scope-20261017/report.json); [çözülmüş soru tercihi ve tekil sayım](../../veri/content-labels/integration/full-exam-history-20261017/report.json). Yeni seçenek ve özet mevcut banka/ortak etiket havuzunu kullanır |
| Soru özeti tablo sunumu | [Güncel canlı hizalama ve hücre ölçümleri](../../veri/content-labels/integration/study-refinement-20261017/live-report.json): form kartıyla aynı 680 px üst sınırı, `DataGrid.dense` ile 34 px satırlar ve ortalama; mobil kaydırma çubuğu sayıları örtmez. `fitContent` diğer çağrılarda korunur |
| Pratik kaynak seçimi ve konu kaydırma | [Canlı ekran/API](../../veri/content-labels/integration/practice-sources-20261017/live-report.json), [15 izole oluşturma](../../veri/content-labels/integration/practice-sources-20261017/ui-report.json), [test ve V53 kanıtı](../../veri/content-labels/integration/practice-sources-20261017/test-report.json). `source` banka–sınav çiftlerinin birleşimidir; menü ve özet `questionSources.js` kullanır |
| Pratikte tek branş ve çoklu konu seçimi | [Canlı kabul](../../veri/content-labels/integration/study-refinement-20261017/live-report.json), [yalıtılmış oluşturma](../../veri/content-labels/integration/study-refinement-20261017/ui-report.json). “Bütün branşlar” veya tek branş seçilir; en çok 20 konu/alt konu işaretlenir. Eski çoklu branş URL'si ilk branşa daraltılır. `branchId` gezinme seçimi; sayım/oluşturma mevcut `categoryId` kimliklerini kullanır |
| Pratik filtre yerleşimi ve açılır konu seçimi | [Canlı ekran/etkileşim](../../veri/content-labels/integration/practice-layout-20261017/live-report.json), [çalışan sürüm](../../veri/content-labels/integration/practice-layout-20261017/runtime-report.json). Kaynak/zorluk ve Ders/Konu masaüstü/mobilde aynı satırlarda; konu menüsü seçim sonrası fare ayrılınca veya dışarı tıklayınca kapanır, seçimler altta korunur. Üst özet rakamları normal yazı stilindedir |
| Bitmemiş pratik hatırlatması ve çizgisiz rakamlar | [Canlı ekran](../../veri/content-labels/integration/practice-reminder-20261017/live-report.json), [0/1/3 oturum ve sahiplik/süre/bitirme testleri](../../veri/content-labels/integration/practice-reminder-20261017/test-report.json). `/api/study-sessions/unfinished-summary` yalnız öğrencinin açık pratik sayısını ve son oturum kimliğini döner; sıfırda kutu gizlenir. Özet sayıları alt çizgi olmadan kaynak filtresi işlevini korur |
| Pratikte çözülmüş sorular ve doğru/yanlış geçmişi | [Güncel V54 ve testler](../../veri/content-labels/integration/unfinished-actions-20261017/test-report.json). `history=CORRECT/WRONG` yalnız kendi tamamlanmış pratikleri, bağımsız soru pratiği ve teslim edilmiş denemeleri kullanır. Açık/iptal edilmiş çalışmalar dışarıda kalır; birleşim tekildir. Geçmiş yokken `includeSolved` kutusu `MIXED/NEW` seçer; geçmiş varken gizlenir ve sunucu `REPEAT` kullanır. Etiket sürümü değişmez |
| Deneme planı ve konu dengesi | [19 backend testi](../../veri/content-labels/integration/exam-coverage-20261018/test-report.json), [24 oluşturma kombinasyonu ve mobil/masaüstü](../../veri/content-labels/integration/exam-coverage-20261018/isolated-ui-report.json), [canlı ekran](../../veri/content-labels/integration/exam-coverage-20261018/ui-report.json). Genel/branş/özel denemeler önce ünite kapsamını, sonra öğrencinin az/eski sorulan konularını gözetir; iptal edilen ve başka öğrencinin denemeleri dışarıda kalır. Kotalar tek SQL'de sayılır, adaylar branş–ünite başına toplam soru sayısıyla sınırlanır; öğrenci kilidi eşzamanlı oluşturmaları sıralar |
| Yıla ait tam sınav | V57/V58 `exam_archive_positions`: 2.466 korunmuş tekil kimlik; kaynak/görsel/cevap/etiket ve eski sonuçlar değişmez. [Canlı arşiv](../../veri/content-labels/integration/exam-coverage-20261018/api-report.json): AYT sayısal 2018–2025; eşit ağırlık/sözel 2018 ve 2020–2025 hazır. TYT'de her yıl Türkçe 34/40; 2019'da ayrıca Matematik 39/40. Eksik arşivlerin tamamlanması `12.01` işidir; yıl seçimi eksikleri gösterir |
| DB/ekran ve yedek kabulü | [DB tek doğruluk kaynağı kabulü](../../veri/content-labels/integration/database-authority-20261016/report.json): 36 backend ve 19 JavaScript testi, build/UI, JSON/DB/API farkı sıfır. [Yedek/geri yükleme](../../veri/content-labels/backup-restore/ivme-20261017-003903.json): 44 DB denetimi, 262.841 dosya, 19.825.481.098 bayt; aynı disk olduğu kayıtlı |
| Kalıcı sistem kurgusu ve tekrar önleme | [00_SISTEM_REHBERI.md](00_SISTEM_REHBERI.md); kullanıcı isteğiyle korunur, görev listesi değildir; sistem değişince güncellenir |
| Yapılacak işin tanımı | Yalnız seçilen numaralı adım dosyası |
| Etkin yayımlanmış kategori kimlikleri | PostgreSQL `learning_catalog.current_run/current_categories`; salt okunur API `GET /api/learning-resources/metadata` |
| Yerel üretilmiş sözlük ve ilişkiler | `veri/content-labels/labels.json`; büyük dosyanın yalnız ilgili branş/kategori parçasını oku |
| Diğer kontrollü etiket boyutları | `backend/src/main/resources/review-vocabulary.json` |
| Mevcut müfredat/sınav/ders ağacı | `frontend/src/curriculum.js`; yayımlanmış kimlikleri değiştirerek yeniden oluşturma |
| Kaynak ve karar kanıtları | `veri/content-labels/report.json`, `audit.json`, `source_research`, `content_reviews/content_review_history` |
| Sürüm/fark doğrulayıcısı | `scripts/content-label-reconcile.py`; kullanım ve kapsam [ortak etiket kaydında](../ORTAK_ETIKET_KAPSAMI.md); denetim içerik doğruluğu onayı değildir |
| Kaynak kimliği ve işlem farkları | `scripts/content-label-workset.py`; sürümlü `veri/content-labels/inventory/<runKey>-<zaman>/report.json`, `resources.jsonl`, `gaps.jsonl`; uzak video erişimi bilinmiyorsa `REMOTE_NOT_CHECKED` |
| Yapısal envanter dayanağı | `veri/content-labels/inventory/labels-v1-46db17fefdb317bd15b899e9-20261016T203124462177Z/report.json`; önceki sürümün 85.570 kaydı/66.969 yapısal iş farkı. Güncel sürüm farkı kaynak uzlaştırmasındadır; kalite risk kuyruğuyla aynı sayaç değildir |
| Soru/not sürüm kanıtı | `veri/content-labels/question-checks/labels-v1-00509791e46290a42506896e/report.json`; 81.626 soru, 68.944 güncel araştırma kaydı, 473 güncel not örnek referansı. 55 not taslağının 109 gerçek soru bağı/PDF sayfası denetlendi; insan onayı değildir |
| Tek sözlük üretim kaynağı | `backend/src/main/resources/content-taxonomy.json`; `scripts/content-taxonomy.mjs`, `scripts/canonical-units.mjs`; `taxonomy-v1-a12a9bbf6618ea6a8925477a`. Üretilmiş kimlik projeksiyonu elle değiştirilmez; çalışma anında DB metadata kullanılır |
| Etiket/konum/adlandırma sözleşmesi | `docs/plan/sema/learning-resource-v2.schema.json`; `scripts/learning-resource-contract.mjs`, `learning-resource-check.mjs`; ad/konum sunumu `frontend/src/resourceMetadata.js` |

Kaynaklar uyuşmazsa birini sessizce doğru ilan etme: 01.01 fark raporunu ve güncel kaynak sürümünü kullan. Üretilen JSON dosyaları elle düzeltilmez; değişiklik üretim kaynağında yapılır. Her branş için ayrı sözlük açılmaz. Ders ve alt kategoriler prompt içinde yeniden icat edilmez; kayıtlı kimliklerden seçilir.

## Kalıcı etiket, kaynak ve adlandırma kuralları

Bu bölüm adım dosyaları silindikten sonra da geçerlidir. Hedef veri sözleşmesidir; bu kuralların burada yazması uygulamada tamamlandığı anlamına gelmez. Kesinleşen şema/üretici yolları yukarıdaki referanslara eklenir; bütün ayrıntılar tekrar buraya kopyalanmaz.

- Tek kontrollü sözlük: sabit kategori kimliği, Türkçe görünen ad, üst/alt ilişki, branş ve sınav kapsamı. Eş adlar alias ile çözülür; ad değişince kimlik değişmez.
- Tek kaynak kaydına çok sayıda kategori ilişkisi bağlanabilir; her ilişki kendi kanıtını, güvenini ve kaynak aralıklarını taşır. `PRIMARY/SECONDARY/PREREQUISITE`, aday/kesin kapsam ve öğretmen onayı ayrı bilgilerdir.
- Her kaynak en az bir etiket alır. Kanıt yetersizse bilinen en geniş kapsam ve düşük güven; kapsam da bilinmiyorsa kontrollü inceleme etiketi kullanılır. Rastgele dar konu atanmaz.
- Güven `LOW/MEDIUM/HIGH` ve kısa gerekçeyle tutulur; OCR okunabilirliği, konum doğrulaması ve öğretmen onayı ayrı değerlendirilir. Kaynak/sözlük değişince etkilenen karar yeniden incelemeye gider; geçmiş karar korunur.
- PDF: fiziksel 1 tabanlı başlangıç/bitiş sayfası, ikisi de dahil. Basılı sayfa numarası ayrıca tutulur. Kesintili konu bölümleri ayrı aralıklardır; aralık sayfa sayısını aşmaz.
- Video: başlangıç dahil/bitiş hariç saniye aralığı; `0 ≤ başlangıç < bitiş ≤ süre`. Ekranda `HH:MM:SS–HH:MM:SS` gösterilir. Soru için kod/PDF sayfası/kırpım; not için sabit bölüm ve destek kaynağı ayrı tutulur.
- Konum durumları: `MISSING/NOT_APPLICABLE/ESTIMATED/VERIFIED`. Okunamayan kaynağa sayfa veya dakika uydurulmaz; erişim ve eksiklik nedeni saklanır.
- Özgün başlık/dosya adı ve kalıcı kimlik korunur. Ortak görünen ad: `Sınav | Branş | Konu | Alt konu(lar) | Kaynak/Hoca | İçerik türü`. Boş alan/ayraç atlanır; tahmini kapsam açıkça belirtilir.
- Çok konulu kaynakta bütün ilişkiler metadatada kalır; geniş kaynak için “Karma konular” ve tam etiket listesi kullanılır. Konuya özel referans, kaynak adının yanında kendi sayfa/zaman aralığını gösterir.
- Fiziksel dosyalar etiket değişince yeniden adlandırılmaz. İndirme adı okunur slug ve kısa kalıcı kimlikten türetilebilir; asıl video başlığı/URL'si korunur. Taşıma gerekirse yol manifesti, hash ve referans güncellemesiyle ayrı yapılır.
- Sayımlar tekil kaynak/soru kimliğine dayanır; çoklu etiket öğrenci olayını çoğaltmaz. İlk deneme ve geçmiş etiket sürümü korunur. Etiket güncellemesi cevap anahtarını veya öğrenci geçmişini sessizce değiştirmez.
- Önce mevcut çıktı/hash önbelleği ve kurallar, sonra gerekli sayfada OCR; yalnız belirsiz bölümde AI. Yeni kaynaklar da aynı sözlük, adlandırma ve konum doğrulamasından geçer.

## Her prompt için çalışma protokolü

1. Kök `AGENTS.md`, bu dosya, yol haritası ve seçilen adımı oku; `git status` ile mevcut kullanıcı değişikliklerini gör. Yalnız görevin ilgili kaynak/sözlük dalını ve kodunu aç.
2. Görevin hâlâ açık olduğunu kanıtlarla kontrol et. Zaten kapanmışsa yeniden üretme; plandaki eski maddeyi kaldır, devam noktasını düzelt ve istenen adım içindeki ilk açık işe geç.
3. Başlarken etkin görev kimliğini ve kaynak/sözlük sürümünü bu dosyaya yaz. Önceki yarım grubun çıktı/checkpoint yolunu kullan; tüm içeriği yeniden okuma.
4. İşin gerektirdiği en küçük tekrar edilebilir betik/komutu kullan. Şema, alias, adlandırma ve kaynak aralığı kurallarını tek kaynaktan al. Yeni genel karar gerekiyorsa ilgili sözleşmeyi ve bu dosyanın referansını birlikte güncelle.
5. Yalnız görev kapsamındaki değişikliği yap, ilgili denetimi çalıştır ve kanıtı küçük rapora veya commit'e bağla. Kaynaklar ve öğrenci/öğretmen geçmişi korunur. Bir grup bitti diye bütün adımı tamamlanmış sayma.
6. Sonuçta bu dosyanın devam noktasını; ilgili adımın yalnız açık alt işlerini; sıra/bağımlılık değiştiyse yol haritasını aynı iş içinde güncelle. Kapanan alt görevi aktif listeden çıkar; adım tamamen biterse kalıcı kuralları/kanıtı koruyup dosyasını sil. Görev kimliklerini yeniden kullanma veya kalanları yeniden numaralama.
7. Son kapanan görev için yalnız tek satır kanıt bağlantısı tut; eski ayrıntı sürümlü raporda/commit geçmişinde kalsın. Yarım işte `itemKey`/sayfa/zaman/parti ve sonraki eylemi yaz. Ayrı “yapılanlar” ve “eksikler” listesi açma.

Tamamlanan adımın kabul ölçütleri doğrulanınca önce kalıcı kararları ilgili teknik belge/sözlük/şemaya aktar, bu dosyadaki sürüm/kanıt referanslarını güncelle; sonra adımın `.md` dosyasını sil. Tamamlanan adım için kısa özet dosyası veya arşiv klasörü bırakma. Yol haritasındaki satırını kaldır; kalan adımların bağımlılıklarını ve silinen dosyaya giden bütün bağlantıları güncelle. `01` bittiğinde kalan ilk dosya `02` ve başlığı “2. Adım” olarak kalır; hiçbir adımı veya alt görevi yeniden numaralama. Yarım adım silinmez. `00_` belgeleri, kullanılan teknik belgeler, şemalar ve gerçek çıktılar kalıcıdır.

## Her adımda kopyalanabilir prompt

Adım dosyalarının sonundaki “Kopyalanacak prompt” doğrudan kullanılabilir. Bir adım seçmeden sıradaki işe devam etmek için:

```text
D:\workspace\ivme\uygulama projesinde devam et.
Önce AGENTS.md, docs/plan/00_YOL_HARITASI.md ve
 docs/plan/00_CALISMA_BAGLAMI.md dosyalarını oku.
Çalışma bağlamındaki yarım işe, yoksa sıradaki açık göreve devam et.
Bu prompt seçilen uygulama işini yapma talimatıdır; yalnız plan çıkarma.
İlgili adımın kabul ölçütünü ve ortak sözlük/adlandırma/kaynak aralığı
sözleşmesini kullan. Önce mevcut kanıtı kontrol et; biteni yeniden yapma.
Betik ve önbelleği önce kullan, AI'ya yalnız çözülemeyen kısa parçayı ver.
Mevcut kullanıcı değişikliklerini ve kaynak/öğrenci/öğretmen kayıtlarını koru.
Gerçek veriyi sıfırlama; yayın/push için mevcut kullanıcı yetkisini aşma.
Gerekli doğrulamayı yap. İş bitince çalışma bağlamını ve ilgili adımın
kalan işlerini güncelle; kapanan işleri aktif listeden çıkar.
Adım tamamen bittiyse kalıcı kuralları/kanıtı koruyup görev dosyasını sil;
bağlantıları güncelle, kalan adımların numarasını değiştirme.
Sonuçta ne değiştiğini, kanıt yolunu ve sıradaki görev kimliğini kısa yaz.
```

Bu protokol bir sohbetin tüm eski konuşmaları kendiliğinden hatırladığı varsayımına dayanmaz. Süreklilik, her seferinde okunan bu kısa dosya ve sürümlü çıktı referanslarıyla sağlanır. Gelecekte yeni görev eklenirken aynı prompt ve kapanış kuralları kullanılır.
