@echo off
rem ORNEK ayar dosyasi. Bu dosyayi "uretim.ayarlar.bat" adiyla KOPYALA, degerleri doldur.
rem uretim.ayarlar.bat .gitignore'dadir; gercek sifreler depoya girmez.

rem --- Veritabani (PostgreSQL). Sadece tablo/veri yetkili uygulama rolu kullan.
rem Rol ve sifre icin once scripts\kur-uygulama-rolu.ps1 betigini yetkili DB hesabi ile calistir.
rem Sifreyi Git disi veri\gizli\ivme_app_password.txt dosyasindan yerel ayar dosyana aktar.
set YKS_DB_URL=jdbc:postgresql://localhost:5432/ivme
set YKS_DB_KULLANICI=ivme_app
set YKS_DB_SIFRE=BURAYA_VERITABANI_SIFRESI
rem V10–V13 yetkili hesapla 05.03 adiminda uygulandiktan sonra bu degeri false yap.
rem Sema gocunu sinirli uygulama rolune birakma.
set YKS_FLYWAY_ETKIN=false

rem --- Sabit dis adres. Cloudflare Tunnel bunu HTTPS olarak yayinlar; QR kodlar burada acilir.
set YKS_SITE_ADRESI=https://net.ivme.dev
rem Mevcut Cloudflare Tunnel net.ivme.dev adresini localhost:5173'e yonlendirir.
set PORT=5173

rem --- Soru gorsellerinin kok klasoru (bu bilgisayardaki Git disi pilot klasor)
set YKS_RESIM_KLASORU=%~dp0veri\resimler-pilot

rem --- Mevcut ivmeadmin ve ivmeoperator hesaplarinin sifresini once yerel Hesap ekraninda degistir.
rem Yeni bir yonetici hesabina ihtiyac yoksa YKS_ADMIN_SIFRE tanimlama.

rem --- HTTPS arkasindaysan (tunel/alan adi) true birak
set YKS_COOKIE_SECURE=true
