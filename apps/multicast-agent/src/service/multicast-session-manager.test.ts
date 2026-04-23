import { describe, expect, test } from "bun:test";
import { resolveBundledFfmpegPath } from "./ffmpeg-path";
import { resolveWindowsProgramDataPath } from "./windows-paths";

describe("multicast agent windows paths", () => {
  test("resolves bundled ffmpeg path under Program Files", () => {
    const result = resolveBundledFfmpegPath("C:\\Program Files\\Khomp Stack");
    expect(result).toBe("C:\\Program Files\\Khomp Stack\\ffmpeg\\ffmpeg.exe");
  });

  test("resolves ProgramData root for logs and config", () => {
    const result = resolveWindowsProgramDataPath("C:\\ProgramData");
    expect(result).toBe("C:\\ProgramData\\Khomp Stack");
  });
});
