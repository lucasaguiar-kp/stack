import { db } from "@stack-pbx/db";
import { deviceGroup as deviceGroupSchema, user as userSchema } from "@stack-pbx/db/schema/index";
import { and, eq, ne } from "drizzle-orm";
import { AppError } from "../../../core/errors/app-error";
import type { Input } from "./schema";

export async function updateDeviceGroup(input: Input): Promise<void> {
  const user = await db.query.user.findFirst({
    where: eq(userSchema.id, input.requesterId),
  });

  if (!user) {
    throw new AppError("USER_NOT_FOUND");
  }

  const group = await db.query.deviceGroup.findFirst({
    where: and(eq(deviceGroupSchema.id, input.groupId), eq(deviceGroupSchema.userId, user.id)),
  });

  if (!group) {
    throw new AppError("DEVICE_GROUP_NOT_FOUND");
  }

  const existing = await db.query.deviceGroup.findFirst({
    where: and(
      eq(deviceGroupSchema.userId, user.id),
      eq(deviceGroupSchema.name, input.name),
      ne(deviceGroupSchema.id, input.groupId),
    ),
  });

  if (existing) {
    throw new AppError("DEVICE_GROUP_NAME_ALREADY_EXISTS");
  }

  const [updated] = await db
    .update(deviceGroupSchema)
    .set({
      name: input.name,
      description: input.description ?? null,
    })
    .where(and(eq(deviceGroupSchema.id, input.groupId), eq(deviceGroupSchema.userId, user.id)))
    .returning({ id: deviceGroupSchema.id });

  if (!updated) {
    throw new AppError("DEVICE_GROUP_NOT_FOUND");
  }
}
