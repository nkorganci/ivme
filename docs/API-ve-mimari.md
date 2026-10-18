# İvme API ve mimari sözleşmesi


> Güncel yapılacaklar yalnız [numaralı planda](plan/00_YOL_HARITASI.md), devam noktası [çalışma bağlamında](plan/00_CALISMA_BAGLAMI.md) tutulur. Bu belgedeki tarihli sonuçlar teknik kanıttır; uygulama sırası değildir.

Güncelleme: 2026-10-18. React 19/Vite ve Spring Boot 3.5/Java 21 iki ayrı Git worktree içinde paketli çalışır: `main` (`uygulama-main`) yerel production olarak `127.0.0.1:9090` / PostgreSQL `ivme`; `feature/ivme-yol-haritasi` (`uygulama`) geliştirme olarak `127.0.0.1:9091` / PostgreSQL `ivme_dev`. Her ortamın kaynakları, build çıktısı, görselleri, PDF katalog kopyası ve kaynak izleyicisi ayrıdır. İsteğe bağlı Vite akışında feature API portu 8082'dir. İki yerel paket mevcut otomatik giriş davranışı için Spring `dev` profilini korur. Dış adres `https://net.ivme.dev`, mevcut Cloudflare hedefi `http://localhost:5173` üzerinden main'in aynı sürecine ulaşır. Ek Tomcat girişi yalnız `YKS_TUNNEL_PORT=5173` ile, loopback'te açılır; feature'da kapalıdır. Başlatma ve merge akışı [README](../README.md) içindedir.

## Kimlik ve erişim

`POST /api/auth/register` `{username,email,phone,password}` → 201; `POST /api/auth/login` `{login,password}`; `POST /api/auth/logout`; `GET /api/auth/me`. `login` kullanıcı adı veya e-posta olabilir. Kayıtta e-posta ve telefon zorunlu, ancak şimdilik doğrulanmaz. Parola en az 8 karakter ve BCrypt sınırı gereği en çok 72 UTF-8 bayttır. `GET/PUT /api/account/contact` ve `PUT /api/account/password` kendi hesap bilgileri içindir; değişiklikte mevcut parola gerekir. `UserDto` içindeki `passwordChangeRequired` ayrıcalıklı hesabın geçici parola durumunu gösterir. Yalnız öğrenci için `POST /api/account/export` `{currentPassword}` kendi verilerini `no-store` JSON olarak döndürür; `POST /api/account/delete` `{currentPassword,confirmation:"HESABIMI SIL"}` hesabı ve kişisel verilerini tek işlemde silip oturumu kapatır. Ortak sorular ve başka hesaplar korunur; eski yedekler bu canlı işlemden ayrı kalır.

Oturum `HttpOnly`, `SameSite=Lax` çereziyle taşınır. Main `JSESSIONID` / `XSRF-TOKEN`, feature `IVME_DEV_SESSION` / `XSRF-TOKEN-DEV` çerezlerini kullanır; değiştirici istekler kendi ortamının CSRF çerezinden `X-XSRF-TOKEN` başlığı gerektirir. Ayrı çerez adları aynı tarayıcıdaki localhost portlarının oturumları bozmasını önler. Üretimde iki çerez de `Secure`, HTTPS dış adresi zorunludur. `X-Forwarded-*` işlenmez. Yalnız loopback'ten gelen `CF-Connecting-IP` giriş/kayıt hız sınırı için değerlendirilir. Geçici parolalı `ADMIN`/`OPERATOR` dış alan adından giriş yapamaz ve üretim başlatılamaz.

| Rol | İzinli alan |
|---|---|
| `USER` | Kendi soru, sınav, geri bildirim ve hesap akışı |
| `ADMIN` | `GET /api/admin/stats`; yalnız kayıtlı öğrenci ve tamamlanan deneme sayısı |
| Ek `SITE_MANAGER` yetkisi | `GET /api/admin/students`; salt okunur öğrenci listesi ve araması. ADMIN rolüne otomatik verilmez |
| `OPERATOR` | `/api/operator/**`; soru ve geri bildirim bakımı, CSV/JSON içe alma |

## Soru ve sınav uçları

