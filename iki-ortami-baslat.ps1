[CmdletBinding()]
param([string]$Branch = 'main', [switch]$OpenBrowser)
$ErrorActionPreference = 'Stop'
$worktrees = @{}
$path = $null
& git -C $PSScriptRoot worktree list --porcelain | ForEach-Object {
    if ($_ -like 'worktree *') { $path = $_.Substring(9) }
    if ($_ -like 'branch refs/heads/*') { $worktrees[$_.Substring(18)] = $path }
}
if (-not $worktrees.ContainsKey($Branch)) { throw "Yerel worktree bulunamadı: $Branch" }

$activeFile = Join-Path (Split-Path $PSScriptRoot -Parent) '.ivme-active-branch'
Set-Content -LiteralPath $activeFile -Value $Branch -NoNewline -Encoding ASCII

# Port 1010 belongs to one worktree at a time. Stop only this project's other instance.
foreach ($otherBranch in $worktrees.Keys) {
    if ($otherBranch -eq $Branch) { continue }
    $otherRepo = $worktrees[$otherBranch]
    $statusFile = Join-Path $otherRepo 'backend\target\live-watch.status'
    if (Test-Path -LiteralPath $statusFile) {
        $watchPid = ((Get-Content -LiteralPath $statusFile -Raw) -split '\|')[0]
        if ($watchPid -match '^\d+$') {
            $watch = Get-CimInstance Win32_Process -Filter "ProcessId=$watchPid" -ErrorAction SilentlyContinue
            if ($watch -and $watch.CommandLine -like "*$otherRepo*canli-izle.ps1*") {
                Stop-Process -Id ([int]$watchPid) -Force
            }
        }
    }
}
$listener = Get-NetTCPConnection -LocalPort 1010 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
    $ownedByOther = $false
    foreach ($otherBranch in $worktrees.Keys) {
        if ($otherBranch -eq $Branch) { continue }
        $otherBackend = Join-Path $worktrees[$otherBranch] 'backend'
        if ($process.CommandLine -match 'hedef-yks\.jar' -and
            $process.CommandLine -match 'server\.port=1010(?:\s|$)' -and
            $process.CommandLine.Contains($otherBackend)) { $ownedByOther = $true; break }
    }
    if ($ownedByOther) {
        Stop-Process -Id $listener.OwningProcess -Force
        for ($i = 0; $i -lt 20; $i++) {
            if (-not (Get-NetTCPConnection -LocalPort 1010 -State Listen -ErrorAction SilentlyContinue)) { break }
            Start-Sleep -Milliseconds 500
        }
    }
}

$repo = $worktrees[$Branch]
$script = Join-Path $repo 'canli-izle.ps1'
if (-not (Test-Path -LiteralPath $script)) { throw "İzleyici bulunamadı: $script" }
$null = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $script + '"')
) -WorkingDirectory $repo -WindowStyle Hidden -PassThru
Write-Host "$Branch`: http://localhost:1010"

if ($OpenBrowser) {
    $deadline = (Get-Date).AddMinutes(5)
    $ready = $false
    do {
        try {
            $response = Invoke-WebRequest -Uri 'http://localhost:1010' -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -eq 200) { $ready = $true; break }
        } catch { }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    if (-not $ready) { throw "1010 açılamadı: $repo\backend\target\live-watch.log dosyasını kontrol edin." }
    Start-Process 'http://localhost:1010'
}
