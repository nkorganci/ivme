# 08.02 — İlk deneme dönemleri

**Durum:** BITTI (yalıtılmış test DB ve ön yüz derleme) · **Tarih:** 2026-10-09

`GET /api/progress/first-attempts?period=DAY|WEEK|MONTH&zone=...` oturumdaki öğrencinin soru başına ilk cevap olayını sayar. Pratikte yalnız `ANSWER`, sınavda yalnız teslim edilmiş sınavın doğru/yanlış/boş sonucu kullanılır. `SKIP`, `REVEAL`, sonraki cevaplar ve devam eden sınavlar ilk deneme sayısını değiştirmez. Pratik ile sınavda karşılaşılan aynı soru yalnız ilk gerçekleşen olayın dönemine ve sonucuna girer. Boş cevap yalnız teslim edilmiş sınavdan gelir. Başarı yüzdesi doğru / (doğru + yanlış + boş) olarak bir ondalığa yuvarlanır.

Dönem sınırları öğrencinin tarayıcısının IANA saat dilimindeki yerel gece yarısıdır: gün, pazartesi başlayan hafta ve ay. SQL aralığı başlangıç dahil, bitiş hariçtir. Sunucu geçersiz saat dilimini reddeder. İlerlemem ekranı dönemleri ve doğru/yanlış/boş sayılarını, oranı ve boş durumu gösterir.

`ProgressPeriodTest` iki öğrenciyi, tekrar denemeyi, atlamayı, sınav boşunu ve New York yaz saati geçişindeki 23 saatlik günü doğruladı. Test `ivme_test` üzerinde geçti; ön yüz `npm run build` ile derlendi. Canlı `ivme` DB V15'e geçmeden bu ekran canlı kabul edilmez; geçiş 05.03 kapsamındadır. Masaüstü/telefon görsel provası henüz ayrıca kaydedilmedi.
