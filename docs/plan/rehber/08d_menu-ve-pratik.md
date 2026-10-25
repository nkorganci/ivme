# Sistem rehberi — Uygulamada adlandırma ve erişim — menü ve pratik

[Rehber dizini](../00_SISTEM_REHBERI.md) · Ne zaman okunur: Menü yapısı, pratik oluşturma, bitmemiş pratik.

## Menü ve pratik

`frontend/src/App.jsx` sayfaları rota açıldığında yükler; ilk pakette yalnız ortak kabuk ve giriş bulunur. Yükleme sırasında ortak `Loading` durumu gösterilir. Yeni sayfalar da rota düzeyinde yüklenir; büyük tablo, PDF ve sınav kodu başlangıç paketine eklenmez.

Ana içerik menüsü “Konular ve Kaynaklar”dır; “Soru Çöz & Pratik” ve Takip ayrı
amaç taşır. `frontend/src/config.js` içindeki `STUDY_LABEL` menü/bağlantı adını,
`STUDY_TITLE` ise “Pratik Yap ve Deneme Oluştur” sayfa başlığını belirler;
adres `/calisma/yeni` olarak korunur.
Soru, pratik ve deneme çözüm alanları `100dvh` içindeki kullanılabilir yüksekliği
paylaşır; sayfanın dış kaydırması içerik gizlenerek engellenmez. Masaüstünde soru
araçları üst satırdan başlar, karalama kalan panel yüksekliğini doldurur. Dar
ekranda görsel ve araçlar aynı ekranı dikey paylaşır; uzun geri bildirim ve araç
ayrıntıları kendi alanında kaydırılabilir. Üst bilgi tek satırdır; kaynak başlığı
gerektiğinde kısaltılır, tam metin başlık ipucunda, kaynak bağlantıları açılır
menüde korunur. Önceki, şıklar ve Sonraki/Bitir aynı satırda kalır.
Ortak `QuestionImage` içindeki soru, çözüm ve büyütülmüş görseller 2 px `--line`
çerçevesini kullanır; bu renk sayfadaki karalama ve kart çerçeveleriyle aynıdır.
Görseli ekrana sığdırma hesabı çerçevenin toplam 4 px payını da ayırır.
Pratikte fare veya A–E/1–5 ile şık seçimi mevcut `ANSWER` olayını hemen kaydeder;
ayrı kontrol düğmesi yoktur. Yanıt sürerken çift gönderim ve sorudan ayrılma
engellenir. Ağ hatasında aynı şıkkı tekrar seçmek mevcut olay kimliğini yeniden
kullanır; yanlış yanıt, yeniden deneme, cevabı gösterme ve atlama kuralları
sunucuda korunur. Çözüm görseli soru sayfasını uzatmadan iletişim kutusunda açılır.
Çalışma ekranında kendisine dönen sekme gösterilmez. Soru listeleri aynı bölüme
filtre bağlamını koruyan bir dönüş bağlantısı sunar; soru bankası ve çıkmış
sorular çalışma oluşturucusundaki “Kaynak” alanından seçilir.
Pratikte “Kaynak”, AYT/TYT çıkmış sorular ve AYT/TYT soru bankası için dört
işaretlenebilir seçenekli tek açılır menüdür; ayrıca sınav türü alanı gösterilmez.
Menü ve üstteki sayısal özet `questionSources.js` tanımını paylaşır. Birden fazla
seçim `source=CIKMIS_AYT&source=OGM_TYT` gibi banka–sınav çiftlerinin birleşimidir;
bankalar ve sınavların ayrı birleşimi diğer iki çifti havuza katamaz. V53 aynı
çift filtresini güncel ortak etiket havuzuna uygular; çoklu sınav etiketli soru
tekil sayılır. Sayım, ders/konu seçenekleri ve oturum oluşturma aynı `source`
dizisini kullanır; oturumun `catalog_filter.sources` alanı bu seçimi saklar.
Seçim URL'de korunur, eski `bank/examType` bağlantıları uygun kutulara çevrilir;
hiç kaynak seçilmemişse pratik başlatılamaz ve sınırsız havuz sorgulanmaz.
Pratikte ilk filtre satırında “Kaynak” ve “Öğretmen zorluk etiketi”, ikinci
satırda “Ders” ve “Konu” bulunur; dar ekranda da bu hizalama korunur. Ayrı
Genel/Ders/Konu kapsam düğmeleri ve “Branş seç” alanı gösterilmez. Dersin
başlangıç değeri “Bütün dersler”dir; tek ders seçilince konu açılır menüsü
etkinleşir. Konu seçilmezse dersin tamamı, en çok 20 kategori seçilirse
bu kategorilerin soru havuzu kullanılır. Seçim sonrası fare konu alanından
ayrılınca menü kapanır; seçili konular altta kaldırılabilir etiketler olarak kalır.
`SharedCategorySelect.branchFirst` görünümü `BranchCategoryPicker` kullanır;
ders kimlikleri yayımlanmış kategorilerin `subjectId` alanından alınır. Yeni
sözlük üretilmez. Kaynak/sınav/zorluk filtresinde soru içeren kategoriler ve
seçilmiş kimlikler gösterilir; zorlukta sonuç kalmasa da seçilen dersin adı
korunur. Konular sınav ve ders başlıkları altında gruplanır; arama seçili
derste çalışır. `branchId` URL'deki ders seçimidir; pratik sayımı ve oluşturma
bu kimliği mevcut `subject` API filtresine aktarır. `categoryId` kimlikleri
isteğe bağlı konu daraltmasıdır. Eski `scope` parametresi zorunlu seçim üretmez;
eski `subject`, `topic` ve kategori bağlantıları kendi filtrelerini korur.
Ders değiştirme önceki dersin konularını kaldırır; “Bütün dersler”e dönüş
ders/konu filtresini temizler. Kaynak değişimi de ders/konu seçimini temizler.
Eski çoklu branş URL'si ilk derse daraltılır; diğer dersin gizli konu filtresi
korunmaz. Liste kendi içinde kaydırılır; sürükleme seçimi kapatmaz. Katalog
okuma hatasında Kaynak alanı görünür kalır ve katalog yeniden denenebilir.
“Konu eşleşmesi” ve “Onaylı soru tipi” kontrolleri bu ekranda gösterilmez;
eski bağlantı bağlamları korunur.
Pratik kaynak menüsünde banka–sınav çiftlerinden ayrı `history=CORRECT` ve
`history=WRONG` seçimleri bulunur. Bunlar seçili kaynak havuzunu öğrencinin en az
bir kez doğru veya yanlış yanıtladığı sorulara daraltır; kaynak çifti seçilmemişse
bütün kaynaklar kullanılır. İkisi birlikte birleşimdir; aynı soru çoğalmaz.
Geçmiş yalnız öğrencinin tamamlanmış pratik `ANSWER` olayları ve teslim edilmiş
deneme yanıtlarından okunur; boş cevap, açık/iptal edilmiş çalışma ve başka
öğrencinin cevabı sayılmaz. V54 `completed_practice_attempts` görünümü oturuma
bağlı cevapları yalnız `COMPLETED` durumunda ortak hesaba açar; bağımsız tekil
soru pratiğinin oturumsuz olayları kayıt anında kullanılabilir. Havuz sayımı,
doğru/yanlış filtreleri, ilk yanıt istatistikleri, kategori ilerlemesi, öneriler
ve soru çözme süreleri aynı görünümü kullanır. Açık çalışmanın kendi soru/tur
ilerlemesi ham olaylardan okunur; farklı bir oturuma taşınmaz.
`availability.correct` ilk yanıt doğruluğunu göstermeye devam eder; `CORRECT`
geçmişi sonraki doğru yanıtları da kapsar. Yeni kimlik, kategori veya geçmiş
kopyası üretilmez. Sayım ve oluşturma aynı SQL koşulunu kullanır; seçim
`catalog_filter.history` içinde saklanır. Geçmiş kategorisi seçilince sunucu
seçim modunu `REPEAT` yapar ve ekrandaki çözülmüş soru kutusu gizlenir.
Geçmiş kategorisi yokken `includeSolved` (varsayılan `true`) URL'de saklanır;
işaretli kutu `MIXED`, işaretsiz kutu `NEW` oluşturur. Son geçmiş seçimi
kaldırılınca kutu önceki tercihiyle geri gelir. Kaynak, geçmiş ve kutu tercihi
yenilemede korunur; eski ayrı “Soru geçmişi” açılır menüsü gösterilmez.

