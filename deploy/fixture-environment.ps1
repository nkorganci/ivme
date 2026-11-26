function Get-FixturePassword([string]$Role) {
    $path = Join-Path $env:LOCALAPPDATA "IvmeProductionMirror/$Role.credential"
    $secret = ConvertTo-SecureString ([IO.File]::ReadAllText($path))
    return (New-Object System.Net.NetworkCredential('', $secret)).Password
}

function Get-LocalFixture([string]$Project) {
    $marker = Join-Path $env:LOCALAPPDATA "IvmeProductionMirror/$Project.ready"
    if (!(Test-Path -LiteralPath $marker)) { return }
    & docker start ivme-development-postgres | Out-Null
    if ($LASTEXITCODE) { throw 'Start Docker Desktop to use the local production fixture.' }
    $names = @{ivme='ivme_local'; wrestling='wrestling_club_local'; arapca='arapca_local'; prepexpert='sat_local'}
    return @{Database=$names[$Project]; User="dev_$Project"; Password=(Get-FixturePassword $Project)}
}

function Set-LocalFixture([string]$Project) {
    $fixture = Get-LocalFixture $Project
    if (!$fixture) { return }
    $db = $fixture.Database
    if ($Project -eq 'wrestling') {
        $env:SPRING_DATASOURCE_URL = "jdbc:postgresql://localhost:55432/$db"
        $env:SPRING_DATASOURCE_USERNAME = $fixture.User
        $env:SPRING_DATASOURCE_PASSWORD = $fixture.Password
    } else {
        $env:DATABASE_URL = "postgresql://$($fixture.User):$($fixture.Password)@127.0.0.1:55432/$db"
        if ($Project -eq 'prepexpert') {
            $env:QB2_DATABASE_URL = "postgresql://sat_qb2:$(Get-FixturePassword 'sat_qb2')@127.0.0.1:55432/$db"
        }
    }
}
