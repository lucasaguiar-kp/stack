import { execFile } from "node:child_process";

export type ParsedServiceState = {
  code: number | null;
  label: string;
  isRunning: boolean;
};

export type WindowsServiceStatus = {
  name: string;
  found: boolean;
  state: ParsedServiceState;
  error: string | null;
  rawOutput: string;
};

const UNKNOWN_SERVICE_STATE: ParsedServiceState = {
  code: null,
  label: "UNKNOWN",
  isRunning: false,
};

export type WindowsServiceCommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type WindowsServiceCommandRunner = (
  file: string,
  args: string[],
) => Promise<WindowsServiceCommandResult>;

export function parseScQueryOutput(output: string): ParsedServiceState {
  const match = output.match(/STATE\s*:\s*(\d+)\s+([A-Z_]+)/);

  if (!match) {
    return UNKNOWN_SERVICE_STATE;
  }

  const rawCode = match[1];
  const rawLabel = match[2];

  if (!rawCode || !rawLabel) {
    return UNKNOWN_SERVICE_STATE;
  }

  const code = Number.parseInt(rawCode, 10);
  const label = rawLabel.toUpperCase();

  return {
    code: Number.isNaN(code) ? null : code,
    label,
    isRunning: code === 4 || label === "RUNNING",
  };
}

export const execWindowsServiceCommand: WindowsServiceCommandRunner = (file, args) =>
  new Promise((resolve) => {
    execFile(file, args, { windowsHide: true }, (error, stdout, stderr) => {
      if (!error) {
        resolve({
          stdout,
          stderr,
          exitCode: 0,
        });

        return;
      }

      resolve({
        stdout,
        stderr,
        exitCode: typeof error.code === "number" ? error.code : 1,
      });
    });
  });

export async function runScQuery(
  serviceName: string,
  runCommand: WindowsServiceCommandRunner = execWindowsServiceCommand,
): Promise<WindowsServiceStatus> {
  const { stdout, stderr, exitCode } = await runCommand("sc.exe", [
    "query",
    serviceName,
  ]);
  const rawOutput = stdout.trim() || stderr.trim();
  const state = parseScQueryOutput(stdout);

  return {
    name: serviceName,
    found: exitCode === 0 && state.code !== null,
    state,
    error: exitCode === 0 ? null : rawOutput || `sc.exe exited with code ${exitCode}.`,
    rawOutput,
  };
}

export async function queryWindowsServiceStatus(
  serviceName: string,
): Promise<WindowsServiceStatus> {
  if (process.platform !== "win32") {
    return {
      name: serviceName,
      found: false,
      state: UNKNOWN_SERVICE_STATE,
      error: "Windows service queries are only available on Windows.",
      rawOutput: "",
    };
  }

  return runScQuery(serviceName);
}
