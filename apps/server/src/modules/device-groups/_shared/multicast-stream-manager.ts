import { env } from "@stack-pbx/env/server";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { multicastEvents } from "./multicast-events";

export const MULTICAST_RTP_PORT = 16384;

type StreamEntry = {
  ffmpegProcess: ChildProcess;
  senderProcess: ChildProcess;
  address: string;
  startedAt: Date;
  tempFilePath?: string;
};

const activeStreams = new Map<string, StreamEntry>();

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const nodeSenderScriptPath = path.join(currentDir, "rtp_sender.cjs");

export type MulticastSource =
  | { type: "radio_url"; url: string }
  | { type: "audio_file"; filePath: string };

export function buildMulawConversionArgs(source: MulticastSource) {
  const inputArgs =
    source.type === "radio_url" ? ["-i", source.url] : ["-re", "-i", source.filePath];

  return [
    "-hide_banner",
    "-loglevel",
    "error",
    ...inputArgs,
    "-vn",
    "-acodec",
    "pcm_mulaw",
    "-ar",
    "8000",
    "-ac",
    "1",
    "-f",
    "mulaw",
    "-",
  ];
}

export function buildNodeSenderArgs(input: {
  address: string;
  port: number;
  sourcePath: string | null;
}) {
  if (input.sourcePath) {
    return [nodeSenderScriptPath, input.sourcePath, input.address, String(input.port)];
  }

  return [nodeSenderScriptPath, input.address, String(input.port)];
}

function cleanupEntry(groupId: string, entry: StreamEntry) {
  if (activeStreams.get(groupId) !== entry) {
    return;
  }

  activeStreams.delete(groupId);
  multicastEvents.emit("status", { type: "multicast.status.changed", groupId, running: false });

  if (entry.tempFilePath) {
    rm(entry.tempFilePath, { force: true }).catch(() => undefined);
  }
}

export function startMulticastStream(groupId: string, address: string, source: MulticastSource) {
  stopMulticastStream(groupId);

  const senderArgs = buildNodeSenderArgs({
    address: env.MULTICAST_RELAY_HOST ?? address,
    port: env.MULTICAST_RELAY_PORT ?? MULTICAST_RTP_PORT,
    sourcePath: null,
  });

  const senderProcess = spawn("node", senderArgs, {
    stdio: ["pipe", "ignore", "pipe"],
  });

  senderProcess.stderr?.on("data", (data: Buffer) => {
    process.stderr.write(`[multicast-sender:${groupId}] ${data}`);
  });

  const ffmpegProcess = spawn("ffmpeg", buildMulawConversionArgs(source), {
    stdio: ["ignore", "pipe", "pipe"],
  });

  ffmpegProcess.stderr?.on("data", (data: Buffer) => {
    process.stderr.write(`[multicast-ffmpeg:${groupId}] ${data}`);
  });

  const entry: StreamEntry = {
    ffmpegProcess,
    senderProcess,
    address,
    startedAt: new Date(),
    tempFilePath: source.type === "audio_file" ? source.filePath : undefined,
  };

  activeStreams.set(groupId, entry);
  multicastEvents.emit("status", { type: "multicast.status.changed", groupId, running: true });

  senderProcess.on("exit", () => {
    cleanupEntry(groupId, entry);
  });

  ffmpegProcess.stdout?.pipe(senderProcess.stdin!);

  ffmpegProcess.on("exit", () => {
    senderProcess.stdin?.end();
  });
}

export function stopMulticastStream(groupId: string) {
  const entry = activeStreams.get(groupId);
  if (!entry) return;

  entry.ffmpegProcess.kill("SIGTERM");
  entry.senderProcess.kill("SIGTERM");
  cleanupEntry(groupId, entry);
}

export function getMulticastStreamStatus(groupId: string) {
  const entry = activeStreams.get(groupId);
  if (!entry) return { running: false as const };
  return { running: true as const, address: entry.address, startedAt: entry.startedAt };
}
