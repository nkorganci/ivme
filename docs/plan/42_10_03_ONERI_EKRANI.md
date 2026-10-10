# 10.03 — Çalışma önerileri ekranı

**Durum:** BITTI (yalıtılmış test DB ve masaüstü/telefon tarayıcı provası) · **Tarih:** 2026-10-09

Öğrenci menüsündeki `Çalışma önerileri` ekranı ders seçimiyle kendi onaylı ilk deneme verisini okur. Az ve çeşitsiz veride açık belirsizlik mesajı, yeterli veri olup belirgin güçlük yoksa sakin boş durum gösterir. Öneri kartında soru tipi, beceri, alt konu ve ilk deneme sayıları; `Neden öneriyoruz?` bölümünde 90 günlük pencere, son 30 gün ağırlığı, başarı/süre ve varsa önkoşul görünür. `Şimdi çalış`, önerideki etkin örnek soruya gider; doğrulanmış tip filtresi hazır olmadan hedefli soru havuzu iddiası taşımaz.

Öğrenci örnek soru için `Etiket hatası bildir` formuyla `QUESTION_ISSUE` geri bildirimi gönderebilir. Bildirim soru kimliğine ve soru tipi koduna bağlıdır. API yalnız etkin örnek soruları döndürür. `RecommendationTest` örnek soru kimliğini ve öğrencinin kendi verisini doğruladı. Ön yüz derlemesi ve izole Chrome 1280/390 px akışı öneri, az veri, gerekçe, örnek soru bağlantısı, bildirim gönderimi ve yatay taşma açısından geçti.

Gerçek 50 soruluk taslak etiketler öneriye girmez; insan onayı/yayın akışı 14.01/14.02 kapsamında açık. Fiziksel cihaz ve canlı DB kabulü de ayrıca açık.
