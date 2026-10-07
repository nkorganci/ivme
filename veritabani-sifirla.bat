@echo off
setlocal
rem Veritabanini SIFIRDAN kurar: yks_hazirlik ve yks_hazirlik_test silinir ve bos olarak yeniden olusturulur.
rem Tablolari bu betik DEGIL, arka yuz ilk acilista Flyway gocleriyle (V1__sema.sql ...) olusturur.
rem Dikkat: tum kullanicilar, sorular, sinavlar ve geri bildirimler SILINIR.
if not defined PG_BIN set "PG_BIN=C:\Program Files\PostgreSQL\18\bin"
if not defined PGHOST set "PGHOST=localhost"
if not defined PGPORT set "PGPORT=5432"
if not defined PG_YONETICI set "PG_YONETICI=postgres"

echo.
echo UYARI: yks_hazirlik ve yks_hazirlik_test veritabanlari silinecek!
set /p ONAY="Devam etmek icin EVET yaz: "
if /i not "%ONAY%"=="EVET" (echo Iptal edildi. & exit /b 1)

if not defined PGPASSWORD set /p PGPASSWORD="%PG_YONETICI% kullanicisinin sifresi: "

set "SQL=%TEMP%\hedef-yks-sifirla.sql"
> "%SQL%" echo DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'root') THEN CREATE ROLE root LOGIN PASSWORD 'root' CREATEDB; END IF; END $$;
>> "%SQL%" echo DROP DATABASE IF EXISTS yks_hazirlik WITH (FORCE);
>> "%SQL%" echo DROP DATABASE IF EXISTS yks_hazirlik_test WITH (FORCE);
>> "%SQL%" echo CREATE DATABASE yks_hazirlik OWNER root TEMPLATE template0 ENCODING 'UTF8' LOCALE_PROVIDER builtin BUILTIN_LOCALE 'C.UTF-8';
>> "%SQL%" echo CREATE DATABASE yks_hazirlik_test OWNER root TEMPLATE template0 ENCODING 'UTF8' LOCALE_PROVIDER builtin BUILTIN_LOCALE 'C.UTF-8';

"%PG_BIN%\psql.exe" -h %PGHOST% -p %PGPORT% -U %PG_YONETICI% -d postgres -v ON_ERROR_STOP=1 -f "%SQL%"
if errorlevel 1 (echo HATA: veritabani sifirlanamadi. & del "%SQL%" & exit /b 1)
del "%SQL%"
echo.
echo Tamam. Simdi arka yuzu baslat (backend-baslat.bat): Flyway tablolari olusturur, ornek sorular yuklenir.
