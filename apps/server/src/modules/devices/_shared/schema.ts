import { z } from "zod";

export const deviceSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  name: z.string(),
  extension: z.string(),
  sipUser: z.string(),
  sipPassword: z.string(),
  macAddress: z.string().nullable().optional(),
  deviceIp: z.string().nullable().optional(),
  mqttTopic: z.string(),
  status: z.enum(["provisioning", "active", "failed"]),
  connectionStatus: z.enum(["online", "offline", "unknown"]),
  lastSeenAt: z.date().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Device = z.infer<typeof deviceSchema>;
