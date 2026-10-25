# Öğretmen Doğrulaması


> Bu belge çalışan ekranın güncel kullanım ve kayıt sözleşmesidir; ekran değişince aynı işte güncellenir. Yapılacak işler [numaralı planda](plan/00_YOL_HARITASI.md), devam noktası [devir dosyasında](plan/00_DEVAM.md) tutulur.

Sol menüdeki **Öğretmen Doğrulaması** bölümü 14 branşı aynı etiket sözlüğüyle açar. Başlangıç: `/ogretmen-dogrulamasi/fizik`. Her branşta konu/alt konu, ders notu, video, PDF ve soru kuyrukları vardır. Mevcut videolar yalnız fizik için hazırlanmışsa diğer branşların video kuyruğu boş görünür; içerik uydurulmaz.

## Hızlı kullanım

**Ortak ünite seçimi:** Excel'in ilk KONULAR sayfasından gelen TYT/AYT üniteleri
bütün branşlarda aynı DB sözlüğünden alınır; alt başlıklar ayrı seçenek değildir. Güncel kapsam `GET /api/learning-resources/metadata` üzerinden okunur. **Tahmini etiketleri
göster** düğmesi aday ilişkileri ayırır. Soru veya PDF satırını açın,
doğru üniteyi işaretleyin ve **Konuları kaydet ve sonraki** düğmesine basın.
Soru sekmesinde **Kaynak → Bütün kaynaklar** seçimi çıkmış ve banka sorularını
birlikte gösterir. Birden fazla gerçek konusu olan PDF için birden fazla seçim
yapılabilir. Belirsiz eşleşmeler tahmini adaydır; dar üniteye kanıt yoksa geniş
kapsam etiketi kalır. Sınıfı bilinmeyen kayıtta olası sınıflar tahmini olarak
filtrelenir; öğretmen bunları sınıf düğmelerinden düzelterek ayrıntılı kararla kaydeder.

Bu düğme yalnız konu kapsamını doğrular; cevabı, görseli veya PDF sayfa aralığını
onaylamaz. Diğer kontroller belirsiz, genel karar düzeltilecek kalır. Seçim
DB'deki karar/geçmişe yazılır; soru havuzu, güncel ilerleme ve PDF görünen adı
aynı kararı kullanır. Fiziksel dosya, soru cevabı ve öğrenci olayları değişmez.
Tam içerik onayı gerekiyorsa mevcut ayrıntılı kontrol/karar akışı kullanılır.

**PDF etiketleme:** Ekran ilk açılışta PDF kuyruğunu gösterir. Yerel OGM ve soru
bankası PDF'lerinin eski başlık kanıtları `pdf-review-labels.json` üretim girdisinde
korunur; çalışma anında ortak DB sürümüne yayımlanmış ünite etiketleri kullanılır.
Sorular, PDF'ler, videolar ve notlar aynı üniteleri kullanır. Etiket üretimi için
öğretmen hesabı gerekmez; otomatik etiket öğretmen onayı oluşturmaz. Kaynak
kütüphanesinde tahmini/onaylı/geniş kapsam ve sınıf filtreleri vardır.

Başlık çıkarımı metin katmanındaki başlık yazılarını, PDF yer imlerini ve gerektiğinde yalnız KONU satırındaki Türkçe OCR'ı kullanır. Sunuların ilk dört, diğer PDF'lerin ilk on iki sayfasındaki başlıklara bakılır; bütün paragraflar veya sorular analiz edilmez. Genel kitaplarda görülen başlıklara özel kapsam etiketleri eklenir; bütün içeriğin incelendiği iddia edilmez. Kaynak başlığı aynı kavramın farklı yazılışıysa ortak kimliğe bağlanır; örneğin TYT fizik hareket/kuvvet kaynakları `tyt.fizik.hareket-ve-kuvvet` kimliğini ve mevcut video alt konu kimliklerini paylaşır. Bölüm numarası yeni kategori oluşturmaz.

Satır açıldığında otomatik etiketler seçilidir; **PDF içindeki başlık dayanakları** sayfa numarasıyla gösterilir. Zorluk tahmin edilmez. Otomatik etiketler içerik doğruluğunun öğretmen onayı sayılmaz; kontrol/karar alanları incelenmedi olarak kalır. Kayıtlı öğretmen etiketleri önceliklidir; konusu boş eski bir kararda PDF başlık etiketleri boşluğu tamamlar. PDF bulunamazsa veya başlık okunamazsa mevcut katalog başlığı kullanılır ve dosya durumu korunur.

