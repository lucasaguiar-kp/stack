import { db } from "@stack-pbx/db";
import { device as deviceTable, user as userSchema } from "@stack-pbx/db/schema/index";
import { and, eq } from "drizzle-orm";
import { AppError } from "../../../core/errors/app-error";
import {
  removeDeviceFromAsterisk,
  syncGroupDialplanInAsterisk,
} from "../_shared/asterisk-provisioning";
import type { Input } from "./schema";

export async function deleteDevice(input: Input): Promise<void> {
  const user = await db.query.user.findFirst({
    where: eq(userSchema.id, input.requesterId),
  });

  if (!user) {
    throw new AppError("USER_NOT_FOUND");
  }

  const device = await db.query.device.findFirst({
    where: and(
      eq(deviceTable.id, input.deviceId),
      eq(deviceTable.userId, user.id),
      input.groupId ? eq(deviceTable.groupId, input.groupId) : undefined,
    ),
  });

  if (!device) {
    throw new AppError("DEVICE_NOT_FOUND");
  }

  await db.delete(deviceTable).where(eq(deviceTable.id, device.id));
  await removeDeviceFromAsterisk({ deviceId: device.id });
  await syncGroupDialplanInAsterisk(device.groupId);
}
