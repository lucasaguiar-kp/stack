import { z } from "zod";
import { deviceSchema } from "../_shared/schema";

export const syncDeviceSchema = z.object({
  deviceId: z.string().min(1),
  requesterId: z.string(),
});

export const syncDeviceOutputSchema = deviceSchema.extend({
  syncMessage: z.string().optional(),
});

export type Input = z.infer<typeof syncDeviceSchema>;
export type Output = z.infer<typeof syncDeviceOutputSchema>;