| İstek | İşlev |
|---|---|
| `GET /api/questions/filters?bank=CIKMIS|OGM&source=` | Koleksiyona veya seçili banka–sınav çiftlerine göre sınav türü/ders/konu ve sayı |
| `GET /api/questions?bank&examType&subject&topic&page&size` | Sayfalı etkin soru listesi |
| `GET /api/questions/availability?bank&examType&subject&topic&history` | Kendi toplam/çözülen/kalan/en az bir kez yanlış yapılan tekil soru sayıları; isteğe bağlı tekrarlı `history=CORRECT/WRONG` değerleri havuzu en az bir kez doğru/yanlış yanıtlanan soruların birleşimine daraltır. `correct` öğrencinin soru başına ilk yanıtında doğru çözdüğü tekil soru sayısıdır. Oturumlu pratik yalnız tamamlanınca, bağımsız soru pratiği kaydedilince, deneme teslimde sayılır; açık/iptal edilmiş çalışmalar hesaba girmez, tekrarlar toplamı artırmaz |
| `GET /api/questions/code/{code}`, `GET /api/questions/{id}` | Soru künyesi; doğru cevap içermez |
| `GET /api/questions/{id}/neighbor?direction&bank&examType&subject&topic` | Filtre içindeki komşu soru |
| `GET /api/questions/{id}/image`, `/solution-image`, `/qr` | Soru/çözüm görseli ve sabit adrese QR; çözüm görseli yalnız cevap görüldükten veya sınav tesliminden sonra (operatör ön izlemesi hariç) |
| `GET /api/questions/{id}/practice?sessionId?` | Yalnız giriş yapan öğrencinin ilgili oturumdaki (kimlik yoksa bağımsız pratikteki) son turu ve olayları; doğru cevap başlangıçta ve yanlış sonrası gizli |
| `POST /api/questions/{id}/practice` | `{clientEventId,eventType,answer?,activeSeconds?,sessionId?}`; `ANSWER`, `REVEAL`, `SKIP` kayıtları; oturum kimliği varsa sahibi ve soru üyeliği doğrulanır; aynı UUID tekrarında çift kayıt yok |
| `GET /api/questions/{id}/board` | Oturumdaki öğrencinin soru çizimi: `{version,strokes}`; kayıt yoksa sürüm `0` ve boş dizi |
| `PUT /api/questions/{id}/board` | `{version,strokes}`; yalnız kendi çizimini kaydeder, eski sürüme `409` döner |
| `POST /api/study-sessions` | `{bank?,examType?,source?:[],history?:[],subject?,topic?,selectionMode?,questionCount,durationMinutes?,clientRequestId}`; `NEW`, `REPEAT`, `WRONG`, `MIXED` (varsayılan) havuzundan 1–120 soruyla pratik kurar. `history` içinde `CORRECT`/`WRONG` seçilirse aynı sayım filtresi uygulanır, seçim modu otomatik `REPEAT` olur ve `catalog_filter.history` saklanır. Süre yoksa süresiz, varsa 1–240 dakika; az adayda 400; aynı UUID ağ tekrarında aynı oturumu döndürür |
| `GET /api/study-sessions/active`, `GET /api/study-sessions/{id}` | Kendi son açık pratiği (yoksa 204) veya seçilen pratiğin kalıcı soru sırası, seçim modu/filtreleri, sunucu saati, kesin bitişi ve soru başı durumu; başka kullanıcı için 404. Biten oturumda ilk/son tur sonuçları ve toplamlar döner |
| `GET /api/study-sessions/unfinished-summary` | Yalnız giriş yapan öğrencinin bitmemiş pratikleri için `{count,latestSessionId}` döner. Tamamlanan ve süresi dolan oturumlar sayılmaz; oturum yoksa `count:0`, `latestSessionId:null`. Hatırlatma kutusu bu özeti kullanır; soru listesi yüklenmez |
| `GET /api/study-sessions/unfinished` | Kendi açık pratik ve denemelerini başlık/tür/başlangıç/toplam soru/yanıtlanan tekil soru sayısı ve pratik devam sorusuyla listeler; süresi dolmuş pratik önce tamamlanır |
| `GET /api/study-sessions?page&size` | Kendi pratik oturumlarını en yeni önce sayfalar; durum, soru sayısı, seçim modu, süre sınırı, `subject` ve `topic` döner. Tamamlanan oturumda `result` ilk/son tur doğru, yanlış ve boş toplamlarını taşır; açık oturumda `null` kalır. Başka hesabın oturumu listelenmez |
| `POST /api/study-sessions/{id}/finish` | Kendi açık pratiğini kapatır; tekrarda aynı bitiş/sonuç. Başka kullanıcıya 404, iptal edilmiş oturuma 409 |
| `POST /api/study-sessions/{id}/cancel` | Kendi açık pratiğini `ABANDONED` yapar ve bitiş zamanını kaydeder; yanıtlar korunur ve hesaplara girmez. Tekrar 204, başkasının kaydı 404, tamamlanmış pratik 409 |
| `GET /api/exams/plan?bank&examType&track&includeSolved&selectionMode&questionCount` | Genel denemenin branş hedeflerini, uygun soru sayılarını ve `ready` durumunu döndürür. `questionCount` verilmediğinde tam deneme planıdır; `includeSolved=false` yalnız yeni soruları kullanır, varsayılan `true` |
| `POST /api/exams/full` `{bank?,examType,track?,includeSolved?,year?}` | TYT 120 / AYT alanına göre 80 soru ve sabit süre/branş kotalarıyla deneme oluşturur. Genel denemede `includeSolved=false` yalnız yeni soruları kullanır. `year` varsa o yılın çıkmış sorularının tamamı özgün sırayla seçilir; `bank=OGM` veya `includeSolved=false` kabul edilmez. Eksik havuzda 400; eski konu/sayı/geçmiş parametreleri devralınmaz |
| `GET /api/exams/archive?examType&track` | Kayıtlı yılların `year,examType,track,questionCount,timeLimitMinutes,ready,subjects:[{subject,target,available}]` bilgileri. Eksik/birleşik/inceleme bekleyen soru varsa `ready=false`; başka yıldan soru eklenmez |
| `POST /api/exams` `{bank,examType,subject,topic,questionCount,selectionMode,timeLimitMinutes,track?}` | `track=SAYISAL|SOZEL|ESIT_AGIRLIK` genel denemede dengeli branş planını uygular; eksik havuzda 400 |
| `GET /api/exams?page&size` | Yalnız kendi teslim edilmiş denemeleri; toplam sonuçlara ek olarak `examType` ve `bySubject:[{subject,total,correct,wrong,blank}]` döner. Branşlar sayfadaki deneme kimlikleri için tek toplu sorguyla, korunmuş `exam_questions` alan/yanıt/sonuçlarından okunur; soru veya cevap anahtarı taşınmaz |
| `GET /api/exams/{id}`, `PUT /api/exams/{id}/answers`, `POST /api/exams/{id}/submit`, `GET /api/exams/{id}/result` | Sahibine ait sınav, otomatik kayıt ve sonuç |
| `POST /api/exams/{id}/cancel` | Kendi açık denemesini `CANCELLED` yapar; sonuç/puan üretmez, kaydı ve yanıtları korur. Tekrar 204, başkasının kaydı 404, teslim edilmiş deneme 409; iptal sonrası cevap/teslim/devam 409 |
| `GET /api/exams?page&size`, `GET /api/exams/summary` | Sahibine ait geçmiş ve özet |
| `POST /api/feedback` | `RATING`, `QUESTION_ISSUE` veya `GENERAL` geri bildirimi |

