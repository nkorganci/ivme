param([switch]$Install)

$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$python = (Get-Command python.exe -ErrorAction Stop).Source
$taskName = 'Ivme-ProductionDataMirror'
$person = [Security.Principal.WindowsIdentity]::GetCurrent().Name

if ($Install) {
    $powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
    $arguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + $PSCommandPath + '"'
    $action = New-ScheduledTaskAction -Execute $powershell -Argument $arguments -WorkingDirectory $project
    $logon = New-ScheduledTaskTrigger -AtLogOn -User $person
    $periodic = New-ScheduledTaskTrigger -Once -At (Get-Date).AddHours(2) -RepetitionInterval (New-TimeSpan -Hours 2)
    $principal = New-ScheduledTaskPrincipal -UserId $person -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5) -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($logon, $periodic) -Principal $principal -Settings $settings -Force | Out-Null
    Start-ScheduledTask -TaskName $taskName
    Write-Output "Installed and started $taskName"
    exit 0
}

$mutex = New-Object System.Threading.Mutex($false, 'Local\IvmeProductionDataMirror')
$owns = $false
try {
    try { $owns = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $owns = $true }
    if (!$owns) { exit 0 }
    $directory = Join-Path $env:LOCALAPPDATA 'IvmeProductionMirror'
    New-Item -Path $directory -ItemType Directory -Force | Out-Null
    $log = Join-Path $directory 'last-sync.log'
    $previous = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $python -X utf8 (Join-Path $project 'production_mirror.py') *> $log
        $result = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previous }
    exit $result
} finally {
    if ($owns) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
