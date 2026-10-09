# 09.03 — Hedef ilerlemesi

**Durum:** BITTI (yalıtılmış test DB ve tarayıcı provası) · **Tarih:** 2026-10-09

Hedef API'si `progressCount` ve `remainingCount` döndürür. Dönem sınırı, hedefe kaydedilen saat diliminde gece yarısıdır; bitiş hariçtir. Durdurulan hedefin sayımı `stopped_at` anında donar. Kalan sayı sıfırın altına düşmez.

`UNIQUE_QUESTIONS` pratik cevapları ve teslim edilmiş sınav cevapları arasındaki soru başına ilk cevap olayını sayar; sonraki tekrar dönem içinde olsa da tekil sayıyı artırmaz. `ATTEMPTS` her pratik cevap gönderimini ve teslim edilmiş sınavın cevaplanmış her sorusunu sayar. `TESTS` tamamlanmış süreli pratik oturumunu, `EXAMS` teslim edilmiş sınavı bir kez sayar. Dersli test hedefinde oturumun kurulurken seçilen ders filtresi gerekir; karışık oturum tek derse mal edilmez.

`GoalProgressTest` iki hesap, tekrarlı cevap, sınav sorusu, süreli pratik, farklı ders, yerel gün başlangıcı/bitişi, 23 saatlik yaz saati günü ve durdurma anını `ivme_test` üzerinde doğruladı. `GoalFlowTest`, `GoalPeriodTest`, ön yüz derlemesi ve 1280/390 px izole Chrome akışı geçti. Canlı DB ve fiziksel cihaz kabulü ayrıca açık.
