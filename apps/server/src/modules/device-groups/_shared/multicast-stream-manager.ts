import { env } from "@stack-pbx/env/server";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { rm } from "node:fs/promises";
import { multicastEvents } from "./multicast-events";

export const MULTICAST_RTP_PORT = 16384;

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

  const relayHost = process.env.MULTICAST_RELAY_HOST;
  const relayPort = process.env.MULTICAST_RELAY_PORT;
  const localAddr = process.env.MULTICAST_LOCAL_ADDR;
  const ttl = process.env.MULTICAST_TTL ?? "32";

  let target: string;
  if (relayHost && relayPort) {
    target = `rtp://${relayHost}:${relayPort}`;
  } else {
    const params = new URLSearchParams({ ttl });
    if (localAddr) params.set("localaddr", localAddr);
    target = `rtp://${address}:${MULTICAST_RTP_PORT}?${params.toString()}`;
  }

  const inputArgs =
    source.type === "radio_url"
      ? ["-i", source.url]
      : ["-re", "-i", source.filePath];

  const proc = spawn(
    "ffmpeg",
    [
      ...inputArgs,
      "-acodec", "pcm_mulaw",
      "-ar", "8000",
      "-ac", "1",
      "-f", "rtp",
      target,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  proc.stderr?.on("data", (data: Buffer) => {
    process.stderr.write(`[multicast:${groupId}] ${data}`);
  });

  const entry: StreamEntry = {
    process: proc,
    address,
    startedAt: new Date(),
    tempFilePath: source.type === "audio_file" ? source.filePath : undefined,
  };

  activeStreams.set(groupId, entry);
  multicastEvents.emit("status", { type: "multicast.status.changed", groupId, running: true });

  proc.on("exit", () => {
    const current = activeStreams.get(groupId);
    if (current?.process === proc) {
      activeStreams.delete(groupId);
      multicastEvents.emit("status", { type: "multicast.status.changed", groupId, running: false });
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
  multicastEvents.emit("status", { type: "multicast.status.changed", groupId, running: false });

  if (entry.tempFilePath) {
    rm(entry.tempFilePath, { force: true }).catch(() => undefined);
  }
}

export function getMulticastStreamStatus(groupId: string) {
  const entry = activeStreams.get(groupId);
  if (!entry) return { running: false as const };
  return { running: true as const, address: entry.address, startedAt: entry.startedAt };
}
