# 04.07 — Sınırlı PostgreSQL rolü ve gizli ayarlar

**Durum:** YAPILACAK (altyapı hazır; canlı rol kurulumu yetkili erişim bekliyor). **Önerilen model:** GPT-6.1 Sol · High.

## Hedef

Uygulama veri işlemlerinde `ivme_app` rolünü kullansın. Bu rol tablo/veri ve sequence işlemlerini yapabilsin; rol, veritabanı, şema veya Flyway göçü yönetemesin. Göçü ayrı yetkili işlem yapsın. Gerçek parolalar ve yedekler Git dışında kalsın.

## 2026-10-09 yapılanlar

- Gerçek `ivme` veritabanına yalnız okuma yapıldı: Flyway sürümü **V9**, 14 tablo/10 sequence sahibi `root`. `root` rolünde `CREATEROLE` yok; bu yetki yalnız `postgres` hesabında. Canlı role veya veri tablolarına değişiklik yapılmadı.
- `scripts/kur-uygulama-rolu.ps1` hazırlandı: `postgres` parolasını etkileşimli ister, güçlü rastgele uygulama parolası oluşturur, veri ve sequence yetkilerini verir, Flyway geçmişini hariç tutar ve sonraki `root` göçlerinin nesnelerine varsayılan yetki verir. Parolayı Git dışı `veri/gizli/ivme_app_password.txt` dosyasına yalnız yerel kullanıcı ACL'siyle kaydeder. Var olan rolü yalnız açık `-Rotate` ile değiştirir.
- `YKS_FLYWAY_ETKIN` ayarı eklendi; mevcut geliştirme/test davranışı varsayılan `true`, sınırlı üretim çalışma rolü için göç tamamlandıktan sonra `false`. Üretim örneği `ivme_app` kullanacak şekilde güncellendi.
- Git'te izlenen `.env`, gerçek `uretim.ayarlar.bat`, dump/yedek veya parola dosyası yok; `.gitignore` yerel ayar ve `veri/` klasörünü dışarıda bırakıyor. İzlenen eski `veritabani-sifirla.bat` geliştirme betiğinde yerel `root/root` örneği var; README bu yıkıcı betiği kullanmamayı söylüyor. Üretim örneğindeki DB parolası yalnız yer tutucu.
- Betik sözdizimi hatasız; `ProgressAccessTest` varsayılan Flyway açık ayarıyla geçti. Canlı rol bağlantısı ve sınırlı yetki henüz doğrulanamadı.

## Tamamlama sırası

1. Yerel bilgisayarda `postgres` yetkili parola istemine cevap verebilen kullanıcı `pwsh -File scripts/kur-uygulama-rolu.ps1` çalıştırır. Parola sohbete veya Git'e yazılmaz. Betik rolü oluşturur, yetkileri verir ve uygulama parolasını yerel dosyaya kaydeder.
2. `ivme_app` ile `ivme` üzerinde SELECT/INSERT/UPDATE/DELETE ve sequence kullanımı kontrollü olarak doğrulanır; `CREATE TABLE`, `ALTER TABLE`, Flyway geçmişine erişim ve rol yönetimi reddedilmelidir. İşlem sırasında gerçek öğrenci/soru verisi değiştirilmez.
3. 05.03 kapsamında yedek sonrası V10–V13 yetkili hesapla uygulanır; sonrasında varsayılan yetkiler yeni tablo/sequence için kontrol edilir. Üretim ayarında yalnız `ivme_app` parolası ve `YKS_FLYWAY_ETKIN=false` kullanılır; gerçek uygulama süreci yeni rol ile başladıktan sonra `current_user` ve kritik API akışları doğrulanır.

**Açık risk:** Canlı uygulama hâlâ mevcut süreç/DB rolüyle çalışıyor. V9 şemasında yeni API'ler canlıya alınmış sayılmaz. Yetkili rol kurulumu ve 05.03 göçü tamamlanana kadar 04.07 BITTI yazılmaz.
