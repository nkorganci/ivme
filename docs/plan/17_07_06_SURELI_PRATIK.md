# 07.06 — Süreli pratik ve sonuç

**Durum:** SIRADAKI · **Bağımlılık:** [07.05](16_07_05_PRATIK_SECIMI.md) BITTI. · **Model:** GPT-6 Luna · Medium (testler veya katmanlar arası tutarlılık çözülemezse GPT-6.1 Sol · Medium'a yükselt).

## Kısa amaç

Öğrenci süreli pratik seçerse kalan süreyi görür; süre dolunca veya kendisi bitirince cevaplar sabitlenir, yanıtlanmamış sorular boş sayılır ve özet gösterilir. Süresiz pratikte mevcut davranış sürer.

## Bu dilimin sınırı ve kabulü

1. Oturuma süre seçimini ve sunucu kaynaklı kesin bitiş zamanını ekle. İstemci sayacı yalnız gösterim içindir; süre dolan oturuma API'den yanıt kabul edilmez. Ağ tekrarları ve saat farkı için sunucu zamanı esas alınır.
2. Süreli pratikte açık **Bitir** eylemi ve süre bitiminde otomatik kapanma; tamamlanma işlemi tekrar çağrıldığında aynı sonucu verir. Soru başı olaylar korunur; boş sorular ve her sorunun ilk/son tur sonucu açıkça tanımlanır. Sonuç, sonradan soru anahtarı değişse de o anki denemelerle tutarlı kalır.
3. Kurucuda süreli/süresiz tercih ve anlaşılır süre alanı; oturumda kalan süre, mobil görünüm, uyarı ve sonuç ekranı. Süresiz oturum ve eski oturumsuz pratik akışları bozulmaz.
4. İki hesap, sunucu süresi, bitişe yakın yanıt, yenileme/geri dönüş, bitmiş oturuma yazma reddi, boş soru ve masaüstü/telefon UI doğrulaması. Gerçek DB ve canlı süreci değiştirme.

**Bu işte ertelenenler:** Oturum geçmişi [07.07](12_NUMARALI_IS_LISTESI.md), OGM PDF'den konuya geçiş [07.08](15_OGM_PDF_VE_KONU_SORU_BAGI.md).

## Oturum sonu kaydı

`Tarih · değişiklik · UI · test · yerel commit · açık risk` ekle. [İş listesini](12_NUMARALI_IS_LISTESI.md) ve dış klasör kopyasını eşitle; bitince **07.06 BITTI**, **07.07 SIRADAKI** yap. GitHub'a push yapma.
