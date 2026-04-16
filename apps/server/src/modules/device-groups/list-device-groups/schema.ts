import { z } from "zod";
import { deviceGroupSchema } from "../_shared/schema";

export const listDeviceGroupsSchema = z.object({
  requesterId: z.string(),
});

export const listDeviceGroupsOutputSchema = z.array(
  deviceGroupSchema.extend({
    deviceCount: z.number(),
  }),
);

export type Input = z.infer<typeof listDeviceGroupsSchema>;
export type Output = z.infer<typeof listDeviceGroupsOutputSchema>;
