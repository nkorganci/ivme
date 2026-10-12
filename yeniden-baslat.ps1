$ErrorActionPreference = 'Stop'
$repo = $PSScriptRoot
$backend = Join-Path $repo 'backend'
$frontend = Join-Path $repo 'frontend'
$jar = Join-Path $backend 'target\hedef-yks.jar'
$backup = Join-Path $backend 'target\hedef-yks.jar.restart-backup'
$images = (Join-Path $repo 'veri\resimler-pilot').Replace('\', '/')
$javaHome = 'C:\Tools\jdk-21'

if (-not (Test-Path -LiteralPath (Join-Path $javaHome 'bin\java.exe'))) {
    throw "JDK 21 bulunamadı: $javaHome"
}
$env:JAVA_HOME = $javaHome
$env:Path = "$(Join-Path $javaHome 'bin');$env:Path"

function Start-Program {
    Start-Process -FilePath (Join-Path $javaHome 'bin\java.exe') -ArgumentList @(
        '-jar', 'target\hedef-yks.jar', '--spring.profiles.active=dev', '--server.port=5173',
        "--app.images.dir=$images"
    ) -WorkingDirectory $backend -WindowStyle Hidden -PassThru
}

Push-Location $frontend
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Ön yüz derlenemedi.' }
} finally { Pop-Location }

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo 'uretim-static-kopyala.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Ön yüz dosyaları pakete kopyalanamadı.' }

Push-Location $backend
try {
    & mvn.cmd -q -DskipTests compile
    if ($LASTEXITCODE -ne 0) { throw 'Arka yüz derlenemedi.' }

    $listener = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) {
        $running = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
        if (-not $running -or $running.CommandLine -notmatch 'hedef-yks\.jar' -or
                $running.CommandLine -notmatch 'server\.port=5173') {
            throw '5173 portunda farklı bir uygulama çalışıyor; durdurulmadı.'
        }
    }

    if (Test-Path -LiteralPath $jar) { Copy-Item -LiteralPath $jar -Destination $backup -Force }
    if ($listener) { Stop-Process -Id $listener.OwningProcess -Force }

    & mvn.cmd -q -DskipTests package
    if ($LASTEXITCODE -ne 0) {
        if (Test-Path -LiteralPath $backup) {
            Copy-Item -LiteralPath $backup -Destination $jar -Force
            $null = Start-Program
        }
        throw 'Yeni paket oluşturulamadı. Önceki paket yeniden başlatıldı.'
    }

    $started = Start-Program
} finally { Pop-Location }

for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Seconds 1
    if ($started.HasExited) { throw 'Uygulama başlatıldı ancak hemen kapandı.' }
    try {
        $response = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-Host 'Uygulama hazır: http://localhost:5173'
            exit 0
        }
    } catch { }
}
throw 'Uygulama başlatıldı fakat 30 saniyede hazır olmadı.'
