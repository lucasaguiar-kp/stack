import { db } from "@stack-pbx/db";
import { user as userSchema } from "@stack-pbx/db/schema/auth";
import { count } from "drizzle-orm";
import type { Output } from "./schema";

export async function getSetupStatus(): Promise<Output> {
  const [result] = await db.select({ userCount: count(userSchema.id) }).from(userSchema);
  const userCount = result?.userCount ?? 0;

  return {
    userCount,
    hasUsers: userCount > 0,
    allowRegistration: userCount === 0,
  };
}
