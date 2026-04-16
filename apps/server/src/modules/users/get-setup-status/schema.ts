import { z } from "zod";

export const getSetupStatusOutputSchema = z.object({
  allowRegistration: z.boolean(),
  hasUsers: z.boolean(),
  userCount: z.number().int().nonnegative(),
});

export type Output = z.infer<typeof getSetupStatusOutputSchema>;
