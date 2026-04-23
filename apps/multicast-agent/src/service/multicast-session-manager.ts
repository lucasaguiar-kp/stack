import { spawn, type ChildProcess } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type MulticastSourceType = "radio_url" | "audio_file";

export type BuildFfmpegArgsInput = {
  sourceType: MulticastSourceType;
  source: string;
};

export type SpawnProcess = typeof spawn;

type ManagedProcess = Pick<
  ChildProcess,
  "kill" | "on" | "removeListener" | "stdout" | "stdin" | "stderr"
>;

type Session = {
  ffmpegProcess: ManagedProcess;
  senderProcess: ManagedProcess;
  source: string;
  sourceType: MulticastSourceType;
};

type StartSessionInput = BuildFfmpegArgsInput & {
  groupId: string;
  multicastAddress: string;
  port: number;
  ffmpegPath: string;
};

type StartSessionResult = { ok: true } | { ok: false; error: string };

type MulticastSessionManagerOptions = {
  spawnProcess?: SpawnProcess;
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const senderScriptPath = path.join(currentDir, "rtp-sender.cjs");
const repoRoot = path.resolve(currentDir, "../../../../");
export const MULTICAST_SHARED_AUDIO_ROOT = path.join(repoRoot, ".runtime", "multicast-agent-inputs");

export function buildFfmpegArgs({ sourceType, source }: BuildFfmpegArgsInput) {
  const inputArgs =
    sourceType === "radio_url" || sourceType === "audio_file"
      ? ["-re", "-i", source]
      : ["-i", source];

  return [
    "-hide_banner",
    "-loglevel",
    "error",
    ...inputArgs,
    "-ar",
    "8000",
    "-ac",
    "1",
    "-f",
    "mulaw",
    "-",
  ];
}

export function buildSenderArgs(multicastAddress: string, port: number) {
  return [senderScriptPath, multicastAddress, String(port)];
}

export class MulticastSessionManager {
  private readonly sessions = new Map<string, Session>();
  private readonly spawnProcess: SpawnProcess;

  constructor(options: MulticastSessionManagerOptions = {}) {
    this.spawnProcess = options.spawnProcess ?? spawn;
  }

  async start(input: StartSessionInput): Promise<StartSessionResult> {
    this.stop(input.groupId);

    let senderProcess: ManagedProcess | undefined;
    let ffmpegProcess: ManagedProcess | undefined;

    try {
      senderProcess = this.spawnProcess("node", buildSenderArgs(input.multicastAddress, input.port), {
        stdio: ["pipe", "ignore", "pipe"],
      });

      ffmpegProcess = this.spawnProcess(input.ffmpegPath, buildFfmpegArgs(input), {
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      this.cleanupFailedStart(senderProcess, ffmpegProcess);
      return { ok: false, error: this.stringifyError(error) };
    }

    const [senderResult, ffmpegResult] = await Promise.all([
      this.waitForSpawn(senderProcess),
      this.waitForSpawn(ffmpegProcess),
    ]);

    if (!senderResult.ok || !ffmpegResult.ok) {
      this.cleanupFailedStart(senderProcess, ffmpegProcess);
      let error = "spawn failed";
      if (!senderResult.ok) {
        error = senderResult.error;
      } else if (!ffmpegResult.ok) {
        error = ffmpegResult.error;
      }
      return {
        ok: false,
        error,
      };
    }

    const session: Session = {
      ffmpegProcess,
      senderProcess,
      source: input.source,
      sourceType: input.sourceType,
    };
    this.sessions.set(input.groupId, session);

    ffmpegProcess.stdout?.pipe(senderProcess.stdin as NodeJS.WritableStream);

    ffmpegProcess.on("exit", () => {
      senderProcess.stdin?.end();
    });

    senderProcess.on("exit", () => {
      ffmpegProcess.kill("SIGTERM");
      this.cleanup(input.groupId, session);
    });

    this.attachStderrLogging(input.groupId, "ffmpeg", ffmpegProcess.stderr);
    this.attachStderrLogging(input.groupId, "sender", senderProcess.stderr);

    return { ok: true };
  }

  stop(groupId: string) {
    const session = this.sessions.get(groupId);
    if (!session) {
      return false;
    }

    this.sessions.delete(groupId);
    session.ffmpegProcess.kill("SIGTERM");
    session.senderProcess.kill("SIGTERM");
    this.cleanupSessionArtifacts(session);
    return true;
  }

  getStatus(groupId: string) {
    return { running: this.sessions.has(groupId) };
  }

  private cleanup(groupId: string, session: Session) {
    if (this.sessions.get(groupId) !== session) {
      return;
    }

    this.sessions.delete(groupId);
    this.cleanupSessionArtifacts(session);
  }

  private cleanupFailedStart(
    senderProcess: ManagedProcess | undefined,
    ffmpegProcess: ManagedProcess | undefined,
  ) {
    senderProcess?.kill("SIGTERM");
    ffmpegProcess?.kill("SIGTERM");
  }

  private cleanupSessionArtifacts(session: Session) {
    if (session.sourceType !== "audio_file") {
      return;
    }

    const resolvedSource = path.resolve(session.source);
    const resolvedSharedRoot = `${path.resolve(MULTICAST_SHARED_AUDIO_ROOT)}${path.sep}`;

    if (!resolvedSource.startsWith(resolvedSharedRoot)) {
      return;
    }

    try {
      rmSync(path.dirname(resolvedSource), { recursive: true, force: true });
    } catch {
      // Best-effort cleanup: staged audio should never block session teardown.
    }
  }

  private waitForSpawn(processHandle: ManagedProcess | undefined): Promise<StartSessionResult> {
    if (!processHandle) {
      return Promise.resolve({ ok: false, error: "spawn process unavailable" });
    }

    return new Promise((resolve) => {
      const onSpawn = () => {
        cleanup();
        resolve({ ok: true });
      };

      const onError = (error: unknown) => {
        cleanup();
        resolve({ ok: false, error: this.stringifyError(error) });
      };

      const cleanup = () => {
        processHandle.removeListener("spawn", onSpawn);
        processHandle.removeListener("error", onError);
      };

      processHandle.on("spawn", onSpawn);
      processHandle.on("error", onError);
    });
  }

  private stringifyError(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private attachStderrLogging(
    groupId: string,
    processName: "ffmpeg" | "sender",
    stderr: ManagedProcess["stderr"],
  ) {
    stderr?.on?.("data", (chunk: Buffer) => {
      process.stderr.write(`[multicast:${groupId}:${processName}] ${chunk}`);
    });
  }
}
