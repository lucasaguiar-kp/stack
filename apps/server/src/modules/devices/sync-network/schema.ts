import { z } from "zod";

export const syncNetworkDevicesSchema = z.object({
  requesterId: z.string(),
});

export const syncNetworkDevicesOutputSchema = z.object({
  currentHost: z.string(),
  failed: z.number(),
  results: z.array(
    z.object({
      deviceId: z.string(),
      deviceName: z.string(),
      message: z.string().optional(),
      status: z.enum(["synced", "failed", "skipped"]),
    }),
  ),
  skipped: z.number(),
  synced: z.number(),
  total: z.number(),
});

export type Input = z.infer<typeof syncNetworkDevicesSchema>;
export type Output = z.infer<typeof syncNetworkDevicesOutputSchema>;
