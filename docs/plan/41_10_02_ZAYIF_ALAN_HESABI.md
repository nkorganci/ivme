# 10.02 — Açıklanabilir zayıf alan hesabı

**Durum:** BITTI (yalıtılmış test DB; gerçek etiket verisi yok) · **Tarih:** 2026-10-09

`GET /api/recommendations?subject=Türkçe` yalnız öğrencinin kendi ilk cevap olaylarını inceler. Pratikte cevap anındaki onaylı soru tipi kopyasını, teslim edilmiş sınavda onaylı güncel soru tipi bağını kullanır. Her soru ilk kez cevaplandığı anda bir kez sayılır; tekrar cevapları öneriyi değiştirmez. Son 90 günlük ilk cevaplar değerlendirilir; son 30 gündekiler başarı hesabında iki kat ağırlık alır.

En az 30 etiketli tekil soru ve üç ayrı tip yoksa `INSUFFICIENT_DATA` döner. En az beş örnekli tipte ağırlıklı başarı %60'ın altındaysa veya yeterli süre örneğinde ders ortalamasının 1,5 katından uzunsa öneri üretilir. Yanıt soru tipi, beceri, alt konu, varsa beceri önkoşulunun alt konusu, örnek sayısı, doğru/yanlış ve ortalama aktif süreyi içerir. Yeterli veri olup belirgin güçlük yoksa `NO_CLEAR_WEAKNESS` döner. Bu ipucu tanı değildir; süre yaklaşık istemci ölçümüdür.

`RecommendationTest` iki kullanıcı ayrımı, 30 soruluk üç tipli örnek, tekrar cevabı, beceri önkoşulu, onaylı sınav etiketi ve yüksek başarıda öneri vermemeyi `ivme_test` üzerinde doğruladı. Gerçek 50 soruluk CSV'deki etiketler `proposed` durumundadır ve bu hesaba girmez; uzman onayı ile yayın akışı 14.01/14.02 işine bağlıdır. Öğrenci açıklama ekranı 10.03 kapsamındadır.
