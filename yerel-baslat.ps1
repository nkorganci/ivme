[CmdletBinding()]
param([switch]$OpenBrowser)
$ErrorActionPreference = 'Stop'
$repo = $PSScriptRoot
. (Join-Path $repo 'yerel-ortam.ps1')
$settings = Get-IvmeLocalEnvironment
$script = Join-Path $repo 'canli-izle.ps1'
$null = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $script + '"')
) -WorkingDirectory $repo -WindowStyle Hidden -PassThru
Write-Host "$($settings.Branch): http://localhost:$($settings.Port)"

if ($OpenBrowser) {
    $url = "http://localhost:$($settings.Port)"
    $deadline = (Get-Date).AddMinutes(5)
    $ready = $false
    do {
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -eq 200) { $ready = $true; break }
        } catch { }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    if (-not $ready) { throw "1010 açılamadı: $repo\backend\target\live-watch.log dosyasını kontrol edin." }
    Start-Process $url
}
