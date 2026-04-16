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

function Get-GitValue {
  param(
    [string]$ProjectRoot,
    [string[]]$Args
  )

  $result = & git -C $ProjectRoot @Args 2>$null
  if ($LASTEXITCODE -ne 0) {
    return $null
  }

  return ($result | Out-String).Trim()
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

$projectRoot = Get-ProjectRoot
$envPath = Join-Path $projectRoot ".env"

Write-Step "Validando ambiente"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Fail "Git nao foi encontrado. Instale o Git para Windows antes de atualizar."
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Fail "Docker Desktop nao foi encontrado."
}

try {
  $null = & docker info 2>$null
  if ($LASTEXITCODE -ne 0) {
    Fail "Docker Desktop foi encontrado, mas nao esta em execucao."
  }
} catch {
  Fail "Docker Desktop foi encontrado, mas nao esta em execucao."
}

$isRepo = Get-GitValue -ProjectRoot $projectRoot -Args @("rev-parse", "--is-inside-work-tree")
if ($isRepo -ne "true") {
  Fail "A pasta atual nao parece ser um repositorio Git valido."
}

Write-Step "Buscando atualizacoes"
& git -C $projectRoot fetch origin --prune
if ($LASTEXITCODE -ne 0) {
  Fail "Falha ao executar git fetch."
}

$branch = Get-GitValue -ProjectRoot $projectRoot -Args @("rev-parse", "--abbrev-ref", "HEAD")
$remoteUrl = Get-GitValue -ProjectRoot $projectRoot -Args @("remote", "get-url", "origin")
$currentCommit = Get-GitValue -ProjectRoot $projectRoot -Args @("rev-parse", "HEAD")
$remoteCommit = Get-GitValue -ProjectRoot $projectRoot -Args @("rev-parse", "origin/$branch")

if ([string]::IsNullOrWhiteSpace($branch) -or [string]::IsNullOrWhiteSpace($currentCommit)) {
  Fail "Nao foi possivel identificar a branch ou o commit atual."
}

if ($currentCommit -eq $remoteCommit) {
  Write-Host "Nenhuma atualizacao pendente. O sistema ja esta na ultima versao." -ForegroundColor Green
} else {
  Write-Step "Aplicando atualizacoes"
  & git -C $projectRoot pull --ff-only origin $branch
  if ($LASTEXITCODE -ne 0) {
    Fail "Falha ao executar git pull."
  }
}

$updatedCommit = Get-GitValue -ProjectRoot $projectRoot -Args @("rev-parse", "HEAD")
$lines = Get-EnvLines -EnvPath $envPath

Set-EnvValue -Lines $lines -Key "APP_INSTALL_DIR" -Value $projectRoot

if (-not [string]::IsNullOrWhiteSpace($remoteUrl)) {
  Set-EnvValue -Lines $lines -Key "APP_GIT_REMOTE_URL" -Value $remoteUrl
}

Set-EnvValue -Lines $lines -Key "APP_GIT_BRANCH" -Value $branch
Set-EnvValue -Lines $lines -Key "APP_CURRENT_COMMIT" -Value $updatedCommit

[System.IO.File]::WriteAllLines($envPath, $lines)

Write-Step "Recriando os containers"
Push-Location $projectRoot
try {
  & docker compose up -d --build
  if ($LASTEXITCODE -ne 0) {
    Fail "Falha ao recriar os containers com docker compose."
  }
} finally {
  Pop-Location
}

Write-Step "Atualizacao concluida"
Write-Host "Commit atual: $updatedCommit" -ForegroundColor Green
