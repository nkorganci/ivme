# 07.06 — Süreli pratik ve sonuç

**Durum:** BITTI · **Bağımlılık:** [07.05](16_07_05_PRATIK_SECIMI.md) BITTI. · **Model:** GPT-6 Luna · Medium.

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

2026-10-09 · Süre alanı, sunucu başlangıcından kesin bitiş, süre sonunda kapanma, zamanlı yazma reddi, idempotent bitirme ve kayıtlı ilk/son tur sonuçları eklendi. Süresiz ve oturumsuz akış korundu. · Edge ile 1280/390 px kurucu, açık oturum ve sonuç ekranları sahte API verisiyle görsel olarak kontrol edildi; yatay taşma ve tarayıcı hatası yok. · `StudySessionTest` + `AttemptTest` geçti; `npm run build` geçti. Gerçek DB ve canlı süreç değiştirilmedi. · Yerel commit: bu işin Git kaydı. · Açık risk: canlı V10–V13 geçişi ve gerçek cihaz provası 05.03/05.05 kapsamında; bu UI kontrolü test verisiyle yapıldı.
