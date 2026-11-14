function Get-YksSourceFingerprint([ValidateSet('All', 'Full', 'Fast')][string]$Part = 'All') {
    # Fast: yalnız ön yüz kaynağı (frontend\src, public, index.html) -> jar yeniden derlenmeden yayımlanır.
    # Full: geri kalan her şey. All: ikisi birlikte (önceki tanımla aynı özet).
    $repo = $PSScriptRoot
    $directories = @(
        'frontend\src', 'frontend\public', 'backend\src\main\java', 'backend\src\main\resources\db'
    )
    $individual = @(
        'yerel-ortam.ps1', 'yeniden-baslat.ps1', 'canli-izle.ps1',
        '.codex\local-environment.json',
        'frontend\index.html', 'frontend\vite.config.js', 'frontend\package.json',
        'frontend\package-lock.json', 'backend\pom.xml',
        'scripts\content-review-catalog.mjs', 'scripts\pdf-review-labels.mjs',
        'scripts\pdf-review-taxonomy.mjs'
    )
    # Every top-level backend resource ships in the JAR; static\ is generated from frontend\dist.
    $resources = Join-Path $repo 'backend\src\main\resources'
    $files = @(
        foreach ($directory in $directories) {
            $path = Join-Path $repo $directory
            if (Test-Path -LiteralPath $path -PathType Container) {
                Get-ChildItem -LiteralPath $path -File -Recurse
            }
        }
        if (Test-Path -LiteralPath $resources -PathType Container) {
            Get-ChildItem -LiteralPath $resources -File
        }
        foreach ($file in $individual) {
            $path = Join-Path $repo $file
            if (Test-Path -LiteralPath $path -PathType Leaf) { Get-Item -LiteralPath $path }
        }
    )
    $fastRoots = @((Join-Path $repo 'frontend\src'), (Join-Path $repo 'frontend\public'), (Join-Path $repo 'frontend\index.html'))
    $isFast = { param($f) foreach ($r in $fastRoots) { if ($f.FullName.StartsWith($r, [StringComparison]::OrdinalIgnoreCase)) { return $true } }; return $false }
    if ($Part -eq 'Fast') { $files = @($files | Where-Object { & $isFast $_ }) }
    elseif ($Part -eq 'Full') { $files = @($files | Where-Object { -not (& $isFast $_) }) }
    $fileDigest = [Security.Cryptography.SHA256]::Create()
    try {
        $lines = foreach ($file in ($files | Sort-Object FullName)) {
            $stream = [IO.File]::OpenRead($file.FullName)
            try {
                $hash = [BitConverter]::ToString($fileDigest.ComputeHash($stream)).Replace('-', '')
            } finally { $stream.Dispose() }
            "$($file.FullName.Substring($repo.Length))|$hash"
        }
    } finally { $fileDigest.Dispose() }
    $digest = [Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [Text.Encoding]::UTF8.GetBytes(($lines -join "`n"))
        return [BitConverter]::ToString($digest.ComputeHash($bytes)).Replace('-', '')
    } finally {
        $digest.Dispose()
    }
}
