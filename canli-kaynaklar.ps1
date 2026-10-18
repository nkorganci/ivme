function Get-YksSourceFingerprint {
    $repo = $PSScriptRoot
    $directories = @(
        'frontend\src', 'frontend\public', 'backend\src\main\java', 'backend\src\main\resources\db'
    )
    $individual = @(
        'yerel-ortam.ps1', 'yeniden-baslat.ps1', 'canli-izle.ps1',
        '.codex\local-environment.json',
        'frontend\index.html', 'frontend\vite.config.js', 'frontend\package.json',
        'frontend\package-lock.json', 'backend\pom.xml',
        'backend\src\main\resources\application.yml',
        'backend\src\main\resources\application-dev.yml',
        'backend\src\main\resources\topic-pdf-links.json',
        'backend\src\main\resources\pdf-review-labels.json',
        'backend\src\main\resources\content-review-catalog.json',
        'backend\src\main\resources\content-label-categories.json',
        'backend\src\main\resources\content-taxonomy.json',
        'backend\src\main\resources\review-vocabulary.json',
        'scripts\content-review-catalog.mjs', 'scripts\pdf-review-labels.mjs',
        'scripts\pdf-review-taxonomy.mjs'
    )
    $files = @(
        foreach ($directory in $directories) {
            $path = Join-Path $repo $directory
            if (Test-Path -LiteralPath $path -PathType Container) {
                Get-ChildItem -LiteralPath $path -File -Recurse
            }
        }
        foreach ($file in $individual) {
            $path = Join-Path $repo $file
            if (Test-Path -LiteralPath $path -PathType Leaf) { Get-Item -LiteralPath $path }
        }
    )
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
