import { z } from "zod";
import { deviceFullConfigSchema } from "../_shared/device-config-schema";
import { deviceSchema } from "../_shared/schema";

export const getDeviceDetailSchema = z.object({
  deviceId: z.string().min(1),
  requesterId: z.string(),
});

export const getDeviceDetailOutputSchema = z.object({
  audioAssets: z.array(
    z.object({
      audioIndex: z.string().optional(),
      createdAt: z.date(),
      id: z.string(),
      name: z.string(),
      originalFileName: z.string(),
      sizeBytes: z.number().nullable().optional(),
      status: z.enum(["draft", "active", "archived"]),
      updatedAt: z.date(),
    }),
  ),
  config: deviceFullConfigSchema,
  device: deviceSchema.extend({
    groupName: z.string(),
  }),
  live: z.object({
    configs: z.unknown().optional(),
    network: z.unknown().optional(),
    relays: z.unknown().optional(),
    schedulerTasks: z.unknown().optional(),
    sip: z.unknown().optional(),
    system: z.unknown().optional(),
  }),
});

export type Input = z.infer<typeof getDeviceDetailSchema>;
export type Output = z.infer<typeof getDeviceDetailOutputSchema>;
