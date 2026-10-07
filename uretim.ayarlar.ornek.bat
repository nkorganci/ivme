@echo off
rem ORNEK ayar dosyasi. Bu dosyayi "uretim.ayarlar.bat" adiyla KOPYALA, degerleri doldur.
rem uretim.ayarlar.bat .gitignore'dadir; gercek sifreler depoya girmez.

rem --- Veritabani (PostgreSQL). Uretimde root/root KULLANMA: kendi kullanici ve sifreni olustur.
set YKS_DB_URL=jdbc:postgresql://localhost:5432/yks_hazirlik
set YKS_DB_KULLANICI=root
set YKS_DB_SIFRE=BURAYA_VERITABANI_SIFRESI

rem --- Sitenin disaridan acilan adresi (QR kodlar bu adrese gider). Tunel/alan adi adresini yaz.
set YKS_SITE_ADRESI=https://BURAYA-ADRES

rem --- Soru gorsellerinin kok klasoru
set YKS_RESIM_KLASORU=D:\yks-resimler

rem --- Ilk yonetici hesabi (hesap bir kez olusunca sifreyi ezmez; sifreyi sonra Hesap sayfasindan degistirebilirsin)
set YKS_ADMIN_KULLANICI=yonetici
set YKS_ADMIN_SIFRE=BURAYA-EN-AZ-10-KARAKTERLIK-GUCLU-SIFRE

rem --- HTTPS arkasindaysan (tunel/alan adi) true birak
set YKS_COOKIE_SECURE=true
