[CmdletBinding()]
param(
  [string]$ProgramDataRoot = "C:\ProgramData\Khomp Stack",
  [string]$InstallRoot = $(Split-Path -Path (Split-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -Parent) -Parent),
  [string]$AppVersion = "0.0.0"
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

function Get-StableHexSecret {
  param(
    [string]$ExistingValue,
    [int]$ByteLength = 16
  )

  if (-not [string]::IsNullOrWhiteSpace($ExistingValue) -and $ExistingValue.Length -ge 8) {
    return $ExistingValue
  }

  $bytes = New-Object byte[] $ByteLength
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()

  try {
    $rng.GetBytes($bytes)
  } finally {
    $rng.Dispose()
  }

  return (($bytes | ForEach-Object { $_.ToString("x2") }) -join "")
}

function Test-PrivateIPv4 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$IPAddress
  )

  return (
    ($IPAddress -match '^10\.') -or
    ($IPAddress -match '^192\.168\.') -or
    ($IPAddress -match '^172\.(1[6-9]|2[0-9]|3[0-1])\.')
  )
}

function Test-LocalOnlyIPv4 {
  param(
    [AllowEmptyString()]
    [string]$IPAddress
  )

  if ([string]::IsNullOrWhiteSpace($IPAddress)) {
    return $true
  }

  if ($IPAddress -match '^(127\.|0\.|169\.254\.)') {
    return $true
  }

  return $false
}

function Get-PreferredLanIPv4 {
  $candidates = @()

  try {
    foreach ($config in (Get-NetIPConfiguration -ErrorAction Stop)) {
      $adapterStatus = $null

      if ($config.NetAdapter) {
        $adapterStatus = $config.NetAdapter.Status
      }

      if ($adapterStatus -and ($adapterStatus.ToString() -ne "Up")) {
        continue
      }

      $hasGateway = $null -ne $config.IPv4DefaultGateway

      foreach ($address in @($config.IPv4Address)) {
        if (-not $address.IPAddress) {
          continue
        }

        $candidates += [pscustomobject]@{
          IPAddress = [string]$address.IPAddress
          HasGateway = $hasGateway
          AddressState = "Preferred"
        }
      }
    }
  } catch {
    Write-Warning "Failed to inspect network configuration: $($_.Exception.Message)"
  }

  if ($candidates.Count -eq 0) {
    try {
      $candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
        Where-Object { $_.AddressState.ToString() -eq "Preferred" } |
        ForEach-Object {
          [pscustomobject]@{
            IPAddress = [string]$_.IPAddress
            HasGateway = $false
            AddressState = $_.AddressState.ToString()
          }
        }
    } catch {
      Write-Warning "Failed to inspect IPv4 addresses: $($_.Exception.Message)"
    }
  }

  $selected = $candidates |
    Where-Object { (Test-PrivateIPv4 -IPAddress $_.IPAddress) -and (-not (Test-LocalOnlyIPv4 -IPAddress $_.IPAddress)) } |
    Sort-Object -Property @{ Expression = "HasGateway"; Descending = $true }, @{ Expression = "IPAddress"; Descending = $false } |
    Select-Object -First 1

  if ($selected) {
    return [string]$selected.IPAddress
  }

  return "127.0.0.1"
}

