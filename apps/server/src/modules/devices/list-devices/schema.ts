import { z } from "zod";
import { deviceSchema } from "../_shared/schema";

export const listDevicesSchema = z.object({
  groupId: z.string().min(1).optional(),
  requesterId: z.string(),
});

export const listDevicesOutputSchema = z.array(
  deviceSchema.extend({
    groupName: z.string(),
  }),
);

export type Input = z.infer<typeof listDevicesSchema>;
export type Output = z.infer<typeof listDevicesOutputSchema>;