Bitmemiş pratik hatırlatması `GET /api/study-sessions/unfinished-summary`
özetindeki `count` ve `latestSessionId` değerlerini kullanır. Sayım yalnız
öğrencinin `PRACTICE/IN_PROGRESS` oturumlarını kapsar; süre dolumu mevcut
sunucu kuralıyla kapatılır. Sıfır oturumda kutu gösterilmez. Uyarı öğrencinin
kaç pratiğe başlayıp bitirmediğini belirtir ve son açık pratiğe dönüş sunar;
sayım için soru listeleri veya bütün geçmiş sayfaları yüklenmez.
`/calisma/yarim-kalan` her açık pratik ve deneme için Devam et / İptal et sunar.
Pratik ilk tamamlanmamış turdan, deneme ilk yanıtsız sorudan devam eder.
`POST /api/study-sessions/{id}/cancel` pratiği `ABANDONED`,
`POST /api/exams/{id}/cancel` denemeyi `CANCELLED` yapar; yanıtlar silinmez,
sonuç üretilmez. Yalnız sahibi iptal edebilir; tekrar çağrı zararsızdır,
tamamlanmış çalışma iptal edilemez ve iptal edilmiş çalışma bitirilemez.
Pratik iptali cevap/bitirme ile aynı kullanıcı kilidini; deneme iptali,
cevap kaydı ve teslim aynı deneme satırı kilidini kullanır. Liste ortak
`DataGrid.fitContent` ile içeriğe göre ölçülür ve ayrılan genişliği doldurur; başlık/hücreler ortalanır ve
işlem düğmeleri dar ekranda sağda görünür kalır.
Deneme sorusunun geçici inceleme işareti de `exam_questions.flagged` alanında
saklanır; sayfa yenileme ve aynı hesapla ikinci oturumda geri gelir. Cevap ve
işaret isteği başarılı olmadan seçili/kayıtlı durum gösterilmez. Ders çizelgesinde
`math_tutoring_lessons.revision` eski oturumun yeni ders kaydını sessizce ezmesini
önler; toplu güncelleme tek işlemde geri alınır. Öğrenciye ait kalıcı değişiklikler
PostgreSQL tablolarında tutulur; `user_record_audit` değişiklik kimliğini kaydeder,
yanıt/pratik ve öğretim olayları kendi olay tablolarında kalır. Kaydedilmemiş form
taslağı veya gezinme filtresi tamamlanmış öğrenci kaydı sayılmaz.
Diğer ekranların ortak konu açılır listesi ve arama önerileri korunur.
Mevcut bağlantılardaki eşleşme/soru tipi bağlamı API sözleşmesine uygun korunur.
Çalışma kapsamı, kaynak, sınav ve ders URL'de tutulur; yenileme veya geri gezinme
seçimi kaybettirmez. Soru sayımı yanıtı istek bağlamının anahtarıyla tutulur;
geciken eski filtre yanıtı yeni seçimde gösterilmez. Aday seçeneği konu seçilince
görünür; eksik ders/konu seçimi, boş soru geçmişi, öğretmen zorluğu ve doğrulanmış
eşleme yokluğu aynı genel “soru yok” uyarısına indirgenmez.
