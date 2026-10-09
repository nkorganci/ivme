# 09.02 — Hedef yönetimi

**Durum:** BITTI (yalıtılmış test DB ve ön yüz derleme) · **Tarih:** 2026-10-09

Öğrenci `Hedeflerim` sayfasında günlük, haftalık veya aylık tekil soru, cevap denemesi, süreli pratik ya da sınav hedefi oluşturur. Etkin sorulardan bir ders seçebilir veya tüm dersleri kapsayabilir. Saat dilimi oluşturma anında hedefte saklanır. Hedef listesi son 100 kaydı ve dönem sınırını gösterir. Etkin hedefin sayısı/dersi düzenlenebilir veya hedef durdurulabilir; dönem ve ölçüt değişikliği için yeni hedef oluşturulur. Geçmiş kayıtlar silinmez.

`/api/goals` uçları kullanıcı kimliğini oturumdan alır. Başkasının hedefini düzenleme/durdurma 404 döner. Sayı 1–10000 ve saat dilimi doğrulanır. Dönemi biten veya durdurulan hedef düzenlenemez; durdurma tekrar isteğinde aynı sonucu verir.

`GoalFlowTest` iki hesapla oluşturma, listeleme, düzenleme, tekrar durdurma, geçersiz sayı, negatif sahiplik ve hatalı dilimi `ivme_test` üzerinde doğruladı. `GoalPeriodTest` ve ön yüz derlemesi geçti. İzole Chrome provasındaki oluştur/düzenle/durdur akışı 1280 ve 390 px genişlikte geçti; yatay taşma görülmedi. Başarısız işlem uyarısı erişilebilir hata durumunda gösterilir, durdurulan hedefin düzenleme formu kapanır. Hedef ilerleme sayıları ve gün sonu sayımı 09.03 kapsamındadır. Canlı veritabanı ve fiziksel cihaz kabulü ayrıca açık.
