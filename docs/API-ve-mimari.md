# İvme API ve mimari sözleşmesi

Güncelleme: 2026-10-09. React 19/Vite ön yüzü geliştirmede `127.0.0.1:5173`, Spring Boot 3.5/Java 21 API'si `127.0.0.1:8081` üzerinden çalışır. Vite `/api` isteklerini API'ye yollar. Üretim paketinde React dosyaları Spring Boot içinde, mevcut tünel rotasına uygun **tek `127.0.0.1:5173` sürecinde** sunulur. Dış adres `https://net.ivme.dev`, yerel Cloudflare hedefi `http://localhost:5173`'tür.

## Kimlik ve erişim

`POST /api/auth/register` `{username,email,phone,password}` → 201; `POST /api/auth/login` `{login,password}`; `POST /api/auth/logout`; `GET /api/auth/me`. `login` kullanıcı adı veya e-posta olabilir. Kayıtta e-posta ve telefon zorunlu, ancak şimdilik doğrulanmaz. Parola en az 8 karakter ve BCrypt sınırı gereği en çok 72 UTF-8 bayttır. `GET/PUT /api/account/contact` ve `PUT /api/account/password` kendi hesap bilgileri içindir; değişiklikte mevcut parola gerekir. `UserDto` içindeki `passwordChangeRequired` ayrıcalıklı hesabın geçici parola durumunu gösterir.

Oturum `HttpOnly`, `SameSite=Lax` çereziyle taşınır; değiştirici istekler `XSRF-TOKEN` çerezinden `X-XSRF-TOKEN` başlığı gerektirir. Üretimde iki çerez de `Secure`, HTTPS dış adresi zorunludur. `X-Forwarded-*` işlenmez. Yalnız loopback'ten gelen `CF-Connecting-IP` giriş/kayıt hız sınırı için değerlendirilir. Geçici parolalı `ADMIN`/`OPERATOR` dış alan adından giriş yapamaz ve üretim başlatılamaz.

| Rol | İzinli alan |
|---|---|
| `USER` | Kendi soru, sınav, geri bildirim ve hesap akışı |
| `ADMIN` | `GET /api/admin/stats`; yalnız kayıtlı öğrenci ve tamamlanan deneme sayısı |
| `OPERATOR` | `/api/operator/**`; soru ve geri bildirim bakımı, CSV/JSON içe alma |

## Soru ve sınav uçları

| İstek | İşlev |
|---|---|
| `GET /api/questions/filters?bank=CIKMIS|OGM` | Koleksiyona göre sınav türü/ders/konu ve sayı |
| `GET /api/questions?bank&examType&subject&topic&page&size` | Sayfalı etkin soru listesi |
| `GET /api/questions/availability?bank&examType&subject&topic` | Kendi toplam/çözülen/kalan/en az bir kez yanlış yapılan tekil soru sayıları |
| `GET /api/questions/code/{code}`, `GET /api/questions/{id}` | Soru künyesi; doğru cevap içermez |
| `GET /api/questions/{id}/neighbor?direction&bank&examType&subject&topic` | Filtre içindeki komşu soru |
| `GET /api/questions/{id}/image`, `/solution-image`, `/qr` | Soru/çözüm görseli ve sabit adrese QR; çözüm görseli yalnız cevap görüldükten veya sınav tesliminden sonra (operatör ön izlemesi hariç) |
| `GET /api/questions/{id}/practice?sessionId?` | Yalnız giriş yapan öğrencinin ilgili oturumdaki (kimlik yoksa bağımsız pratikteki) son turu ve olayları; doğru cevap başlangıçta ve yanlış sonrası gizli |
| `POST /api/questions/{id}/practice` | `{clientEventId,eventType,answer?,activeSeconds?,sessionId?}`; `ANSWER`, `REVEAL`, `SKIP` kayıtları; oturum kimliği varsa sahibi ve soru üyeliği doğrulanır; aynı UUID tekrarında çift kayıt yok |
| `GET /api/questions/{id}/board` | Oturumdaki öğrencinin soru çizimi: `{version,strokes}`; kayıt yoksa sürüm `0` ve boş dizi |
| `PUT /api/questions/{id}/board` | `{version,strokes}`; yalnız kendi çizimini kaydeder, eski sürüme `409` döner |
| `POST /api/study-sessions` | `{bank?,examType?,subject?,topic?,questionCount,clientRequestId}`; 1–120 etkin soruyla süresiz pratik kurar; aynı UUID ağ tekrarında aynı oturumu döndürür |
| `GET /api/study-sessions/active`, `GET /api/study-sessions/{id}` | Kendi son açık pratiği (yoksa 204) veya seçilen pratiğin kalıcı soru sırası ve soru başı `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED` durumu; başka kullanıcı için 404 |
| `POST /api/exams` `{bank,examType,subject,topic,questionCount,selectionMode,timeLimitMinutes}` | `NEW`, `REPEAT`, `WRONG`, `MIXED` aday havuzundan süreli/süresiz sınav; eksik havuzda 400 |
| `GET /api/exams/{id}`, `PUT /api/exams/{id}/answers`, `POST /api/exams/{id}/submit`, `GET /api/exams/{id}/result` | Sahibine ait sınav, otomatik kayıt ve sonuç |
| `GET /api/exams?page&size`, `GET /api/exams/summary` | Sahibine ait geçmiş ve özet |
| `POST /api/feedback` | `RATING`, `QUESTION_ISSUE` veya `GENERAL` geri bildirimi |

