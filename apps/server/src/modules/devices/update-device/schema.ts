import { z } from "zod";

const deviceIpSchema = z
  .string()
  .trim()
  .regex(
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/,
    "Invalid IP address",
  )
  .transform((value) => value.trim());

export const updateDeviceSchema = z.object({
  deviceId: z.string().min(1),
  groupId: z.string().min(1),
  name: z.string().min(1).max(100),
  deviceIp: deviceIpSchema,
  requesterId: z.string(),
});

export type Input = z.infer<typeof updateDeviceSchema>;
