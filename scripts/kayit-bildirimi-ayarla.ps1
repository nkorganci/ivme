[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Recipient,
    [Parameter(Mandatory)][string]$Sender,
    [Parameter(Mandatory)][string]$ManagementUrl
)
$ErrorActionPreference = 'Stop'
foreach ($address in @($Recipient, $Sender)) {
    $parsed = [System.Net.Mail.MailAddress]::new($address)
    if ($parsed.Address -ne $address) { throw 'Use a plain email address.' }
}
$uri = [Uri]$ManagementUrl
if ($uri.Scheme -ne 'https' -and -not ($uri.Scheme -eq 'http' -and $uri.IsLoopback)) {
    throw 'ManagementUrl must use HTTPS (HTTP is allowed for localhost).'
}
$repo = Split-Path $PSScriptRoot -Parent
$path = Join-Path $repo '.codex\local-environment.json'
# Refuse to write a secret if local Git rules no longer protect the destination.
& git -C $repo check-ignore -q -- $path
if ($LASTEXITCODE -ne 0) { throw 'The local settings file must be ignored by Git.' }
$settings = if (Test-Path -LiteralPath $path) { Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json } else { [PSCustomObject]@{} }
$secret = Read-Host 'Brevo API key (hidden; do not paste it into chat)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
    $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    if ([string]::IsNullOrWhiteSpace($key)) { throw 'API key is required.' }
    $values = @{
        RegistrationMailRecipient = $Recipient
        RegistrationMailSender = $Sender
        RegistrationMailManagementUrl = $ManagementUrl
        BrevoApiKey = $key
    }
    foreach ($name in $values.Keys) { $settings | Add-Member -NotePropertyName $name -NotePropertyValue $values[$name] -Force }
    $null = New-Item -ItemType Directory -Path (Split-Path $path -Parent) -Force
    [IO.File]::WriteAllText($path, ($settings | ConvertTo-Json -Depth 20), [Text.UTF8Encoding]::new($false))
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    $key = $null
    $secret.Dispose()
}
Write-Host 'Saved local settings. Run .\yeniden-baslat.ps1, then check Yonetim > Yeni kayit bildirimleri.'
