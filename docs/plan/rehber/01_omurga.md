# Sistem rehberi — Sistemin omurgası

[Rehber dizini](../00_SISTEM_REHBERI.md) · Ne zaman okunur: Uygulamanın katmanları ve veri akışı; ilk kez sistemi tanırken.

## Sistemin omurgası

Tek uygulama `D:\workspace\ivme\uygulama` altındadır: React/Vite ön yüz,
Spring Boot API ve PostgreSQL. Özgün eğitim dosyaları üst dizindeki `Kaynaklar`,
çıkarım girdileri `veri-hatti`, korunmuş soru kartları `icerik/data` altındadır.
Uygulamanın `veri/` dizini büyük üretim çıktıları, önbellekler ve denetim kanıtlarını tutar.
Özgün içerik, üretilmiş katalog, öğretmen kararı ve öğrenci olayı birbirinden ayrıdır.

```mermaid
flowchart LR
    S[Özgün PDF, soru, video ve not girdileri] --> I[Kaynak envanteri ve hash kontrolü]
    X[Excel ilk KONULAR sayfası] --> T[content-taxonomy.json]
    T --> G[Ortak kimlikle üretim]
    I --> G
    C[Sayfa çıkarım önbelleği] --> G
    G --> V[Şema, kaynak, konum ve kapsam denetimi]
    V --> P[Atomik etiket sürümü]
    P --> DB[PostgreSQL learning_catalog]
    DB --> API[Rol sınırları olan API]
    H[Öğretmen kararı ve değişmez geçmişi] --> API
    API --> UI[Kaynak, soru ve takip ekranları]
    UI --> E[Öğrenciye ait çalışma ve sınav olayları]
```
