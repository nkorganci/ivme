# İvme — kaynaklar ve referans envanteri

Bu dosya kaynak konumlarını ve dış teknik kaynakları tutar. Planın kendisi [00_YOL_HARITASI.md](00_YOL_HARITASI.md), uygulama ilkeleri [01_BEST_PRACTICES.md](01_BEST_PRACTICES.md) içindedir. Kaynak içeriğini buraya kopyalamak veya PDF/görselleri Git'e eklemek gerekmez.

## Yerel referanslar

| Kaynak | Amaç | Durum / sonraki kontrol |
|---|---|---|
| `D:\workspace\ivme\uygulama\README.md` | Çalışan uygulama, kurulum ve mevcut özellikler | Adım 1'de kodla karşılaştır |
| `D:\workspace\ivme\uygulama\docs\API-ve-mimari.md` | Mevcut API ve beş tablo sözleşmesi | Yeni adımlarla sürümle |
| `D:\workspace\ivme\README.md` | Eski yerel statik site ve veri hattı genel haritası | Yeni ürünün kaynağı ile karıştırma |
| `D:\workspace\ivme\veri-hatti\` | PDF soru üretimi ve etiketleme betikleri | Adım 1 ve 12'de kalite/envanter |
| `D:\workspace\ivme\Kaynaklar\` | PDF, müfredat ve diğer ham malzeme | Kaynak ve kapsam tablosu çıkar |
| `D:\workspace\ivme\uygulama\ornek-veri\` | Küçük örnek veri | Örneklerin sentetik ve doğru eşleşmiş olduğunu doğrula |

## Dış teknik kaynaklar (2026-10-08'de kontrol edildi)

- [Cloudflare Tunnel: kurulum ve yerel servise yayın rotası](https://developers.cloudflare.com/tunnel/get-started/) — `net.ivme.dev` için public hostname → yerel servis eşlemesi. Tünel URL'si yerel servis URL'si değildir.
- [Cloudflare Access: self-hosted web uygulaması](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/) — davetli pilot erişim seçeneği; uygulamanın öğrenci/yönetici yetkilendirmesini ayrıca kur.
- [Cloudflare Tunnel: HTTPS origin sorun giderme](https://developers.cloudflare.com/tunnel/troubleshooting/https-origins/) — origin protokolü ve tünel rotası denetimi.
- [PostgreSQL: SQL dump, özel biçim ve geri yükleme](https://www.postgresql.org/docs/current/backup-dump.html) — `pg_dump -Fc` ve `pg_restore` yaklaşımı; düzenli geri yükleme testi.
- [PyMuPDF: PDF metin çıkarma](https://pymupdf.readthedocs.io/en/latest/recipes-text.html) ve [görsel çıkarma](https://pymupdf.readthedocs.io/en/latest/recipes-images.html) — mevcut Python hattına uygunluğu Adım 12'de ölç.
- [Tesseract OCR: girdi biçimleri](https://github.com/tesseract-ocr/tessdoc/blob/main/InputFormats.md) — doğrudan PDF okuyamaz; taranmış PDF için önce görüntüye çevirme/OCR katmanı gerekir.
- [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction/) — erişim kontrolü, kimlik doğrulama ve güvenlik kayıtları için inceleme çerçevesi.

## Yeni sınav içeriği ekleme şablonu

`Sınav türü` → `ders` → `konu` → `alt konu/beceri` → `soru tipi` → `önkoşul`; kaynak bilgisi; örnek soru/cevap/çözüm; kalite kontrol örneklemi. Bu şablon TYT/AYT'ye bağlı olmayan ilk yeni sınav paketinde doğrulanacak.
