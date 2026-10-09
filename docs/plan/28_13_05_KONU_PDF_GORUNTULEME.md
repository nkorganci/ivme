# 13.05 — Konu anlatımları ve özgün PDF görüntüleme

**Durum:** BITTI (kod ve yerel doğrulama) · **Tarih:** 2026-10-09 · **Girdi:** [13.04 artımlı katalog](27_13_04_OGM_KONU_PDF_KATALOGU.md).

## Yapılan iş

`TopicPdfService`, Git dışında üretilen katalog JSON kayıtlarını açılışta okur; sınav, ders, içerik türü ve başlığa göre sayfalar. `/api/topic-pdfs` liste/filtre/detay/dosya uçları yalnız `USER` rolündedir. API yerel yolu veya checksum'ı döndürmez. PDF açarken kimlik, `.pdf` uzantısı, kök içindeki gerçek yol, sembolik bağ ve SHA-256 kontrol edilir. Eksik ya da değişmiş dosya açılmaz; detay sayfası güncel eksik durumu bildirir. PDF `inline` ve `no-store` döner; yalnız PDF dosya yanıtının çerçeve izni `SAMEORIGIN` olur.

Öğrenci menüsüne **Konu anlatımları** eklendi. Filtreli/aranabilir listede PDF, eksik dosya ve yalnız video durumları ayrılır. Masaüstü detayında özgün PDF sayfaya gömülür; telefonda aynı sitedeki PDF tam ekran yeni sekmede açılır. Listeye dönüş, yükleniyor, boş ve hata durumları vardır. Katalogdaki `candidate_title_match` konu eşleşmesi onaylı soru bağı sayılmadığı için soru çözme bağlantısı henüz gösterilmez.

## Yapılandırma ve kontrol

`app.topic-pdfs.catalog-dir` ve `app.topic-pdfs.source-dir` katalog kayıtları ile OGM kaynak PDF kökünü gösterir. Geliştirme varsayılanları `application-dev.yml` içindedir; üretim örneği `uretim.ayarlar.ornek.bat` içinde `YKS_KONU_PDF_KATALOGU` ve `YKS_OGM_PDF_KAYNAGI` olarak verilir. Katalog yeniden üretildiğinde API'nin yeni kayıtları görmesi için yeniden başlatma gerekir.

- Backend: `TopicPdfServiceTest`, `TopicPdfAccessTest`, `TopicPdfEndpointTest`; dosya bütünlüğü, kök sınırı, rol ayrımı, satır içi PDF ve çerçeve başlığı.
- Ön yüz: `npm run build`; Edge CDP ile 1280 px masaüstü ve 390 px telefon, liste/detay, eksik dosya, boş/hata durumu ve taşma kontrolü. Masaüstünde PDF görüntüsü, telefonda tam ekran bağlantısı görüldü.
- Gerçek çalışan servis ve canlı veritabanı bu dilimde yeniden başlatılmadı. UI denetimi yerel API taklidi ve test PDF'siyle yapıldı; gerçek telefon/dış ağ denemesi 05.05 kapsamında açık.

**Sonraki bağımlılık:** 07.08, yalnız doğrulanmış PDF–konu–soru bağlantılarını kullanarak pratik/test geçişini ekler. Başlık benzerliğinden otomatik bağ kurulmaz.
