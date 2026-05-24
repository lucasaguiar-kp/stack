import { afterEach, describe, expect, mock, test } from "bun:test";
import {
  MULTICAST_RTP_PORT,
  activeStreams,
  getMulticastStreamStatus,
  startMulticastStream,
  stopMulticastStream,
} from "./multicast-stream-manager";
import { multicastEvents } from "./multicast-events";

const originalFetch = globalThis.fetch;

function createFetchMock() {
  return mock(async () => new Response(JSON.stringify({ ok: true })));
}

describe("backend multicast agent delegation", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    activeStreams.clear();
    multicastEvents.removeAllListeners("status");
  });

  test("posts start requests to the multicast agent", async () => {
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await startMulticastStream("group-1", "224.0.0.1", {
      type: "radio_url",
      url: "https://example.com/live",
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestUrl).toBe("http://127.0.0.1:3010/multicast/start");
    expect(requestInit).toMatchObject({
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        groupId: "group-1",
        sourceType: "radio_url",
        source: "https://example.com/live",
        multicastAddress: "224.0.0.1",
        localAddress: "172.30.254.26",
        audioCodec: "pcmu",
        port: MULTICAST_RTP_PORT,
        rtpPayloadSize: 160,
        ttl: 32,
      }),
    });
  });

  test("posts stop requests to the multicast agent", async () => {
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await stopMulticastStream("group-1");

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestUrl).toBe("http://127.0.0.1:3010/multicast/stop");
    expect(requestInit).toMatchObject({
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        groupId: "group-1",
      }),
    });
  });

  test("tracks active status locally after start and stop", async () => {
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await startMulticastStream("group-1", "224.0.0.1", {
      type: "audio_file",
      filePath: "/tmp/live.wav",
    });

    expect(getMulticastStreamStatus("group-1")).toMatchObject({
      running: true,
      address: "224.0.0.1",
    });

    await stopMulticastStream("group-1");

    expect(getMulticastStreamStatus("group-1")).toEqual({ running: false });
  });

  test("emits a stop event even if local cache was already empty", async () => {
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const events: Array<{ groupId: string; running: boolean }> = [];

    multicastEvents.on("status", (event) => {
      events.push({ groupId: event.groupId, running: event.running });
    });

    await startMulticastStream("group-1", "224.0.0.1", {
      type: "radio_url",
      url: "https://example.com/live",
    });

    activeStreams.clear();
    await stopMulticastStream("group-1");

    expect(events).toContainEqual({ groupId: "group-1", running: false });
  });
});
