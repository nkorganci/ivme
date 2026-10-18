$ErrorActionPreference = 'Stop'
$repo = $PSScriptRoot
. (Join-Path $repo 'yerel-ortam.ps1')
$settings = Get-IvmeLocalEnvironment
$stateDir = Join-Path $repo 'backend\target'
New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
. (Join-Path $repo 'canli-kaynaklar.ps1')

$nameHash = [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash(
    [Text.Encoding]::UTF8.GetBytes($repo.ToLowerInvariant()))).Replace('-', '').Substring(0, 16)
$mutex = New-Object Threading.Mutex($false, "Local\HedefYksLiveWatch-$nameHash")
if (-not $mutex.WaitOne(0)) { $mutex.Dispose(); exit 0 }

$deployedFile = Join-Path $stateDir 'live-deployed.fingerprint'
$statusFile = Join-Path $stateDir 'live-watch.status'
$logFile = Join-Path $stateDir 'live-watch.log'
$buildOut = Join-Path $stateDir 'live-build.stdout.log'
$buildErr = Join-Path $stateDir 'live-build.stderr.log'

function Write-WatchLog([string]$message) {
    Add-Content -LiteralPath $logFile -Value "$(Get-Date -Format o) $message" -Encoding UTF8
}

try {
    Write-WatchLog "İzleyici başladı (PID $PID)."
    # Let the launcher see the new process before the first full source hash completes.
    Set-Content -LiteralPath $statusFile -Value "$PID|$(Get-Date -Format o)" -Encoding ASCII
    $lastSeen = Get-YksSourceFingerprint
    $changedAt = Get-Date
    $retryAt = Get-Date
    while ($true) {
        Set-Content -LiteralPath $statusFile -Value "$PID|$(Get-Date -Format o)" -Encoding ASCII
        Start-Sleep -Seconds 2
        try {
            $current = Get-YksSourceFingerprint
            if ($current -ne $lastSeen) {
                $lastSeen = $current
                $changedAt = Get-Date
            }
            $deployed = if (Test-Path -LiteralPath $deployedFile) {
                (Get-Content -LiteralPath $deployedFile -Raw).Trim()
            } else { '' }
            $listener = Get-NetTCPConnection -LocalPort $settings.Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
            if (($current -ne $deployed -or -not $listener) -and
                    (Get-Date) -ge $retryAt -and ((Get-Date) - $changedAt).TotalSeconds -ge 3) {
                Write-WatchLog 'Kaynak/sunum değişikliği algılandı; paket yenileniyor.'
                $build = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
                    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
                    ('"' + (Join-Path $repo 'yeniden-baslat.ps1') + '"'), '-FromWatcher'
                ) -WorkingDirectory $repo -WindowStyle Hidden -PassThru `
                  -RedirectStandardOutput $buildOut -RedirectStandardError $buildErr
                $null = $build.Handle
                $build.WaitForExit()
                $build.Refresh()
                if ($build.ExitCode -eq 0) {
                    Write-WatchLog 'Yeni sürüm yayımlandı.'
                    $retryAt = Get-Date
                } else {
                    Write-WatchLog "Yenileme başarısız (çıkış kodu $($build.ExitCode)); 30 saniye sonra yeniden denenecek. Ayrıntı: $buildErr"
                    $retryAt = (Get-Date).AddSeconds(30)
                }
            }
        } catch {
            Write-WatchLog "İzleyici hatası: $($_.Exception.Message)"
            $retryAt = (Get-Date).AddSeconds(30)
        }
    }
} finally {
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}
