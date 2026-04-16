import { z } from "zod";
import { deviceFullConfigSchema, deviceConfigUpdateSchema } from "../_shared/device-config-schema";

export const updateDeviceConfigSchema = z.object({
  config: deviceConfigUpdateSchema.refine((value) => Object.keys(value).length > 0, {
    message: "At least one config section must be provided",
  }),
  deviceId: z.string().min(1),
  requesterId: z.string(),
  syncWithDevice: z.boolean().default(true),
});

export const updateDeviceConfigOutputSchema = z.object({
  config: deviceFullConfigSchema,
  deviceId: z.string(),
  storedOnlySections: z.array(z.string()),
  syncedSections: z.array(z.string()),
});

export type Input = z.infer<typeof updateDeviceConfigSchema>;
export type Output = z.infer<typeof updateDeviceConfigOutputSchema>;
