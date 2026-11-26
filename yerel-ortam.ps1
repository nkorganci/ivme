# Local development stays separate from the Cloudflare origin and production data.
function Get-IvmeLocalEnvironment {
    $repoRoot = $PSScriptRoot
    $branch = (& git -C $repoRoot branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $branch) { throw 'A checked-out Git branch is required.' }
    if ($branch -ne 'test') { throw 'Switch to the local test branch before starting Ivme.' }
    $settings = [ordered]@{
        Branch = $branch
        Name = 'test'
        Port = 1010
        ApiPort = 8081
        Database = 'ivme_local'
        SessionCookie = 'IVME_LOCAL_SESSION'
        CsrfCookie = 'IVME_LOCAL_XSRF'
        DbUser = 'root'
        DbPassword = 'root'
        Images = (Join-Path $repoRoot 'veri\test-resimler')
        PdfCatalog = (Join-Path $repoRoot 'veri\ogm-konu-pdf-katalog\entries')
        PdfSource = [IO.Path]::GetFullPath((Join-Path $repoRoot '..\Kaynaklar\ogm-materyal'))
    }
    $localFile = Join-Path $repoRoot '.codex\local-environment.json'
    if (Test-Path -LiteralPath $localFile) {
        $localSettings = Get-Content -LiteralPath $localFile -Raw -Encoding UTF8 | ConvertFrom-Json
        foreach ($key in @('DbUser', 'DbPassword', 'PdfCatalog', 'PdfSource')) {
            if ($localSettings.PSObject.Properties.Name -contains $key) { $settings[$key] = $localSettings.$key }
        }
    }
    return [PSCustomObject]$settings
}

function Initialize-IvmeLocalDatabase {
    param([Parameter(Mandatory)]$Settings)
    $psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
    $previous = [Environment]::GetEnvironmentVariable('PGPASSWORD', 'Process')
    try {
        $env:PGPASSWORD = $Settings.DbPassword
        @'
SELECT pg_advisory_lock(7079923378000212);
SELECT 'CREATE DATABASE ivme_local' WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = 'ivme_local'
) \gexec
'@ | & $psql -X -w -q -h 127.0.0.1 -U $Settings.DbUser -d postgres -v ON_ERROR_STOP=1 -f - | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Could not initialize the local ivme_local database.' }
    } finally {
        [Environment]::SetEnvironmentVariable('PGPASSWORD', $previous, 'Process')
    }
}

function Set-IvmeLocalEnvironment {
    param([Parameter(Mandatory)]$Settings)
    . (Join-Path $PSScriptRoot 'deploy/fixture-environment.ps1')
    $fixture = Get-LocalFixture 'ivme'
    $dbPort = 5432
    if ($fixture) {
        $dbPort = 55432
        $Settings.DbUser = $fixture.User
        $Settings.DbPassword = $fixture.Password
        $Settings.Images = Join-Path $PSScriptRoot 'veri/resimler-pilot'
    } else { Initialize-IvmeLocalDatabase $Settings }
    if (-not (Test-Path -LiteralPath $Settings.Images)) {
        New-Item -ItemType Directory -Path $Settings.Images -Force | Out-Null
        Copy-Item -Path (Join-Path $PSScriptRoot 'ornek-veri\resimler\*') -Destination $Settings.Images -Recurse
    }
    $env:YKS_DB_URL = "jdbc:postgresql://127.0.0.1:${dbPort}/$($Settings.Database)"
    $env:YKS_DB_KULLANICI = $Settings.DbUser
    $env:YKS_DB_SIFRE = $Settings.DbPassword
    $env:PORT = [string]$Settings.Port
    $env:YKS_RESIM_KLASORU = $Settings.Images
    $env:YKS_KONU_PDF_KATALOGU = $Settings.PdfCatalog
    $env:YKS_OGM_PDF_KAYNAGI = $Settings.PdfSource
    $env:YKS_BIND_ADDRESS = '127.0.0.1'
    $env:YKS_COOKIE_SECURE = 'false'
    $env:YKS_SESSION_COOKIE = $Settings.SessionCookie
    $env:YKS_CSRF_COOKIE = $Settings.CsrfCookie
    $env:VITE_CSRF_COOKIE_NAME = $Settings.CsrfCookie
    $env:IVME_API_TARGET = "http://127.0.0.1:$($Settings.ApiPort)"
    $env:YKS_FLYWAY_ETKIN = 'true'
    $env:YKS_KAYIT_BILDIRIM_ETKIN = 'false'
    $env:YKS_SITE_ADRESI = ''
    $env:YKS_IMPORT_DOSYASI = ''
}
