[CmdletBinding()]
param(
  [string]$InstallRoot = $(Split-Path -Path (Split-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -Parent) -Parent),
  [string]$ProgramDataRoot = "C:\ProgramData\Khomp Stack",
  [string]$DatabaseName = "stack-pbx",
  [string]$DatabaseUser = "postgres",
  [string]$DatabasePassword = "postgres",
  [string]$PostgresServiceName = "postgresql-x64-16",
  [int]$PostgresPort = 5432
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-FullPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  return [System.IO.Path]::GetFullPath($Path)
}

function Assert-PathExists {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$Description
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "$Description was not found at '$Path'."
  }
}

function Wait-ServiceState {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [ValidateSet("Running", "Stopped")]
    [string]$DesiredStatus,
    [int]$TimeoutSeconds = 120,
    [int]$PollIntervalMilliseconds = 1000
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    $service = Get-Service -Name $Name -ErrorAction SilentlyContinue

    if ($service -and $service.Status.ToString() -eq $DesiredStatus) {
      return $true
    }

    Start-Sleep -Milliseconds $PollIntervalMilliseconds
  }

  throw "Service '$Name' did not reach state '$DesiredStatus' within $TimeoutSeconds seconds."
}

function Wait-TcpPort {
  param(
    [Parameter(Mandatory = $true)]
    [string]$HostName,
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [int]$TimeoutSeconds = 120,
    [int]$PollIntervalMilliseconds = 1000
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    $client = [System.Net.Sockets.TcpClient]::new()

    try {
      $asyncResult = $client.BeginConnect($HostName, $Port, $null, $null)
      if ($asyncResult.AsyncWaitHandle.WaitOne(1000)) {
        $client.EndConnect($asyncResult)
        return $true
      }
    } catch {
      Start-Sleep -Milliseconds $PollIntervalMilliseconds
    } finally {
      $client.Dispose()
    }
  }

  throw "TCP port '$HostName`:$Port' did not become available within $TimeoutSeconds seconds."
}

function Resolve-PostgresBinDirectory {
  $candidates = @(
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\17\bin",
    "C:\Program Files\PostgreSQL\18\bin"
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath (Join-Path $candidate "psql.exe")) {
      return $candidate
    }
  }

  $psql = Get-Command "psql.exe" -ErrorAction SilentlyContinue

  if ($psql) {
    return Split-Path -Path $psql.Source -Parent
  }

  throw "Unable to locate PostgreSQL psql.exe after installation."
}

function Install-PostgresIfMissing {
  param(
    [Parameter(Mandatory = $true)]
    [string]$InstallRootPath
  )

  $existingService = Get-Service -Name $PostgresServiceName -ErrorAction SilentlyContinue

  if ($existingService) {
    if ($existingService.Status.ToString() -ne "Running") {
      Start-Service -Name $PostgresServiceName
    }

    $null = Wait-ServiceState -Name $PostgresServiceName -DesiredStatus "Running"
    return $false
  }

  $installerPath = Join-Path $InstallRootPath "vendor\postgresql\postgresql-16.13-3-windows-x64.exe"
  Assert-PathExists -Path $installerPath -Description "PostgreSQL installer"

  $arguments = @(
    "--mode", "unattended",
    "--unattendedmodeui", "none",
    "--disable-components", "pgAdmin,stackbuilder",
    "--superpassword", $DatabasePassword,
    "--servicename", $PostgresServiceName,
    "--serverport", [string]$PostgresPort
  )

  $process = Start-Process -FilePath $installerPath -ArgumentList $arguments -Wait -PassThru

  if ($process.ExitCode -ne 0) {
    throw "PostgreSQL installer exited with code $($process.ExitCode)."
  }

  $null = Wait-ServiceState -Name $PostgresServiceName -DesiredStatus "Running"
  return $true
}

function Invoke-PostgresCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ExecutablePath,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $previousPassword = $env:PGPASSWORD
  $env:PGPASSWORD = $DatabasePassword

  try {
    & $ExecutablePath @Arguments

    if ($LASTEXITCODE -ne 0) {
      throw "'$ExecutablePath $($Arguments -join ' ')' failed with exit code $LASTEXITCODE."
    }
  } finally {
    $env:PGPASSWORD = $previousPassword
  }
}

function Invoke-PostgresScalar {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PsqlPath,
    [Parameter(Mandatory = $true)]
    [string]$Sql,
    [string]$Database = "postgres"
  )

  $previousPassword = $env:PGPASSWORD
  $env:PGPASSWORD = $DatabasePassword

  try {
    $output = & $PsqlPath `
      -h "127.0.0.1" `
      -p $PostgresPort `
      -U $DatabaseUser `
      -d $Database `
      -tAc $Sql

    if ($LASTEXITCODE -ne 0) {
      throw "psql scalar command failed with exit code $LASTEXITCODE."
    }

    $firstLine = $output | Select-Object -First 1
    if ($null -eq $firstLine) {
      return ""
    }

    return ([string]$firstLine).Trim()
  } finally {
    $env:PGPASSWORD = $previousPassword
  }
}

$installRootPath = Get-FullPath -Path $InstallRoot
$programDataRootPath = Get-FullPath -Path $ProgramDataRoot
$schemaPath = Join-Path $installRootPath "ops\windows\db\schema.sql"

Assert-PathExists -Path $schemaPath -Description "Database schema"

$installedPostgres = Install-PostgresIfMissing -InstallRootPath $installRootPath
$null = Wait-TcpPort -HostName "127.0.0.1" -Port $PostgresPort

$postgresBinDirectory = Resolve-PostgresBinDirectory
$psqlPath = Join-Path $postgresBinDirectory "psql.exe"
$createdbPath = Join-Path $postgresBinDirectory "createdb.exe"

$databaseExists = Invoke-PostgresScalar `
  -PsqlPath $psqlPath `
  -Database "postgres" `
  -Sql "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName';"

if ($databaseExists -ne "1") {
  Invoke-PostgresCommand `
    -ExecutablePath $createdbPath `
    -Arguments @("-h", "127.0.0.1", "-p", [string]$PostgresPort, "-U", $DatabaseUser, $DatabaseName)
}

$userTableExists = Invoke-PostgresScalar `
  -PsqlPath $psqlPath `
  -Database $DatabaseName `
  -Sql "SELECT to_regclass('public.user') IS NOT NULL;"

if ($userTableExists -ne "t") {
  Invoke-PostgresCommand `
    -ExecutablePath $psqlPath `
    -Arguments @("-h", "127.0.0.1", "-p", [string]$PostgresPort, "-U", $DatabaseUser, "-d", $DatabaseName, "-f", $schemaPath)
}

[pscustomobject]@{
  InstalledPostgres = $installedPostgres
  PostgresServiceName = $PostgresServiceName
  PostgresBinDirectory = $postgresBinDirectory
  DatabaseName = $DatabaseName
  SchemaPath = $schemaPath
  ProgramDataRoot = $programDataRootPath
}