`CIKMIS` ve `OGM` koleksiyonları `questions.bank` ile ayrılır. `questions.solution_image` varsa ve erişim izni oluştuysa çözüm görseli soru ekranında gösterilir. Soru görseli ve çözüm görseli veritabanında dosya değil, `YKS_RESIM_KLASORU` altındaki göreli yoldur; gerçek dosya yolu kökün dışına çıkamaz. QR üretimde sabit `YKS_SITE_ADRESI/soru/{code}` adresini kullanır. Karalama `strokes` alanı 0–1 arası koordinatlardan oluşan çizgi/nokta dizileridir; en çok 100 çizgi, çizgi başına 250 nokta ve 64 KiB JSON kabul edilir. Serbest pratikte iki yanıt hakkından sonra öğrenci cevap gösterir veya soruyu atlar; sonraki çalışma yeni turdur. `question_attempts.correct_answer` olay anında kopyalanır, aktif saniye görünür/odaklı sekmede yaklaşık ölçülür. Eski stateless `/api/questions/{id}/check` kaldırıldı. Sınav oturumu cevap anahtarını teslimden önce döndürmez. `exam_questions.correct_answer` teslimde kopyalanır; sonraki soru düzenlemesi eski sonucu değiştirmez.

İlerleme sayıları yalnız etkin sorularda hesaplanır. `solved`, öğrencinin en az bir `ANSWER` olayı veya teslim edilmiş sınavda cevapladığı tekil sorudur; `remaining = total - solved`. `everWrong`, bu cevaplardan herhangi birinde yanlış yapılan tekil sorudur; sonradan düzeltilse de burada kalır. Cevabı gösterme/atlama ve teslim edilmemiş sınav, çözülen sayısını artırmaz. Filtreler soru listesiyle aynıdır. Bu ilk kapsam sayısıdır; günlük/haftalık grafik ve aktif süre panosu sonraki dilimdedir.

