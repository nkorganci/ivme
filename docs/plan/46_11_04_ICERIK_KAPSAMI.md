# 11.04 — Yönetici içerik kapsamı

**Durum:** BITTI (yalıtılmış test DB ve masaüstü/telefon tarayıcı provası) · **Tarih:** 2026-10-09

Yönetici paneli etkin ve `CIKMIS`/`OGM` koleksiyonuna atanmış tekil soru kayıtlarının toplamını, koleksiyonlara ve TYT/AYT türlerine göre gösterir. Her soru toplamda bir kez, kendi koleksiyon ve sınav türünde bir kez sayılır. İçerik sayıları öğrenci davranışı içermediğinden kesin kayıt toplamıdır. Görsel dosyaların varlığı/okunabilirliği bu SQL sayımıyla doğrulanmaz; ekran bunu açıklar.

`AdminContentTest`, etkin iki farklı koleksiyon/tür sorusunun sayılmasını ve pasif sorunun dışlanmasını `ivme_test` üzerinde doğruladı. `AdminUsageTest`, `RoleBoundaryTest`, ön yüz derlemesi ve 1280/390 px izole Chrome yönetici ekranı geçti. İçerik bakım kayıtları veya soru kimlikleri yönetici API'sine eklenmedi. Canlı DB/gerçek cihaz kabulü açık.
