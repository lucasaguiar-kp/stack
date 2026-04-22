import { describe, expect, test } from "bun:test";
import {
  buildMulawConversionArgs,
  buildNodeSenderArgs,
} from "./multicast-stream-manager";

describe("multicast stream pipeline", () => {
  test("builds ffmpeg args that convert files to raw mulaw on stdout", () => {
    expect(
      buildMulawConversionArgs({ type: "audio_file", filePath: "/tmp/input.wav" }),
    ).toEqual([
      "-hide_banner",
      "-loglevel",
      "error",
      "-re",
      "-i",
      "/tmp/input.wav",
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
    ]);
  });

  test("builds ffmpeg args that convert radio streams to raw mulaw on stdout", () => {
    expect(
      buildMulawConversionArgs({
        type: "radio_url",
        url: "https://example.com/stream",
      }),
    ).toEqual([
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      "https://example.com/stream",
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
    ]);
  });

  test("builds node sender args for stdin mode", () => {
    expect(
      buildNodeSenderArgs({
        address: "224.0.0.1",
        port: 16384,
        sourcePath: null,
      }),
    ).toEqual([
      "/Users/lucasaguiar/www/kp/stack-pbx/apps/server/src/modules/device-groups/_shared/rtp_sender.cjs",
      "224.0.0.1",
      "16384",
    ]);
  });

  test("builds node sender args for file mode", () => {
    expect(
      buildNodeSenderArgs({
        address: "224.0.0.1",
        port: 16384,
        sourcePath: "/tmp/output.raw",
      }),
    ).toEqual([
      "/Users/lucasaguiar/www/kp/stack-pbx/apps/server/src/modules/device-groups/_shared/rtp_sender.cjs",
      "/tmp/output.raw",
      "224.0.0.1",
      "16384",
    ]);
  });
});
