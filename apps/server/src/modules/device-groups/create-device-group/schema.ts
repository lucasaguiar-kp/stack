import { z } from "zod";

export const createDeviceGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  requesterId: z.string(),
});

export type Input = z.infer<typeof createDeviceGroupSchema>;
