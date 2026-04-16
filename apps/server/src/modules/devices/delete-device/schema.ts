import { z } from "zod";

export const deleteDeviceSchema = z.object({
  deviceId: z.string().min(1),
  groupId: z.string().min(1).optional(),
  requesterId: z.string(),
});

export type Input = z.infer<typeof deleteDeviceSchema>;
