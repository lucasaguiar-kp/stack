[CmdletBinding()]
param(
  [string]$InstallRoot = $(Split-Path -Path (Split-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -Parent) -Parent)
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

function Wait-ServiceState {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [ValidateSet("Running", "Stopped")]
    [string]$DesiredStatus,
    [int]$TimeoutSeconds = 30,
    [int]$PollIntervalMilliseconds = 500,
    [switch]$AllowMissing
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    $service = Get-Service -Name $Name -ErrorAction SilentlyContinue

    if (-not $service) {
      if ($AllowMissing -or ($DesiredStatus -eq "Stopped")) {
        return $true
      }

      Start-Sleep -Milliseconds $PollIntervalMilliseconds
      continue
    }

    if ($service.Status.ToString() -eq $DesiredStatus) {
      return $true
    }

    Start-Sleep -Milliseconds $PollIntervalMilliseconds
  }

  throw "Service '$Name' did not reach state '$DesiredStatus' within $TimeoutSeconds seconds."
}

function Uninstall-KhompService {
  param(
    [Parameter(Mandatory = $true)]
    [string]$InstallRootPath,
    [Parameter(Mandatory = $true)]
    [string]$ServiceId
  )

  $wrapperExecutable = Join-Path $InstallRootPath "services\\$ServiceId\\$ServiceId.exe"
  $wrapperConfig = Join-Path $InstallRootPath "services\\$ServiceId\\$ServiceId.xml"
  $serviceRoot = Split-Path -Path $wrapperExecutable -Parent

  if (Get-Service -Name $ServiceId -ErrorAction SilentlyContinue) {
    Stop-Service -Name $ServiceId -ErrorAction SilentlyContinue
    Wait-ServiceState -Name $ServiceId -DesiredStatus "Stopped" -AllowMissing
  }

  if (Test-Path -LiteralPath $wrapperExecutable) {
    & $wrapperExecutable uninstall | Out-Null
    Wait-ServiceState -Name $ServiceId -DesiredStatus "Stopped" -AllowMissing
  }

  if (Test-Path -LiteralPath $serviceRoot) {
    Remove-Item -LiteralPath $serviceRoot -Recurse -Force
  }

  [pscustomobject]@{
    ServiceId = $ServiceId
    RemovedWrapperExecutable = -not (Test-Path -LiteralPath $wrapperExecutable)
    RemovedWrapperConfig = -not (Test-Path -LiteralPath $wrapperConfig)
  }
}

$installRootPath = Get-FullPath -Path $InstallRoot
$serviceIds = @(
  "KhompStack-MulticastAgent",
  "KhompStack-Ingest",
  "KhompStack-Backend",
  "KhompStack-FreeSWITCH",
  "KhompStack-Asterisk",
  "KhompStack-Mqtt"
)

$serviceIds | ForEach-Object {
  Uninstall-KhompService -InstallRootPath $installRootPath -ServiceId $_
}