function Resolve-RuntimeHostValue {
  param(
    [hashtable]$ExistingValues,
    [string]$Key,
    [string]$DetectedLanIPv4
  )

  # Network addresses are environment-derived. Reusing an old LAN IP after the
  # user changes networks makes MQTT/SIP provisioning point devices at a dead host.
  return $DetectedLanIPv4
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
$detectedLanIPv4 = Get-PreferredLanIPv4
$pbxHost = Resolve-RuntimeHostValue -ExistingValues $existingRuntimeValues -Key "PBX_HOST" -DetectedLanIPv4 $detectedLanIPv4
$mqttBrokerHost = Resolve-RuntimeHostValue -ExistingValues $existingRuntimeValues -Key "MQTT_BROKER_HOST" -DetectedLanIPv4 $pbxHost
$mqttBrokerUsername = if (
  $existingRuntimeValues.ContainsKey("MQTT_BROKER_USERNAME") -and
  (-not [string]::IsNullOrWhiteSpace($existingRuntimeValues["MQTT_BROKER_USERNAME"]))
) {
  [string]$existingRuntimeValues["MQTT_BROKER_USERNAME"]
} else {
  "khomp"
}
$mqttBrokerPassword = Get-StableHexSecret -ExistingValue $existingRuntimeValues["MQTT_BROKER_PASSWORD"] -ByteLength 12
$freeSwitchEventSocketPassword = Get-StableHexSecret -ExistingValue $existingRuntimeValues["FREESWITCH_ESL_PASSWORD"] -ByteLength 12
$mqttBrokerPort = if (
  $existingRuntimeValues.ContainsKey("MQTT_BROKER_PORT") -and
  (-not [string]::IsNullOrWhiteSpace($existingRuntimeValues["MQTT_BROKER_PORT"]))
) {
  [string]$existingRuntimeValues["MQTT_BROKER_PORT"]
} else {
  "1883"
}

$runtimeValues = @{
  APP_INSTALL_DIR = $installRootPath
  APP_VERSION = $AppVersion
  APP_GIT_REMOTE_URL = "https://github.com/lucasaguiar-kp/stack.git"
  APP_GIT_BRANCH = "main"
  BETTER_AUTH_SECRET = $betterAuthSecret
  BETTER_AUTH_URL = "http://127.0.0.1:3000"
  CORS_ORIGIN = "http://127.0.0.1:3001"
  DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/stack-pbx"
  FFMPEG_PATH = (Join-Path $installRootPath "ffmpeg\ffmpeg.exe")
  FRONTEND_URL = "http://127.0.0.1:3001"
  INTERNAL_SERVER_URL = "http://127.0.0.1:3000"
  PBX_PROVIDER = "freeswitch"
  FREESWITCH_AUTO_PROVISION = "true"
  FREESWITCH_CONFIG_DIR = (Join-Path $programDataRootPath "config\freeswitch")
  FREESWITCH_DIALPLAN_DIR = (Join-Path $programDataRootPath "config\freeswitch\dialplan\default")
  FREESWITCH_DIRECTORY_DIR = (Join-Path $programDataRootPath "config\freeswitch\directory\default")
  FREESWITCH_DOMAIN = $pbxHost
  FREESWITCH_ESL_HOST = "127.0.0.1"
  FREESWITCH_ESL_PASSWORD = $freeSwitchEventSocketPassword
  FREESWITCH_ESL_PORT = "8021"
  FREESWITCH_RTP_END_PORT = "10100"
  FREESWITCH_RTP_START_PORT = "10000"
  FREESWITCH_SIP_PORT = "5060"
  FREESWITCH_WS_PORT = "5066"
  MQTT_BROKER_HOST = $mqttBrokerHost
  MQTT_BROKER_PASSWORD = $mqttBrokerPassword
  MQTT_BROKER_PORT = $mqttBrokerPort
  MQTT_BROKER_USERNAME = $mqttBrokerUsername
  MQTT_PUBLIC_URL = "mqtt://${mqttBrokerHost}:${mqttBrokerPort}"
  MULTICAST_ADDRESS_BASE = "239.255.0"
  MULTICAST_AGENT_HOST = "127.0.0.1"
  MULTICAST_AGENT_PORT = "3010"
  MULTICAST_LOCAL_ADDR = $pbxHost
  MULTICAST_RTP_PAYLOAD_SIZE = "160"
  MULTICAST_TTL = "32"
  NODE_ENV = "production"
  PBX_HOST = $pbxHost
  PORT = "3000"
  WINDOWS_PROGRAM_DATA_DIR = $programDataRootPath
  WINDOWS_PROGRAM_FILES_DIR = $installRootPath
}

foreach ($key in $existingRuntimeValues.Keys) {
  if (
    ($key -ne "BETTER_AUTH_SECRET") -and
    ($key -ne "FFMPEG_PATH") -and
    ($key -ne "MQTT_BROKER_HOST") -and
    ($key -ne "MQTT_BROKER_PASSWORD") -and
    ($key -ne "MQTT_BROKER_PORT") -and
    ($key -ne "MQTT_BROKER_USERNAME") -and
    ($key -ne "MQTT_PUBLIC_URL") -and
    ($key -ne "MULTICAST_ADDRESS_BASE") -and
    ($key -ne "MULTICAST_AGENT_HOST") -and
    ($key -ne "MULTICAST_AGENT_PORT") -and
    ($key -ne "MULTICAST_LOCAL_ADDR") -and
    ($key -ne "MULTICAST_RTP_PAYLOAD_SIZE") -and
    ($key -ne "MULTICAST_TTL") -and
    ($key -ne "PBX_HOST") -and
    ($key -ne "PBX_PROVIDER") -and
    ($key -ne "FREESWITCH_AUTO_PROVISION") -and
    ($key -ne "FREESWITCH_CONFIG_DIR") -and
    ($key -ne "FREESWITCH_DIALPLAN_DIR") -and
    ($key -ne "FREESWITCH_DIRECTORY_DIR") -and
    ($key -ne "FREESWITCH_DOMAIN") -and
    ($key -ne "FREESWITCH_ESL_HOST") -and
    ($key -ne "FREESWITCH_ESL_PASSWORD") -and
    ($key -ne "FREESWITCH_ESL_PORT") -and
    ($key -ne "FREESWITCH_RTP_END_PORT") -and
    ($key -ne "FREESWITCH_RTP_START_PORT") -and
    ($key -ne "FREESWITCH_SIP_PORT") -and
    ($key -ne "FREESWITCH_WS_PORT") -and
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
