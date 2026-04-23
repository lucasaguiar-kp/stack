import { env } from "@stack-pbx/env/server";
import { multicastEvents } from "./multicast-events";

export const MULTICAST_RTP_PORT = 16384;

type StreamEntry = {
  address: string;
  startedAt: Date;
};

export type MulticastSource =
  | { type: "radio_url"; url: string }
  | { type: "audio_file"; filePath: string };

export const activeStreams = new Map<string, StreamEntry>();

export function agentUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `http://${env.MULTICAST_AGENT_HOST}:${env.MULTICAST_AGENT_PORT}${normalizedPath}`;
}

async function postToAgent(path: string, payload: unknown) {
  const response = await fetch(agentUrl(path), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Multicast agent request failed (${response.status} ${response.statusText})${errorBody ? `: ${errorBody}` : ""}`,
    );
  }
}

function setInactive(groupId: string, options?: { emitWhenMissing?: boolean }) {
  const hadStream = activeStreams.delete(groupId);

  if (hadStream || options?.emitWhenMissing) {
    multicastEvents.emit("status", { type: "multicast.status.changed", groupId, running: false });
  }
}

export async function startMulticastStream(
  groupId: string,
  address: string,
  source: MulticastSource,
) {
  if (activeStreams.has(groupId)) {
    await stopMulticastStream(groupId);
  }

  const sourceValue = source.type === "radio_url" ? source.url : source.filePath;

  await postToAgent("/multicast/start", {
    groupId,
    sourceType: source.type,
    source: sourceValue,
    multicastAddress: address,
    port: MULTICAST_RTP_PORT,
  });

  activeStreams.set(groupId, {
    address,
    startedAt: new Date(),
  });
  multicastEvents.emit("status", { type: "multicast.status.changed", groupId, running: true });
}

export async function stopMulticastStream(groupId: string) {
  await postToAgent("/multicast/stop", { groupId });
  setInactive(groupId, { emitWhenMissing: true });
}

export function getMulticastStreamStatus(groupId: string) {
  const entry = activeStreams.get(groupId);
  if (!entry) return { running: false as const };
  return { running: true as const, address: entry.address, startedAt: entry.startedAt };
}