`CIKMIS` ve `OGM` koleksiyonları `questions.bank` ile ayrılır. `questions.solution_image` varsa ve erişim izni oluştuysa çözüm görseli soru ekranında gösterilir. Soru görseli ve çözüm görseli veritabanında dosya değil, `YKS_RESIM_KLASORU` altındaki göreli yoldur; gerçek dosya yolu kökün dışına çıkamaz. QR üretimde sabit `YKS_SITE_ADRESI/soru/{code}` adresini kullanır. Karalama `strokes` alanı 0–1 arası koordinatlardan oluşan çizgi/nokta dizileridir; en çok 100 çizgi, çizgi başına 250 nokta ve 64 KiB JSON kabul edilir. Serbest pratikte iki yanıt hakkından sonra öğrenci cevap gösterir veya soruyu atlar; sonraki çalışma yeni turdur. `question_attempts.correct_answer` olay anında kopyalanır, aktif saniye görünür/odaklı sekmede yaklaşık ölçülür. Eski stateless `/api/questions/{id}/check` kaldırıldı. Sınav oturumu cevap anahtarını teslimden önce döndürmez. `exam_questions.correct_answer` teslimde kopyalanır; sonraki soru düzenlemesi eski sonucu değiştirmez.

İlerleme sayıları yalnız etkin sorularda hesaplanır. `solved`, öğrencinin en az bir `ANSWER` olayı veya teslim edilmiş sınavda cevapladığı tekil sorudur; `remaining = total - solved`. `everWrong`, bu cevaplardan herhangi birinde yanlış yapılan tekil sorudur; sonradan düzeltilse de burada kalır. Cevabı gösterme/atlama ve teslim edilmemiş sınav, çözülen sayısını artırmaz. Filtreler soru listesiyle aynıdır. Bu ilk kapsam sayısıdır; günlük/haftalık grafik ve aktif süre panosu sonraki dilimdedir.

Sınavda `selectionMode` verilmezse `MIXED` kabul edilir. `NEW` daha önce cevaplanmamış, `REPEAT` en az bir kez cevaplanmış, `WRONG` en az bir kez yanlış cevaplanmış, `MIXED` tüm etkin sorulardır. Pratik cevapları ve teslim edilmiş sınavlar birlikte değerlendirilir; aynı soru tek adaydır. İstenen sayı aday sayısından büyükse sınav hiç oluşturulmaz. Seçim modu sınav kaydında saklanır; sınav oluşturulduktan sonra soru sırası kalıcıdır.

Süresiz pratik oturumu bu aşamada `MIXED` havuzundan seçilir. Oluşturulan soru kimlikleri `session_questions.position` ile saklanır; yanıt anahtarı oturum API'sine konmaz. Başlatma ekranı devam eden son pratiği gösterir; soru ekranı oturum sırasındaki önceki/sonraki soruya gider. `sessionId` ile gönderilen yanıtlar ve soru başı durum yalnız o oturumun olaylarından hesaplanır. Kimliksiz eski pratik ayrı kalır; daha sonraki bağımsız yanıt eski oturumun durumunu değiştirmez. Dört seçim modu, zamanlı pratik ve bitiş/sonuç sonraki işlere aittir.

## Operatör ve yönetici uçları

`GET /api/admin/stats` yalnız `ADMIN` içindir. Eski `/api/admin/questions`, `/api/admin/feedback` ve `/api/admin/import` yolları kapalıdır. `OPERATOR` şunları kullanır: `GET /api/operator/questions`, `GET/PUT /api/operator/questions/{id}`, `GET /api/operator/feedback`, `PATCH /api/operator/feedback/{id}`, `GET /api/operator/reported-questions`, `POST /api/operator/import`. İçe alma `file` (CSV/JSON), `mode=INSERT_ONLY|UPSERT`, `dryRun=true|false` alır. `dryRun` varsayılan olarak `true`; tek dosyada doğrulama hatası varsa yazma yapılmaz. `code` kalıcı tekil soru kimliğidir; `bank` ve `solution_image` ithalat alanlarıdır.

## Veritabanı ve henüz bağlanmamış alanlar

Flyway `V1`–`V12` göçleri PostgreSQL veritabanını yönetir; test DB `ivme_test`'tir. `V10`, öğrenci ve soru birleşik anahtarlı `question_boards` tablosunu ekler. `V11`, eski sınavlara `MIXED` varsayarak `exams.selection_mode` sütununu ekler. `V12`, `study_sessions` için kullanıcı başına tekil `client_request_id` sütununu ekler; eski satırlar null kalabilir. Mevcut açık `ivme` sitesi yeniden başlatılmadığı için gerçek DB hâlâ V9'dadır; V10–V12 kontrollü canlı geçişte uygulanacaktır. `study_sessions` ve `session_questions` artık süresiz pratikte kullanılır; `goals`, taksonomi/önkoşul ve `activity_events` tablolarının diğer ürün işlevleri hâlâ açıktır. Ham `activity_events` için 90 günlük temizlik görevi çalışır. Görsel yedeği DB yedeğinden ayrıdır. Göç ve geri yükleme ayrıntıları [Adım 2 kaydında](plan/05_VERITABANI_GECISI.md); [Adım 6 deneme kaydı](plan/09_SORU_DENEMELERI.md), [Adım 7 sınav seçimi](plan/11_SINAV_SORU_SECIMI.md) ve [07.03 pratik kaydı](plan/13_07_03_PRATIK_OTURUMU.md) ilgili sınırları açıklar.
