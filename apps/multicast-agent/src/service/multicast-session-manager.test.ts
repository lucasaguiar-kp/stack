import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { EventEmitter } from "node:events";
import { describe, expect, mock, test } from "bun:test";
import { createRoutes } from "../routes";
import {
  MulticastSessionManager,
  MULTICAST_SHARED_AUDIO_ROOT,
  buildFfmpegArgs,
  buildSenderArgs,
} from "./multicast-session-manager";

describe("multicast session manager", () => {
  test("builds ffmpeg args for radio streams", () => {
    expect(
      buildFfmpegArgs({
        audioCodec: "pcma",
        sourceType: "radio_url",
        source: "https://example.com/live",
      }),
    ).toEqual([
      "-hide_banner",
      "-loglevel",
      "error",
      "-re",
      "-i",
      "https://example.com/live",
      "-ar",
      "8000",
      "-ac",
      "1",
      "-f",
      "alaw",
      "-",
    ]);
  });

  test("builds ffmpeg args for mu-law streams", () => {
    expect(
      buildFfmpegArgs({
        audioCodec: "pcmu",
        sourceType: "radio_url",
        source: "https://example.com/live",
      }),
    ).toContain("mulaw");
  });

  test("builds ffmpeg args for file sources with pacing", () => {
    expect(
      buildFfmpegArgs({
        sourceType: "audio_file",
        source: "/tmp/audio.wav",
      }),
    ).toEqual([
      "-hide_banner",
      "-loglevel",
      "error",
      "-re",
      "-i",
      "/tmp/audio.wav",
      "-ar",
      "8000",
      "-ac",
      "1",
      "-f",
      "alaw",
      "-",
    ]);
  });

  test("builds sender args for stdin mode", () => {
    const args = buildSenderArgs({
      localAddress: "172.30.254.26",
      multicastAddress: "239.255.0.1",
      port: 16384,
      rtpPayloadSize: 160,
      ttl: 32,
    });

    expect(args[0]?.endsWith("rtp-sender.cjs")).toBe(true);
    expect(args.slice(1)).toEqual(["239.255.0.1", "16384", "172.30.254.26", "32", "160", "pcma"]);
  });

  test("starts and stops a multicast session", async () => {
    const ffmpegProcess = new EventEmitter() as EventEmitter & {
      stdout: { pipe: ReturnType<typeof mock> };
      stdin: { end: ReturnType<typeof mock> };
      stderr: { on: ReturnType<typeof mock> };
      kill: ReturnType<typeof mock>;
    };
    ffmpegProcess.stdout = {
      pipe: mock((destination: unknown) => destination),
    };
    ffmpegProcess.stdin = {
      end: mock(() => undefined),
    };
    ffmpegProcess.stderr = {
      on: mock(() => undefined),
    };
    ffmpegProcess.kill = mock(() => true);

    const senderProcess = new EventEmitter() as EventEmitter & {
      stdin: { end: ReturnType<typeof mock> };
      stderr: { on: ReturnType<typeof mock> };
      kill: ReturnType<typeof mock>;
    };
    senderProcess.stdin = {
      end: mock(() => undefined),
    };
    senderProcess.stderr = {
      on: mock(() => undefined),
    };
    senderProcess.kill = mock(() => true);

    const spawnProcess = mock((command: string) => {
      if (command === "ffmpeg-path") {
        return ffmpegProcess as never;
      }

      return senderProcess as never;
    });

    const manager = new MulticastSessionManager({
      spawnProcess,
    });

    const startPromise = manager.start({
      groupId: "group-1",
      sourceType: "radio_url",
      source: "https://example.com/live",
      localAddress: "172.30.254.26",
      multicastAddress: "239.255.0.1",
      port: 16384,
      ffmpegPath: "ffmpeg-path",
      rtpPayloadSize: 160,
      ttl: 32,
    });

    senderProcess.emit("spawn");
    ffmpegProcess.emit("spawn");

    await expect(startPromise).resolves.toEqual({ ok: true });
    expect(spawnProcess).toHaveBeenCalledTimes(2);
    expect(ffmpegProcess.stdout.pipe).toHaveBeenCalledWith(senderProcess.stdin);
    expect(manager.stop("group-1")).toBe(true);
    expect(ffmpegProcess.kill).toHaveBeenCalledWith("SIGTERM");
    expect(senderProcess.kill).toHaveBeenCalledWith("SIGTERM");
    expect(manager.stop("group-1")).toBe(false);
  });

  test("reports spawn failures instead of starting a session", async () => {
    const makeProcess = () => {
      const process = new EventEmitter() as EventEmitter & {
        stdout: { pipe: ReturnType<typeof mock> };
        stdin: { end: ReturnType<typeof mock> };
        stderr: { on: ReturnType<typeof mock> };
        kill: ReturnType<typeof mock>;
      };

      process.stdout = {
        pipe: mock(() => undefined),
      };
      process.stdin = {
        end: mock(() => undefined),
      };
      process.stderr = {
        on: mock(() => undefined),
      };
      process.kill = mock(() => true);

      return process;
    };

    const senderProcess = makeProcess();
    const ffmpegProcess = makeProcess();

    const spawnProcess = mock((command: string) => {
      if (command === "node") {
        return senderProcess as never;
      }

      return ffmpegProcess as never;
    });

    const manager = new MulticastSessionManager({ spawnProcess });
    const startPromise = manager.start({
      groupId: "group-err",
      sourceType: "audio_file",
      source: "/tmp/audio.wav",
      localAddress: "172.30.254.26",
      multicastAddress: "239.255.0.1",
      port: 16384,
      ffmpegPath: "missing-ffmpeg",
      rtpPayloadSize: 160,
      ttl: 32,
    });

    senderProcess.emit("spawn");
    ffmpegProcess.emit("error", new Error("spawn failed"));

    await expect(startPromise).resolves.toEqual({
      ok: false,
      error: "spawn failed",
    });
    expect(manager.stop("group-err")).toBe(false);
  });

  test("reports running status for active sessions", async () => {
    const ffmpegProcess = new EventEmitter() as EventEmitter & {
      stdout: { pipe: ReturnType<typeof mock> };
      stdin: { end: ReturnType<typeof mock> };
      stderr: { on: ReturnType<typeof mock> };
      kill: ReturnType<typeof mock>;
    };
    ffmpegProcess.stdout = { pipe: mock((destination: unknown) => destination) };
    ffmpegProcess.stdin = { end: mock(() => undefined) };
    ffmpegProcess.stderr = { on: mock(() => undefined) };
    ffmpegProcess.kill = mock(() => true);

    const senderProcess = new EventEmitter() as EventEmitter & {
      stdin: { end: ReturnType<typeof mock> };
      stderr: { on: ReturnType<typeof mock> };
      kill: ReturnType<typeof mock>;
    };
    senderProcess.stdin = { end: mock(() => undefined) };
    senderProcess.stderr = { on: mock(() => undefined) };
    senderProcess.kill = mock(() => true);

    const spawnProcess = mock((command: string) => {
      if (command === "ffmpeg-path") {
        return ffmpegProcess as never;
      }

      return senderProcess as never;
    });

    const manager = new MulticastSessionManager({ spawnProcess });
    const startPromise = manager.start({
      groupId: "group-status",
      sourceType: "radio_url",
      source: "https://example.com/live",
      localAddress: "172.30.254.26",
      multicastAddress: "239.255.0.1",
      port: 16384,
      ffmpegPath: "ffmpeg-path",
      rtpPayloadSize: 160,
      ttl: 32,
    });

    senderProcess.emit("spawn");
    ffmpegProcess.emit("spawn");
    await startPromise;

    expect(manager.getStatus("group-status")).toEqual({ running: true });

    manager.stop("group-status");

    expect(manager.getStatus("group-status")).toEqual({ running: false });
  });

  test("removes staged shared audio files when an audio session stops", async () => {
    const sharedGroupDir = path.join(MULTICAST_SHARED_AUDIO_ROOT, "group-cleanup");
    const stagedAudioPath = path.join(sharedGroupDir, "input.wav");
    await rm(sharedGroupDir, { recursive: true, force: true });
    await mkdir(sharedGroupDir, { recursive: true });
    await Bun.write(stagedAudioPath, "wave-data");

    const ffmpegProcess = new EventEmitter() as EventEmitter & {
      stdout: { pipe: ReturnType<typeof mock> };
      stdin: { end: ReturnType<typeof mock> };
      stderr: { on: ReturnType<typeof mock> };
      kill: ReturnType<typeof mock>;
    };
    ffmpegProcess.stdout = { pipe: mock((destination: unknown) => destination) };
    ffmpegProcess.stdin = { end: mock(() => undefined) };
    ffmpegProcess.stderr = { on: mock(() => undefined) };
    ffmpegProcess.kill = mock(() => true);

    const senderProcess = new EventEmitter() as EventEmitter & {
      stdin: { end: ReturnType<typeof mock> };
      stderr: { on: ReturnType<typeof mock> };
      kill: ReturnType<typeof mock>;
    };
    senderProcess.stdin = { end: mock(() => undefined) };
    senderProcess.stderr = { on: mock(() => undefined) };
    senderProcess.kill = mock(() => true);

    const spawnProcess = mock((command: string) => {
      if (command === "ffmpeg-path") {
        return ffmpegProcess as never;
      }

      return senderProcess as never;
    });

    const manager = new MulticastSessionManager({ spawnProcess });
    const startPromise = manager.start({
      groupId: "group-cleanup",
      sourceType: "audio_file",
      source: stagedAudioPath,
      localAddress: "172.30.254.26",
      multicastAddress: "239.255.0.1",
      port: 16384,
      ffmpegPath: "ffmpeg-path",
      rtpPayloadSize: 160,
      ttl: 32,
    });

    senderProcess.emit("spawn");
    ffmpegProcess.emit("spawn");
    await startPromise;

    manager.stop("group-cleanup");

    expect(await Bun.file(stagedAudioPath).exists()).toBe(false);
  });

  test("returns a failure response when multicast startup fails", async () => {
    const app = createRoutes({
      sessionManager: {
        start: mock(async () => ({ ok: false as const, error: "spawn failed" })),
        stop: mock(() => false),
        getStatus: mock(() => ({ running: false })),
      },
    });

    const response = await app.request("/multicast/start", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        groupId: "group-1",
        sourceType: "audio_file",
        source: "/tmp/audio.wav",
        multicastAddress: "239.255.0.1",
        port: 16384,
      }),
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "spawn failed",
    });
  });

  test("returns running status from the session manager", async () => {
    const app = createRoutes({
      sessionManager: {
        start: mock(async () => ({ ok: true as const })),
        stop: mock(() => false),
        getStatus: mock((groupId: string) => ({ running: groupId === "group-1" })),
      },
    });

    const response = await app.request("/multicast/group-1/status");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      groupId: "group-1",
      running: true,
    });
  });
});
