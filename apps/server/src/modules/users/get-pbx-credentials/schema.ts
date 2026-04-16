import { z } from "zod";

export const getUserPbxCredentialsSchema = z.object({
  requesterId: z.string(),
});

export const getUserPbxCredentialsOutputSchema = z.object({
  extension: z.string(),
  sipUser: z.string(),
  sipPassword: z.string(),
});

export type Input = z.infer<typeof getUserPbxCredentialsSchema>;
export type Output = z.infer<typeof getUserPbxCredentialsOutputSchema>;
