param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path,
  [string]$BundleRoot = "",
  [string]$RuntimeRoot = "",
  [string]$FreeSwitchVersion = "1.10.12",
  [string]$FreeSwitchMsiUrl = "http://files.freeswitch.org/windows/installer/x64/FreeSWITCH-1.10.12-Release-x64.msi",
  [string]$FfmpegZipUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip",
  [string]$MosquittoInstallerUrl = "https://mosquitto.org/files/binary/win64/mosquitto-2.1.2-install-windows-x64.exe",
  [string]$WinSWUrl = "https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW-x64.exe",
  [string]$PostgresInstallerUrl = "https://get.enterprisedb.com/postgresql/postgresql-16.13-3-windows-x64.exe"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Resolve-FullPath {
  param([string]$Path)
  return [System.IO.Path]::GetFullPath($Path)
}

function Assert-Path {
  param(
    [string]$Path,
    [string]$Description = $Path
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing required bundle input: $Description ($Path)"
  }
}

function New-CleanDirectory {
  param([string]$Path)
  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Copy-DirectoryContents {
  param(
    [string]$Source,
    [string]$Destination
  )

  Assert-Path -Path $Source
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  Get-ChildItem -LiteralPath $Source -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $Destination -Recurse -Force
  }
}

function Assert-DesktopRendererApiUrl {
  param([string]$RendererRoot)

  Assert-Path -Path $RendererRoot -Description "desktop renderer root"

  $rendererFiles = Get-ChildItem -LiteralPath $RendererRoot -Recurse -File -Include "*.html", "*.js", "*.css"
  $forbiddenApiUrl = $rendererFiles | Select-String -Pattern ":3002", "localhost:3002", "127.0.0.1:3002" -SimpleMatch
  if ($null -ne $forbiddenApiUrl) {
    $firstMatch = $forbiddenApiUrl | Select-Object -First 1
    throw "Desktop renderer was built with a development API URL ($($firstMatch.Pattern)) in $($firstMatch.Path). Rebuild with the packaged API URL."
  }

  $packagedApiUrl = $rendererFiles | Select-String -Pattern "http://127.0.0.1:3000" -SimpleMatch
  if ($null -eq $packagedApiUrl) {
    throw "Desktop renderer does not contain the packaged API URL http://127.0.0.1:3000."
  }
}

