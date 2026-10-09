@echo off
rem Hedef YKS arka yuz (Spring Boot, port 8081) - gelistirme profili.
rem Gerekenler: JDK 21 (C:\Tools\jdk-21), Maven, PostgreSQL (ivme veritabani).
if not defined JAVA_HOME_YKS set "JAVA_HOME_YKS=C:\Tools\jdk-21"
if not exist "%JAVA_HOME_YKS%\bin\java.exe" (
  echo JDK 21 bulunamadi: %JAVA_HOME_YKS%
  echo JAVA_HOME_YKS ortam degiskenini JDK 21 klasorune ayarla.
  pause
  exit /b 1
)
set "JAVA_HOME=%JAVA_HOME_YKS%"
rem Yerel tam gorsel agacini kullan; yoksa eski veri/resimler veya kucuk ornek veri.
if not defined YKS_RESIM_KLASORU if exist "%~dp0veri\resimler-pilot" set "YKS_RESIM_KLASORU=%~dp0veri\resimler-pilot"
if not defined YKS_RESIM_KLASORU if exist "%~dp0veri\resimler" set "YKS_RESIM_KLASORU=%~dp0veri\resimler"
cd /d "%~dp0backend"
call mvn spring-boot:run -Dspring-boot.run.profiles=dev
pause
