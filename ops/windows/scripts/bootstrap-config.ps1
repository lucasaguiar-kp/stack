[CmdletBinding()]
param(
  [string]$ProgramDataRoot = "C:\ProgramData\Khomp Stack",
  [string]$InstallRoot = $(Split-Path -Path (Split-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -Parent) -Parent)
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function New-KhompDirectory {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  New-Item -Path $Path -ItemType Directory -Force | Out-Null
}

function Get-StableSecret {
  param(
    [string]$ExistingValue
  )

  if (-not [string]::IsNullOrWhiteSpace($ExistingValue) -and $ExistingValue.Length -ge 32) {
    return $ExistingValue
  }

  $bytes = New-Object byte[] 48
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()

  try {
    $rng.GetBytes($bytes)
  } finally {
    $rng.Dispose()
  }

  return [Convert]::ToBase64String($bytes)
}

function Read-EnvFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $values = @{}

  if (-not (Test-Path -LiteralPath $Path)) {
    return $values
  }

  foreach ($line in Get-Content -LiteralPath $Path) {
    if ([string]::IsNullOrWhiteSpace($line)) {
      continue
    }

    $trimmedLine = $line.Trim()

    if ($trimmedLine.StartsWith("#")) {
      continue
    }

    $separatorIndex = $trimmedLine.IndexOf("=")

    if ($separatorIndex -lt 1) {
      continue
    }

    $key = $trimmedLine.Substring(0, $separatorIndex).Trim().TrimStart([char]0xFEFF)
    $value = $trimmedLine.Substring($separatorIndex + 1)

    $values[$key] = $value
  }

  return $values
}

function Write-EnvFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [hashtable]$Values
  )

  $lines = foreach ($key in ($Values.Keys | Sort-Object)) {
    "$key=$($Values[$key])"
  }

  $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllLines($Path, $lines, $utf8WithoutBom)
}

$programDataRootPath = [System.IO.Path]::GetFullPath($ProgramDataRoot)
$installRootPath = [System.IO.Path]::GetFullPath($InstallRoot)
$runtimeEnvPath = Join-Path $programDataRootPath "config\service-runtime.env"

$directories = @(
  $programDataRootPath,
  (Join-Path $programDataRootPath "config"),
  (Join-Path $programDataRootPath "config\\backend"),
  (Join-Path $programDataRootPath "config\\ingest"),
  (Join-Path $programDataRootPath "config\\multicast-agent"),
  (Join-Path $programDataRootPath "data"),
  (Join-Path $programDataRootPath "data\\multicast"),
  (Join-Path $programDataRootPath "data\\uploads"),
  (Join-Path $programDataRootPath "logs"),
  (Join-Path $programDataRootPath "logs\\backend"),
  (Join-Path $programDataRootPath "logs\\ingest"),
  (Join-Path $programDataRootPath "logs\\multicast-agent"),
  (Join-Path $programDataRootPath "temp")
)

foreach ($directory in $directories) {
  New-KhompDirectory -Path $directory
}

$existingRuntimeValues = Read-EnvFile -Path $runtimeEnvPath
$betterAuthSecret = Get-StableSecret -ExistingValue $existingRuntimeValues["BETTER_AUTH_SECRET"]

$runtimeValues = @{
  APP_INSTALL_DIR = $installRootPath
  BETTER_AUTH_SECRET = $betterAuthSecret
  BETTER_AUTH_URL = "http://127.0.0.1:3000"
  CORS_ORIGIN = "http://127.0.0.1:3001"
  DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/stack-pbx"
  FRONTEND_URL = "http://127.0.0.1:3001"
  INTERNAL_SERVER_URL = "http://127.0.0.1:3000"
  MQTT_BROKER_HOST = "127.0.0.1"
  MQTT_BROKER_PORT = "1883"
  MULTICAST_AGENT_HOST = "127.0.0.1"
  MULTICAST_AGENT_PORT = "3010"
  NODE_ENV = "production"
  PBX_HOST = "127.0.0.1"
  WINDOWS_PROGRAM_DATA_DIR = $programDataRootPath
  WINDOWS_PROGRAM_FILES_DIR = $installRootPath
}

foreach ($key in $existingRuntimeValues.Keys) {
  if (
    ($key -ne "BETTER_AUTH_SECRET") -and
    (-not [string]::IsNullOrWhiteSpace($existingRuntimeValues[$key]))
  ) {
    $runtimeValues[$key] = $existingRuntimeValues[$key]
  }
}

Write-EnvFile -Path $runtimeEnvPath -Values $runtimeValues

[pscustomobject]@{
  ProgramDataRoot = $programDataRootPath
  InstallRoot = $installRootPath
  RuntimeEnvPath = $runtimeEnvPath
  RuntimeValues = $runtimeValues
  CreatedDirectories = $directories
}
