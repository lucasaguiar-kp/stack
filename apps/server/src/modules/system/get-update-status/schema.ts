import { z } from "zod";

export const getUpdateStatusOutputSchema = z.object({
  isConfigured: z.boolean(),
  hasUpdate: z.boolean(),
  repository: z.string().nullable(),
  branch: z.string().nullable(),
  currentCommit: z.string().nullable(),
  latestCommit: z.string().nullable(),
  installDirectory: z.string().nullable(),
  updateCommand: z.string(),
  unavailableReason: z.string().nullable(),
  checkedAt: z.string(),
});

export type Output = z.infer<typeof getUpdateStatusOutputSchema>;
