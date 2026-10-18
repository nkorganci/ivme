[CmdletBinding()]
param([switch]$FromWatcher)

$ErrorActionPreference = 'Stop'
$repo = $PSScriptRoot
$backend = Join-Path $repo 'backend'
$frontend = Join-Path $repo 'frontend'
. (Join-Path $repo 'yerel-ortam.ps1')
$settings = Get-IvmeLocalEnvironment
Set-IvmeLocalEnvironment $settings
$port = $settings.Port
$baseUrl = "http://127.0.0.1:$port"
$images = $settings.Images.Replace('\', '/')
$javaHome = 'C:\Tools\jdk-21'
. (Join-Path $repo 'canli-kaynaklar.ps1')
$sourceFingerprint = Get-YksSourceFingerprint
$stateDir = Join-Path $backend 'target'
New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
try {
    $deploymentLock = [IO.File]::Open((Join-Path $stateDir 'live-restart.lock'),
        [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
} catch {
    throw 'Başka bir yeniden başlatma işlemi sürüyor. Kaynak izleyici yeniden deneyecek.'
}

try {

if (-not (Test-Path -LiteralPath (Join-Path $javaHome 'bin\java.exe'))) {
    throw "JDK 21 bulunamadı: $javaHome"
}
$env:JAVA_HOME = $javaHome
$env:Path = "$(Join-Path $javaHome 'bin');$env:Path"

function Start-Program([string]$jarPath) {
    Start-Process -FilePath (Join-Path $javaHome 'bin\java.exe') -ArgumentList @(
        '-jar', ('"' + $jarPath + '"'), '--spring.profiles.active=dev', "--server.port=$port",
        ('"--app.images.dir=' + $images + '"')
    ) -WorkingDirectory $backend -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput (Join-Path $stateDir 'application.stdout.log') `
      -RedirectStandardError (Join-Path $stateDir 'application.stderr.log')
}

Push-Location $frontend
try {
    if (-not (Test-Path -LiteralPath 'node_modules')) {
        & npm.cmd ci --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
    }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Ön yüz derlenemedi.' }
} finally { Pop-Location }

$buildVersion = [Guid]::NewGuid().ToString('N')
Set-Content -LiteralPath (Join-Path $frontend 'dist\app-version.txt') -Value $buildVersion -NoNewline -Encoding ASCII

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo 'uretim-static-kopyala.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Ön yüz dosyaları pakete kopyalanamadı.' }

Push-Location $backend
try {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    $runningKind = $null
    $oldJar = $null
    if ($listener) {
        $running = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
        if ($running -and $running.CommandLine -match 'hedef-yks\.jar' -and
                $running.CommandLine -match "server\.port=$port(?:\s|$)" -and
                $running.CommandLine.Contains($backend)) {
            $runningKind = 'jar'
            $jarMatch = [regex]::Match($running.CommandLine, '-jar\s+(?:"([^"]+)"|(\S+))')
            if ($jarMatch.Success) {
                $oldJar = if ($jarMatch.Groups[1].Success) { $jarMatch.Groups[1].Value } else { $jarMatch.Groups[2].Value }
                if (-not [IO.Path]::IsPathRooted($oldJar)) { $oldJar = Join-Path $backend $oldJar }
            }
        } elseif ($running -and $running.CommandLine -like "*$frontend*" -and
                $running.CommandLine -match 'vite[\\/]bin[\\/]vite\.js') {
            $runningKind = 'vite'
        } else {
            throw "$port portunda farkli bir uygulama calisiyor; durdurulmadi."
        }
    }

    $slot = if ($oldJar -and $oldJar -match 'target[\\/]deploy-a[\\/]') { 'deploy-b' } else { 'deploy-a' }
    $newJar = Join-Path $backend "target\$slot\hedef-yks.jar"
    & mvn.cmd -q -DskipTests "-Dyks.build.directory=target/$slot" clean package
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $newJar)) {
        throw 'Yeni paket oluşturulamadı; çalışan uygulama korunuyor.'
    }

    if ($listener) {
        Write-Host "$port portundaki $runningKind sureci durduruluyor (PID $($listener.OwningProcess))."
        Stop-Process -Id $listener.OwningProcess -Force
        for ($wait = 0; $wait -lt 20; $wait++) {
            if (-not (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)) { break }
            Start-Sleep -Milliseconds 500
        }
        if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
            throw "$port portu bosalmadi; yeni surum baslatilmadi."
        }
    }

    $started = Start-Program $newJar
} finally { Pop-Location }

$expectedIndex = Get-Content -LiteralPath (Join-Path $repo 'frontend\dist\index.html') -Raw
$assetMatch = [regex]::Match($expectedIndex, '/assets/index-[^" ]+\.js')
if (-not $assetMatch.Success) { throw 'Derlenen on yuz dosyasi bulunamadi.' }
$expectedAsset = $assetMatch.Value

$ready = $false
for ($attempt = 0; $attempt -lt 90; $attempt++) {
    Start-Sleep -Seconds 1
    if ($started.HasExited) { break }
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/?surum-kontrolu=1" -UseBasicParsing -TimeoutSec 2 -Headers @{ 'Cache-Control' = 'no-cache' }
        if ($response.StatusCode -eq 200 -and $response.Content.Contains($expectedAsset)) {
            $route = Invoke-WebRequest -Uri "$baseUrl/ogrenci-takip" -UseBasicParsing -TimeoutSec 2
            if ($route.StatusCode -ne 200) { continue }
            $trialRoute = Invoke-WebRequest -Uri "$baseUrl/ogrenci-takip/tyt-denemeleri" -UseBasicParsing -TimeoutSec 2
            if ($trialRoute.StatusCode -ne 200 -or -not $trialRoute.Content.Contains($expectedAsset)) { continue }
            $versionResponse = Invoke-WebRequest -Uri "$baseUrl/app-version.txt" -UseBasicParsing -TimeoutSec 2
            if ($versionResponse.Content.Trim() -ne $buildVersion) { continue }
            Write-Host "Uygulama hazir: http://localhost:$port ($($settings.Name), $expectedAsset)"
            $ready = $true
            break
        }
    } catch { }
}
if (-not $ready) {
    if (-not $started.HasExited) { Stop-Process -Id $started.Id -Force }
    if ($oldJar -and (Test-Path -LiteralPath $oldJar)) {
        $null = Start-Program $oldJar
        Write-Warning 'Yeni sürüm açılamadı; önceki paket yeniden başlatıldı.'
    }
    throw "Uygulama baslatildi ancak beklenen on yuz surumu 90 saniyede gorulmedi: $expectedAsset"
}

Set-Content -LiteralPath (Join-Path $stateDir 'live-deployed.fingerprint') -Value $sourceFingerprint -NoNewline -Encoding ASCII
if (-not $FromWatcher) {
    $watchScript = Join-Path $repo 'canli-izle.ps1'
    $null = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $watchScript + '"')
    ) -WorkingDirectory $repo -WindowStyle Hidden -PassThru
    $statusFile = Join-Path $stateDir 'live-watch.status'
    $watchReady = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 500
        if (Test-Path -LiteralPath $statusFile) {
            $status = Get-Item -LiteralPath $statusFile
            $watchPid = ((Get-Content -LiteralPath $statusFile -Raw) -split '\|')[0]
            if (((Get-Date).ToUniversalTime() - $status.LastWriteTimeUtc).TotalSeconds -lt 10 -and
                    $watchPid -match '^\d+$' -and (Get-Process -Id ([int]$watchPid) -ErrorAction SilentlyContinue)) {
                $watchReady = $true
                break
            }
        }
    }
    if (-not $watchReady) { throw 'Uygulama hazır ancak canlı kaynak izleyicisi başlatılamadı.' }
    Write-Host "Canli guncelleme etkin (izleyici PID $watchPid)."
}
} finally {
    $deploymentLock.Dispose()
}
