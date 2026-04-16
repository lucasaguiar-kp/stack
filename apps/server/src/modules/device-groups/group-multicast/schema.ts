import { z } from "zod";

export const updateGroupMulticastConfigSchema = z.object({
  requesterId: z.string(),
  groupId: z.string(),
  sourceType: z.enum(["radio_url", "audio_file"]),
  sourceUrl: z.string().url().optional(),
  audioFileData: z.string().optional(),
  audioFileName: z.string().optional(),
  participantDeviceIds: z.array(z.string()),
});

export const startGroupMulticastSchema = z.object({
  requesterId: z.string(),
  groupId: z.string(),
});

export const stopGroupMulticastSchema = z.object({
  requesterId: z.string(),
  groupId: z.string(),
});

export const getGroupMulticastStatusSchema = z.object({
  requesterId: z.string(),
  groupId: z.string(),
});

export const groupMulticastConfigOutputSchema = z.object({
  groupId: z.string(),
  sourceType: z.enum(["radio_url", "audio_file"]),
  sourceUrl: z.string().nullable(),
  audioFileName: z.string().nullable(),
  participantDeviceIds: z.array(z.string()),
});

export const groupMulticastStatusOutputSchema = z.object({
  running: z.boolean(),
  address: z.string().nullable(),
  config: groupMulticastConfigOutputSchema.nullable(),
});

export type UpdateGroupMulticastConfigInput = z.infer<typeof updateGroupMulticastConfigSchema>;
export type StartGroupMulticastInput = z.infer<typeof startGroupMulticastSchema>;
export type StopGroupMulticastInput = z.infer<typeof stopGroupMulticastSchema>;
export type GetGroupMulticastStatusInput = z.infer<typeof getGroupMulticastStatusSchema>;
export type GroupMulticastStatusOutput = z.infer<typeof groupMulticastStatusOutputSchema>;
