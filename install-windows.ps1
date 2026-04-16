Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Fail {
  param([string]$Message)
  Write-Host ""
  Write-Host "ERRO: $Message" -ForegroundColor Red
  exit 1
}

function Get-ProjectRoot {
  return Split-Path -Parent $MyInvocation.PSCommandPath
}

function Test-DockerAvailable {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    return $false
  }

  try {
    $null = & docker version 2>$null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

function Test-DockerComposeAvailable {
  try {
    $null = & docker compose version 2>$null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

function Test-DockerRunning {
  try {
    $null = & docker info 2>$null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

function Test-GitAvailable {
  return $null -ne (Get-Command git -ErrorAction SilentlyContinue)
}

function Test-GitRepository {
  param([string]$ProjectRoot)

  if (-not (Test-GitAvailable)) {
    return $false
  }

  try {
    $null = & git -C $ProjectRoot rev-parse --is-inside-work-tree 2>$null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

function Get-GitValue {
  param(
    [string]$ProjectRoot,
    [string[]]$Args
  )

  try {
    $result = & git -C $ProjectRoot @Args 2>$null
    if ($LASTEXITCODE -eq 0) {
      return ($result | Out-String).Trim()
    }
  } catch {
  }

  return $null
}

function Get-PrimaryIPv4Address {
  try {
    $defaultRoute = Get-NetRoute -DestinationPrefix "0.0.0.0/0" |
      Sort-Object RouteMetric, InterfaceMetric |
      Select-Object -First 1

    if ($null -ne $defaultRoute) {
      $ip = Get-NetIPAddress -InterfaceIndex $defaultRoute.InterfaceIndex -AddressFamily IPv4 |
        Where-Object {
          $_.IPAddress -ne "127.0.0.1" -and
          $_.IPAddress -notlike "169.254*" -and
          $_.PrefixOrigin -ne "WellKnown"
        } |
        Select-Object -First 1 -ExpandProperty IPAddress

      if (-not [string]::IsNullOrWhiteSpace($ip)) {
        return $ip
      }
    }
  } catch {
  }

  try {
    $candidate = Get-NetIPAddress -AddressFamily IPv4 |
      Where-Object {
        $_.IPAddress -ne "127.0.0.1" -and
        $_.IPAddress -notlike "169.254*" -and
        $_.SkipAsSource -eq $false
      } |
      Select-Object -First 1 -ExpandProperty IPAddress

    if (-not [string]::IsNullOrWhiteSpace($candidate)) {
      return $candidate
    }
  } catch {
  }

  Fail "Nao foi possivel detectar o IPv4 principal desta maquina."
}

function New-RandomSecret {
  $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  $bytes = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)

  $builder = New-Object System.Text.StringBuilder
  foreach ($byte in $bytes) {
    [void]$builder.Append($chars[$byte % $chars.Length])
  }

  return $builder.ToString()
}

function Get-EnvLines {
  param([string]$EnvPath)

  if (Test-Path $EnvPath) {
    return [System.Collections.Generic.List[string]](Get-Content $EnvPath)
  }

  return [System.Collections.Generic.List[string]]::new()
}

function Set-EnvValue {
  param(
    [System.Collections.Generic.List[string]]$Lines,
    [string]$Key,
    [string]$Value
  )

  $prefix = "$Key="
  for ($index = 0; $index -lt $Lines.Count; $index++) {
    if ($Lines[$index].StartsWith($prefix)) {
      $Lines[$index] = "$Key=$Value"
      return
    }
  }

  [void]$Lines.Add("$Key=$Value")
}

function Get-ExistingEnvValue {
  param(
    [System.Collections.Generic.List[string]]$Lines,
    [string]$Key
  )

  $prefix = "$Key="
  foreach ($line in $Lines) {
    if ($line.StartsWith($prefix)) {
      return $line.Substring($prefix.Length)
    }
  }

  return $null
}

$projectRoot = Get-ProjectRoot
$envExamplePath = Join-Path $projectRoot ".env.example"
$envPath = Join-Path $projectRoot ".env"

Write-Step "Validando pre-requisitos"

if (-not (Test-Path $envExamplePath)) {
  Fail "Arquivo .env.example nao encontrado em $projectRoot"
}

if (-not (Test-DockerAvailable)) {
  Fail @"
Docker Desktop nao foi encontrado.

Instale primeiro o Docker Desktop para Windows:
https://www.docker.com/products/docker-desktop/

Depois abra o Docker Desktop e execute este script novamente.
"@
}

if (-not (Test-DockerComposeAvailable)) {
  Fail "O comando 'docker compose' nao esta disponivel nesta instalacao."
}

if (-not (Test-DockerRunning)) {
  Fail @"
Docker Desktop foi encontrado, mas nao esta em execucao.

Abra o Docker Desktop, aguarde ele ficar pronto e execute este script novamente.
"@
}

Write-Step "Detectando o IP principal da maquina"
$primaryIp = Get-PrimaryIPv4Address
Write-Host "IP detectado: $primaryIp" -ForegroundColor Green

Write-Step "Preparando o arquivo .env"

if (-not (Test-Path $envPath)) {
  Copy-Item $envExamplePath $envPath
  Write-Host ".env criado a partir do .env.example" -ForegroundColor Green
} else {
  $backupPath = "$envPath.backup"
  Copy-Item $envPath $backupPath -Force
  Write-Host "Backup atualizado em $backupPath" -ForegroundColor Yellow
}

$lines = Get-EnvLines -EnvPath $envPath
$currentSecret = Get-ExistingEnvValue -Lines $lines -Key "BETTER_AUTH_SECRET"

if ([string]::IsNullOrWhiteSpace($currentSecret) -or $currentSecret -eq "replace-with-at-least-32-characters") {
  Set-EnvValue -Lines $lines -Key "BETTER_AUTH_SECRET" -Value (New-RandomSecret)
}

Set-EnvValue -Lines $lines -Key "BETTER_AUTH_URL" -Value "http://$primaryIp`:3000"
Set-EnvValue -Lines $lines -Key "CORS_ORIGIN" -Value "http://$primaryIp`:3001"
Set-EnvValue -Lines $lines -Key "FRONTEND_URL" -Value "http://$primaryIp`:3001"
Set-EnvValue -Lines $lines -Key "VITE_SERVER_URL" -Value "http://$primaryIp`:3000"
Set-EnvValue -Lines $lines -Key "APP_INSTALL_DIR" -Value $projectRoot
Set-EnvValue -Lines $lines -Key "PBX_HOST" -Value $primaryIp
Set-EnvValue -Lines $lines -Key "MQTT_PUBLIC_URL" -Value "mqtt://$primaryIp`:1883"
Set-EnvValue -Lines $lines -Key "ASTERISK_DEVICE_HOST" -Value $primaryIp

if (Test-GitRepository -ProjectRoot $projectRoot) {
  $gitRemoteUrl = Get-GitValue -ProjectRoot $projectRoot -Args @("remote", "get-url", "origin")
  $gitBranch = Get-GitValue -ProjectRoot $projectRoot -Args @("rev-parse", "--abbrev-ref", "HEAD")
  $gitCommit = Get-GitValue -ProjectRoot $projectRoot -Args @("rev-parse", "HEAD")

  if (-not [string]::IsNullOrWhiteSpace($gitRemoteUrl)) {
    Set-EnvValue -Lines $lines -Key "APP_GIT_REMOTE_URL" -Value $gitRemoteUrl
  }

  if (-not [string]::IsNullOrWhiteSpace($gitBranch)) {
    Set-EnvValue -Lines $lines -Key "APP_GIT_BRANCH" -Value $gitBranch
  }

  if (-not [string]::IsNullOrWhiteSpace($gitCommit)) {
    Set-EnvValue -Lines $lines -Key "APP_CURRENT_COMMIT" -Value $gitCommit
  }
}

[System.IO.File]::WriteAllLines($envPath, $lines)
Write-Host ".env atualizado com sucesso" -ForegroundColor Green

Write-Step "Subindo os containers"
Push-Location $projectRoot
try {
  & docker compose up -d --build
  if ($LASTEXITCODE -ne 0) {
    Fail "Falha ao subir o docker compose."
  }
} finally {
  Pop-Location
}

$webUrl = "http://$primaryIp`:3001"

Write-Step "Instalacao concluida"
Write-Host "A aplicacao foi iniciada." -ForegroundColor Green
Write-Host "Acesse: $webUrl" -ForegroundColor Green

try {
  Start-Process $webUrl | Out-Null
} catch {
  Write-Host "Nao foi possivel abrir o navegador automaticamente." -ForegroundColor Yellow
}
