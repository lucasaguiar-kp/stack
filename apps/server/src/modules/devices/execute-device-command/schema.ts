import { z } from "zod";

const schedulerTaskPayloadSchema = z.object({
  action: z.string().min(1),
  description: z.string().min(1),
  enabled: z.boolean(),
  params: z.record(z.string(), z.unknown()).default({}),
  schedule: z.string().min(1),
});

export const executeDeviceCommandSchema = z.object({
  command: z.discriminatedUnion("type", [
    z.object({ type: z.literal("get-audios") }),
    z.object({
      type: z.literal("play-audio"),
      audioId: z.union([z.number().int().positive(), z.string().min(1)]),
      milliSecondsBetweenPlay: z.number().int().nonnegative().default(10000),
      numberOfTimes: z.number().int().nonnegative().default(1),
    }),
    z.object({ type: z.literal("stop-audio") }),
    z.object({
      type: z.literal("upload-audio"),
      data: z.string().min(1),
      fileName: z.string().min(1),
    }),
    z.object({
      type: z.literal("upload-and-play-audio"),
      data: z.string().min(1),
      fileName: z.string().min(1),
    }),
    z.object({
      type: z.literal("delete-audio"),
      audioId: z.union([z.number().int().positive(), z.string().min(1)]),
    }),
    z.object({ type: z.literal("get-audio-playback-status") }),
    z.object({ type: z.literal("get-relays") }),
    z.object({
      type: z.literal("set-relay"),
      activate: z.boolean().optional(),
      mode: z.enum(["auto_deactivate", "manual", "alternate"]).optional(),
      pulseIntervalSeconds: z.number().int().nonnegative().optional(),
      relayId: z.number().int().positive().default(1),
    }),
    z.object({ type: z.literal("get-sip-status") }),
    z.object({
      type: z.literal("make-sip-call"),
      destination: z.string().min(1),
      mode: z.enum(["p2p", "extension"]),
    }),
    z.object({ type: z.literal("drop-sip-call") }),
    z.object({ type: z.literal("get-system-status") }),
    z.object({ type: z.literal("get-system-logs") }),
    z.object({ type: z.literal("reboot") }),
    z.object({ type: z.literal("factory-reset") }),
    z.object({
      type: z.literal("update-firmware"),
      fileName: z.string().min(1).default("update-dg101-image.bin"),
      fileUrl: z.string().url(),
    }),
    z.object({
      type: z.literal("change-password"),
      newPassword: z.string().min(1),
      oldPassword: z.string().min(1),
    }),
    z.object({ type: z.literal("list-scheduler-tasks") }),
    z.object({
      type: z.literal("create-scheduler-task"),
      task: schedulerTaskPayloadSchema,
    }),
    z.object({
      type: z.literal("update-scheduler-task"),
      task: schedulerTaskPayloadSchema,
      taskId: z.string().min(1),
    }),
    z.object({
      type: z.literal("delete-scheduler-task"),
      taskId: z.string().min(1),
    }),
  ]),
  deviceId: z.string().min(1),
  requesterId: z.string(),
});

export const executeDeviceCommandOutputSchema = z.object({
  data: z.unknown().optional(),
  deviceId: z.string(),
  type: z.string(),
});

export type Input = z.infer<typeof executeDeviceCommandSchema>;
export type Output = z.infer<typeof executeDeviceCommandOutputSchema>;
