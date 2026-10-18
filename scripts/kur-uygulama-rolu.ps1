# Üretim veritabanında yalnız veri işlemi yapabilen rolü kurar.
# Yetkili PostgreSQL parolası yalnız bu PowerShell işleminin ortamında tutulur.
param(
    [string]$Database = 'ivme',
    [string]$AdminUser = 'postgres',
    [string]$Role = 'ivme_app',
    [string]$HostName = '127.0.0.1',
    [string]$Psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe',
    [switch]$Rotate
)

$ErrorActionPreference = 'Stop'
foreach ($identifier in @($Database, $AdminUser, $Role)) {
    if ($identifier -cnotmatch '^[a-z][a-z0-9_]*$') {
        throw 'Veritabanı, yönetici ve rol adları yalnız küçük harf, rakam ve alt çizgi içermeli.'
    }
}
if (-not (Test-Path -LiteralPath $Psql)) { throw "psql bulunamadı: $Psql" }

$secure = Read-Host -Prompt "$AdminUser PostgreSQL parolası" -AsSecureString
$previousPgPassword = [Environment]::GetEnvironmentVariable('PGPASSWORD', 'Process')
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}

try {
    $existing = & $Psql -X -q -t -A -v ON_ERROR_STOP=1 -h $HostName -U $AdminUser -d $Database `
        -c "SELECT count(*) FROM pg_roles WHERE rolname = '$Role'"
    if ($LASTEXITCODE -ne 0) { throw 'Yetkili PostgreSQL bağlantısı başarısız.' }
    if ($existing.Trim() -eq '1' -and -not $Rotate) {
        throw "Rol zaten var: $Role. Parolayı değiştirmek için açıkça -Rotate kullan."
    }

    $randomText = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(36))
    $password = $randomText.TrimEnd('=').Replace('+', '-').Replace('/', '_')
    $roleStatement = if ($existing.Trim() -eq '1') {
        "ALTER ROLE $Role PASSWORD '$password';"
    } else {
        "CREATE ROLE $Role LOGIN PASSWORD '$password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;"
    }
    $readSchemas = & $Psql -X -q -t -A -v ON_ERROR_STOP=1 -h $HostName -U $AdminUser -d $Database `
        -c "SELECT nspname FROM pg_namespace WHERE nspname IN ('learning_catalog','source_research')"
    if ($LASTEXITCODE -ne 0) { throw 'Katalog şemaları denetlenemedi.' }
    $catalogGrants = foreach ($schema in $readSchemas) {
        $schema = $schema.Trim()
        if ($schema -notin @('learning_catalog','source_research')) { throw 'Beklenmeyen şema.' }
        "GRANT USAGE ON SCHEMA $schema TO $Role;"
        "GRANT SELECT ON ALL TABLES IN SCHEMA $schema TO $Role;"
        if ($schema -eq 'learning_catalog') { "GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA learning_catalog TO $Role;" }
        "ALTER DEFAULT PRIVILEGES FOR ROLE root IN SCHEMA $schema GRANT SELECT ON TABLES TO $Role;"
    }
    $intakeExists = & $Psql -X -q -t -A -v ON_ERROR_STOP=1 -h $HostName -U $AdminUser -d $Database `
        -c "SELECT to_regclass('learning_catalog.question_intake') IS NOT NULL"
    if ($LASTEXITCODE -ne 0) { throw 'Kaynak kabul tablosu denetlenemedi.' }
    $intakeGrant = if ($intakeExists.Trim() -eq 't') { "GRANT INSERT, UPDATE, DELETE ON learning_catalog.question_intake TO $Role;" } else { '' }
    $sql = @"
BEGIN;
$roleStatement
GRANT CONNECT ON DATABASE $Database TO $Role;
GRANT USAGE ON SCHEMA public TO $Role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $Role;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO $Role;
REVOKE ALL ON TABLE public.flyway_schema_history FROM $Role;
$($catalogGrants -join [Environment]::NewLine)
$intakeGrant
ALTER DEFAULT PRIVILEGES FOR ROLE root IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $Role;
ALTER DEFAULT PRIVILEGES FOR ROLE root IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO $Role;
COMMIT;
"@
    $sql | & $Psql -X -q -v ON_ERROR_STOP=1 -h $HostName -U $AdminUser -d $Database -f -
    if ($LASTEXITCODE -ne 0) { throw 'Rol kurulamadı; işlem geri alındı.' }

    $secretDir = Join-Path (Split-Path -Parent $PSScriptRoot) 'veri\gizli'
    New-Item -ItemType Directory -Path $secretDir -Force | Out-Null
    $secretPath = Join-Path $secretDir "${Role}_password.txt"
    if (-not (Test-Path -LiteralPath $secretPath)) {
        New-Item -ItemType File -Path $secretPath | Out-Null
    }
    $acl = [Security.AccessControl.FileSecurity]::new()
    $rule = [Security.AccessControl.FileSystemAccessRule]::new(
        [Security.Principal.WindowsIdentity]::GetCurrent().Name,
        [Security.AccessControl.FileSystemRights]::FullControl,
        [Security.AccessControl.AccessControlType]::Allow)
    $acl.SetAccessRuleProtection($true, $false)
    $acl.AddAccessRule($rule)
    Set-Acl -LiteralPath $secretPath -AclObject $acl
    [IO.File]::WriteAllText($secretPath, $password + [Environment]::NewLine)
    Write-Host "Rol kuruldu: $Role. Parola Git dışı dosyada: $secretPath"
} finally {
    [Environment]::SetEnvironmentVariable('PGPASSWORD', $previousPgPassword, 'Process')
}
