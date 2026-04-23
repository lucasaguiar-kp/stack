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
Source: "{#BundleRoot}\vendor\winsw\*"; DestDir: "{app}\vendor\winsw"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BundleRoot}\ops\windows\scripts\*"; DestDir: "{app}\ops\windows\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BundleRoot}\ops\windows\winsw\*"; DestDir: "{app}\ops\windows\winsw"; Flags: ignoreversion recursesubdirs createallsubdirs

; Optional infrastructure payload. The installer copies it when staged, but the
; current installer release only registers backend, ingest, and multicast-agent.
; Asterisk, MQTT, and Postgres stay as carry-through payload until their Windows
; service wrappers are versioned in the same flow.
Source: "{#BundleRoot}\asterisk\*"; DestDir: "{app}\asterisk"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
Source: "{#BundleRoot}\mqtt\*"; DestDir: "{app}\mqtt"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
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
function BundleFilePath(RelativePath: string): string;
begin
  Result := ExpandConstant('{#BundleRoot}\' + RelativePath);
end;

function EnsureBundleFile(RelativePath: string): Boolean;
var
  FullPath: string;
begin
  FullPath := BundleFilePath(RelativePath);
  Result := FileExists(FullPath);

  if not Result then
  begin
    MsgBox(
      'Missing required bundle file:' + #13#10 + FullPath + #13#10 + #13#10 +
      'Stage the full Windows bundle before compiling the installer.',
      mbCriticalError,
      MB_OK
    );
  end;
end;

function EnsureBundleDirectory(RelativePath: string): Boolean;
var
  FullPath: string;
begin
  FullPath := BundleFilePath(RelativePath);
  Result := DirExists(FullPath);

  if not Result then
  begin
    MsgBox(
      'Missing required bundle directory:' + #13#10 + FullPath + #13#10 + #13#10 +
      'Stage the full Windows bundle before compiling the installer.',
      mbCriticalError,
      MB_OK
    );
  end;
end;

function InitializeSetup(): Boolean;
begin
  Result :=
    EnsureBundleFile('app\{#DesktopExecutableName}') and
    EnsureBundleDirectory('app\resources') and
    EnsureBundleFile('backend\server.exe') and
    EnsureBundleFile('ingest\ingest.exe') and
    EnsureBundleFile('multicast-agent\multicast-agent.exe') and
    EnsureBundleFile('ffmpeg\ffmpeg.exe') and
    EnsureBundleFile('vendor\winsw\WinSW-x64.exe') and
    EnsureBundleFile('ops\windows\scripts\bootstrap-config.ps1') and
    EnsureBundleFile('ops\windows\scripts\install-services.ps1') and
    EnsureBundleFile('ops\windows\scripts\uninstall-services.ps1') and
    EnsureBundleFile('ops\windows\winsw\backend.xml') and
    EnsureBundleFile('ops\windows\winsw\ingest.xml') and
    EnsureBundleFile('ops\windows\winsw\multicast-agent.xml');
end;
