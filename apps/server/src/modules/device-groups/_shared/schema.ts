import { z } from "zod";

export const deviceGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  extension: z.string().nullable().optional(),
  multicastAddress: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DeviceGroup = z.infer<typeof deviceGroupSchema>;