Sınavda `selectionMode` verilmezse `MIXED` kabul edilir. `NEW` daha önce cevaplanmamış, `REPEAT` en az bir kez cevaplanmış, `WRONG` en az bir kez yanlış cevaplanmış, `MIXED` tüm etkin sorulardır. Pratik cevapları ve teslim edilmiş sınavlar birlikte değerlendirilir; aynı soru tek adaydır. İstenen sayı aday sayısından büyükse sınav hiç oluşturulmaz. Seçim modu sınav kaydında saklanır; sınav oluşturulduktan sonra soru sırası kalıcıdır.

Genel denemede `track` verildiğinde TYT tüm alanlar için ortak 120 soruluk; AYT seçilen alan için 80 soruluk ders oranlarını kullanır. Seçilen sayı bu oranlara göre en büyük kalan yöntemiyle ölçeklenir; kısa denemede her branşa en az bir soru ayrılır. Hedefi karşılamayan branş başka dersle doldurulmaz. Ders bloklarının sırası sabittir, blok içindeki sorular uygun havuzdan seçilir. `track` ders/konu veya konu PDF'si kapsamında kabul edilmez; eski `track` içermeyen API istekleri önceki seçimi korur. Oranlar [ÖSYM 2026 TYT kitapçığı](https://dokuman.osym.gov.tr/pdfdokuman/2026/yks/tsk/yks_tyt_2026_kitapcik_d350.pdf) ve [ÖSYM 2026 AYT kitapçığı](https://dokuman.osym.gov.tr/pdfdokuman/2026/yks/tsk/yks_ayt_2026_kitapcik_kt12.pdf) test yapısını izler; bu uygulama resmî bir ÖSYM denemesi sunmaz.

Deneme planı bütün branşları aynı salt okunur `REPEATABLE_READ` işleminde tek
toplu SQL ile sayar. Ortak etiket kuralı, güncel kaynak damgası ve öğretmen
önceliği korunur. Genel, branş ve özel denemelerde önce deneme içinde az temsil
edilen, eşitlikte öğrencinin önceki denemelerinde az kullanılan ve daha eskiden
sorulan ünite seçilir. Yeterli konu varsa bir konudan ikinci soru alınmadan
diğer konulara sıra gelir; sonraki deneme atlanan konuları öne alır.
Güncel ortak kimlikler/öğretmen kararları kullanılır; iptal edilmiş denemeler ve
başka öğrencinin geçmişi kapsam hesabına katılmaz. Adaylar tek sorguda
branş–ünite başına en çok toplam soru sayısıyla sınırlandırılır; çok etiketli
sorular çoğaltılmaz. Öğrenci satırı kilidi eşzamanlı oluşturmaları sıralar.
Yıla ait tam sınav, `exam_archive_positions` (V57/V58) içindeki özgün kimlik ve
sırayı kullanır; özgün konu dağılımına dengeleme uygulanmaz. Denemenin kayıt
işlemi atomiktir; branş başına thread veya kalıcı kullanıcı havuz önbelleği yoktur.
Salt okunur yerel süre kontrolü:
`..\.venv\Scripts\python.exe -X utf8 -B testler/exam-plan-performance.py --output RAPOR.json`.

Pratikte `selectionMode` yoksa `MIXED` seçilir; aday sayıları sınavla aynı `QuestionAvailabilityService` tanımından gelir. Oluşturulan soru kimlikleri `session_questions.position`, seçilen mod ve kaynak/sınav/ders/konu filtreleri `study_sessions` ile saklanır; yanıt anahtarı oturum API'sine konmaz. `time_limit_seconds` sunucuda saklanır; `deadlineAt = started_at + time_limit_seconds` ve `serverNow` sayaç gösterimi için döner. Sunucu bitişten sonra yeni cevap/olay kabul etmez; süre dolan oturum ilk okumada kapanır. Bitiş sonucu, soru başına ilk ve son çalışma turunun kayıtlı `is_correct` alanlarından hesaplanır: turda doğru yanıt varsa doğru, yalnız yanlış yanıt varsa yanlış, yanıt yoksa boş. Sonuçtaki son tur toplamı ve ilk tur toplamı ayrı gösterilir. Soru anahtarı sonradan değişse de eski tur puanı değişmez. Başlatma ekranı devam eden son pratiği gösterir; soru ekranı oturum sırasındaki önceki/sonraki soruya gider. `sessionId` ile gönderilen yanıtlar ve soru başı durum yalnız o oturumun olaylarından hesaplanır. Kimliksiz eski pratik ayrı kalır; daha sonraki bağımsız yanıt eski oturumun durumunu değiştirmez. Ortak konu/alt konu seçimi categoryId ile sunulur; eski onaylı soru tipi ağacı ve zorluk seçimi 9. adımdaki uzlaştırma kapsamındadır.

