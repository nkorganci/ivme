# 07.04 — Pratik yanıtını oturuma bağlama ve soru geçişi

**Durum:** SIRADAKI · **Bağımlılık:** [07.03](13_07_03_PRATIK_OTURUMU.md) BITTI.

## Kısa amaç

Öğrenci oturumdaki soruları sırayla çözer. Cevap, cevap gösterme ve atlama olayları doğru oturum sorusuna bağlanır; oturum listesi her soru için henüz başlanmadı/çalışılıyor/tamamlandı durumunu gösterir. Soru ekranındaki önceki/sonraki yalnız oturum sırasını izler.

## Bu dilimin sınırı ve kabulü

1. `POST /api/questions/{id}/practice` için isteğe bağlı `sessionId` ekle. Sunucu oturumun kullanıcıya ait, açık ve sorunun bu oturumda olduğunu doğrulasın; eski oturumsuz pratik akışı aynı kalsın. Aynı `clientEventId` ağ tekrarında tek deneme döndürsün.
2. `GET /api/study-sessions/{id}` güvenli, tekil soru durumlarını mevcut olaylardan hesaplasın. İlk deneme/son tur ayrımını koru; daha sonra açılan bağımsız cevap eski oturumu tamamlanmış göstermesin.
3. React soru ekranı oturum kimliğini isteğe geçirsin, önceki/sonraki düğmeleri oturum sırasına bağlasın; oturum listesindeki durumlar yenileme/geri girişten sonra aynı kalsın. Boş, yükleniyor, hata ve dar ekran akışını kontrol et.
4. İki hesapla sahiplik, oturum dışı soru, yinelenen istek, eski bağımsız pratik ve masaüstü/telefon uçtan uca akışlarını doğrula. Gerçek DB ve canlı süreçleri değiştirme; yalnız `ivme_test` ve gerekirse yedekten geçici DB kullan.

**Bu işte ertelenenler:** Dört pratik seçim modu/alt konu filtreleri **07.05**; süreli pratik/bitiş/sonuç **07.06**; geçmiş listesi **07.07**.

## Oturum sonu kaydı

`Tarih · değişiklik · UI · test · yerel commit · açık risk` ekle. [İş listesini](12_NUMARALI_IS_LISTESI.md) ve dış klasör kopyasını eşitle; bitince **07.04 BITTI**, **07.05 SIRADAKI** yap. GitHub'a push yapma.
