import { db } from "@stack-pbx/db";
import {
  device as deviceTable,
  deviceGroup as deviceGroupSchema,
  user as userSchema,
} from "@stack-pbx/db/schema/index";
import { and, asc, eq } from "drizzle-orm";
import { AppError } from "../../../core/errors/app-error";
import type { Input, Output } from "./schema";

export async function listDevices(input: Input): Promise<Output> {
  const user = await db.query.user.findFirst({
    where: eq(userSchema.id, input.requesterId),
  });

  if (!user) {
    throw new AppError("USER_NOT_FOUND");
  }

  const conditions = input.groupId ? [eq(deviceTable.groupId, input.groupId)] : [];
  conditions.unshift(eq(deviceTable.userId, user.id));

  return await db
    .select({
      id: deviceTable.id,
      groupId: deviceTable.groupId,
      name: deviceTable.name,
      extension: deviceTable.extension,
      sipUser: deviceTable.sipUser,
      sipPassword: deviceTable.sipPassword,
      macAddress: deviceTable.macAddress,
      deviceIp: deviceTable.deviceIp,
      mqttTopic: deviceTable.mqttTopic,
      status: deviceTable.status,
      connectionStatus: deviceTable.connectionStatus,
      lastSeenAt: deviceTable.lastSeenAt,
      isActive: deviceTable.isActive,
      createdAt: deviceTable.createdAt,
      updatedAt: deviceTable.updatedAt,
      groupName: deviceGroupSchema.name,
    })
    .from(deviceTable)
    .innerJoin(
      deviceGroupSchema,
      and(eq(deviceTable.groupId, deviceGroupSchema.id), eq(deviceGroupSchema.userId, user.id)),
    )
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(deviceTable.createdAt));
}
