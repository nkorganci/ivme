# 09.05 — İlerleme Takip Paneli

**Durum:** BITTI (ön yüz derlemesi) · **Tarih:** 2026-10-11

## Karar ve değişiklik

`D:\workspace\ivme\takip\takip.json` içindeki sabit Nazile YKS çalışma planından uygulamanın ihtiyaç duyduğu alanlar `frontend/src/data/ilerleme-plani.json` dosyasına alındı: ders ve faz hedefleri, günlük/haftalık/aylık satırlar, deneme tarihleri, konu takvimi ve haftalık program. Kullanıcıya ait eski deneme sonuçları, puan/sıralama kalibrasyonu, Excel formülleri ve tekrar üretilmiş CSV/JS dosyaları yeni uygulamaya alınmadı. Kaynak `takip/` ve eski `site/` yapısı başka akışlarda kullanıldığı için yerinde bırakıldı.

Öğrenci sol menüde **İlerleme Takip Paneli** bağlantısını görür. Günlük, haftalık, aylık plan ve seçili tarihin fazı, bu ayın bitmemiş konuları, planlı denemeleri, konu kontrol listesi ve seçilen günün saat programı gösterilir. `Hedeflerim` mevcut kişisel hedefleri yönetmeye devam eder; `İlerlemem` mevcut ilk deneme istatistiğini sunar. Paneldeki güncel çalışma sayısı aynı ilerleme API'sinden gelir. İlk deneme sayısı, tekrarları içerebilen Excel plan hedefiyle eşdeğer olmadığı için tamamlanma yüzdesi hesaplanmaz.

Konu işaretleri `localStorage` içinde hesap kimliğine ayrılmış anahtarda tutulur; sunucuya, başka cihazlara veya hesap verisi yedeğine aktarılmaz. Plan tek öğrenciye göre hazırlanmış örnek şablondur; tüm öğrencilere otomatik kişisel hedef olarak atanmaz. Sınav tarihi tahmini plan girdisidir.

## Kontrol

- Ön yüz: `npm run build`.
- Gün/hafta/ay geçişi, plan dışı tarih, ders filtresi, konu işaretleme, mobil menü ve sunucu verisi yokken hata/boş durum tarayıcıda ayrıca kontrol edilmelidir.
- Yeni API veya veritabanı geçişi yoktur. Kaynağın Excel'den yeniden üretilmesi halinde uygulama içindeki plan kopyası otomatik güncellenmez; içerik yeniden aktarılmalıdır.

**Yerel commit:** Bu kayıt, uygulama değişiklikleriyle aynı commit'te tutulur. **Sonraki bağımlılık:** Çok cihazlı konu durumu istenirse öğrenciye özel sunucu kaydı tasarlanır.
