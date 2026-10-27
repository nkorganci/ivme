[CmdletBinding()]
param([switch]$OpenBrowser)
$ErrorActionPreference = 'Stop'
$repo = $PSScriptRoot
. (Join-Path $repo 'yerel-ortam.ps1')
$settings = Get-IvmeLocalEnvironment
$url = "http://localhost:$($settings.Port)"
$stateDir = Join-Path $repo 'backend\target'
$watchLog = Join-Path $stateDir 'live-watch.log'
$buildOut = Join-Path $stateDir 'live-build.stdout.log'
$buildErr = Join-Path $stateDir 'live-build.stderr.log'
$timeoutSeconds = 600

function Test-AppReady {
    try { return (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200 } catch { return $false }
}

# Returns complete lines appended to the watcher log after byte offset $from.
function Read-WatchLog([long]$from) {
    $result = @{ Offset = $from; Lines = @() }
    if (-not (Test-Path -LiteralPath $watchLog)) { return $result }
    $stream = [IO.File]::Open($watchLog, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
    try {
        if ($stream.Length -lt $from) { $from = 0 }
        if ($stream.Length -eq $from) { $result.Offset = $from; return $result }
        $stream.Position = $from
        $bytes = New-Object byte[] ($stream.Length - $from)
        $read = $stream.Read($bytes, 0, $bytes.Length)
        $text = [Text.Encoding]::UTF8.GetString($bytes, 0, $read)
        $end = $text.LastIndexOf("`n")
        if ($end -ge 0) {
            $complete = $text.Substring(0, $end + 1)
            $result.Offset = $from + [Text.Encoding]::UTF8.GetByteCount($complete)
            $result.Lines = @($complete -split "`r?`n" | Where-Object { $_ })
        }
        return $result
    } finally { $stream.Dispose() }
}

function Show-BuildError {
    Write-Host ''
    Write-Host 'Derleme hatası:' -ForegroundColor Yellow
    if (Test-Path -LiteralPath $buildOut) {
        Get-Content -LiteralPath $buildOut | Where-Object {
            $_ -match '\[ERROR\]\s+\S|error during build|Error:' -and $_ -notmatch 'Help 1|full stack trace|Re-run Maven'
        } | Select-Object -Unique | Select-Object -First 6 | ForEach-Object { Write-Host "  $_" }
    }
    if (Test-Path -LiteralPath $buildErr) {
        # Child PowerShell writes stderr in the OEM code page; skip Vite's size warning and error-record decoration.
        Get-Content -LiteralPath $buildErr -Encoding Oem | Where-Object {
            $_.Trim() -and $_ -notmatch '^\s*(\+|At |- |\(!\))|vite-reporter|chunkSizeWarningLimit|CategoryInfo|FullyQualifiedErrorId'
        } | Select-Object -Last 6 | ForEach-Object { Write-Host "  $_" }
    }
    Write-Host "Günlükler: $stateDir" -ForegroundColor Yellow
}

# Prints watcher log lines added since the last call and notes a failed build.
function Show-WatchProgress {
    $chunk = Read-WatchLog $script:offset
    $script:offset = $chunk.Offset
    foreach ($line in $chunk.Lines) {
        $shown = if ($line -match '^\S*T(\d\d:\d\d:\d\d)\S*\s+(.*)$') { "$($Matches[1])  $($Matches[2])" } else { $line }
        Write-Host "  $shown"
        # ASCII prefix of "Yenileme başarısız" still matches if a script loses its UTF-8 BOM.
        if (-not $script:buildFailedAt -and $line -match 'Yenileme ba') { $script:buildFailedAt = Get-Date }
    }
}

if (-not (Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue)) {
    throw 'PostgreSQL çalışmıyor (5432 portu kapalı). Windows Hizmetleri''nden postgresql hizmetini başlatıp tekrar deneyin.'
}

$offset = if (Test-Path -LiteralPath $watchLog) { (Get-Item -LiteralPath $watchLog).Length } else { 0 }
# The watcher builds and serves the app; a second copy exits at once through its mutex.
$watcher = Join-Path $repo 'canli-izle.ps1'
$null = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $watcher + '"')
) -WorkingDirectory $repo -WindowStyle Hidden -PassThru

$buildFailedAt = $null
if (Test-AppReady) {
    Write-Host "İvme çalışıyor: $url"
} else {
    Write-Host "İvme açılıyor: $url"
    Write-Host 'Kod değiştiyse derleme 2-3 dakika sürer; pencereyi kapatsanız da açılış arka planda sürer.'
    $startedAt = Get-Date
    $nextNotice = 30
    while (-not (Test-AppReady)) {
        Show-WatchProgress
        $elapsed = ((Get-Date) - $startedAt).TotalSeconds
        # After a failed build the watcher reopens the previous package; give it time before giving up.
        if ($buildFailedAt -and ((Get-Date) - $buildFailedAt).TotalSeconds -gt 120) {
            Show-BuildError
            throw 'İvme açılamadı: yeni kod derlenemedi ve önceki sürüm de başlatılamadı.'
        }
        if ($elapsed -gt $timeoutSeconds) {
            Show-BuildError
            throw "İvme $([int]($timeoutSeconds / 60)) dakikada açılamadı. Günlük: $watchLog"
        }
        if ($elapsed -ge $nextNotice) {
            Write-Host "  ... $([int]$elapsed) sn"
            $nextNotice += 30
        }
        Start-Sleep -Seconds 2
    }
    Start-Sleep -Milliseconds 500
    Show-WatchProgress
    Write-Host "Hazır: $url ($([int](((Get-Date) - $startedAt).TotalSeconds)) sn)"
}

if ($OpenBrowser) { Start-Process $url }
if ($buildFailedAt) {
    Show-BuildError
    Write-Warning 'Yeni kod derlenemedi; açılan sürüm son çalışan pakettir.'
    exit 2
}