1. Sol menüden branş seçin. Yerel dev ortamında öğrenci görünümündeyken bu seçim mevcut `ivmeoperator` hesabıyla öğretmen görünümünü açar. Üretim/tünel erişiminde OPERATOR hesabıyla normal giriş gerekir. Birden fazla öğretmen için ayrı OPERATOR hesapları kullanılır.
2. Sınav, konu, kaynak veya inceleme durumuna göre filtreleyin. Zorluk/içerik türü/beceri filtreleri **Diğer filtreler** içindedir. Kaydın başındaki aşağı ok, hemen altına üç kompakt panel açar: konu eşleşmeleri, ortak etiketler, kontrol/karar. Panel sıralama sırasında kendi kaydını izler.
3. **Otomatik seç**, açık kaynak kimliğinden veya aynı sınav/branştaki birebir konu etiketinden öneri seçer. PDF/not başlığının konuya tam eşleşmesi de önerilebilir; kelime benzerliğinden kapsam tahmin edilmez. İçerik doğruluğunu onaylamaz; zorluk tahmin etmez. Seçilen etiketler yeşil ve onay işaretli görünür. İlgili ana/alt konular doğrudan görünür; **Tüm konular**, arama ve branş/sınav seçimi başka eşleşmeleri açar. **Grubu seç / Grubu temizle** görünen konu grubunu tek hamlede işaretler. Çoklu branş ve konu desteklenir. **Doğrudan konusu**, **İkincil konu**, **Ön bilgi** farklı ilişkilerdir.
4. Zorluk, içerik türü, beceri ve sınıflar tek tıklanan düğmelerle seçilir. **Önceki etiketler**, benzer kayıtları hızlandırır; otomatik seçim mevcut öğretmen etiketlerini korur.
5. Kontrolleri ✓ / ✕ / ? ile işaretleyin. **Uygun** kararına basmak bütün kontrolleri uygun yapar ve kısa bir gerekçe başlatır; bu düğme öğretmenin açık onayıdır. Düzeltme/emin değilim kararları kontrol edilmemiş alanları belirsiz olarak korur. Ayrıntılı başlık/cevap/bağlantı önerileri gerektiğinde açılır.
6. **Kaydet** veya **Kaydet ve sonraki** ile PostgreSQL'e yazın. **Ctrl + Enter** kaydedip görünür sıralamadaki sonraki kaydı açar. Taslaklar bu tarayıcıda kullanıcı/kaynak kimliğiyle saklanır; okla kapatıp yeniden açınca korunur, sunucu kaydı değildir. Kaydetmeden çıkarken uyarılır. Taslak saklanamıyorsa ekranda gösterilir.
7. **Kararları indir** bütün branşların kaydedilmiş kararlarını, kaynak ve kategori anlık kayıtlarını, inceleyeni, UTC zamanını ve bütün eski kararları JSON olarak verir. Ekran filtresiyle sınırlanmaz; tarayıcı taslaklarını içermez.

## Tek ortak etiket sözlüğü

`backend/src/main/resources/review-vocabulary.json` API doğrulaması ve React seçenekleri için aynı kaynaktır. Etiketler sabit kodla saklanır; Türkçe görünen ad kimlik değildir.

- Zorluk: `KOLAY`, `ORTA`, `ZOR`, `BELIRLENMEDI`, `UYGULANMAZ`. Öğretmen zorluğu öğrenci zorluk oylarından ayrıdır. Konu ağacında zorluk uygulanmaz; uzun bir PDF'nin tek zorluk derecesi yoksa belirlenmedi kullanılabilir.
- İçerik türü: konu anlatımı, konu özeti, tek soru, çözümlü örnek, konu testi, deneme, karma, uygulanmaz.
- Beceriler: bilgiyi hatırlama, kavrama, uygulama, analiz, yorumlama, akıl yürütme, hesaplama, deney/gözlem, problem çözme. Çoklu ve isteğe bağlıdır; derse özgü ölçme türlerinin yerine geçmez.
- İlgili sınıflar: 9–12, çoklu ve isteğe bağlı.
- Konu eşleşmeleri: TYT/AYT → branş → ana konu → mevcut alt konu/taksonomi. Aynı kayda en fazla 50 farklı kategori bağlanabilir. Onay için en az bir doğrudan konu gerekir.
- Kararlar: uygun, düzeltilecek, yanlış branş, kaldırılacak, emin değilim. Ayrıca incelenmedi ve yeniden kontrol sistem durumlarıdır.

Seçilebilir kategori havuzu yayımlanmış katalogdaki `selectable=true` konulardır (Excel ilk KONULAR sayfası + KPSS). Eski müfredat,
video alt konusu, arşiv ve `taxonomy_nodes` kimlikleri geçmiş ve yönlendirme için
korunur; ayrı ünite seçenekleri oluşturmaz. Kaynak eşlemesinin tahmini olması
öğretmen doğrulaması değildir. Yeni başlık önerisi gerekçe alanına yazılır;
serbest başlıktan yeni kontrollü kimlik üretilmez.

Bu düzen, SKOS'un sabit kavram kimliği ve hiyerarşi yaklaşımını ve Dublin Core'un konu, tür ve eğitim düzeyi alanlarını ayırmasını temel alan uygulama tasarımıdır; tam RDF/SKOS uygulaması veya standart sertifikasyonu iddiası değildir.

- https://www.w3.org/TR/skos-primer/
- https://www.dublincore.org/specifications/dublin-core/dcmi-terms/

## Kapsam ve doğruluk

