@echo off
rem Bir kullanicinin (varsayilan: ivmeadmin) sifresini dogrudan veritabanindan degistirir. Ayrinti: yonetici-sifre-degistir.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0yonetici-sifre-degistir.ps1" %*
pause
