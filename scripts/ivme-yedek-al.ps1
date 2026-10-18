param(
    [Parameter(Mandatory = $true)][string]$Destination,
    [string]$Database = 'ivme',
    [string]$DatabaseUser = 'root',
    [string]$DatabaseSnapshot = '',
    [string]$PgBin = 'C:\Program Files\PostgreSQL\18\bin',
    [switch]$AllowSameDiskForDrill
)

$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$imageRoots = [ordered]@{
    ogm = (Join-Path $sourceRoot '..\icerik\data\ogm\img')
    tyt = (Join-Path $sourceRoot 'veri\resimler\TYT')
    ayt = (Join-Path $sourceRoot 'veri\resimler\AYT')
    pdfs = (Join-Path $sourceRoot '..\Kaynaklar')
    labels = (Join-Path $sourceRoot 'veri\content-labels')
    sourceMetadata = (Join-Path $sourceRoot 'ornek-veri')
    pilotImages = (Join-Path $sourceRoot 'veri\resimler-pilot')
    repairedImages = (Join-Path $sourceRoot 'veri\resimler-pilot\onarilmis')
}
$targetRoot = (Resolve-Path -LiteralPath $Destination).Path
if (-not (Get-Item -LiteralPath $targetRoot).PSIsContainer) { throw 'Yedek hedefi klasör olmalı.' }
if ($targetRoot.StartsWith($sourceRoot + [IO.Path]::DirectorySeparatorChar,
        [StringComparison]::OrdinalIgnoreCase) -or $targetRoot.Equals($sourceRoot,
        [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Yedek hedefi uygulama deposunun içinde olamaz.'
}
foreach ($imageRoot in $imageRoots.Values) {
    $actual = (Resolve-Path -LiteralPath $imageRoot).Path
    if ($targetRoot.StartsWith($actual + [IO.Path]::DirectorySeparatorChar,
            [StringComparison]::OrdinalIgnoreCase) -or $targetRoot.Equals($actual,
            [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Yedek hedefi görsel kaynağının içinde olamaz.'
    }
}
function Get-BackupStorageInfo([string]$ResolvedPath) {
    $networkPath = if ($ResolvedPath.StartsWith('\\')) { $ResolvedPath } else {
        $drive = [IO.Path]::GetPathRoot($ResolvedPath).TrimEnd('\')
        $logical = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$drive'"
        if ($logical.DriveType -eq 4) { $logical.ProviderName } else { $null }
    }
    if ($networkPath) {
        $server = $networkPath.TrimStart([char]'\').Split('\')[0]
        if ($server -in @('localhost','127.0.0.1','::1',$env:COMPUTERNAME)) {
            throw 'Yerel makine paylaşımı bağımsız ağ yedeği sayılmaz.'
        }
        return @{ kind='NETWORK'; server=$server; disk=$null }
    }
    $drive = [IO.Path]::GetPathRoot($ResolvedPath).TrimEnd(':','\')
    if ($drive -notmatch '^[A-Za-z]$') { throw 'Yedek hedefinin fiziksel diski belirlenemedi.' }
    $partition = Get-Partition -DriveLetter $drive -ErrorAction Stop
    return @{ kind='LOCAL'; server=$null; disk=$partition.DiskNumber }
}
$sourceStorage = Get-BackupStorageInfo $sourceRoot
$targetStorage = Get-BackupStorageInfo $targetRoot
$sourceDisk = $sourceStorage.disk
$targetDisk = $targetStorage.disk
if ($targetStorage.kind -eq 'LOCAL' -and $sourceDisk -eq $targetDisk -and -not $AllowSameDiskForDrill) {
    throw "Kaynak ve hedef aynı fiziksel diskte ($sourceDisk). Ayrı disk seçin."
}
if (-not (Test-Path -LiteralPath (Join-Path $PgBin 'pg_dump.exe'))) { throw 'pg_dump bulunamadı.' }
if (-not (Get-Command tar.exe -ErrorAction SilentlyContinue)) { throw 'tar.exe bulunamadı.' }

$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$backupDir = Join-Path $targetRoot "ivme-$stamp"
New-Item -ItemType Directory -Path $backupDir | Out-Null
$databaseFile = Join-Path $backupDir 'database.dump'
$dumpArguments = @('-w','-Fc','-h','localhost','-U',$DatabaseUser,'-d',$Database,'-f',$databaseFile)
if ($DatabaseSnapshot) {
    if ($DatabaseSnapshot -cnotmatch '^[0-9A-Fa-f]+-[0-9A-Fa-f]+-[0-9]+$') { throw 'Geçersiz PostgreSQL anlık kayıt kimliği.' }
    $dumpArguments += @('--snapshot',$DatabaseSnapshot)
}
& (Join-Path $PgBin 'pg_dump.exe') @dumpArguments
if ($LASTEXITCODE -ne 0) { throw 'Veritabanı yedeği alınamadı.' }
$files = [ordered]@{}
$files['database'] = @{ name = 'database.dump'; bytes = (Get-Item -LiteralPath $databaseFile).Length;
    sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $databaseFile).Hash.ToLowerInvariant() }
foreach ($entry in $imageRoots.GetEnumerator()) {
    $root = (Resolve-Path -LiteralPath $entry.Value).Path
    $archiveName = "images-$($entry.Key).tar"
    $archive = Join-Path $backupDir $archiveName
    & tar.exe -cf $archive -C $root .
    if ($LASTEXITCODE -ne 0) { throw "Görsel arşivi alınamadı: $($entry.Key)" }
    $stats = Get-ChildItem -LiteralPath $root -Recurse -File -Force | Measure-Object -Property Length -Sum
    $files[$entry.Key] = @{ name = $archiveName; sourceRoot = $root; count = $stats.Count; sourceBytes = $stats.Sum;
        bytes = (Get-Item -LiteralPath $archive).Length;
        sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToLowerInvariant() }
}
$manifest = [ordered]@{
    createdAtUtc = (Get-Date).ToUniversalTime().ToString('o')
    database = $Database
    sourceDisk = $sourceDisk
    targetDisk = $targetDisk
    separatePhysicalDisk = if ($targetStorage.kind -eq 'LOCAL') { $sourceDisk -ne $targetDisk } else { $null }
    independentNetworkTarget = $targetStorage.kind -eq 'NETWORK'
    targetStorage = $targetStorage
    files = $files
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $backupDir 'manifest.json') -Encoding utf8
Write-Output $backupDir
