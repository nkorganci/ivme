# 04.09 — Ayrı yerde yedek ve geri yükleme provası

**Durum:** YAPILACAK (yerel prova geçti, ayrı fiziksel hedef yok) · **Tarih:** 2026-10-09

## Hazırlanan betik

`scripts/ivme-yedek-al.ps1`, PostgreSQL `pg_dump -Fc` ile tam veritabanı dökümü ve OGM/TYT/AYT görselleri için ayrı tar arşivleri üretir. Her dosyanın SHA-256 özeti, görsel sayısı ve kaynak boyutu `manifest.json` içinde saklanır. Hedef kaynak görsel klasörlerinin veya uygulama deposunun içinde olamaz. Kaynak ve hedef aynı fiziksel diskteyse normal çalışmayı reddeder; `-AllowSameDiskForDrill` yalnız prova için açıkça seçilir. Gerçek yedek için başka fiziksel disk veya bağımsız ağ hedefi gerekir; veritabanı parolası betiğe konmaz, PostgreSQL ortam/kimlik mekanizmasından alınır.

## 2026-10-09 prova sonucu

C: ve D: bölümleri aynı `Disk 0` üzerindedir. Betik C: hedefini normal kipte reddetti. Prova kipinde Git dışı `C:\Users\nkorg\Documents\ivme-20261009-220426` klasörüne yedek alındı. `manifest.json` `separatePhysicalDisk=false` yazar; bu klasör gerçek ayrı yer yedeği sayılmaz.

| Parça | Kayıt | SHA-256 ilk 12 karakter |
|---|---:|---|
| DB dökümü | 1.160.209 bayt | `c12688f25ea3` |
| OGM görselleri | 84.926 dosya | `4652116eba16` |
| TYT görselleri | 1.070 dosya | `7d97c3daf488` |
| AYT görselleri | 1.494 dosya | `f886bd1dd4c4` |

Dört dosyanın da tam özeti manifest ile yeniden hesaplanarak eşleşti. DB dökümü yeni `ivme_backup_check_20261009_2205` veritabanına `pg_restore --exit-on-error --no-owner --no-privileges` ile yüklendi. Kaynak ve geri yüklenen kopyada sırasıyla 4 kullanıcı, 80.097 soru, 9 sınav, 6 soru denemesi ve Flyway sürüm 9 eşleşti. Prova DB'si kontrolden sonra silindi; canlı `ivme` değiştirilmedi. Üç görsel arşivinden üçer dosya okunup SHA-256 içerikleri kaynak dosyalarla eşleştirildi.

**Kalan kabul:** Ayrı fiziksel veya ağ hedefi bağlanınca betiği normal kipte çalıştır; manifest ve döküm geri yükleme ile görsel örneklerini o hedefte yeniden doğrula. Eski yedeklerin saklama/silme takvimini hesap silme akışıyla uyumlu kaydet. O zamana kadar 04.09 `BITTI` sayılmaz.
