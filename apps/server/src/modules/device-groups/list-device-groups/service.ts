import { db } from "@stack-pbx/db";
import { device as deviceSchema, deviceGroup as deviceGroupSchema, user as userSchema } from "@stack-pbx/db/schema/index";
import { and, count, eq } from "drizzle-orm";
import { AppError } from "../../../core/errors/app-error";
import type { Input, Output } from "./schema";

export async function listDeviceGroups(input: Input): Promise<Output> {
  const user = await db.query.user.findFirst({
    where: eq(userSchema.id, input.requesterId),
  });

  if (!user) {
    throw new AppError("USER_NOT_FOUND");
  }

  return await db
    .select({
      id: deviceGroupSchema.id,
      name: deviceGroupSchema.name,
      extension: deviceGroupSchema.extension,
      multicastAddress: deviceGroupSchema.multicastAddress,
      description: deviceGroupSchema.description,
      createdAt: deviceGroupSchema.createdAt,
      updatedAt: deviceGroupSchema.updatedAt,
      deviceCount: count(deviceSchema.id),
    })
    .from(deviceGroupSchema)
    .leftJoin(
      deviceSchema,
      and(eq(deviceSchema.groupId, deviceGroupSchema.id), eq(deviceSchema.userId, user.id)),
    )
    .where(eq(deviceGroupSchema.userId, user.id))
    .groupBy(
      deviceGroupSchema.id,
      deviceGroupSchema.userId,
      deviceGroupSchema.name,
      deviceGroupSchema.extension,
      deviceGroupSchema.multicastAddress,
      deviceGroupSchema.description,
      deviceGroupSchema.createdAt,
      deviceGroupSchema.updatedAt,
    );
}
