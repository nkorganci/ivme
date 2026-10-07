# Hedef YKS — Mimari ve API sözleşmesi

Amaç: 10–50 kişilik MVP; sonra ölçeklenebilir. **Aşırı mühendislik yok.** Çalıştırma ve yapılandırma için bkz. [../README.md](../README.md).
Uygulama genel amaçlıdır: kodda/arayüzde/belgede kişisel ad veya hesap geçmez; başlıklar giriş yapan kullanıcının adına göre kişiselleşir ("Merhaba, {ad}", sekme başlığı "{Sayfa} · {ad} · Hedef YKS").

## Teknoloji
- **Ön yüz:** React 19 + Vite + JavaScript (JSX) + react-router-dom 7 + düz CSS (UI kütüphanesi YOK). Dev portu 5173; `/api` → `http://localhost:8081` (Vite proxy).
- **Arka yüz:** Java 21 (`C:\Tools\jdk-21`), Spring Boot 3.5, Spring MVC, Spring Security (oturum çerezi + CSRF), Spring Data JPA, Flyway, Maven. Port **8081** (8080 başka uygulamada dolu).
- **Veritabanı:** PostgreSQL 18, `localhost:5432`, veritabanı `yks_hazirlik`, kullanıcı `root` / şifre `root` (yalnız geliştirme). Tablolar yalnız Flyway ile oluşur.
- **Görseller:** DB'de değil; `questions.image` = göreli yol. Kök klasör `app.images.dir` (env `YKS_RESIM_KLASORU`). Örnek: `ornek-veri/resimler`.
- **QR:** soru başına `{app.public-base-url}/soru/{code}` adresini gösteren QR, anında üretilir (saklanmaz).

## Şema (Flyway `V1__sema.sql`)
`users`, `questions`, `exams`, `exam_questions`, `feedback` (5 tablo).
- Sınav gönderilince `exam_questions.correct_answer` (o anki doğru cevap), `selected_answer`, `is_correct` yazılır; ayrıca sınav satırına D/Y/B/yüzde/net/süre yazılır → soru cevabı sonradan değişse de geçmiş sonuç değişmez. `question_code/subject/topic` sınav oluşturulurken kopyalanır.
- Sınav sürerken doğru cevap istemciye ASLA gönderilmez.

