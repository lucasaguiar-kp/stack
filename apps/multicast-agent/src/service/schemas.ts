import { z } from "zod";

export const multicastStartSchema = z.object({
  groupId: z.string().min(1),
  sourceType: z.enum(["audio_file", "radio_url"]),
  source: z.string().min(1),
  multicastAddress: z.string().min(1),
  port: z.number().int().positive().default(16384),
});

export const multicastStopSchema = z.object({
  groupId: z.string().min(1),
});
