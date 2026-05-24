; Khomp Stack Windows installer
; Expects a pre-staged bundle rooted at dist\windows\bundle (or /DBundleRoot=...),
; mirroring the final install tree under C:\Program Files\Khomp Stack.

#define RepoRoot AddBackslash(SourcePath + "..\..\..")
#define DefaultBundleRoot AddBackslash(RepoRoot + "dist\windows\bundle")
#define DesktopExecutableName "Khomp Stack Desktop.exe"

#ifndef BundleRoot
  #define BundleRoot DefaultBundleRoot
#endif

#ifndef AppVersion
  #define AppVersion "0.1.0"
#endif

#ifnexist BundleRoot + "app\" + DesktopExecutableName
  #error "Missing required bundle file: " + BundleRoot + "app\" + DesktopExecutableName + ". Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "app\resources"
  #error "Missing required bundle directory: " + BundleRoot + "app\resources. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "backend\server.exe"
  #error "Missing required bundle file: " + BundleRoot + "backend\server.exe. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "ingest\ingest.exe"
  #error "Missing required bundle file: " + BundleRoot + "ingest\ingest.exe. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "multicast-agent\multicast-agent.exe"
  #error "Missing required bundle file: " + BundleRoot + "multicast-agent\multicast-agent.exe. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "ffmpeg\ffmpeg.exe"
  #error "Missing required bundle file: " + BundleRoot + "ffmpeg\ffmpeg.exe. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "freeswitch\FreeSwitchConsole.exe"
  #error "Missing required bundle file: " + BundleRoot + "freeswitch\FreeSwitchConsole.exe. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "freeswitch\mod\mod_conference.dll"
  #error "Missing required bundle file: " + BundleRoot + "freeswitch\mod\mod_conference.dll. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "mqtt\mosquitto\mosquitto.exe"
  #error "Missing required bundle file: " + BundleRoot + "mqtt\mosquitto\mosquitto.exe. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "mqtt\mosquitto\mosquitto_passwd.exe"
  #error "Missing required bundle file: " + BundleRoot + "mqtt\mosquitto\mosquitto_passwd.exe. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "vendor\winsw\WinSW-x64.exe"
  #error "Missing required bundle file: " + BundleRoot + "vendor\winsw\WinSW-x64.exe. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "vendor\postgresql\postgresql-16.13-3-windows-x64.exe"
  #error "Missing required bundle file: " + BundleRoot + "vendor\postgresql\postgresql-16.13-3-windows-x64.exe. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "ops\windows\scripts\bootstrap-config.ps1"
  #error "Missing required bundle file: " + BundleRoot + "ops\windows\scripts\bootstrap-config.ps1. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "ops\windows\scripts\init-postgres.ps1"
  #error "Missing required bundle file: " + BundleRoot + "ops\windows\scripts\init-postgres.ps1. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "ops\windows\scripts\install-services.ps1"
  #error "Missing required bundle file: " + BundleRoot + "ops\windows\scripts\install-services.ps1. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "ops\windows\scripts\uninstall-services.ps1"
  #error "Missing required bundle file: " + BundleRoot + "ops\windows\scripts\uninstall-services.ps1. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "ops\windows\db\schema.sql"
  #error "Missing required bundle file: " + BundleRoot + "ops\windows\db\schema.sql. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "ops\windows\winsw\backend.xml"
  #error "Missing required bundle file: " + BundleRoot + "ops\windows\winsw\backend.xml. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "ops\windows\winsw\freeswitch.xml"
  #error "Missing required bundle file: " + BundleRoot + "ops\windows\winsw\freeswitch.xml. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "ops\windows\winsw\ingest.xml"
  #error "Missing required bundle file: " + BundleRoot + "ops\windows\winsw\ingest.xml. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "ops\windows\winsw\mqtt.xml"
  #error "Missing required bundle file: " + BundleRoot + "ops\windows\winsw\mqtt.xml. Stage the full Windows bundle before compiling the installer."
#endif
#ifnexist BundleRoot + "ops\windows\winsw\multicast-agent.xml"
  #error "Missing required bundle file: " + BundleRoot + "ops\windows\winsw\multicast-agent.xml. Stage the full Windows bundle before compiling the installer."
#endif