## API sözleşmesi (ön yüz ve arka yüz buna uyar)
Genel: JSON, `/api` altında. Oturum çerezi `JSESSIONID` (HttpOnly). **CSRF:** sunucu `XSRF-TOKEN` çerezi koyar; POST/PUT/PATCH/DELETE isteklerine `X-XSRF-TOKEN` başlığı olarak aynı değeri ekle (çerezden oku). Hata gövdesi her zaman: `{ "hata": "Türkçe mesaj", "alanlar": { "alan": "mesaj" } }` (`alanlar` yalnız doğrulama hatasında). Durumlar: 400 doğrulama, 401 oturum yok, 403 yetki yok, 404 yok, 409 çakışma. Sayfalı yanıt: `{ content: [], page, size, totalElements, totalPages }` (istek: `?page=0&size=20`, page 0'dan başlar).
Sabitler: `examType`: `TYT`|`AYT` · `difficultyVote` (yalnız kullanıcı oyu): `KOLAY`|`ORTA`|`ZOR` · şık: `A`–`E`. **Sorularda zorluk alanı YOKTUR** (V2 göçüyle kaldırıldı); zorluk yalnızca kullanıcıların verdiği oy olarak toplanır · `role`: `USER`|`ADMIN`.

### Kimlik
| İstek | Gövde → Yanıt |
|---|---|
| `POST /api/auth/register` | `{username,email,password}` → 201 `User` · kullanıcı adı 3–30 (harf/rakam/`_.-`), şifre ≥ 8, kullanıcı adı/e-posta tekil (büyük/küçük harf duyarsız) |
| `POST /api/auth/login` | `{login,password}` (login = kullanıcı adı **veya** e-posta) → `User` · yanlışsa 401 `Kullanıcı adı veya şifre hatalı` |
| `POST /api/auth/logout` | → 204 |
| `GET /api/auth/me` | → `User` veya 401 |
| `PUT /api/account/password` | `{currentPassword,newPassword}` → 204 |
`User` = `{id, username, email, role}`

### Soru bankası
| İstek | Yanıt |
|---|---|
| `GET /api/questions/filters` | `[{examType, subject, topic, count}]` (yalnız aktif sorular; açılır listeleri ön yüz bundan türetir) |
| `GET /api/questions?examType&subject&topic&page&size` | `Page<QuestionListItem>`; `QuestionListItem = {id, code, examType, subject, topic, year}` (id sırası) |
| `GET /api/questions/{id}` · `GET /api/questions/code/{code}` | `QuestionDetail = {id, code, examType, subject, topic, year, source, choiceCount, avgRating, ratingCount, difficultyVotes:{KOLAY,ORTA,ZOR}, myEvaluation:{difficultyVote,rating}\|null}` (doğru cevap YOK; `avgRating` yoksa null) |
| `GET /api/questions/{id}/neighbor?direction=next\|prev&examType&subject&topic` | `QuestionDetail` veya **204** (başka soru yok); filtreler sorunun kendi filtresiyle aynı gönderilir |
| `POST /api/questions/{id}/check` | `{answer}` → `{correct, correctAnswer, solutionUrl}` (`solutionUrl` yoksa null) |
| `GET /api/questions/{id}/image` | görsel (png/webp/jpg), `<img src>` ile kullanılır |
| `GET /api/questions/{id}/qr` | PNG QR (`?size=300`) |

### Sınav
| İstek | Gövde → Yanıt |
|---|---|
| `POST /api/exams` | `{examType?, subject?, topic?, questionCount, timeLimitMinutes?}` → 201 `ExamSession` (rastgele seçim; yeterli soru yoksa olanı verir; hiç yoksa 400; `timeLimitMinutes` boş/0 = süresiz) |
| `GET /api/exams/{id}` | `ExamSession` (kendi sınavın değilse 404). Gönderilmişse `status:"SUBMITTED"`, `questions:[]` → ön yüz sonuca yönlendirir |
| `PUT /api/exams/{id}/answers` | `{questionId, answer}` (`answer: null` = temizle) → 204 (otomatik kayıt); gönderilmişse 409 |
| `POST /api/exams/{id}/submit` | `{answers:{"<questionId>":"B"}}` (gövde isteğe bağlı) → `ExamResult`; iki kez gönderilirse aynı sonuç |
| `GET /api/exams/{id}/result` | `ExamResult` (gönderilmemişse 409) |
| `GET /api/exams?page&size` | `Page<ExamHistoryItem>` (yalnız gönderilenler, yeniden eskiye) |
| `GET /api/exams/summary` | `{examCount, averagePercent\|null, totalCorrect, totalWrong, totalBlank, lastExam: ExamHistoryItem\|null, activeExam: {id,title,questionCount,remainingSeconds\|null}\|null}` |

`ExamSession = {id, title, status:"IN_PROGRESS"|"SUBMITTED", questionCount, timeLimitMinutes|null, startedAt, remainingSeconds|null, questions:[{questionId, position, code, subject, topic, choiceCount, selectedAnswer|null}]}`
`ExamHistoryItem = {id, title, questionCount, correctCount, wrongCount, blankCount, percent, net, durationSeconds, submittedAt}`
`ExamResult = ExamHistoryItem + {examType, subject, startedAt, bySubject:[{subject,total,correct,wrong,blank}], questions:[{position, questionId, code, subject, topic, selectedAnswer|null, correctAnswer, status:"CORRECT"|"WRONG"|"BLANK"}]}`
`percent` = doğru/toplam×100 (2 ondalık); `net` = doğru − yanlış/4.

### Geri bildirim
`POST /api/feedback` → 201 `{id}` · gövde `{category, questionId?, difficultyVote?, rating?, message?}`
- `RATING` (soru değerlendirme): `questionId` + (`difficultyVote` veya `rating` 1–5); kullanıcı+soru başına tek kayıt (tekrar gönderilirse güncellenir).
- `QUESTION_ISSUE` (soru sorunu bildirimi): `questionId` + `message` (≥ 5 karakter).
- `GENERAL` (genel görüş): `message` (≥ 5 karakter), isteğe bağlı `rating` 1–5.
`message` ≤ 2000.

### Yönetim (yalnız ADMIN; diğerlerine 403)
| İstek | Yanıt |
|---|---|
| `GET /api/admin/stats` | `{userCount, questionCount, activeQuestionCount, submittedExamCount, openFeedbackCount, reportedQuestionCount}` |
| `GET /api/admin/questions?query&examType&subject&topic&active&page&size` | `Page<AdminQuestion>` (`query` = kodda geçen metin) |
| `GET /api/admin/questions/{id}` | `AdminQuestion` |
| `PUT /api/admin/questions/{id}` | `{examType, subject, topic, year, source, image, correctAnswer, choiceCount, solutionUrl, active}` → `AdminQuestion` (`code` değişmez) |
| `GET /api/admin/feedback?category&resolved&page&size` | `Page<AdminFeedback>` |
| `PATCH /api/admin/feedback/{id}` | `{resolved:true\|false}` → `AdminFeedback` |
| `GET /api/admin/reported-questions` | `[{questionId, code, subject, topic, reportCount, lastReportAt}]` (çözülmemiş `QUESTION_ISSUE` olanlar) |
| `POST /api/admin/import` | multipart: `file` (CSV/JSON), `mode` = `INSERT_ONLY`\|`UPSERT`, `dryRun` = `true`\|`false` → `ImportReport` |

`AdminQuestion = {id, code, examType, subject, topic, year|null, source, image, correctAnswer, choiceCount, solutionUrl, active, openReportCount, avgRating|null, ratingCount, updatedAt}`
`AdminFeedback = {id, category, username, questionId|null, questionCode|null, difficultyVote|null, rating|null, message|null, resolved, resolvedAt|null, createdAt}`
`ImportReport = {dryRun, mode, applied, totalRows, inserted, updated, skipped, errorCount, warningCount, errors:[{row,code,field,message}], warnings:[{row,code,field,message}]}` — hata varsa **hiçbir şey yazılmaz** (`applied:false`); listeler en çok 1000 kayıt taşır, tam sayılar `errorCount/warningCount`'tadır; `row` = dosyadaki kayıt sırası (CSV'de başlık 1).

