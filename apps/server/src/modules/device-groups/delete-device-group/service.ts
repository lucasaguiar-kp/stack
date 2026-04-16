import { db } from "@stack-pbx/db";
import { device as deviceSchema, deviceGroup as deviceGroupSchema, user as userSchema } from "@stack-pbx/db/schema/index";
import { and, eq } from "drizzle-orm";
import { AppError } from "../../../core/errors/app-error";
import type { Input } from "./schema";

export async function deleteDeviceGroup(input: Input): Promise<void> {
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

  const devices = await db.query.device.findMany({
    where: and(eq(deviceSchema.groupId, input.groupId), eq(deviceSchema.userId, user.id)),
  });

  if (devices.length > 0) {
    throw new AppError("DEVICE_GROUP_HAS_DEVICES");
  }

  await db
    .delete(deviceGroupSchema)
    .where(and(eq(deviceGroupSchema.id, input.groupId), eq(deviceGroupSchema.userId, user.id)));
}