## Ortak kaynak ve konu seçimi

| İstek | İşlev |
|---|---|
| `GET /api/learning-resources/metadata` | Yayımlanmış katalog özeti/sürümü, kontrollü kategori kimlikleri ve ek etiket seçenekleri |
| `GET /api/learning-resources?exam&subject&kind&categoryId&match&includeCandidates&bankOnly` | Etkin öğretmen kararıyla süzülen kaynaklar; tekrarlı `categoryId`, `ANY/ALL` ve aday kapsam seçimi; `bankOnly=true` yalnız etkin gerçek soru bankası kayıtlarını alır |
| `GET /api/learning-resources/item?key=` | Aynı kaynağın bütün ilişkilerini, ortak görünen/özgün adını ve ayrı konumlarını sunar |
| `GET /api/learning-resources/items?key=…&key=…` | En çok 100 kimlik için aynı öğrenci projeksiyonu; bulunamayan/görünmeyen kaynaklar sonuçta yer almaz |
| `GET /api/learning-resources/progress?classification=CURRENT\|HISTORICAL` | Oturumdaki öğrencinin tekil ilk karşılaşma, yanlış/boş, tekrar ve kaydedilmiş aktif süre sayıları; güncel etiket veya olay anındaki anlık kayıtla sınıflama |
| `GET /api/learning-resources/coverage?exam&subject` | Tekil kaynak, fiziksel varlık, konu referansı ve doğrulanmış sayfa/süre birleşimi; okuma/izleme ilerlemesi değildir |

Ortak soru seçimi `questionTypeId=taxonomy:<id>` ve
`teacherDifficulty=KOLAY|ORTA|ZOR` alanlarını kaynak listesi, soru bankası,
uygunluk, pratik ve rastgele deneme oluşturma isteklerinde destekler. Soru tipi
kaynak damgasıyla geçerli insan onayından; öğretmen zorluğu güncel `APPROVE`
kararından gelir. Geçersiz kimlik 400 döndürür. Dengeli deneme ortak filtreyle
birleştirilmez. Soru listesi özgün alanları korur, `resource` içinde kütüphaneyle
aynı güvenli görünen adı, etkin branşı ve inceleme bilgisini verir.

Matematik özel dersin `learning` verisi `categoryId`, `resourceKeys` (en çok 20),
çalışma durumu ve tekrar tarihini mevcut notlarla birlikte saklar. Bağlanan
kaynak seçili kategoriyle katalog ilişkisi taşımalıdır. Sahiplik mevcut ders
kaydıyla sınırlıdır. Haftalık programın benzer bağları kullanıcı/hafta başına
tarayıcıda saklanır; bu çizelge için sunucu eşitleme API'si yoktur.

Soru listesi, uygun soru sayımı, pratik ve deneme oluşturma `categoryId`,
`categoryMatch=ANY|ALL`, `includeCandidates` alanlarını kabul eder. URL'de birden
fazla `categoryId` tekrarlanır; oluşturma gövdelerinde dizi olur. Kütüphane aynı
eşleşme için `match` kullanır; ön yüz `categoryMatch` içeren eski bağlamı da korur.
Kategori ve kaynak kimlikleri başlıktan yeniden türetilmez. Ortak seçimi
`SharedQuestionLabels` ve V45 `learning_catalog.question_ids_for_labels` çözer;
kaynak sürümü değişmiş, etkin olmayan veya yalnız arşiv/not örneği olan soru
havuzda yer almaz. Öğretmen düzeltmesi filtrede ve sunulan adda aynı anda geçerlidir.

