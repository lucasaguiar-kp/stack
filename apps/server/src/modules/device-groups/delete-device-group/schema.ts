import { z } from "zod";

export const deleteDeviceGroupSchema = z.object({
  groupId: z.string().min(1),
  requesterId: z.string(),
});

export type Input = z.infer<typeof deleteDeviceGroupSchema>;
