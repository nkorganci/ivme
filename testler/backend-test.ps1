[CmdletBinding()]
# -Test A,B yalnız seçilen test sınıflarını çalıştırır; boşsa tam paket.
param([string]$Test = '')
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
. (Join-Path $repo 'yerel-ortam.ps1')
$settings = Get-IvmeLocalEnvironment
$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
if (-not (Test-Path -LiteralPath $psql)) { throw "psql bulunamadı: $psql" }
$env:PGPASSWORD = $settings.DbPassword
$env:YKS_DB_KULLANICI = $settings.DbUser
$env:YKS_DB_SIFRE = $settings.DbPassword
$env:YKS_TEST_DB_URL = 'jdbc:postgresql://localhost:5432/ivme_test'
$existing = & $psql -h localhost -U $settings.DbUser -d postgres -Atqc "SELECT 1 FROM pg_database WHERE datname='ivme_test'"
if ($LASTEXITCODE -ne 0) { throw 'Veritabanı listesi okunamadı.' }
if ($existing) { throw 'ivme_test zaten var; mevcut veritabanı korunuyor.' }
& $psql -v ON_ERROR_STOP=1 -h localhost -U $settings.DbUser -d postgres -c 'CREATE DATABASE ivme_test'
if ($LASTEXITCODE -ne 0) { throw 'Geçici test veritabanı oluşturulamadı.' }
$testExit = 1
try {
    Push-Location (Join-Path $repo 'backend')
    try {
        if ($Test) { & mvn.cmd -q test "-Dtest=$Test" '-Dsurefire.failIfNoSpecifiedTests=false' }
        else { & mvn.cmd test }
        $testExit = $LASTEXITCODE
    } finally { Pop-Location }
} finally {
    & $psql -v ON_ERROR_STOP=1 -h localhost -U $settings.DbUser -d postgres -c 'DROP DATABASE ivme_test WITH (FORCE)'
    if ($LASTEXITCODE -ne 0) { throw 'Geçici test veritabanı kaldırılamadı.' }
}
exit $testExit
