# Bir kullanıcının (varsayılan: ivmeadmin) şifresini doğrudan veritabanından değiştirir.
# Şifre BCrypt ile ("{bcrypt}..." biçiminde, uygulamanın kullandığı biçimde) saklanır; düz metin yazılmaz.
# Kullanım:  yonetici-sifre-degistir.bat            (sorarak)
#            yonetici-sifre-degistir.bat -Kullanici ayse
# İsteğe bağlı ortam değişkenleri: PG_BIN (psql klasörü), YKS_DB_ADI, PGHOST, PGPORT, PGUSER, PGPASSWORD, YKS_YENI_SIFRE.
param(
    [string]$Kullanici,
    [string]$VeritabaniAdi = $(if ($env:YKS_DB_ADI) { $env:YKS_DB_ADI } else { 'ivme' })
)

function Oku-Gizli([string]$soru) {
    $guvenli = Read-Host $soru -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($guvenli)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

$pgBin = if ($env:PG_BIN) { $env:PG_BIN } else { 'C:\Program Files\PostgreSQL\18\bin' }
$psql = Join-Path $pgBin 'psql.exe'
if (-not (Test-Path $psql)) { Write-Host "HATA: psql bulunamadi: $psql  (PG_BIN ortam degiskenini ayarla)" -ForegroundColor Red; exit 1 }

if (-not $Kullanici) {
    $Kullanici = Read-Host 'Sifresi degisecek kullanici adi (Enter = ivmeadmin)'
    if (-not $Kullanici) { $Kullanici = 'ivmeadmin' }
}

if ($env:YKS_YENI_SIFRE) {
    $yeni = $env:YKS_YENI_SIFRE
} else {
    $yeni = Oku-Gizli 'Yeni sifre (en az 15 karakter; yalniz ingilizce harf, rakam ve isaretler)'
    $tekrar = Oku-Gizli 'Yeni sifre (tekrar)'
    if ($yeni -ne $tekrar) { Write-Host 'HATA: sifreler uyusmuyor.' -ForegroundColor Red; exit 1 }
}
if ($yeni.Length -lt 15 -or $yeni.Length -gt 72) { Write-Host 'HATA: sifre 15-72 karakter olmali.' -ForegroundColor Red; exit 1 }
if ($yeni -eq 'ivmeadmin' -or $yeni -eq 'root') { Write-Host 'HATA: varsayilan sifre kullanilamaz.' -ForegroundColor Red; exit 1 }
if ($yeni -notmatch '^[\x20-\x7E]+$') {
    Write-Host 'HATA: bu arac icin sifrede yalniz ingilizce harf, rakam ve isaretler kullan (turkce harf yok). Turkce harfli sifre icin sitedeki Hesap sayfasini kullan.' -ForegroundColor Red
    exit 1
}

if (-not $env:PGPASSWORD) {
    $dbSifre = Oku-Gizli 'Veritabani sifresi (Enter = root)'
    $env:PGPASSWORD = if ($dbSifre) { $dbSifre } else { 'root' }
}
$dbHost = if ($env:PGHOST) { $env:PGHOST } else { 'localhost' }
$dbPort = if ($env:PGPORT) { $env:PGPORT } else { '5432' }
$dbUser = if ($env:PGUSER) { $env:PGUSER } else { 'root' }

# Kullanici adi ve sifre komut satirina degil ortam degiskenine konur; psql \getenv ile okur
$env:YKS_K = $Kullanici
$env:YKS_S = $yeni
$env:PGCLIENTENCODING = 'UTF8'
$sql = Join-Path $env:TEMP ('yks-sifre-' + [Guid]::NewGuid().ToString('N') + '.sql')
@'
\getenv k YKS_K
\getenv s YKS_S
SET client_min_messages = warning;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
UPDATE users SET password_hash = '{bcrypt}' || crypt(:'s', gen_salt('bf', 12)), password_change_required = false
 WHERE lower(username) = lower(:'k')
RETURNING 'GUNCELLENDI ' || username || ' (' || role || ')';
'@ | Set-Content -Path $sql -Encoding UTF8

try {
    $ErrorActionPreference = 'Continue'
    $cikti = & $psql -h $dbHost -p $dbPort -U $dbUser -d $VeritabaniAdi -v ON_ERROR_STOP=1 -At -q -f $sql 2>&1 | Out-String
    $kod = $LASTEXITCODE
} finally {
    Remove-Item $sql -ErrorAction SilentlyContinue
    Remove-Item Env:YKS_K, Env:YKS_S -ErrorAction SilentlyContinue
}

if ($kod -ne 0) { Write-Host "HATA: veritabani islemi basarisiz.`n$cikti" -ForegroundColor Red; exit 1 }
if ($cikti -match 'GUNCELLENDI') {
    Write-Host ($cikti.Trim()) -ForegroundColor Green
    Write-Host "Sifre degisti. Acik oturumlar suruyor; yeni sifreyle giris yapabilirsin."
} else {
    Write-Host "HATA: '$Kullanici' adinda bir kullanici bulunamadi ($VeritabaniAdi)." -ForegroundColor Red
    exit 1
}
