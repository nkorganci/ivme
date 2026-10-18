$ErrorActionPreference = 'Stop'
$physicsRepo = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $physicsRepo
. (Join-Path $physicsRepo 'canli-kaynaklar.ps1')
$physicsCurrent = Get-YksSourceFingerprint
$physicsDeployed = (Get-Content backend/target/live-deployed.fingerprint -Raw).Trim()
$physicsWatch = (Get-Content backend/target/live-watch.status -Raw).Trim() -split '\|'
$physicsWatchAge = ((Get-Date).ToUniversalTime() - [DateTimeOffset]::Parse($physicsWatch[1]).UtcDateTime).TotalSeconds
$physicsHtml = Invoke-WebRequest 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 5
$physicsAsset = [regex]::Match((Get-Content frontend/dist/index.html -Raw), '/assets/index-[^" ]+\.js').Value
$physicsVersion = (Invoke-WebRequest 'http://127.0.0.1:5173/app-version.txt' -UseBasicParsing -TimeoutSec 5).Content.Trim()
$physicsReport = [ordered]@{
    Status = 'PASS'
    VerificationEngine = $PSVersionTable.PSVersion.ToString()
    SourceFingerprint = $physicsCurrent
    DeployedFingerprint = $physicsDeployed
    SourceMatches = ($physicsCurrent -eq $physicsDeployed)
    ServedAsset = $physicsAsset
    HtmlMatches = $physicsHtml.Content.Contains($physicsAsset)
    AppVersion = $physicsVersion
    VersionMatches = ($physicsVersion -eq (Get-Content frontend/dist/app-version.txt -Raw).Trim())
    WatcherPid = [int]$physicsWatch[0]
    WatcherAlive = [bool](Get-Process -Id ([int]$physicsWatch[0]) -ErrorAction SilentlyContinue)
    WatcherAgeSeconds = [math]::Round($physicsWatchAge, 2)
}
if (-not ($physicsReport.SourceMatches -and $physicsReport.HtmlMatches -and $physicsReport.VersionMatches -and
        $physicsReport.WatcherAlive -and $physicsWatchAge -lt 10)) { throw 'Runtime verification failed.' }
$physicsJson = $physicsReport | ConvertTo-Json
[IO.File]::WriteAllText((Join-Path $physicsRepo 'veri/content-labels/integration/physics-46-20261017/runtime-report.json'), $physicsJson, (New-Object Text.UTF8Encoding($false)))
$physicsJson
