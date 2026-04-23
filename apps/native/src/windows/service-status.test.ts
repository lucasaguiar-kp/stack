import { describe, expect, test } from "bun:test";

import { parseScQueryOutput, runScQuery } from "./service-status";

describe("parseScQueryOutput", () => {
  test("extracts the service state from sc query output", () => {
    const result = parseScQueryOutput(`
SERVICE_NAME: KhompStackBackend
        TYPE               : 10  WIN32_OWN_PROCESS
        STATE              : 4  RUNNING
                                (STOPPABLE, NOT_PAUSABLE, ACCEPTS_SHUTDOWN)
        WIN32_EXIT_CODE    : 0  (0x0)
        SERVICE_EXIT_CODE  : 0  (0x0)
        CHECKPOINT         : 0x0
        WAIT_HINT          : 0x0
`);

    expect(result).toEqual({
      code: 4,
      label: "RUNNING",
      isRunning: true,
    });
  });

  test("returns unknown when the output does not contain a state line", () => {
    const result = parseScQueryOutput("SERVICE_NAME: KhompStackBackend");

    expect(result).toEqual({
      code: null,
      label: "UNKNOWN",
      isRunning: false,
    });
  });

  test("builds a running service status from the command result", async () => {
    const result = await runScQuery("KhompStackBackend", async (file, args) => {
      expect(file).toBe("sc.exe");
      expect(args).toEqual(["query", "KhompStackBackend"]);

      return {
        stdout: `
SERVICE_NAME: KhompStackBackend
        STATE              : 4  RUNNING
`,
        stderr: "",
        exitCode: 0,
      };
    });

    expect(result).toEqual({
      name: "KhompStackBackend",
      found: true,
      state: {
        code: 4,
        label: "RUNNING",
        isRunning: true,
      },
      error: null,
      rawOutput: `SERVICE_NAME: KhompStackBackend
        STATE              : 4  RUNNING`,
    });
  });

  test("surfaces a command failure from sc query", async () => {
    const result = await runScQuery("KhompStackBackend", async () => ({
      stdout: "",
      stderr: "[SC] OpenService FAILED 1060:\nThe specified service does not exist as an installed service.",
      exitCode: 1060,
    }));

    expect(result).toEqual({
      name: "KhompStackBackend",
      found: false,
      state: {
        code: null,
        label: "UNKNOWN",
        isRunning: false,
      },
      error:
        "[SC] OpenService FAILED 1060:\nThe specified service does not exist as an installed service.",
      rawOutput:
        "[SC] OpenService FAILED 1060:\nThe specified service does not exist as an installed service.",
    });
  });
});
