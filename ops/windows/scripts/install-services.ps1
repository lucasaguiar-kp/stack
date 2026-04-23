[CmdletBinding()]
param(
  [string]$InstallRoot = $(Split-Path -Path (Split-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -Parent) -Parent),
  [string]$ProgramDataRoot = "C:\ProgramData\Khomp Stack",
  [string]$WinSWExecutablePath = ""
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

function ConvertTo-XmlAttributeValue {
  param(
    [Parameter(Mandatory = $true)]
    [AllowEmptyString()]
    [string]$Value
  )

  return [System.Security.SecurityElement]::Escape($Value)
}

function Read-EnvFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $values = @{}

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

function ConvertTo-WinSWEnvEntries {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Values
  )

  $lines = foreach ($key in ($Values.Keys | Sort-Object)) {
    "  <env name=""$(ConvertTo-XmlAttributeValue -Value $key)"" value=""$(ConvertTo-XmlAttributeValue -Value ([string]$Values[$key]))"" />"
  }

  return ($lines -join [Environment]::NewLine)
}

function Render-WinSWTemplate {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TemplatePath,
    [Parameter(Mandatory = $true)]
    [string]$DestinationPath,
    [Parameter(Mandatory = $true)]
    [hashtable]$Tokens
  )

  $content = Get-Content -LiteralPath $TemplatePath -Raw

  foreach ($key in $Tokens.Keys) {
    $content = $content.Replace($key, $Tokens[$key])
  }

  Set-Content -LiteralPath $DestinationPath -Value $content -Encoding UTF8
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

function Resolve-WinSWExecutablePath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$InstallRootPath,
    [Parameter(Mandatory = $true)]
    [string]$ScriptRootPath,
    [string]$RequestedPath
  )

  $candidates = @()

  if (-not [string]::IsNullOrWhiteSpace($RequestedPath)) {
    $candidates += (Get-FullPath -Path $RequestedPath)
  }

  $candidates += @(
    (Get-FullPath -Path (Join-Path $InstallRootPath "vendor\winsw\WinSW-x64.exe")),
    (Get-FullPath -Path (Join-Path $InstallRootPath "vendor\winsw\winsw-x64.exe")),
    (Get-FullPath -Path (Join-Path $InstallRootPath "winsw\WinSW-x64.exe")),
    (Get-FullPath -Path (Join-Path $InstallRootPath "ops\windows\vendor\winsw\WinSW-x64.exe")),
    (Get-FullPath -Path (Join-Path $ScriptRootPath "..\vendor\winsw\WinSW-x64.exe"))
  ) | Select-Object -Unique

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  $candidateList = $candidates | ForEach-Object { " - $_" }
  $message = @(
    "Unable to locate WinSW-x64.exe."
    "Looked in:"
    $candidateList
    "Pass -WinSWExecutablePath explicitly or ensure the installer places WinSW in one of the expected package locations."
  ) -join [Environment]::NewLine

  throw $message
}

