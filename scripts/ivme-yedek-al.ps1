param(
    [Parameter(Mandatory = $true)][string]$Destination,
    [string]$Database = 'ivme',
    [string]$DatabaseUser = 'root',
    [string]$PgBin = 'C:\Program Files\PostgreSQL\18\bin',
    [switch]$AllowSameDiskForDrill
)

$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$imageRoots = [ordered]@{
    ogm = 'D:\workspace\ivme\site\data\ogm\img'
    tyt = (Join-Path $sourceRoot 'veri\resimler\TYT')
    ayt = (Join-Path $sourceRoot 'veri\resimler\AYT')
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
$sourceDrive = (Get-Item -LiteralPath $sourceRoot).PSDrive.Name
$targetDrive = (Get-Item -LiteralPath $targetRoot).PSDrive.Name
$sourceDisk = (Get-Partition -DriveLetter $sourceDrive).DiskNumber
$targetDisk = (Get-Partition -DriveLetter $targetDrive).DiskNumber
if ($sourceDisk -eq $targetDisk -and -not $AllowSameDiskForDrill) {
    throw "Kaynak ve hedef aynı fiziksel diskte ($sourceDisk). Ayrı disk seçin."
}
if (-not (Test-Path -LiteralPath (Join-Path $PgBin 'pg_dump.exe'))) { throw 'pg_dump bulunamadı.' }
if (-not (Get-Command tar.exe -ErrorAction SilentlyContinue)) { throw 'tar.exe bulunamadı.' }

$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$backupDir = Join-Path $targetRoot "ivme-$stamp"
New-Item -ItemType Directory -Path $backupDir | Out-Null
$databaseFile = Join-Path $backupDir 'database.dump'
& (Join-Path $PgBin 'pg_dump.exe') -Fc -h localhost -U $DatabaseUser -d $Database -f $databaseFile
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
    $stats = Get-ChildItem -LiteralPath $root -Recurse -File | Measure-Object -Property Length -Sum
    $files[$entry.Key] = @{ name = $archiveName; count = $stats.Count; sourceBytes = $stats.Sum;
        bytes = (Get-Item -LiteralPath $archive).Length;
        sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToLowerInvariant() }
}
$manifest = [ordered]@{
    createdAtUtc = (Get-Date).ToUniversalTime().ToString('o')
    database = $Database
    sourceDisk = $sourceDisk
    targetDisk = $targetDisk
    separatePhysicalDisk = $sourceDisk -ne $targetDisk
    files = $files
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $backupDir 'manifest.json') -Encoding utf8
Write-Output $backupDir
