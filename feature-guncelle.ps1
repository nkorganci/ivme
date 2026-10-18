[CmdletBinding()]
param([switch]$SyncStudents)
$ErrorActionPreference = 'Stop'
$repo = $PSScriptRoot
$branch = (& git -C $repo branch --show-current).Trim()
if ($branch -notlike 'feature/*') { throw 'Run this command from the feature worktree.' }
if (& git -C $repo status --porcelain) { throw 'Commit pending local changes before synchronizing feature.' }
& git -C $repo fetch ivme
if ($LASTEXITCODE -ne 0) { throw 'Fetching ivme failed; local sources were preserved.' }
foreach ($reference in @('main', 'ivme/main')) {
    & git -C $repo merge-base --is-ancestor $reference HEAD
    if ($LASTEXITCODE -eq 0) { continue }
    $preview = & git -C $repo merge-tree --write-tree HEAD $reference 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Merge conflicts with $reference; working files were preserved." }
    & git -C $repo merge --no-edit --no-stat $reference
    if ($LASTEXITCODE -ne 0) { throw "Feature merge failed: $reference" }
}
if ($SyncStudents) {
    $python = Join-Path (Split-Path $repo -Parent) '.venv\Scripts\python.exe'
    & $python -X utf8 (Join-Path $repo 'scripts\sync-production-students.py') --apply
    if ($LASTEXITCODE -ne 0) { throw 'Development student synchronization failed.' }
}
Write-Host 'Feature contains local main and ivme/main; production worktree was preserved.'
