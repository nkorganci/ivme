@echo off
rem Hedef YKS'yi tek surec olarak calistirir (API + arayuz, varsayilan port 9090). Once uretim.ayarlar.bat hazirla.
rem Kaynak kod paketten yeniyse (veya paket yoksa) otomatik olarak yeniden derler.
cd /d "%~dp0"
if not exist uretim.ayarlar.bat (
  echo uretim.ayarlar.bat bulunamadi.
  echo uretim.ayarlar.ornek.bat dosyasini uretim.ayarlar.bat olarak kopyalayip doldur.
  pause
  exit /b 1
)
call uretim.ayarlar.bat
if not defined PORT set "PORT=9090"
if not defined JAVA_HOME_YKS set "JAVA_HOME_YKS=C:\Tools\jdk-21"

powershell -NoProfile -Command "$j = Get-Item 'backend\target\hedef-yks.jar' -ErrorAction SilentlyContinue; if (-not $j) { exit 1 }; $p = 'backend\src','frontend\src','frontend\index.html','frontend\package.json','frontend\package-lock.json','frontend\vite.config.js','backend\pom.xml','uretim-derle.bat','uretim-static-kopyala.ps1'; $n = Get-ChildItem $p -Recurse -File | Where-Object { $_.LastWriteTime -gt $j.LastWriteTime } | Select-Object -First 1; if ($n) { exit 1 } else { exit 0 }"
if errorlevel 1 call uretim-derle.bat
if not exist backend\target\hedef-yks.jar (
  echo Paket olusturulamadi.
  pause
  exit /b 1
)
echo Hedef YKS basliyor: http://localhost:%PORT%  (durdurmak icin Ctrl+C)
"%JAVA_HOME_YKS%\bin\java.exe" -jar backend\target\hedef-yks.jar
pause
