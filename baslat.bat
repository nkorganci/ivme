@echo off
rem Arka yuzu ve on yuzu ayri pencerelerde baslatir, sonra tarayicida acar.
start "Hedef YKS - arka yuz" cmd /c "%~dp0backend-baslat.bat"
start "Hedef YKS - on yuz" cmd /c "%~dp0frontend-baslat.bat"
echo Servisler aciliyor (arka yuz ilk seferde ~30 sn surebilir)...
timeout /t 25 /nobreak >nul
start "" http://localhost:5173
