# Creates the dedicated Inspect MySQL/MariaDB database and application user.
# Does not print passwords. Requires local root access without a password by default,
# or set MYSQL_ROOT_PASSWORD in the session.
#
# Usage:
#   .\scripts\create-inspect-mysql.ps1

$ErrorActionPreference = 'Stop'

$Mysql = 'C:\tools\mariadb-10.11\bin\mysql.exe'
if (-not (Test-Path $Mysql)) {
  $cmd = Get-Command mysql -ErrorAction SilentlyContinue
  if ($cmd) { $Mysql = $cmd.Source } else { throw 'mysql client not found' }
}

$HostName = '127.0.0.1'
$Port = '3306'
$RootUser = if ($env:MYSQL_ROOT_USER) { $env:MYSQL_ROOT_USER } else { 'root' }

function Invoke-Mysql([string[]]$ExtraArgs, [string]$Sql) {
  $args = @('-h', $HostName, '-P', $Port, '-u', $RootUser) + $ExtraArgs + @('-e', $Sql)
  & $Mysql @args
  if ($LASTEXITCODE -ne 0) { throw "mysql failed ($LASTEXITCODE)" }
}

$rootArgs = @()
if ($env:MYSQL_ROOT_PASSWORD) {
  $rootArgs = @("-p$($env:MYSQL_ROOT_PASSWORD)")
}

Write-Host 'Checking for existing inspect database/user...'
$dbCount = (Invoke-Mysql $rootArgs "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='inspect';").Trim()
$userCount = (Invoke-Mysql $rootArgs "SELECT COUNT(*) FROM mysql.user WHERE User='inspect_app';").Trim()
# mysql -N might be needed; parse last line
$dbExists = $dbCount -match '1'
$userExists = $userCount -match '1'

if ($dbExists -or $userExists) {
  throw "Conflict: inspect database or inspect_app user already exists. Refusing to overwrite."
}

if (-not $env:INSPECT_DB_PASSWORD) {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $env:INSPECT_DB_PASSWORD = ([Convert]::ToBase64String($bytes) -replace '[+/=]', 'A')
}

$PasswordLiteral = $env:INSPECT_DB_PASSWORD.Replace("'", "''")

Write-Host 'Creating database inspect and user inspect_app...'
Invoke-Mysql $rootArgs @"
CREATE DATABASE inspect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'inspect_app'@'127.0.0.1' IDENTIFIED BY '$PasswordLiteral';
CREATE USER 'inspect_app'@'localhost' IDENTIFIED BY '$PasswordLiteral';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES ON inspect.* TO 'inspect_app'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES ON inspect.* TO 'inspect_app'@'localhost';
FLUSH PRIVILEGES;
"@ | Out-Null

$Root = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $Root '.env'
if (-not (Test-Path $EnvFile)) {
  Copy-Item (Join-Path $Root '.env.example') $EnvFile
}

$escaped = [uri]::EscapeDataString($env:INSPECT_DB_PASSWORD)
$databaseUrl = "mysql://inspect_app:$escaped@127.0.0.1:3306/inspect"
$content = Get-Content $EnvFile -Raw
if ($content -match '(?m)^DATABASE_URL=.*$') {
  $content = [regex]::Replace($content, '(?m)^DATABASE_URL=.*$', "DATABASE_URL=$databaseUrl")
} else {
  $content = $content.TrimEnd() + "`r`nDATABASE_URL=$databaseUrl`r`n"
}
if ($content -match '(?m)^MYSQL_PASSWORD=.*$') {
  $content = [regex]::Replace($content, '(?m)^MYSQL_PASSWORD=.*$', "MYSQL_PASSWORD=$($env:INSPECT_DB_PASSWORD)")
}
Set-Content -Path $EnvFile -Value $content -NoNewline

Remove-Item Env:INSPECT_DB_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:MYSQL_ROOT_PASSWORD -ErrorAction SilentlyContinue

Write-Host 'Done. Database/user created. DATABASE_URL updated in .env (gitignored).'
Write-Host 'Next: npm run db:generate; npm run db:migrate:deploy'