function Install-KhompService {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Service,
    [Parameter(Mandatory = $true)]
    [string]$InstallRootPath,
    [Parameter(Mandatory = $true)]
    [string]$ProgramDataRootPath,
    [Parameter(Mandatory = $true)]
    [string]$WinSWPath,
    [Parameter(Mandatory = $true)]
    [hashtable]$RuntimeValues
  )

  Assert-PathExists -Path $Service.BinaryPath -Description "$($Service.Id) executable"
  Assert-PathExists -Path $Service.TemplatePath -Description "$($Service.Id) WinSW template"

  $serviceRoot = Join-Path $InstallRootPath "services\\$($Service.Id)"
  $serviceExecutablePath = Join-Path $serviceRoot "$($Service.Id).exe"
  $serviceConfigPath = Join-Path $serviceRoot "$($Service.Id).xml"
  $serviceLogPath = Join-Path $ProgramDataRootPath "logs\\$($Service.LogDirectory)"

  New-Item -Path $serviceRoot -ItemType Directory -Force | Out-Null
  New-Item -Path $serviceLogPath -ItemType Directory -Force | Out-Null

  Copy-Item -LiteralPath $WinSWPath -Destination $serviceExecutablePath -Force

  Render-WinSWTemplate -TemplatePath $Service.TemplatePath -DestinationPath $serviceConfigPath -Tokens @{
    "__INSTALL_ROOT__" = $InstallRootPath
    "__PROGRAM_DATA_ROOT__" = $ProgramDataRootPath
    "__ENV_ENTRIES__" = (ConvertTo-WinSWEnvEntries -Values $RuntimeValues)
  }

  if (Get-Service -Name $Service.Id -ErrorAction SilentlyContinue) {
    try {
      Stop-Service -Name $Service.Id -ErrorAction Stop
      Wait-ServiceState -Name $Service.Id -DesiredStatus "Stopped"
    } catch {
      Write-Warning "Failed to stop existing service '$($Service.Id)': $($_.Exception.Message)"
    }

    & $serviceExecutablePath uninstall | Out-Null
    Wait-ServiceState -Name $Service.Id -DesiredStatus "Stopped" -AllowMissing
  }

  & $serviceExecutablePath install | Out-Null
  Start-Service -Name $Service.Id
  Wait-ServiceState -Name $Service.Id -DesiredStatus "Running"

  [pscustomobject]@{
    ServiceId = $Service.Id
    WrapperExecutable = $serviceExecutablePath
    WrapperConfig = $serviceConfigPath
    ServiceRoot = $serviceRoot
  }
}

$installRootPath = Get-FullPath -Path $InstallRoot
$programDataRootPath = Get-FullPath -Path $ProgramDataRoot
$resolvedWinSWPath = Resolve-WinSWExecutablePath `
  -InstallRootPath $installRootPath `
  -ScriptRootPath $PSScriptRoot `
  -RequestedPath $WinSWExecutablePath

$bootstrapScriptPath = Join-Path $PSScriptRoot "bootstrap-config.ps1"
Assert-PathExists -Path $bootstrapScriptPath -Description "Bootstrap script"

$bootstrapResult = & $bootstrapScriptPath -ProgramDataRoot $programDataRootPath -InstallRoot $installRootPath
$runtimeEnvPath = Join-Path $programDataRootPath "config\service-runtime.env"
Assert-PathExists -Path $runtimeEnvPath -Description "Service runtime env file"
$runtimeValues = Read-EnvFile -Path $runtimeEnvPath

$services = @(
  @{
    Id = "KhompStack-Backend"
    TemplatePath = Get-FullPath -Path (Join-Path $installRootPath "ops\\windows\\winsw\\backend.xml")
    BinaryPath = Get-FullPath -Path (Join-Path $installRootPath "backend\\server.exe")
    LogDirectory = "backend"
  },
  @{
    Id = "KhompStack-Ingest"
    TemplatePath = Get-FullPath -Path (Join-Path $installRootPath "ops\\windows\\winsw\\ingest.xml")
    BinaryPath = Get-FullPath -Path (Join-Path $installRootPath "ingest\\ingest.exe")
    LogDirectory = "ingest"
  },
  @{
    Id = "KhompStack-MulticastAgent"
    TemplatePath = Get-FullPath -Path (Join-Path $installRootPath "ops\\windows\\winsw\\multicast-agent.xml")
    BinaryPath = Get-FullPath -Path (Join-Path $installRootPath "multicast-agent\\multicast-agent.exe")
    LogDirectory = "multicast-agent"
  }
)

$installedServices = foreach ($service in $services) {
  Install-KhompService `
    -Service $service `
    -InstallRootPath $installRootPath `
    -ProgramDataRootPath $programDataRootPath `
    -WinSWPath $resolvedWinSWPath `
    -RuntimeValues $runtimeValues
}

[pscustomobject]@{
  RuntimeEnvPath = $runtimeEnvPath
  RuntimeValues = $runtimeValues
  WinSWPath = $resolvedWinSWPath
  BootstrapResult = $bootstrapResult
  InstalledServices = $installedServices
}