Seçilebilir konu havuzu Ark referansındaki 237 ortak ünitedir (`canonicalUnit=true`);
alt başlık kimlikleri `canonicalTopicIds` yönlendirmesiyle korunur. Metadata ve
güncel kaynak/ilerleme adlarının tek kaynağı yayımlanmış DB sürümüdür.
`GET /api/learning-resources` ayrıca `labelStatus=ESTIMATED|APPROVED|UNRESOLVED`
kabul eder: tahmini ünite/sınıf etiketi, tam öğretmen onayı veya geniş kapsam tahmini.
`grade=9|10|11|12` olası sınıflar üzerinde çalışır. Yanıttaki `labels.gradeStatus`
ve `gradeReason` tahmini sınıfı açıklar. Adaylar öğretmen onayı oluşturmaz.
Öğretmen kuyruğunda `labelState=ESTIMATED` aynı ihtiyacı gösterir; ünite seçimini
kaydetmek sınıfı veya cevap/içerik doğruluğunu onaylamaz.

V52, soru seçimindeki `includeCandidates=false` kuralını seçilen kategori
ilişkileriyle sınırlar. Kategori seçilmemiş genel/ders havuzu bu tercihle
boşaltılmaz; seçili kategoride `CONFIRMED` veya güncel öğretmen onayı gereksinimi
korunur. `bankOnly=true` kaynak listesinin kategori seçilmemiş sayımı da aynı
anlamı kullanır; diğer kaynak türlerinin genel aday filtresi değişmez.

`GET /api/questions/filters?bank=` yayımlanmış, etkin ve kaynak damgası güncel
aynı havuzdan ders/konu satırları üretir. Satırdaki `count` yanında `totalCount`,
`examCount`, `subjectCount`, `subjectTotalCount` ve `topicTotalCount` tekil soru
sayılarıdır. Çoklu sınav/ders etiketi, genel toplamda soruyu çoğaltmaz.
Katalog bulunmayan eski/test ortamında korunmuş dört alanlı satırlar desteklenir.
Pratik kaynak seçimi `source=CIKMIS_AYT&source=OGM_TYT` gibi tekrarlı parametreyle
taşınır; desteklenen dört değer `CIKMIS_AYT`, `CIKMIS_TYT`, `OGM_AYT`, `OGM_TYT`.
`filters`, `availability`, soru listesi ve `category-counts` aynı çiftlerin
birleşimini kullanır. `POST /api/study-sessions` aynı değerleri `source` dizisinde
alır ve `catalog_filter.sources` içinde korur. V53, banka ve etkin sınav etiketini
birlikte denetler; çapraz kaynak eklemez ve çoklu sınavlı soruyu çoğaltmaz.
`source` gönderilmezse mevcut `bank/examType` sözleşmesi geçerlidir.
`GET /api/questions/category-counts` aynı `bank`, `examType`, `subject`,
`questionTypeId`, `teacherDifficulty`, `includeCandidates` bağlamında gerçek
banka sorularının kategori kimliği → tekil adet haritasını döndürür; mevcut
kategori seçimi bu öneri havuzuna yeniden uygulanmaz. Bu uç cevap veya kaynak
içeriği döndürmez; soru araması bu sayımları kullanır.

V44, yeni pratik cevaplarında `question_attempts.learning_label_snapshot`, yeni
denemelerde `exam_questions.learning_label_snapshot` ve pratik seçiminde
`study_sessions.catalog_filter` saklar. V46 `exam_taxonomy_snapshot`, deneme
oluşturulurken mevcut onaylı alt konu/soru tipi etiketlerini kopyalar. Eski boş
anlık kayıtlar bugünün etiketleriyle doldurulmaz. Sonraki etiket yayını bu kayıtları
ve eski sonuçları değiştirmez. Ortak konu filtresi, insan onaylı soru tipi veya
ölçülmüş zorluk bilgisi bulunduğu anlamına gelmez.

Kaynak API'si cevap anahtarı, iç analiz/kanıt metni, öğretmen kimliği ve fiziksel
dosya yolu döndürmez. Kapsam sayımında yalnız `VERIFIED` aralıklar birleşir; PDF
uçları tamsayı ve `pageCount` içinde, video aralığı `durationSeconds` içinde
olmalıdır. Geçersiz veya sınırı bilinmeyen aralık sayfa/süre toplamına girmez;
kaynak kaydı korunur.

## Zayıf alan önerisi

