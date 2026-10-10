# 13.03 — Kaynaklı iç pasaj araması

**Durum:** BITTI (dört sayfalık iç pilot) · **Tarih:** 2026-10-09 · **Girdi:** [13.02 metin/OCR pilotu](49_13_02_KONU_PDF_METIN_OCR_PILOTU.md)

`scripts/konu-not-arama-pilotu.py` yalnız yerel, Git dışı `veri/pilot-13-02.json` iç notlarını arar. Türkçe karakterleri katlayarak eşleşen en fazla üç kısa pasajı döndürür; her sonuç not kimliği, inceleme durumu, katalog id, kaynak PDF SHA-256'sı, fiziksel sayfa, başlık ve `/api/topic-pdfs/{id}/file#page=N` bağlantısı taşır. Kaynak sürümü, gerçek dosyanın SHA-256'sı, izinli kök, sayfa aralığı ve not kimliği tekrar doğrulanır. Eşleşme yoksa boş liste döner. Bir PDF değişirse eski pasaj bağlantısı geçerli sayılmaz.

```powershell
$env:PYTHONIOENCODING='utf-8'
D:\workspace\ivme\.venv\Scripts\python.exe -W error scripts\konu-not-arama-pilotu.py fonksiyonun --limit 3
```

`fonksiyonun` sorgusu katalog 2138'ün 3. ve 2. sayfasına bağlı iki pasaj verdi; `taksinin` 3. sayfaya tek pasaj verdi. Boş sorgu sonucu ve değiştirilmiş PDF checksum'ının reddi denendi. Sayfa bağlantıları katalog ve PyMuPDF sayfa sayısıyla karşılaştırıldı. Bağlantıdaki `#page=N` tarayıcının PDF sayfa parçasıdır; yetkili öğrenci PDF dosya API'si aynı kalır. Pilot, tarayıcıların PDF parçasını her platformda aynı biçimde işleyeceği garantisini vermez; ürün akışında kullanılmadan önce hedef tarayıcıda açılış testi gerekir.

Pilot notlarının tümü `needs_review` durumundadır. Arama **yalnız çevrimdışı iç araçtır**; öğrenciye yeni metin sayfası, pasaj API'si veya doğrulanmamış AI ipucu açılmaz. Formül ve tablo görselindeki eksik metinler arama sonucuyla tamamlanmış gibi gösterilmez. Daha geniş arşiv indeksleme ve insan onayı ayrı iştir.
