# 08.03 — Öğrenci istatistik kırılımları

**Durum:** BITTI (yalıtılmış test DB ve ön yüz derleme) · **Tarih:** 2026-10-09

`/api/progress/first-attempts` aynı ilk cevap/teslim edilmiş sınav olaylarını tek SQL sorgusunda ders, konu ve soru tipi olarak toplar. Genel doğru/yanlış/boş ve toplam, ders satırlarından hesaplanır; her kırılımın satır toplamı genel toplamla aynıdır. Her soru bir satıra yerleşir. Konusu boş sorular `Konu belirtilmemiş`, yayımlanmış soru tipi olmayanlar `Onaylı soru tipi yok` grubuna girer. Birden fazla onaylı tip varsa adlar tek birleşik grupta görünür; soru iki kez sayılmaz.

Pratikte soru tipi, ilk cevap olayındaki onaylı anlık etiketlerden gelir; sonradan ad veya eşleme değişince geçmiş kırılım değişmez. Sınavların etiket anlık kaydı henüz yoktur; teslim edilmiş sınav sorusunda güncel onaylı insan veya incelenmiş AI etiketi kullanılır. Ders ve konu soru kaydındaki güncel değerdir. Bu tarihsel sınırlamalar ileride içerik sürümleme ihtiyacı doğurabilir.

İlerlemem ekranı dönem toplamının altında üç erişilebilir tablo gösterir; dar ekranda yatay kayar. `ProgressPeriodTest` iki öğrenciyi, boş sınav cevabını, tekrar denemeyi, her üç kırılımın toplam eşitliğini, etiketsiz durumu ve pratik etiket anlık adının korunmasını `ivme_test` üzerinde doğruladı. `npm run build` geçti. Canlı DB geçişi 05.03, fiziksel cihaz kontrolü 05.05 kapsamında açık.

