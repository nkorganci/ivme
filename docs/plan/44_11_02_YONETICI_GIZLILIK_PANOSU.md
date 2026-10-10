# 11.02 — Toplu yönetici panosu ve küçük grup gizleme

**Durum:** BITTI (yalıtılmış test DB ve masaüstü/telefon tarayıcı provası) · **Tarih:** 2026-10-09

`GET /api/admin/stats?period=DAY|WEEK|MONTH`, kayıtlı öğrenci ve tamamlanmış sınavların tüm zamanlar toplamını; seçilen `Europe/Istanbul` gün/hafta/ayında etkin öğrenci, başlatılan pratik/sınav ve gönderilen cevap toplamlarını döndürür. API ve ekran kimlik, ad, e-posta, tekil cevap veya oturum listesi döndürmez. Dönem saat dilimi sunucuda sabittir; istekle küçük zaman pencereleri türetilemez.

0–4 arasındaki her toplam `null`/“5’ten az” olarak gizlenir. Diğer sayılar beşlik aralığın alt sınırı olarak döner ve ekranda aralık gösterilir (ör. 5–9). Seçilen dönemde beşten az etkin öğrenci varsa dönemlik pratik, sınav ve cevap toplamlarının tamamı da gizlenir. Tüm zamanlar kayıtlı öğrenci sayısı beşten azsa tamamlanan sınav toplamı gizlenir. Bu kural küçük pilotta birey çıkarımını azaltır; kesin sayılar yöneticiye sunulmaz.

`AdminUsageTest`, `AuthTest` ve `ExamFlowTest` toplam 17 testle geçti. İzole Chrome 1280/390 px kontrolünde dönem kartları, gizlenen sayı metni ve yatay taşma doğrulandı. Üç rolün çapraz erişim matrisi 11.03'te ayrıca tamamlanacak. Canlı DB/gerçek cihaz kabulü açık.
