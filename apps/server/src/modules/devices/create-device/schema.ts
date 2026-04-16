import { z } from "zod";

const macAddressSchema = z
  .string()
  .trim()
  .regex(/^([0-9A-Fa-f]{2}[:-]?){5}[0-9A-Fa-f]{2}$/, "Invalid MAC address")
  .transform((value) => value.trim());

const deviceIpSchema = z
  .string()
  .trim()
  .regex(
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/,
    "Invalid IP address",
  )
  .transform((value) => value.trim());

export const createDeviceSchema = z.object({
  groupId: z.string().min(1),
  name: z.string().min(1).max(100),
  macAddress: macAddressSchema,
  deviceIp: deviceIpSchema,
  requesterId: z.string(),
});

export type Input = z.infer<typeof createDeviceSchema>;