[Setup]
AppId={{8A4E8AA8-34A2-4CE8-9C78-1F9C04F301C7}
AppName=Khomp Stack
AppVersion={#AppVersion}
AppPublisher=Khomp
AppPublisherURL=https://www.khomp.com
DefaultDirName={autopf}\Khomp Stack
DefaultGroupName=Khomp Stack
OutputDir={#RepoRoot}dist\windows\installer
OutputBaseFilename=khomp-stack-{#AppVersion}-setup
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
CloseApplications=force
RestartApplications=no
DisableDirPage=yes
UsePreviousAppDir=yes
UsePreviousGroup=yes
UninstallDisplayIcon={app}\app\{#DesktopExecutableName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked
Name: "launchdesktop"; Description: "Launch Khomp Stack Desktop"; GroupDescription: "After setup:"; Flags: unchecked

[Dirs]
Name: "{commonappdata}\Khomp Stack"
Name: "{commonappdata}\Khomp Stack\config"
Name: "{commonappdata}\Khomp Stack\data"
Name: "{commonappdata}\Khomp Stack\logs"
Name: "{commonappdata}\Khomp Stack\temp"

[Files]
; Required application payload
Source: "{#BundleRoot}\app\*"; DestDir: "{app}\app"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BundleRoot}\backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BundleRoot}\ingest\*"; DestDir: "{app}\ingest"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BundleRoot}\multicast-agent\*"; DestDir: "{app}\multicast-agent"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BundleRoot}\ffmpeg\*"; DestDir: "{app}\ffmpeg"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BundleRoot}\freeswitch\*"; DestDir: "{app}\freeswitch"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BundleRoot}\vendor\winsw\*"; DestDir: "{app}\vendor\winsw"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BundleRoot}\vendor\postgresql\*"; DestDir: "{app}\vendor\postgresql"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BundleRoot}\ops\windows\scripts\*"; DestDir: "{app}\ops\windows\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BundleRoot}\ops\windows\winsw\*"; DestDir: "{app}\ops\windows\winsw"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BundleRoot}\ops\windows\db\*"; DestDir: "{app}\ops\windows\db"; Flags: ignoreversion recursesubdirs createallsubdirs

; Required local infrastructure payloads.
Source: "{#BundleRoot}\mqtt\*"; DestDir: "{app}\mqtt"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BundleRoot}\postgres\*"; DestDir: "{app}\postgres"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist

[Icons]
Name: "{autoprograms}\Khomp Stack\Khomp Stack Desktop"; Filename: "{app}\app\{#DesktopExecutableName}"
Name: "{autodesktop}\Khomp Stack Desktop"; Filename: "{app}\app\{#DesktopExecutableName}"; Tasks: desktopicon

[Run]
Filename: "powershell.exe"; \
  Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\ops\windows\scripts\install-services.ps1"" -InstallRoot ""{app}"" -ProgramDataRoot ""{commonappdata}\Khomp Stack"""; \
  Flags: runhidden waituntilterminated; \
  StatusMsg: "Registering Khomp Stack background services..."
Filename: "{app}\app\{#DesktopExecutableName}"; \
  Description: "Launch Khomp Stack Desktop"; \
  Flags: nowait postinstall skipifsilent; \
  Tasks: launchdesktop

[UninstallRun]
Filename: "powershell.exe"; \
  Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\ops\windows\scripts\uninstall-services.ps1"" -InstallRoot ""{app}"""; \
  Flags: runhidden waituntilterminated skipifdoesntexist

[InstallDelete]
Type: filesandordirs; Name: "{app}\services"

[Code]
function PowerShellSingleQuote(Value: string): string;
begin
  StringChangeEx(Value, '''', '''''', True);
  Result := '''' + Value + '''';
end;

procedure StopRunningKhompProcesses();
var
  ResultCode: Integer;
  InstallRoot: string;
  Command: string;
begin
  InstallRoot := ExpandConstant('{app}');

  if not DirExists(InstallRoot) then
  begin
    exit;
  end;

  WizardForm.StatusLabel.Caption := 'Stopping Khomp Stack background services...';

  Command :=
    '-NoProfile -ExecutionPolicy Bypass -Command "' +
    '$ErrorActionPreference = ''SilentlyContinue''; ' +
    '$serviceNames = @(''KhompStack-MulticastAgent'', ''KhompStack-Ingest'', ''KhompStack-Backend'', ''KhompStack-FreeSWITCH'', ''KhompStack-Asterisk'', ''KhompStack-Mqtt''); ' +
    'foreach ($name in $serviceNames) { ' +
    '  $svc = Get-Service -Name $name -ErrorAction SilentlyContinue; ' +
    '  if ($svc) { ' +
    '    Stop-Service -Name $name -Force -ErrorAction SilentlyContinue; ' +
    '    try { (Get-Service -Name $name).WaitForStatus(''Stopped'', ''00:00:30'') } catch {} ' +
    '  } ' +
    '}; ' +
    '$root = ' + PowerShellSingleQuote(InstallRoot) + '; ' +
    'Get-CimInstance Win32_Process | Where-Object { ' +
    '  $_.ExecutablePath -and $_.ExecutablePath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) ' +
    '} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"';

  Exec('powershell.exe', Command, '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssInstall then
  begin
    StopRunningKhompProcesses();
  end;
end;
