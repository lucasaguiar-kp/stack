[CmdletBinding()]
param(
  [string]$InstallRoot = "C:\Program Files\Khomp Stack",
  [string]$ProgramDataRoot = "C:\ProgramData\Khomp Stack"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

function Test-PathStatus {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  [pscustomobject]@{
    Path = $Path
    Exists = Test-Path -LiteralPath $Path
  }
}

function Test-TcpPort {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  $processes = foreach ($connection in @($connections)) {
    $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
    [pscustomobject]@{
      LocalAddress = $connection.LocalAddress
      LocalPort = $connection.LocalPort
      ProcessId = $connection.OwningProcess
      ProcessName = $process.ProcessName
      Path = $process.Path
    }
  }

  [pscustomobject]@{
    Port = $Port
    Listening = @($connections).Count -gt 0
    Processes = @($processes)
  }
}

function Get-LogTail {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [int]$Tail = 80
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return [pscustomobject]@{
      Path = $Path
      Exists = $false
      Tail = ""
    }
  }

  [pscustomobject]@{
    Path = $Path
    Exists = $true
    Tail = (Get-Content -LiteralPath $Path -Tail $Tail -ErrorAction SilentlyContinue) -join [Environment]::NewLine
  }
}

$serviceNames = @(
  "KhompStack-Backend",
  "KhompStack-Mqtt",
  "KhompStack-FreeSWITCH",
  "KhompStack-Ingest",
  "KhompStack-MulticastAgent",
  "postgresql-x64-16"
)

$services = foreach ($name in $serviceNames) {
  $service = Get-Service -Name $name -ErrorAction SilentlyContinue
  [pscustomobject]@{
    Name = $name
    Found = $null -ne $service
    Status = if ($service) { $service.Status.ToString() } else { "NOT_FOUND" }
  }
}

$requiredFiles = @(
  "app\Khomp Stack Desktop.exe",
  "app\resources\app\main.js",
  "backend\server.exe",
  "ingest\ingest.exe",
  "multicast-agent\multicast-agent.exe",
  "multicast-agent\rtp-sender.exe",
  "ffmpeg\ffmpeg.exe",
  "freeswitch\FreeSwitchConsole.exe",
  "mqtt\mosquitto\mosquitto.exe",
  "vendor\postgresql\postgresql-16.13-3-windows-x64.exe",
  "vendor\winsw\WinSW-x64.exe"
) | ForEach-Object { Test-PathStatus -Path (Join-Path $InstallRoot $_) }

$ports = foreach ($port in @(3000, 3001, 3010, 5432, 1883, 8021, 5060, 5066)) {
  Test-TcpPort -Port $port
}

$health = $null
try {
  $health = Invoke-WebRequest -Uri "http://127.0.0.1:3000/" -UseBasicParsing -TimeoutSec 5 |
    Select-Object -ExpandProperty Content
} catch {
  $health = $_.Exception.Message
}

$diagnostic = [pscustomobject]@{
  GeneratedAt = (Get-Date).ToString("o")
  InstallRoot = $InstallRoot
  ProgramDataRoot = $ProgramDataRoot
  Services = @($services)
  Ports = @($ports)
  BackendHealth = $health
  RequiredFiles = @($requiredFiles)
  RuntimeEnvExists = Test-Path -LiteralPath (Join-Path $ProgramDataRoot "config\service-runtime.env")
  Logs = @(
    Get-LogTail -Path (Join-Path $ProgramDataRoot "logs\install-services.log")
    Get-LogTail -Path (Join-Path $ProgramDataRoot "logs\backend\KhompStack-Backend.err.log")
    Get-LogTail -Path (Join-Path $ProgramDataRoot "logs\backend\KhompStack-Backend.out.log")
  )
}

$outputPath = Join-Path $env:TEMP "khomp-stack-diagnostic.json"
$diagnostic | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $outputPath -Encoding UTF8

Write-Host "Diagnostic written to: $outputPath"
Get-Content -LiteralPath $outputPath
