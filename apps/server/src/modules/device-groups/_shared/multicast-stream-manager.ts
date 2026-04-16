import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { rm } from "node:fs/promises";

export const MULTICAST_RTP_PORT = 5004;

type StreamEntry = {
  process: ChildProcess;
  address: string;
  startedAt: Date;
  tempFilePath?: string;
};

const activeStreams = new Map<string, StreamEntry>();

export type MulticastSource =
  | { type: "radio_url"; url: string }
  | { type: "audio_file"; filePath: string };

export function startMulticastStream(groupId: string, address: string, source: MulticastSource) {
  stopMulticastStream(groupId);

  const target = `rtp://${address}:${MULTICAST_RTP_PORT}`;

  const inputArgs =
    source.type === "radio_url"
      ? ["-i", source.url]
      : ["-re", "-i", source.filePath];

  const proc = spawn(
    "ffmpeg",
    [
      ...inputArgs,
      "-acodec", "pcm_s16le",
      "-ar", "8000",
      "-ac", "1",
      "-f", "rtp",
      target,
    ],
    { stdio: "ignore" },
  );

  const entry: StreamEntry = {
    process: proc,
    address,
    startedAt: new Date(),
    tempFilePath: source.type === "audio_file" ? source.filePath : undefined,
  };

  activeStreams.set(groupId, entry);

  proc.on("exit", () => {
    const current = activeStreams.get(groupId);
    if (current?.process === proc) {
      activeStreams.delete(groupId);
    }
    if (entry.tempFilePath) {
      rm(entry.tempFilePath, { force: true }).catch(() => undefined);
    }
  });
}

export function stopMulticastStream(groupId: string) {
  const entry = activeStreams.get(groupId);
  if (!entry) return;

  entry.process.kill("SIGTERM");
  activeStreams.delete(groupId);

  if (entry.tempFilePath) {
    rm(entry.tempFilePath, { force: true }).catch(() => undefined);
  }
}

export function getMulticastStreamStatus(groupId: string) {
  const entry = activeStreams.get(groupId);
  if (!entry) return { running: false as const };
  return { running: true as const, address: entry.address, startedAt: entry.startedAt };
}
