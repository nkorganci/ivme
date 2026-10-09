# 09.01 — Hedef dönem modeli

**Durum:** BITTI (yalıtılmış test DB) · **Tarih:** 2026-10-09

V5'teki `goals` tablosu öğrenci, dönem (`DAY`, `WEEK`, `MONTH`), ölçüt (`UNIQUE_QUESTIONS`, `ATTEMPTS`, `TESTS`, `EXAMS`), isteğe bağlı ders, hedef sayı, başlangıç/bitiş yerel tarihleri ve durumu tutar. V16, hedefin oluşturulduğu IANA saat dilimini (`zone_id`) ve düzenleme/durdurma zamanlarını ekler. Var olan kayıtlar için varsayılan `Europe/Istanbul` kullanılır.

`GoalPeriod.containing` gün başlangıcını yerel gece yarısı, hafta başlangıcını pazartesi, ay başlangıcını ayın biri olarak hesaplar. Veritabanındaki `ends_on` dahil son yerel gündür; olay sayımı için dönen UTC `endsAt` hariçtir. Hedefin saat dilimi kayıtta sabit kalır; öğrenci cihazının dilimi sonradan değişse bile geçmiş hedefin sınırı değişmez. Aynı dönem kuralı 08 istatistik ekranında da kullanılır.

`GoalPeriodTest` yaz saati değişimindeki 23 saatlik günü, hafta/ay sonlarını ve geçersiz saat dilimini doğruladı. `ProgressPeriodTest` ile birlikte `ivme_test` üzerinde Flyway V16 uygulanıp geçti. Hedef oluşturma/düzenleme UI'si 09.02, ilerleme sayımı 09.03 kapsamındadır. Canlı DB geçişi 05.03 kabulüne bağlıdır.
