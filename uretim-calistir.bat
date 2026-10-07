@echo off
rem Hedef YKS'yi tek surec olarak calistirir (API + arayuz, port 8081). Once uretim.ayarlar.bat hazirla.
cd /d "%~dp0"
if not exist uretim.ayarlar.bat (
  echo uretim.ayarlar.bat bulunamadi.
  echo uretim.ayarlar.ornek.bat dosyasini uretim.ayarlar.bat olarak kopyalayip doldur.
  pause
  exit /b 1
)
call uretim.ayarlar.bat
if not defined JAVA_HOME_YKS set "JAVA_HOME_YKS=C:\Tools\jdk-21"
if not exist backend\target\hedef-yks.jar call uretim-derle.bat
if not exist backend\target\hedef-yks.jar (
  echo Paket olusturulamadi.
  pause
  exit /b 1
)
echo Hedef YKS basliyor: http://localhost:8081  (durdurmak icin Ctrl+C)
"%JAVA_HOME_YKS%\bin\java.exe" -jar backend\target\hedef-yks.jar
pause
