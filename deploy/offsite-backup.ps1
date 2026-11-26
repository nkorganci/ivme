param([switch]$Install)

$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$python = (Get-Command python.exe -ErrorAction Stop).Source
$taskName = 'Ivme-OffsiteBackup'
$person = [Security.Principal.WindowsIdentity]::GetCurrent().Name

if ($Install) {
    $powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
    $arguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + $PSCommandPath + '"'
    $action = New-ScheduledTaskAction -Execute $powershell -Argument $arguments -WorkingDirectory $project
    # Docker Desktop needs a few minutes after sign-in for the restore check.
    $logon = New-ScheduledTaskTrigger -AtLogOn -User $person
    $logon.Delay = 'PT10M'
    $periodic = New-ScheduledTaskTrigger -Once -At (Get-Date).AddHours(6) -RepetitionInterval (New-TimeSpan -Hours 6)
    $principal = New-ScheduledTaskPrincipal -UserId $person -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 15) -ExecutionTimeLimit (New-TimeSpan -Hours 3) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($logon, $periodic) -Principal $principal -Settings $settings -Force | Out-Null
    Start-ScheduledTask -TaskName $taskName
    Write-Output "Installed and started $taskName"
    exit 0
}

$mutex = New-Object System.Threading.Mutex($false, 'Local\IvmeOffsiteBackup')
$owns = $false
try {
    try { $owns = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $owns = $true }
    if (!$owns) { exit 0 }
    $directory = Join-Path $env:LOCALAPPDATA 'IvmeProductionMirror'
    New-Item -Path $directory -ItemType Directory -Force | Out-Null
    $log = Join-Path $directory 'offsite-backup.log'
    $previous = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $python -X utf8 (Join-Path $project 'offsite_backup.py') *>> $log
        $result = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previous }
    exit $result
} finally {
    if ($owns) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
