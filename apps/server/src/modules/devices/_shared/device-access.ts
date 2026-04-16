import { db } from "@stack-pbx/db";
import {
  device as deviceTable,
  deviceGroup as deviceGroupTable,
  user as userTable,
} from "@stack-pbx/db/schema/index";
import { and, eq } from "drizzle-orm";
import { AppError } from "../../../core/errors/app-error";

export async function getAuthorizedUserOrThrow(requesterId: string) {
  const user = await db.query.user.findFirst({
    where: eq(userTable.id, requesterId),
  });

  if (!user) {
    throw new AppError("USER_NOT_FOUND");
  }

  return user;
}

export async function getAuthorizedDeviceOrThrow(input: {
  deviceId: string;
  requesterId: string;
}) {
  await getAuthorizedUserOrThrow(input.requesterId);

  const device = await db.query.device.findFirst({
    where: and(eq(deviceTable.id, input.deviceId), eq(deviceTable.userId, input.requesterId)),
  });

  if (!device) {
    throw new AppError("DEVICE_NOT_FOUND");
  }

  const group = await db.query.deviceGroup.findFirst({
    where: and(eq(deviceGroupTable.id, device.groupId), eq(deviceGroupTable.userId, input.requesterId)),
  });

  if (!group) {
    throw new AppError("DEVICE_GROUP_NOT_FOUND");
  }

  return {
    device,
    group,
  };
}
