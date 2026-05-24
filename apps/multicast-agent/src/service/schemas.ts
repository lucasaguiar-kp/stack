import { z } from "zod";

export const multicastStartSchema = z.object({
  groupId: z.string().min(1),
  sourceType: z.enum(["audio_file", "radio_url"]),
  source: z.string().min(1),
  multicastAddress: z.string().min(1),
  localAddress: z.string().min(1).optional(),
  audioCodec: z.enum(["pcma", "pcmu"]).default("pcma"),
  port: z.number().int().positive().default(16384),
  rtpPayloadSize: z.number().int().positive().default(160),
  ttl: z.number().int().min(1).max(255).default(32),
});

export const multicastStopSchema = z.object({
  groupId: z.string().min(1),
});
