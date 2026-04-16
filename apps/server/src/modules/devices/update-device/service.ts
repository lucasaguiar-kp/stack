import { db } from "@stack-pbx/db";
import { device as deviceTable, deviceGroup as deviceGroupSchema, user as userSchema } from "@stack-pbx/db/schema/index";
import { and, eq } from "drizzle-orm";
import { AppError } from "../../../core/errors/app-error";
import { provisionDeviceInAsterisk, syncGroupDialplanInAsterisk } from "../_shared/asterisk-provisioning";
import { provisionDeviceOverMqtt } from "../_shared/mqtt-provisioning";
import { buildGroupScopedSipUser } from "../_shared/sip-identity";
import type { Input } from "./schema";

export async function updateDevice(input: Input): Promise<void> {
  const user = await db.query.user.findFirst({
    where: eq(userSchema.id, input.requesterId),
  });

  if (!user) {
    throw new AppError("USER_NOT_FOUND");
  }

  const device = await db.query.device.findFirst({
    where: and(eq(deviceTable.id, input.deviceId), eq(deviceTable.userId, user.id)),
  });

  if (!device) {
    throw new AppError("DEVICE_NOT_FOUND");
  }

  const targetGroup = await db.query.deviceGroup.findFirst({
    where: and(eq(deviceGroupSchema.id, input.groupId), eq(deviceGroupSchema.userId, user.id)),
  });

  if (!targetGroup) {
    throw new AppError("DEVICE_GROUP_NOT_FOUND");
  }

  const previousGroupId = device.groupId;
  const sipUser = buildGroupScopedSipUser({
    groupKey: targetGroup.extension ?? targetGroup.id,
    extension: device.extension,
  });

  const [updated] = await db
    .update(deviceTable)
    .set({
      userId: user.id,
      groupId: targetGroup.id,
      name: input.name,
      deviceIp: input.deviceIp,
      sipUser,
    })
    .where(eq(deviceTable.id, device.id))
    .returning();

  if (!updated) {
    throw new AppError("DEVICE_NOT_FOUND");
  }

  try {
    await provisionDeviceInAsterisk({
      groupId: targetGroup.id,
      sipUser,
      extension: updated.extension,
      mqttTopic: updated.mqttTopic,
      sipPassword: updated.sipPassword,
      deviceId: updated.id,
      deviceName: updated.name,
    });

    if (updated.macAddress) {
      await provisionDeviceOverMqtt({
        extension: updated.extension,
        sipUser,
        deviceIp: updated.deviceIp,
        macAddress: updated.macAddress,
        sipPassword: updated.sipPassword,
      });
    }

    if (previousGroupId !== targetGroup.id) {
      await syncGroupDialplanInAsterisk(previousGroupId);
    }

  } catch {
    await db
      .update(deviceTable)
      .set({
        status: "failed",
      })
      .where(eq(deviceTable.id, updated.id));
  }
}
