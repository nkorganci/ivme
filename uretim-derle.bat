@echo off
rem Tek calistirilabilir paket uretir: on yuz derlenir, arka yuzun icine konur, backend\target\hedef-yks.jar olusur.
rem Calistirma ve ortam degiskenleri icin README.md "Uretim" bolumune bak.
if not defined JAVA_HOME_YKS set "JAVA_HOME_YKS=C:\Tools\jdk-21"
set "JAVA_HOME=%JAVA_HOME_YKS%"

cd /d "%~dp0frontend"
if not exist node_modules call npm ci || exit /b 1
call npm run build || exit /b 1

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uretim-static-kopyala.ps1" || exit /b 1

cd /d "%~dp0backend"
call mvn -q clean package -DskipTests || exit /b 1
echo.
echo Hazir: %~dp0backend\target\hedef-yks.jar
