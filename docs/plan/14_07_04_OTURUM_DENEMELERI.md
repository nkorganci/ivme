# 07.04 — Pratik yanıtını oturuma bağlama ve soru geçişi

**Durum:** BITTI · **Bağımlılık:** [07.03](13_07_03_PRATIK_OTURUMU.md) BITTI.

## Kısa amaç

Öğrenci oturumdaki soruları sırayla çözer. Cevap, cevap gösterme ve atlama olayları doğru oturum sorusuna bağlanır; oturum listesi her soru için henüz başlanmadı/çalışılıyor/tamamlandı durumunu gösterir. Soru ekranındaki önceki/sonraki yalnız oturum sırasını izler.

## Bu dilimin sınırı ve kabulü

1. `POST /api/questions/{id}/practice` için isteğe bağlı `sessionId` ekle. Sunucu oturumun kullanıcıya ait, açık ve sorunun bu oturumda olduğunu doğrulasın; eski oturumsuz pratik akışı aynı kalsın. Aynı `clientEventId` ağ tekrarında tek deneme döndürsün.
2. `GET /api/study-sessions/{id}` güvenli, tekil soru durumlarını mevcut olaylardan hesaplasın. İlk deneme/son tur ayrımını koru; daha sonra açılan bağımsız cevap eski oturumu tamamlanmış göstermesin.
3. React soru ekranı oturum kimliğini isteğe geçirsin, önceki/sonraki düğmeleri oturum sırasına bağlasın; oturum listesindeki durumlar yenileme/geri girişten sonra aynı kalsın. Boş, yükleniyor, hata ve dar ekran akışını kontrol et.
4. İki hesapla sahiplik, oturum dışı soru, yinelenen istek, eski bağımsız pratik ve masaüstü/telefon uçtan uca akışlarını doğrula. Gerçek DB ve canlı süreçleri değiştirme; yalnız `ivme_test` ve gerekirse yedekten geçici DB kullan.

**Bu işte ertelenenler:** Dört pratik seçim modu **07.05** kapsamında tamamlandı. Doğrulanmış alt konu/soru tipi filtresi **07.10**; süreli pratik/bitiş/sonuç **07.06**; geçmiş listesi **07.07** açık.

## Oturum sonu kaydı

2026-10-09 · Oturum kimlikli GET/POST pratik olayları, sahiplik/soru üyeliği denetimi, tur bazlı soru durumu ve kaydedilen oturum sırasıyla gezinme eklendi. Bağımsız pratik ayrı kaldı; sonradan gelen bağımsız yanıt oturum durumunu değiştirmiyor. Masaüstü ve mobil listede sıra/durum, soru ekranında önceki/sonraki ve yenileme kontrol edildi. `StudySessionTest` 3/3, `AttemptTest` 2/2, ön yüz derlemesi ve izole yerel pakette masaüstü/mobil E2E ayrı ayrı 37/37 geçti. Gerçek `ivme` DB ve çalışan 5173/8081 servisleri değiştirilmedi; canlıya alma [05.03](12_NUMARALI_IS_LISTESI.md) kapsamında açık. Yerel commit: bu görev tamamlanınca Git geçmişinde.

**BITTI**
