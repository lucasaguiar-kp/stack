import { z } from "zod";

export const getUserConnectionInfoSchema = z.object({
  requesterId: z.string(),
});

export const getUserConnectionInfoOutputSchema = z.object({
  pbx: z.object({
    extension: z.string(),
    sipUser: z.string(),
    sipPassword: z.string(),
  }),
  mqtt: z.object({
    configured: z.boolean(),
    publicUrl: z.string(),
    protocol: z.string(),
    host: z.string(),
    port: z.number().int().positive().nullable(),
    username: z.string(),
    password: z.string(),
    tlsEnabled: z.boolean(),
  }),
});

export type Input = z.infer<typeof getUserConnectionInfoSchema>;
export type Output = z.infer<typeof getUserConnectionInfoOutputSchema>;
