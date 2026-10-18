$ErrorActionPreference = 'Stop'
$appRoot = Split-Path -Parent $PSScriptRoot
$backupPath = Join-Path $appRoot 'scripts/ivme-yedek-al.ps1'
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile($backupPath,[ref]$tokens,[ref]$parseErrors)
if ($parseErrors.Count) { throw 'Yedek betiği ayrıştırılamadı.' }
$function = $ast.Find({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Get-BackupStorageInfo' },$true)
. ([scriptblock]::Create($function.Extent.Text))
$localC = Get-BackupStorageInfo 'C:\'
$localD = Get-BackupStorageInfo 'D:\'
if ($localC.kind -ne 'LOCAL' -or $localD.kind -ne 'LOCAL' -or $localC.disk -ne $localD.disk) {
    throw 'Bu makinenin C/D aynı fiziksel disk dayanağı doğrulanamadı.'
}
$network = Get-BackupStorageInfo '\\independent-backup-server\ivme'
if ($network.kind -ne 'NETWORK' -or $null -ne $network.disk -or $network.server -ne 'independent-backup-server') {
    throw 'Ağ hedefi yerel fiziksel disk gibi işaretlenmemeli.'
}
foreach ($server in @('localhost','127.0.0.1',$env:COMPUTERNAME)) {
    $rejected = $false
    try { Get-BackupStorageInfo "\\$server\ivme" | Out-Null } catch { $rejected = $true }
    if (-not $rejected) { throw 'Yerel makine paylaşımı bağımsız hedef olarak kabul edildi.' }
}
$rolePath = Join-Path $appRoot 'scripts/kur-uygulama-rolu.ps1'
$null = [Management.Automation.Language.Parser]::ParseFile($rolePath,[ref]$tokens,[ref]$parseErrors)
if ($parseErrors.Count) { throw 'Rol kurulum betiği ayrıştırılamadı.' }
Write-Output 'PASS: same-disk detection, remote UNC classification, loopback-share rejection; backup/role scripts parse. No backup or role mutation performed.'
