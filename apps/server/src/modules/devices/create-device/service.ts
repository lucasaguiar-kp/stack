import { db } from "@stack-pbx/db";
import {
  device as deviceTable,
  deviceGroup as deviceGroupSchema,
  user as userSchema,
} from "@stack-pbx/db/schema/index";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { AppError } from "../../../core/errors/app-error";
import {
  provisionDeviceInAsterisk,
  waitForDeviceRegistrationInAsterisk,
} from "../_shared/asterisk-provisioning";
import { markDeviceOnlineByTopic } from "../_shared/device-presence";
import {
  buildDeviceTopicBase,
  normalizeDeviceMacAddress,
  provisionDeviceOverMqtt,
} from "../_shared/mqtt-provisioning";
import { allocateDevicePbxIdentity } from "../_shared/pbx";
import { buildGroupScopedSipUser } from "../_shared/sip-identity";
import type { Input } from "./schema";

function isUniqueViolation(error: unknown): error is {
  code: string;
  constraint?: string;
} {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function createDevice(input: Input): Promise<void> {
  const macAddress = normalizeDeviceMacAddress(input.macAddress);

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

  const mqttTopic = buildDeviceTopicBase(macAddress);
  const existingDevice = await db.query.device.findFirst({
    where: eq(deviceTable.mqttTopic, mqttTopic),
  });

  let extension: string;
  let sipUser: string;
  let sipPassword: string;
  let created;

  if (existingDevice) {
    if (existingDevice.status !== "failed") {
      throw new AppError("DEVICE_MQTT_TOPIC_ALREADY_EXISTS");
    }

    extension = existingDevice.extension;
    sipUser = buildGroupScopedSipUser({
      groupKey: group.extension ?? group.id,
      extension,
    });
    sipPassword = existingDevice.sipPassword;

    [created] = await db
      .update(deviceTable)
      .set({
        groupId: group.id,
        userId: user.id,
        name: input.name,
        macAddress,
        deviceIp: input.deviceIp,
        mqttTopic,
        sipUser,
        status: "provisioning",
        connectionStatus: "unknown",
        isActive: true,
      })
      .where(eq(deviceTable.id, existingDevice.id))
      .returning();
  } else {
    const pbxIdentity = await allocateDevicePbxIdentity({
      groupKey: group.extension ?? group.id,
    });

    extension = pbxIdentity.extension;
    sipUser = pbxIdentity.sipUser;
    sipPassword = randomBytes(12).toString("base64url");

    [created] = await db
      .insert(deviceTable)
      .values({
        userId: user.id,
        groupId: group.id,
        name: input.name,
        extension,
        sipUser,
        sipPassword,
        macAddress,
        deviceIp: input.deviceIp,
        mqttTopic,
        status: "provisioning",
        connectionStatus: "unknown",
      })
      .returning()
      .catch((error: unknown) => {
        if (isUniqueViolation(error) && error.constraint === "device_mqttTopic_unique") {
          throw new AppError("DEVICE_MQTT_TOPIC_ALREADY_EXISTS");
        }

        throw error;
      });
  }

  if (!created) {
    throw new AppError("DEVICE_CREATION_FAILED");
  }

  let mqttProvisioned = false;

  try {
    await provisionDeviceInAsterisk({
      groupId: group.id,
      sipUser,
      extension,
      mqttTopic,
      sipPassword,
      deviceId: created.id,
      deviceName: input.name,
    });

    await provisionDeviceOverMqtt({
      extension,
      sipUser,
      deviceIp: created.deviceIp ?? input.deviceIp,
      macAddress,
      sipPassword,
    });
    mqttProvisioned = true;
    await markDeviceOnlineByTopic(mqttTopic);

    await waitForDeviceRegistrationInAsterisk({ sipUser });
    await db
      .update(deviceTable)
      .set({
        connectionStatus: "online",
        lastSeenAt: new Date(),
        status: "active",
      })
      .where(eq(deviceTable.id, created.id));
  } catch (error) {
    console.error("Device provisioning failed", {
      deviceId: created.id,
      mqttProvisioned,
      error,
    });

    await db
      .update(deviceTable)
      .set({
        connectionStatus: mqttProvisioned ? "online" : "unknown",
        lastSeenAt: mqttProvisioned ? new Date() : null,
        status: "failed",
      })
      .where(eq(deviceTable.id, created.id));
  }
}