`content_reviews` güncel kararları, `content_review_history` değiştirilmeyen geçmiş sürümleri tutar. V36 ilk fizik tablolarını oluşturur; V37 veriyi koruyarak bütün branşlar için yeniden adlandırır. İçe aktarma öğretmen kararını ezmez. API yalnız OPERATOR rolüne açıktır; öğrenci ve ürün yöneticisi ortak kararları okuyamaz/yazamaz. Yerel öğretmen kısayolu yalnız dev profili + doğrudan loopback isteğinde çalışır; tünel/forwarded istekler reddedilir, hesap oluşturmaz veya rol değiştirmez.

Konu onayı bağlı kaynakları onaylamaz. Başlık/kanal kontrolü video içeriğinin doğru olduğunu kanıtlamaz. Kayıt sırasında kaynak ve karar sürümü kontrol edilir; iki sekmenin eski sürümü kaydetmesi 409 ile reddedilir. Soru/çözüm görselleri ve PDF'ler detay/kayıt/dışa aktarım sırasında SHA-256 ile kontrol edilir. Yalnız dosya içeriği değiştiğinde liste sayacı metadata üzerinden eski durumu gösterebilir; detay ve dışa aktarım yeniden kontrol durumunu saptar. Kategori tanımı değişir/kaldırılırsa eski onay tekrar kontrol gerektirir. İnceleme anındaki kategori adları da kararın içinde korunur. URL sabitken dış YouTube içeriğinin değişmesi otomatik saptanamaz; gerekçeye dakika aralığı yazılmalıdır.

Kuyruklar fizik etiketli içerikle sınırlı değildir: diğer branş altında kalan içerik ilgili branşta veya bütün branşlar görünümünde bulunabilir. Geometri, matematik kaynaklarını; psikoloji/sosyoloji/mantık, ortak felsefe kaynaklarını aday olarak görebilir. Bu aday kapsamı kaynakların o branşa onaylandığı anlamına gelmez. Ders notlarının anlatımları, mini soruları, kendi kendine deneme soruları ve örnek açıklamaları da denetime dahildir.

## Sonraki içerik düzeltmesi

Kalan inceleme ve düzeltme işleri [7. adımda](plan/07_KALITE_VE_INCELEME.md), asıl kaynak/cevap düzeltmelerinin uygulanması [12. adımda](plan/12_KALAN_ICERIK_VE_YAYIN.md) takip edilir. Bu belge ekranın mevcut teknik davranışını anlatır; ikinci bir görev listesi değildir.

## Geliştirme

`node scripts/content-review-catalog.mjs` müfredat/video/not/etiket arşivinden API projeksiyonunu üretir. `--check` farkları reddeder. `npm run build` üretimi otomatik çalıştırır; yalnız backend derleniyorsa önce üretici çalıştırılmalıdır. Katalog elle düzenlenmez. Kaynak PDF'ler `TopicPdfService`, banka soruları PostgreSQL üzerinden alınır.

PDF etiketlerini yenileme sırası: `D:\workspace\ivme\.venv\Scripts\python.exe scripts/pdf-review-headings.py`, `node scripts/content-review-catalog.mjs`, `node scripts/pdf-review-labels.mjs`. İlk betik PDF envanterini ve başlık önbelleğini Git dışındaki `veri/pdf-review-headings.json` dosyasına yazar. Son betik ortak kategori kimlikleri ve etiketleri kalıcı API kaynağına üretir; `--check` tekrar üretilebilirliğini doğrular. Kaynak dosyalar başka makinede yoksa derleme kayıtlı etiket kaynağını korur. `node testler/pdf-review-labels.mjs` bütün PDF kayıtlarının konu/alt konu kimliklerini, sıfır etiketsiz kaydı ve ortak hareket/kuvvet referansını denetler. PDF'lerin gerçek dosya SHA-256 değerleri açılışta kontrol edilir; özgün dosyalar değiştirilmez. JSON dışa aktarımı otomatik PDF etiketlerini öğretmen kararlarından ayrı `automaticPdfLabels` alanında içerir.

Backend testleri: `ContentReviewFlowTest`, `DevLoginControllerTest`, `RoleBoundaryTest`, `TopicPdfServiceTest`. Testler yalnız `*_test` veritabanında çalışır. İçerik kaynağını değiştirmeden kayıt/geçmiş, eşzamanlı sürüm çakışması, dosya/kaynak değişikliği, çoklu branş-konu, ortak etiket filtreleri, metin soruları ve rol sınırını denetler.

`node testler/teacher-review-ui.mjs` izole `ivme_test` sunucusunda (8082; RoleBoundaryTest hesapları) gerçek tarayıcıda kaydetme, yeniden açma, çoklu branş, zorluk, dışa aktarma, taslak ve mobil görünümü denetler. `--live-read` mevcut yerel Vite sitesinde yalnız okuma yapar; öğretmen kararı yazmaz. `node testler/teacher-review-live-read.mjs` 14 branşın gerçek soru adaylarını, fizik görselini ve PDF açılmasını karar yazmadan kontrol eder.
