# Local branch environments: never inherit a database/port from another launch.
function Get-IvmeLocalEnvironment {
    $repoRoot = $PSScriptRoot
    $branch = (& git -C $repoRoot branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $branch) { throw 'A checked-out Git branch is required.' }
    $main = $branch -eq 'main'
    $settings = [ordered]@{
        Branch = $branch
        Name = $(if ($main) { 'production' } else { 'development' })
        Port = $(if ($main) { 1010 } else { 1011 })
        ApiPort = $(if ($main) { 8081 } else { 8082 })
        Database = $(if ($main) { 'ivme' } else { 'ivme_dev' })
        SessionCookie = $(if ($main) { 'JSESSIONID' } else { 'IVME_DEV_SESSION' })
        CsrfCookie = $(if ($main) { 'XSRF-TOKEN' } else { 'XSRF-TOKEN-DEV' })
        DbUser = 'root'
        DbPassword = 'root'
        Images = (Join-Path $repoRoot 'veri\resimler-pilot')
        PdfCatalog = (Join-Path $repoRoot 'veri\ogm-konu-pdf-katalog\entries')
        PdfSource = [IO.Path]::GetFullPath((Join-Path $repoRoot '..\Kaynaklar\ogm-materyal'))
    }
    $localFile = Join-Path $repoRoot '.codex\local-environment.json'
    if (Test-Path -LiteralPath $localFile) {
        $localSettings = Get-Content -LiteralPath $localFile -Raw | ConvertFrom-Json
        foreach ($key in @('DbUser', 'DbPassword', 'Images', 'PdfCatalog', 'PdfSource')) {
            if ($localSettings.PSObject.Properties.Name -contains $key) { $settings[$key] = $localSettings.$key }
        }
    }
    return [PSCustomObject]$settings
}

function Set-IvmeLocalEnvironment {
    param([Parameter(Mandatory)]$Settings)
    $env:YKS_DB_URL = "jdbc:postgresql://localhost:5432/$($Settings.Database)"
    $env:YKS_DB_KULLANICI = $Settings.DbUser
    $env:YKS_DB_SIFRE = $Settings.DbPassword
    $env:PORT = [string]$Settings.Port
    $env:YKS_RESIM_KLASORU = $Settings.Images
    $env:YKS_KONU_PDF_KATALOGU = $Settings.PdfCatalog
    $env:YKS_OGM_PDF_KAYNAGI = $Settings.PdfSource
    $env:YKS_COOKIE_SECURE = 'false'
    $env:YKS_SESSION_COOKIE = $Settings.SessionCookie
    $env:YKS_CSRF_COOKIE = $Settings.CsrfCookie
    $env:VITE_CSRF_COOKIE_NAME = $Settings.CsrfCookie
    $env:IVME_API_TARGET = "http://127.0.0.1:$($Settings.ApiPort)"
}
