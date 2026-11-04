# Yerel PostgreSQL 18 için pgvector

Hedef yalnız `localhost:5432/ivme` veritabanıdır. PostgreSQL 13 ayrı kurulumdur.
Öğrenci tablolarını değiştirmek veya veritabanını yeniden oluşturmak gerekmez.

## Kurulum

[Resmî Windows yöntemi](https://github.com/pgvector/pgvector#windows):
Visual Studio Build Tools 2022 C++ araçları ve Windows SDK ile kaynak koddan
derleme. Git for Windows kurulu olmalıdır. Yönetici olarak x64 Native Tools
Command Prompt açıp çalıştır:

```bat
set "PGROOT=C:\Program Files\PostgreSQL\18"
cd /d %TEMP%
git clone --depth 1 --branch v0.8.7 https://github.com/pgvector/pgvector.git pgvector-0.8.7
cd pgvector-0.8.7
nmake /F Makefile.win
nmake /F Makefile.win install
```

Mevcut kaynak klasörü varsa önce sürümünü kontrol et; üzerine klonlama.
Kurulum `lib/vector.dll`, `share/extension/vector.control`, sürümlü SQL
dosyaları ve geliştirici başlıklarını PostgreSQL 18 dizinine ekler.

## Etkinleştirme ve doğrulama

pgAdmin'de `ivme` Query Tool penceresini yetkili veritabanı hesabıyla aç:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
SELECT current_database(), current_setting('server_version');
SELECT extversion FROM pg_extension WHERE extname = 'vector';
SELECT '[1,2,3]'::vector <-> '[4,6,3]'::vector AS distance;
```

Beklenen sonuç `ivme`, PostgreSQL `18.x`, eklenti `0.8.7` ve uzaklık `5`.
Parolaları komut satırına veya bu belgeye yazma. Uygulama için kullanılan
`root` rolü süper kullanıcı değildir; eklentiyi yetkili hesap etkinleştirir.

## Yerel kurulum durumu

Kuruldu ve doğrulandı: `localhost:5432/ivme`, PostgreSQL `18.0`, pgvector
`0.8.7`. `CREATE EXTENSION IF NOT EXISTS vector` yetkili `postgres` hesabıyla
uygulandı. Yukarıdaki uzaklık sorgusu hem `postgres` hem uygulamanın `root`
hesabıyla `5` döndürdü; uygulama rolünün yetkileri değiştirilmedi.

Resmî kaynak commit'i `f37c13f68b57d2c3472b2214fbcff699d6d34876`.
Kaynak, derleme/kurulum logları ve dosya hash'li doğrulama kaydı
`%LOCALAPPDATA%\Ivme\pgvector-setup` altında (`build.log`, `install.log`,
`verification.json`). Derleme ve `nmake install` çıkış kodları `0`.
Mevcut tablolar üzerinde veri değişikliği yapılmadı.
