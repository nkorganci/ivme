$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$resources = (Resolve-Path -LiteralPath (Join-Path $repo 'backend\src\main\resources')).Path
$allowed = [IO.Path]::GetFullPath((Join-Path $repo 'backend\src\main\resources'))
if (-not $resources.Equals($allowed, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Statik kaynak klasoru beklenen depo yolunda degil.'
}
$target = [IO.Path]::GetFullPath((Join-Path $resources 'static'))
if (-not $target.Equals((Join-Path $allowed 'static'), [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Statik hedef depo disinda.'
}
$dist = (Resolve-Path -LiteralPath (Join-Path $repo 'frontend\dist')).Path
$existing = Get-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue
if ($existing) {
    if (-not $existing.PSIsContainer -or ($existing.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        throw 'Statik hedef klasor degil veya baglanti; silinmedi.'
    }
    Remove-Item -LiteralPath $target -Recurse -Force
}
New-Item -ItemType Directory -Path $target | Out-Null
Copy-Item -Path (Join-Path $dist '*') -Destination $target -Recurse -Force
