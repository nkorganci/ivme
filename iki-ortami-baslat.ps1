[CmdletBinding()]
param([switch]$OpenBrowser)
$ErrorActionPreference = 'Stop'
$worktrees = @{}
$path = $null
& git -C $PSScriptRoot worktree list --porcelain | ForEach-Object {
    if ($_ -like 'worktree *') { $path = $_.Substring(9) }
    if ($_ -like 'branch refs/heads/*') { $worktrees[$_.Substring(18)] = $path }
}
if (-not $worktrees.ContainsKey('main') -or -not $worktrees.ContainsKey('feature/ivme-yol-haritasi')) {
    throw 'Both main and feature/ivme-yol-haritasi must have separate worktrees.'
}
foreach ($branch in @('main', 'feature/ivme-yol-haritasi')) {
    $repo = $worktrees[$branch]
    $script = Join-Path $repo 'canli-izle.ps1'
    if (-not (Test-Path -LiteralPath $script)) { throw "Missing watcher: $script" }
    $null = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $script + '"')
    ) -WorkingDirectory $repo -WindowStyle Hidden -PassThru
}
Write-Host 'Main: http://localhost:1010; feature: http://localhost:1011'

if ($OpenBrowser) {
    foreach ($site in @(
        @{ Name = 'Main'; Url = 'http://localhost:1010' },
        @{ Name = 'Feature'; Url = 'http://localhost:1011' }
    )) {
        $deadline = (Get-Date).AddMinutes(5)
        Write-Host "$($site.Name) bekleniyor: $($site.Url)"
        $ready = $false
        do {
            try {
                $response = Invoke-WebRequest -Uri $site.Url -UseBasicParsing -TimeoutSec 3
                if ($response.StatusCode -eq 200) { $ready = $true; break }
            } catch { }
            Start-Sleep -Seconds 2
        } while ((Get-Date) -lt $deadline)
        if (-not $ready) { throw "$($site.Name) acilamadi: $($site.Url). backend\\target\\live-watch.log dosyasini kontrol edin." }
        Write-Host "$($site.Name) hazir: $($site.Url)"
        Start-Process $site.Url
    }
}