## Sayfalar ve rotalar (ön yüz)
`/giris` Giriş · `/kayit` Kayıt · `/` Ana sayfa · `/sorular` Soru bankası · `/soru/:code` Soru detayı (QR bu adrese gider; filtreler query string'de taşınır) · `/sinav/yeni` Sınav başlat · `/sinav/:id` Sınav · `/sinav/:id/sonuc` Sonuç · `/gecmis` Sınav geçmişi · `/geri-bildirim` Geri bildirim · `/hesap` Şifre değiştir · `/yonetim` Yönetim (sekmeler: Özet, Sorular, Bildirimler, İçe aktar; `?sekme=`).
Oturum yoksa `/giris`'e yönlendir, girişten sonra geldiği adrese dön (QR akışı). Yönetim yalnız ADMIN.

## Veri aktarma (CSV/JSON)
Sütunlar: `code`(zorunlu, tekil) · `exam_type`(zorunlu) · `subject`(zorunlu) · `topic` · `year` · `source` · `image`(zorunlu; kök klasöre göre göreli yol) · `correct_answer`(zorunlu A–E) · `choice_count`(4–5, varsayılan 5) · `solution_url` · `active`(varsayılan true). CSV: UTF-8, ayraç `,` `;` veya sekme (başlıktan otomatik). JSON: nesne dizisi. Örnek: `ornek-veri/sorular.csv`.