function Download-File {
  param(
    [string]$Url,
    [string]$Destination
  )

  if (Test-Path -LiteralPath $Destination) {
    return
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
  Invoke-WebRequest -Uri $Url -OutFile $Destination
}

function Get-ElectronVersion {
  param([string]$RepoRootPath)

  $nativePackageJsonPath = Join-Path $RepoRootPath "apps\native\package.json"
  Assert-Path -Path $nativePackageJsonPath -Description "native package.json"

  $nativePackageJson = Get-Content -LiteralPath $nativePackageJsonPath -Raw | ConvertFrom-Json
  $declaredVersion = [string]$nativePackageJson.devDependencies.electron

  if ([string]::IsNullOrWhiteSpace($declaredVersion)) {
    throw "Electron dependency was not found in apps\native\package.json."
  }

  return ($declaredVersion.Trim() -replace '^[\^~=v]+', '')
}

function Ensure-ElectronRuntime {
  param(
    [string]$RepoRootPath,
    [string]$RuntimeRootPath
  )

  $electronDistPath = Join-Path $RepoRootPath "node_modules\electron\dist"
  $electronExePath = Join-Path $electronDistPath "electron.exe"

  if (Test-Path -LiteralPath $electronExePath) {
    return $electronDistPath
  }

  $electronVersion = Get-ElectronVersion -RepoRootPath $RepoRootPath
  $electronZip = Join-Path $RuntimeRootPath "electron-v$electronVersion-win32-x64.zip"
  $electronExtract = Join-Path $RuntimeRootPath "electron-v$electronVersion-win32-x64"
  $electronUrl = "https://github.com/electron/electron/releases/download/v$electronVersion/electron-v$electronVersion-win32-x64.zip"

  Write-Step "Downloading Electron runtime"
  Download-File -Url $electronUrl -Destination $electronZip
  New-CleanDirectory -Path $electronExtract
  Expand-Archive -LiteralPath $electronZip -DestinationPath $electronExtract -Force
  Assert-Path -Path (Join-Path $electronExtract "electron.exe") -Description "downloaded Electron runtime"

  New-CleanDirectory -Path $electronDistPath
  Copy-DirectoryContents -Source $electronExtract -Destination $electronDistPath

  return $electronDistPath
}

$repoRootPath = Resolve-FullPath $RepoRoot
if ([string]::IsNullOrWhiteSpace($BundleRoot)) {
  $BundleRoot = Join-Path $repoRootPath "dist\windows\bundle"
}
$bundleRootPath = Resolve-FullPath $BundleRoot
if ([string]::IsNullOrWhiteSpace($RuntimeRoot)) {
  $RuntimeRoot = Join-Path $repoRootPath ".runtime\windows-bundle"
}
$runtimeRoot = Resolve-FullPath $RuntimeRoot

Write-Step "Preparing Windows bundle directories"
New-CleanDirectory -Path $bundleRootPath
New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null

Write-Step "Staging Electron desktop application"
$electronDist = Ensure-ElectronRuntime -RepoRootPath $repoRootPath -RuntimeRootPath $runtimeRoot
$nativeDist = Join-Path $repoRootPath "apps\native\dist"
$desktopTarget = Join-Path $bundleRootPath "app"

Assert-Path -Path (Join-Path $electronDist "electron.exe") -Description "Electron runtime"
Assert-Path -Path (Join-Path $nativeDist "main.js") -Description "native desktop build"
Assert-Path -Path (Join-Path $nativeDist "preload.js") -Description "native desktop preload build"
Assert-Path -Path (Join-Path $nativeDist "renderer\index.html") -Description "desktop renderer build"

Copy-DirectoryContents -Source $electronDist -Destination $desktopTarget
Move-Item -LiteralPath (Join-Path $desktopTarget "electron.exe") -Destination (Join-Path $desktopTarget "Khomp Stack Desktop.exe") -Force
$desktopAppTarget = Join-Path $desktopTarget "resources\app"
New-CleanDirectory -Path $desktopAppTarget
Copy-DirectoryContents -Source $nativeDist -Destination $desktopAppTarget
Assert-DesktopRendererApiUrl -RendererRoot (Join-Path $desktopAppTarget "renderer")

Write-Step "Staging compiled service executables"
$serviceTargets = @{
  "backend\server.exe" = "apps\server\server.exe"
  "ingest\ingest.exe" = "apps\ingest\ingest.exe"
  "multicast-agent\multicast-agent.exe" = "apps\multicast-agent\multicast-agent.exe"
  "multicast-agent\rtp-sender.exe" = "apps\multicast-agent\rtp-sender.exe"
}

foreach ($entry in $serviceTargets.GetEnumerator()) {
  $source = Join-Path $repoRootPath $entry.Value
  $destination = Join-Path $bundleRootPath $entry.Key
  Assert-Path -Path $source
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
  Copy-Item -LiteralPath $source -Destination $destination -Force
}

Write-Step "Downloading and staging FFmpeg"
$ffmpegZip = Join-Path $runtimeRoot "ffmpeg-release-essentials.zip"
$ffmpegExtract = Join-Path $runtimeRoot "ffmpeg"
Download-File -Url $FfmpegZipUrl -Destination $ffmpegZip
New-CleanDirectory -Path $ffmpegExtract
Expand-Archive -LiteralPath $ffmpegZip -DestinationPath $ffmpegExtract -Force
$ffmpegExe = Get-ChildItem -LiteralPath $ffmpegExtract -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1
if ($null -eq $ffmpegExe) {
  throw "ffmpeg.exe was not found after extracting FFmpeg."
}
New-Item -ItemType Directory -Force -Path (Join-Path $bundleRootPath "ffmpeg") | Out-Null
Copy-Item -LiteralPath $ffmpegExe.FullName -Destination (Join-Path $bundleRootPath "ffmpeg\ffmpeg.exe") -Force

Write-Step "Downloading and staging FreeSWITCH"
$freeSwitchMsi = Join-Path $runtimeRoot "FreeSWITCH-$FreeSwitchVersion-Release-x64.msi"
$freeSwitchExtract = Join-Path $runtimeRoot "freeswitch-msi"
Download-File -Url $FreeSwitchMsiUrl -Destination $freeSwitchMsi
New-CleanDirectory -Path $freeSwitchExtract
$msiArgs = @("/a", "`"$freeSwitchMsi`"", "/qn", "TARGETDIR=`"$freeSwitchExtract`"")
$msi = Start-Process -FilePath "msiexec.exe" -ArgumentList $msiArgs -Wait -PassThru
if ($msi.ExitCode -ne 0) {
  throw "Failed to extract FreeSWITCH MSI. msiexec exit code: $($msi.ExitCode)"
}
$freeSwitchConsole = Get-ChildItem -LiteralPath $freeSwitchExtract -Recurse -Filter "FreeSwitchConsole.exe" | Select-Object -First 1
if ($null -eq $freeSwitchConsole) {
  throw "FreeSwitchConsole.exe was not found after extracting FreeSWITCH."
}
Copy-DirectoryContents -Source $freeSwitchConsole.DirectoryName -Destination (Join-Path $bundleRootPath "freeswitch")

Write-Step "Downloading and staging Mosquitto"
$mosquittoInstaller = Join-Path $runtimeRoot "mosquitto-install-windows-x64.exe"
$mosquittoInstallRoot = Join-Path $runtimeRoot "mosquitto"
Download-File -Url $MosquittoInstallerUrl -Destination $mosquittoInstaller
New-CleanDirectory -Path $mosquittoInstallRoot
$mosquittoArgs = @("/S", "/D=$mosquittoInstallRoot")
$mosquitto = Start-Process -FilePath $mosquittoInstaller -ArgumentList $mosquittoArgs -Wait -PassThru
if ($mosquitto.ExitCode -ne 0) {
  throw "Failed to install Mosquitto into staging runtime. Installer exit code: $($mosquitto.ExitCode)"
}
Assert-Path -Path (Join-Path $mosquittoInstallRoot "mosquitto.exe") -Description "mosquitto.exe"
Copy-DirectoryContents -Source $mosquittoInstallRoot -Destination (Join-Path $bundleRootPath "mqtt\mosquitto")

Write-Step "Downloading and staging WinSW and PostgreSQL installer"
$winSwTarget = Join-Path $bundleRootPath "vendor\winsw\WinSW-x64.exe"
$postgresFileName = Split-Path -Leaf ([System.Uri]$PostgresInstallerUrl).AbsolutePath
$postgresTarget = Join-Path $bundleRootPath "vendor\postgresql\$postgresFileName"
Download-File -Url $WinSWUrl -Destination $winSwTarget
Download-File -Url $PostgresInstallerUrl -Destination $postgresTarget

Write-Step "Staging Windows operation scripts"
Copy-DirectoryContents -Source (Join-Path $repoRootPath "ops\windows\scripts") -Destination (Join-Path $bundleRootPath "ops\windows\scripts")
Copy-DirectoryContents -Source (Join-Path $repoRootPath "ops\windows\winsw") -Destination (Join-Path $bundleRootPath "ops\windows\winsw")
Copy-DirectoryContents -Source (Join-Path $repoRootPath "ops\windows\db") -Destination (Join-Path $bundleRootPath "ops\windows\db")

Write-Step "Validating staged bundle"
$requiredFiles = @(
  "app\Khomp Stack Desktop.exe",
  "app\resources\app\main.js",
  "backend\server.exe",
  "ingest\ingest.exe",
  "multicast-agent\multicast-agent.exe",
  "multicast-agent\rtp-sender.exe",
  "ffmpeg\ffmpeg.exe",
  "freeswitch\FreeSwitchConsole.exe",
  "freeswitch\mod\mod_conference.dll",
  "mqtt\mosquitto\mosquitto.exe",
  "mqtt\mosquitto\mosquitto_passwd.exe",
  "vendor\winsw\WinSW-x64.exe",
  "vendor\postgresql\postgresql-16.13-3-windows-x64.exe",
  "ops\windows\scripts\bootstrap-config.ps1",
  "ops\windows\scripts\diagnose-install.ps1",
  "ops\windows\scripts\init-postgres.ps1",
  "ops\windows\scripts\install-services.ps1",
  "ops\windows\scripts\uninstall-services.ps1",
  "ops\windows\db\schema.sql",
  "ops\windows\winsw\backend.xml",
  "ops\windows\winsw\freeswitch.xml",
  "ops\windows\winsw\ingest.xml",
  "ops\windows\winsw\mqtt.xml",
  "ops\windows\winsw\multicast-agent.xml"
)

foreach ($relativePath in $requiredFiles) {
  Assert-Path -Path (Join-Path $bundleRootPath $relativePath)
}

Write-Host ""
Write-Host "Windows bundle staged at: $bundleRootPath" -ForegroundColor Green
