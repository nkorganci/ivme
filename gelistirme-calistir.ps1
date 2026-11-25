[CmdletBinding()]
param([ValidateSet('backend','frontend')][string]$Part)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'yerel-ortam.ps1')
$settings = Get-IvmeLocalEnvironment
$settings.SessionCookie = 'IVME_DEV_SESSION'
$settings.CsrfCookie = 'IVME_DEV_XSRF'
Set-IvmeLocalEnvironment $settings
$env:JAVA_HOME = 'C:\Tools\jdk-21'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
if ($Part -eq 'backend') {
    $env:PORT = [string]$settings.ApiPort
    Set-Location (Join-Path $PSScriptRoot 'backend')
    & mvn.cmd spring-boot:run -Dspring-boot.run.profiles=dev
} else {
    Set-Location (Join-Path $PSScriptRoot 'frontend')
    if (-not (Test-Path -LiteralPath 'node_modules')) { & npm.cmd ci --no-audit --no-fund }
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & npm.cmd run dev
}
exit $LASTEXITCODE
