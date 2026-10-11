# 09.06 — Günlük Program

**Durum:** BITTI (izole test DB ve ön yüz derlemesi) · **Tarih:** 2026-10-11

## Karar ve değişiklik

İlerleme Takip Paneli'ne **Günlük Program** alt kategorisi eklendi. İki takvim alanıyla başlangıç ve bitiş günü dahil tarih aralığı seçilir. Her hafta, saatler solda ve Pazartesi–Pazar üstte olan ayrı bir yedi günlük tabloda gösterilir. Gün adı ve seçilen tarih aynı başlık hücresindedir. Tek gün seçilince diğer sütunların hücreleri boş kalır; bir haftayı aşan aralıkta ikinci ve sonraki tablolar alta eklenir. Saat satırları 08:00–22:00 arasında birer saatlik 14 aralıktır.

Kaydedilmemiş değişiklikle tarih değiştirirken uyarı verilir. Yeni seçilen aralık için **Görünen programı kopyala** veya **Yeni boş program** seçimi yapılır. Kopyalama, görünen ilk haftanın aynı hafta gününe ait saatleri yeni haftalara taşır. Seçim kendi başına kaydetmez; **Programı kaydet** eylemi veritabanına yazar.

Flyway `V19`, `student_program_weeks` tablosunu ekler. Bir öğrenci/hafta için seçilen başlangıç-bitiş ve tarih → 14 hücre JSON içeriği saklanır. `GET /api/study-program?start=&end=` yalnız oturumdaki öğrencinin kayıtlarını döndürür. `PUT /api/study-program` bir veya birden fazla kesintisiz haftayı işlem içinde kaydeder. Aynı haftadaki yeni bir aralık eski haftalık kaydın yerini alabilir; daha dar tarih sorgusunda önceki seçili aralık korunarak yalnız görünen gün düzenlenir. Geçmiş hafta hem arayüzde salt okunur hem API'de 409 ile kilitlidir. Hafta sınırı kayda alınan IANA saat diliminde pazartesi–pazardır; mevcut hafta son gününe kadar düzenlenebilir. İçerik en fazla 250 karakter/hücre, sorgu en fazla 367 gün ve kayıt en fazla 54 hafta ile sınırlıdır. Hesap verisi dışa aktarımına programlar eklenir; hesap silmede kullanıcı dış anahtarıyla silinir.

## Kontrol

- Ön yüz `npm run build` geçti.
- `StudyProgramTest` izole `ivme_test` üzerinde V19 göçünü, tek gün kaydı, iki öğrenci ayrımını, çok haftalı aramayı, geçmiş hafta 409 kuralını, saat dilimi değiştirme ve uzun hücre reddini doğruladı.
- `AccountDataTest` programın hesap dışa aktarımına girdiğini ve hesap silmede silindiğini doğrular.
- Gerçek cihazda tarih seçici, yatay tablo kaydırma ve kopyala/boş akışı ayrıca gözle kontrol edilmelidir. Canlı `ivme` veritabanına göç ve yayın yapılmadı.

**Yerel commit:** Bu kayıt, uygulama değişiklikleriyle aynı commit'te tutulur. **Sonraki bağımlılık:** Canlı veritabanı geçişi ve fiziksel cihaz kabulü.
