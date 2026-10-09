# 06.06 — Onaylı etiket anlık kaydı ve fayda oyu

**Durum:** BITTI (kod ve yalıtılmış test DB doğrulaması) · **Tarih:** 2026-10-09

V14, eski `question_taxonomy` satırlarını `PROPOSED` durumunda bırakır. Bir eşleme yalnız `approval_status=APPROVED`, dolu `taxonomy_version`, `source=HUMAN` veya `AI_REVIEWED` ve etkin `SUBTOPIC`/`QUESTION_TYPE` düğümüyle öğrenciye açılır. 10.01'deki 50 taslak etiket yayımlanmadı. V15, farklı üst dallarda aynı kodlu düğümlerin anlık kaydını ayırır.

Her pratik olayında geçerli onaylı etiketin türü, kodu, adı ve sürümü `attempt_taxonomy_snapshot` tablosuna kopyalanır. Sonradan düğüm adı veya eşleme sürümü değişse bile eski deneme yanıtı sabit kalır. Etiket yoksa API boş liste, soru künyesi “Onaylı etiket yok” gösterir. Soru ayrıntısı mevcut yayımlanmış etiketleri gösterir; deneme geçmişi olay anındaki kopyayı döner.

Fayda oyu `question_helpfulness` içinde kullanıcı ve soru başına tek satırdır. Yanıt veya cevap gösterme olayından ya da teslim edilmiş sınavdan sonra verilebilir; yalnız atlamak yeterli değildir. Tekrar oy önceki değeri günceller. Toplamlar ve kullanıcının kendi oyu soru ayrıntısında görünür. Hesap dışa aktarımına anlık etiketler ve fayda oyu eklendi; hesap silmede bağlı kayıtlar silinir.

**Doğrulama:** `ivme_test` üzerinde V14–V15 geçişi, `AttemptTaxonomyHelpfulnessTest`, `AttemptTest` ve `AccountDataTest` geçti. Taslağın gizlenmesi, anlık sürümün korunması, diğer öğrencinin oyunun ayrılması, çözmeden ve yalnız atlayarak oy verilememesi sınandı. Ön yüz paketi derlendi; yalıtılmış Chrome sahte API provasındaki soru ekranı ve oy akışı 1280/390 px ölçülerinde geçti. Gerçek `ivme` DB V9 ve canlı site bu geçişleri henüz almadı; 05.03 kapısı açık.
