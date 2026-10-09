# 06.05 — Soru başı yaklaşık aktif süre

**Durum:** YAPILACAK (kod ve masaüstü/mobil benzetim doğrulandı; gerçek cihaz davranışı açık) · **Tarih:** 2026-10-09

## Uygulanan düzeltme

Soru ekranının önceki saniyelik `setInterval` sayacı, tarayıcı zamanlayıcısı yavaşlatıldığında süreyi eksik sayabiliyordu. Yeni `ActiveTime` sayacı `performance.now()` ile geçen süreyi toplar. Görünmeyen sekme ve odak dışı masaüstü pencere sayılmaz; son etkileşimden sonra en fazla 60 saniye sayılır. Geri dönüş veya yeni etkileşimden sonra yeniden başlar. Telefonda güvenilir olmayan `document.hasFocus()` yerine görünürlük ve kaba işaretçi koşulu kullanılır. Gönderimde süre 21.600 saniye sınırını aşmaz; sunucu tarafındaki var olan üst sınır değişmedi.

`node --test testler/active-time.test.mjs` ile boşta kalma, arka plan/odak, uzun geciken zamanlayıcı ve sıfırlama durumları 3/3 geçti. `npm run build` geçti. Chrome mobil benzetimi gerçek telefon ekran kilidi, uygulama geçişi ve farklı tarayıcıların odak olaylarını kanıtlamaz.

**Kalan kabul:** Gerçek telefonda en az bir görünür çalışma, uygulamadan ayrılma, ekran kilidi, 60 saniyeyi aşan boşta kalma ve geri dönüş akışında gönderilen `activeSeconds` değerini ölç. Masaüstünde başka pencereye geçişi de aynı şekilde doğrula. Sonuçlar kabul ölçütünü karşılamadan 06.05 `BITTI` yazılmaz.