`GET /api/recommendations?subject=Türkçe` yalnız oturumdaki öğrencinin son 90 gündeki ilk cevaplarını kullanır. Yalnız onaylı soru tipi etiketi hesaba girer. 30 etiketli tekil soru ve üç ayrı tip olmadan `INSUFFICIENT_DATA` döner. En az beş örnekli tipte son 30 gün iki kat ağırlıklı başarı %60'ın altındaysa veya yeterli aktif süre örneğinde ders ortalamasının 1,5 katından uzunsa `SUGGESTIONS` içinde soru tipi, beceri, alt konu, önkoşul, doğru/yanlış, süre gerekçesi ve etkin `exampleQuestionId/exampleQuestionCode` döner. Yeterli veri olup belirgin alan yoksa `NO_CLEAR_WEAKNESS` döner. Öğrenci ekranındaki `Şimdi çalış` örnek soruyu açar; etiket hatası `POST /api/feedback` ile `QUESTION_ISSUE`, örnek soru kimliği ve açıklama olarak bildirilir. Bu eğitim ipucudur.

## OGM konu anlatımı PDF'leri

| İstek | İşlev |
|---|---|
| `GET /api/topic-pdfs/filters` | Katalogdaki sınav, ders, sınıf, içerik türü seçenekleri ve kategori sayıları (`facets`) |
| `GET /api/topic-pdfs?exam&subject&grade&kind&q&page&size` | Başlık araması ve filtrelerle sayfalı konu anlatımı listesi; TYT ve AYT filtreleri ortak `TYT-AYT` kaynaklarını da kapsar; durum `available`, `missing_file` veya `video_only` |
| `GET /api/topic-pdfs/{id}` | Tek kayıt, dosyanın güncel açılabilirlik durumu ve varsa onaylı `verifiedTopic` |
| `GET /api/topic-pdfs/{id}/file` | Uygun PDF'yi `application/pdf`, `inline`, `Cache-Control: no-store` ile açar |

Bu uçlar yalnız `USER` rolüne açıktır. Yanıtlarda yerel dosya yolu ve checksum yoktur. Dosya erişimi katalog kimliği, kaynak kökün gerçek yolu, PDF uzantısı, dosyanın gerçek yolunun kökte kalması ve SHA-256 eşleşmesiyle doğrulanır; eksik/değişmiş dosya açılmaz. PDF yanıtında `X-Frame-Options: SAMEORIGIN`, diğer yanıtlarda `DENY` kullanılır. Katalog JSON kayıtları uygulama başlarken okunur; katalog yeniden üretildiyse uygulama yeniden başlatılır. Masaüstünde özgün PDF sayfaya gömülür, dar ekranda aynı sitenin PDF yolu yeni sekmede açılır. Katalogdaki aday konu adı eşleşmesi doğrulanmış soru bağı değildir. `topic-pdf-links.json` içindeki onaylı bağlantıda PDF checksum'ı tekrar doğrulanır. `GET /api/questions/availability?topicPdfId=` ve pratik/sınav oluşturma isteklerindeki `topicPdfId` yalnız onaylı soru kodlarıyla sınırlandırılır; istemci kaynak/ders/konu göndererek havuzu genişletemez.

İç not v1 biçimi [kayıtlı şemada](plan/sema/ic-not-v1.schema.json) tanımlıdır: kaynak katalog kimliği, PDF SHA-256, fiziksel sayfa, başlık zinciri, doğrulama durumu ve sürüm taşır. Kaynak aralığı, etiket ve adlandırma için [kalıcı çalışma kuralları](plan/00_CALISMA_BAGLAMI.md) ve orada kayıtlı güncel şema referansları kullanılır. Eski OCR/iç arama pilotları öğrenci PDF API'sine yeni metin eklemez; öğrenciye özgün PDF gösterilir.

## Operatör ve yönetici uçları

`GET /api/admin/accounts?role=&query=&page=0&size=25`, açık `SITE_MANAGER`
yetkisiyle bütün hesap rollerini listeler. `/summary` her rol için sıfırları da
içeren kesin sayıları verir. Liste/sayımlar silinen (`archived_at`) hesapları
hariç tutar; kategori bilgisi boş eski USER hesapları öğrenci olarak korunur.
`PATCH /api/admin/accounts/{id}/status` `{enabled, reason}` ile engeller/açar;
`DELETE /api/admin/accounts/{id}` `{confirmation: kullanıcıAdı, reason}` ile
hesabı listeden kaldırır (`enabled=false`, `archived_at=now`). Fiziksel kullanıcı
ve geçmiş kayıtlar korunur. Tüm yazmalar CSRF ve açık site yönetimi yetkisi
ister, self/son yönetici koruması ve işlem kaydı vardır. Gerekçe en çok 500
karakterdir. `AccountStatusFilter` engelli/silinmiş hesabın açık oturumunu sonraki
API isteğinde geçersiz kılar. Normal ADMIN'in toplu istatistik sınırı değişmez.

