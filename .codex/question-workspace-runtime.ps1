$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
. (Join-Path $projectRoot 'canli-kaynaklar.ps1')
$fingerprint = Get-YksSourceFingerprint
$deployed = (Get-Content backend/target/live-deployed.fingerprint -Raw).Trim()
if ($fingerprint -ne $deployed) { throw "Source fingerprint mismatch: $fingerprint / $deployed" }
$localHtml = Get-Content frontend/dist/index.html -Raw
$servedHtml = (Invoke-WebRequest 'http://127.0.0.1:5173/?surum-kontrolu=1' -UseBasicParsing).Content
if ($localHtml.Trim() -ne $servedHtml.Trim()) { throw 'Served HTML mismatch.' }
$localVersion = (Get-Content frontend/dist/app-version.txt -Raw).Trim()
$servedVersion = (Invoke-WebRequest 'http://127.0.0.1:5173/app-version.txt' -UseBasicParsing).Content.Trim()
if ($localVersion -ne $servedVersion) { throw 'Version mismatch.' }
$watch = (Get-Content backend/target/live-watch.status -Raw).Trim().Split('|')
$watchProcess = Get-Process -Id ([int]$watch[0]) -ErrorAction Stop
if (((Get-Date) - [DateTimeOffset]::Parse($watch[1]).LocalDateTime).TotalSeconds -gt 30) { throw 'Watcher heartbeat is stale.' }
$listener = Get-NetTCPConnection -LocalPort 5173 -State Listen | Select-Object -First 1
$report = [ordered]@{sourceFingerprint=$fingerprint;deployedFingerprint=$deployed;htmlMatches=$true;version=$servedVersion;watchProcessId=$watchProcess.Id;watchHeartbeat=$watch[1];listenerProcessId=$listener.OwningProcess;verifiedAt=(Get-Date -Format o);powershellVersion=$PSVersionTable.PSVersion.ToString()}
$report | ConvertTo-Json | Set-Content veri/content-labels/integration/question-workspace-20261017/runtime-report.json -Encoding UTF8
$report | ConvertTo-Json
