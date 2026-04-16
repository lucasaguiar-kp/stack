import { db } from "@stack-pbx/db";
import { deviceGroup as deviceGroupSchema, user as userSchema } from "@stack-pbx/db/schema/index";
import { and, eq } from "drizzle-orm";
import { AppError } from "../../../core/errors/app-error";
import { allocateGroupExtension, allocateMulticastAddress } from "../../users/_shared/pbx";
import type { Input } from "./schema";

export async function createDeviceGroup(input: Input): Promise<void> {
  const user = await db.query.user.findFirst({
    where: eq(userSchema.id, input.requesterId),
  });

  if (!user) {
    throw new AppError("USER_NOT_FOUND");
  }

  const existing = await db.query.deviceGroup.findFirst({
    where: and(eq(deviceGroupSchema.userId, user.id), eq(deviceGroupSchema.name, input.name)),
  });

  if (existing) {
    throw new AppError("DEVICE_GROUP_NAME_ALREADY_EXISTS");
  }

  const [extension, multicastAddress] = await Promise.all([
    allocateGroupExtension(),
    allocateMulticastAddress(),
  ]);

  const [group] = await db
    .insert(deviceGroupSchema)
    .values({
      userId: user.id,
      name: input.name,
      extension,
      multicastAddress,
      description: input.description ?? null,
    })
    .returning({ id: deviceGroupSchema.id });

  if (!group) {
    throw new AppError("INTERNAL_SERVER_ERROR");
  }
}