`GET /api/admin/students?query=&page=0&size=25`, ayrıca `SITE_MANAGER`
yetkisi olan hesaplara kayıtlı öğrencilerin salt okunur listesini verir.
`USER` rolündeki eski, `category` alanı boş hesaplar da dahildir. Liste yalnız
`id`, kullanıcı adı, e-posta, etkinlik/arşiv durumu ve kayıt tarihini döndürür;
parola, parola hash'i, telefon ve öğrenci çalışma geçmişi döndürülmez.
Kullanıcı adı/e-posta araması büyük-küçük harften bağımsız, sayfa boyutu en çok
100'dür. Yetkisiz `ADMIN`, `OPERATOR` ve diğer roller bu listeye erişemez.
`/yonetim?sekme=kullanicilar` site yöneticisi için varsayılan sekmedir; eski `sekme=ogrenciler` yalnız öğrenci filtresini açar;
`sekme=kullanim` mevcut toplu özeti açar. Kayıtlar bağlı olunan yerel ortama
aittir; main'de sonradan açılan hesap geliştirme DB'sine otomatik kopyalanmaz.

`GET /api/admin/stats?period=DAY|WEEK|MONTH` yalnız `ADMIN` içindir. `Europe/Istanbul` döneminde etkin öğrenci, başlatılan pratik/sınav ve cevap toplamları ile tüm zamanlar kayıtlı öğrenci ve tamamlanan sınav toplamlarını döndürür. 0–4 değerleri `null`, diğerleri beşlik aralığın alt sınırıdır; etkin öğrenci beşten azsa dönemlik diğer toplamlar da `null` olur. `content` alanı etkin ve koleksiyona atanmış soru kayıtlarının toplamını, CIKMIS/OGM ve TYT/AYT kırılımını kesin kayıt sayısı olarak verir; görsel dosya bütünlüğü bu sayımın parçası değildir. Yönetici yanıtında bireysel veri yoktur. Eski `/api/admin/questions`, `/api/admin/feedback` ve `/api/admin/import` yolları kapalıdır. `OPERATOR` şunları kullanır: `GET /api/operator/questions`, `GET/PUT /api/operator/questions/{id}`, `GET /api/operator/feedback`, `PATCH /api/operator/feedback/{id}`, `GET /api/operator/reported-questions`, `POST /api/operator/import`. İçe alma `file` (CSV/JSON), `mode=INSERT_ONLY|UPSERT`, `dryRun=true|false` alır. `dryRun` varsayılan olarak `true`; tek dosyada doğrulama hatası varsa yazma yapılmaz. `code` kalıcı tekil soru kimliğidir; `bank` ve `solution_image` ithalat alanlarıdır.

`AdminUsageService` yerel gün/hafta/ay için tekil aktif öğrenci (cevap veya oturum başlatma), pratik/sınav başlatma ve gönderilmiş cevap toplamlarını hesaplar. `serviceErrors`, yalnız yakalanan beklenmeyen API istisnalarının dönemlik sayısıdır; etkin öğrenci beşten azsa gizlenir, aksi halde beşlik aralığa indirilir. Ham hesap API yanıtına konmaz; 11.02 gizleme/yuvarlama kuralı uygulanır. Başlangıç, ağ, tünel ve veritabanının tümüyle erişilemez olduğu hatalar bu sayaca güvenilir biçimde girmez.

## Veritabanı ve henüz bağlanmamış alanlar

Flyway göçleri PostgreSQL veritabanını yönetir; test DB `ivme_test`'tir. `study_sessions` ve `session_questions` pratikte kullanılır; taksonomi/önkoşul ve `activity_events` tablolarının diğer ürün işlevleri hâlâ açıktır. `V32`, kaldırılan Hedeflerim özelliğinin `goals` tablosunu siler. Ham `activity_events` ve kimliksiz `service_error_events` için 90 günlük temizlik görevi çalışır. Görsel yedeği DB yedeğinden ayrıdır. Kalan rol/yedek/yayın kontrolleri [12. adımda](plan/12_KALAN_ICERIK_VE_YAYIN.md); ortak filtre ve geçmiş anlık kayıt sözleşmesi [sistem rehberinde](plan/00_SISTEM_REHBERI.md) tutulur.
