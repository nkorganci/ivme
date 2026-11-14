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
$startOut = Join-Path $stateDir 'live-start.stdout.log'
$startErr = Join-Path $stateDir 'live-start.stderr.log'

function Write-WatchLog([string]$message) {
    Add-Content -LiteralPath $logFile -Value "$(Get-Date -Format o) $message" -Encoding UTF8
}

function Invoke-Restart([string[]]$extraArguments, [string]$stdout, [string]$stderr) {
    $process = Start-Process -FilePath 'powershell.exe' -ArgumentList (@(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
        ('"' + (Join-Path $repo 'yeniden-baslat.ps1') + '"'), '-FromWatcher'
    ) + $extraArguments) -WorkingDirectory $repo -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    $null = $process.Handle
    $process.WaitForExit()
    $process.Refresh()
    return $process.ExitCode
}

# Yalnız ön yüz kaynağı değişti: jar derlenmez, uygulama yeniden başlamaz. Vite ayrı klasöre derler, başarılıysa dist'e eşitlenir
# (derleme hatası çalışan sürümü bozmaz). Uygulama ön yüzü diskten sunar (yeniden-baslat.ps1: static-locations).
function Publish-FrontendOnly {
    $frontend = Join-Path $repo 'frontend'
    $next = Join-Path $frontend 'dist-yeni'
    $dist = Join-Path $frontend 'dist'
    if (Test-Path -LiteralPath $next) { Remove-Item -LiteralPath $next -Recurse -Force }
    $process = Start-Process -FilePath 'node.exe' -ArgumentList @('node_modules/vite/bin/vite.js', 'build', '--outDir', 'dist-yeni', '--emptyOutDir') `
        -WorkingDirectory $frontend -WindowStyle Hidden -PassThru -RedirectStandardOutput $buildOut -RedirectStandardError $buildErr
    $null = $process.Handle
    $process.WaitForExit()
    $process.Refresh()
    if ($process.ExitCode -ne 0 -or -not (Test-Path -LiteralPath (Join-Path $next 'index.html'))) { return $false }
    Set-Content -LiteralPath (Join-Path $next 'app-version.txt') -Value ([Guid]::NewGuid().ToString('N')) -NoNewline -Encoding ASCII
    # index.html en son kopyalanır: eski index yeni dosyaları beklemeden yeni index yeni dosyasız kalmaz.
    & robocopy.exe $next $dist /E /NFL /NDL /NJH /NJS /NP /XF index.html app-version.txt | Out-Null
    if ($LASTEXITCODE -ge 8) { return $false }
    Copy-Item -LiteralPath (Join-Path $next 'index.html') -Destination (Join-Path $dist 'index.html') -Force
    Copy-Item -LiteralPath (Join-Path $next 'app-version.txt') -Destination (Join-Path $dist 'app-version.txt') -Force
    Remove-Item -LiteralPath $next -Recurse -Force -ErrorAction SilentlyContinue
    return $true
}

function Test-ServesFrontendFromDisk([int]$port) {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $listener) { return $false }
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
    return [bool]($process -and $process.CommandLine -match 'static-locations=file:')
}

function Start-LastPackage {
    return (Invoke-Restart @('-ReuseDeployed') $startOut $startErr) -eq 0
}

try {
    Write-WatchLog "İzleyici başladı (PID $PID)."
    # Let the launcher see the new process before the first full source hash completes.
    Set-Content -LiteralPath $statusFile -Value "$PID|$(Get-Date -Format o)" -Encoding ASCII
    $lastSeen = Get-YksSourceFingerprint
    $deployedFullFile = Join-Path $stateDir 'live-deployed.full.fingerprint'
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
                # Unchanged sources after a reboot: reopen the last package instead of a 2-3 minute rebuild.
                $published = $false
                $triedLast = $false
                # Hızlı yol: uygulama açık, ön yüzü diskten sunuyor ve yalnız ön yüz kaynağı değişti.
                if ($listener -and (Test-ServesFrontendFromDisk $settings.Port) -and (Test-Path -LiteralPath $deployedFullFile) -and
                        ((Get-YksSourceFingerprint -Part Full) -eq (Get-Content -LiteralPath $deployedFullFile -Raw).Trim())) {
                    Write-WatchLog 'Yalnız ön yüz değişti; jar derlenmeden hızlı yayımlanıyor.'
                    if (Publish-FrontendOnly) {
                        Set-Content -LiteralPath $deployedFile -Value $current -NoNewline -Encoding ASCII
                        Write-WatchLog 'Ön yüz yayımlandı (yeniden başlatma yok).'
                        $published = $true
                        $retryAt = Get-Date
                    } else {
                        Write-WatchLog "Ön yüz derlenemedi; çalışan sürüm korunuyor. Ayrıntı: $buildErr"
                        $retryAt = (Get-Date).AddSeconds(30)
                        $published = $true
                    }
                }
                if (-not $published -and -not $listener -and $current -eq $deployed) {
                    Write-WatchLog 'Uygulama kapalı algılandı; kaynak değişmediği için son paket açılıyor.'
                    $triedLast = $true
                    $published = Start-LastPackage
                    if ($published) {
                        Write-WatchLog 'Son paket yayımlandı.'
                        $retryAt = Get-Date
                    } else {
                        Write-WatchLog "Son paket açılamadı; tam derlemeye geçiliyor. Ayrıntı: $startErr"
                    }
                }
                if (-not $published) {
                    Write-WatchLog 'Kaynak/sunum değişikliği algılandı; paket yenileniyor.'
                    $exitCode = Invoke-Restart @() $buildOut $buildErr
                    if ($exitCode -eq 0) {
                        Write-WatchLog 'Yeni sürüm yayımlandı.'
                        $retryAt = Get-Date
                    } else {
                        Write-WatchLog "Yenileme başarısız (çıkış kodu $exitCode); 30 saniye sonra yeniden denenecek. Ayrıntı: $buildErr"
                        $retryAt = (Get-Date).AddSeconds(30)
                        # A broken build must not leave the user without an app.
                        if (-not $triedLast -and -not (Get-NetTCPConnection -LocalPort $settings.Port -State Listen -ErrorAction SilentlyContinue)) {
                            if (Start-LastPackage) {
                                Write-WatchLog 'Önceki sürüm açıldı; yeni sürüm derlenince yerini alacak.'
                            } else {
                                Write-WatchLog "Önceki sürüm de açılamadı. Ayrıntı: $startErr"
                            }
                        }
                    }
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
