import { db } from "@stack-pbx/db";
import { device as deviceTable, deviceGroup as deviceGroupSchema, user as userSchema } from "@stack-pbx/db/schema/index";
import { and, eq } from "drizzle-orm";
import { AppError } from "../../../core/errors/app-error";
import { provisionDeviceInAsterisk, waitForDeviceRegistrationInAsterisk } from "../_shared/asterisk-provisioning";
import { provisionDeviceOverMqtt } from "../_shared/mqtt-provisioning";
import type { Input, Output } from "./schema";

export async function syncDevice(input: Input): Promise<Output> {
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

  const group = await db.query.deviceGroup.findFirst({
    where: and(eq(deviceGroupSchema.id, device.groupId), eq(deviceGroupSchema.userId, user.id)),
  });

  if (!group) {
    throw new AppError("DEVICE_GROUP_NOT_FOUND");
  }

  const [provisioningDevice] = await db
    .update(deviceTable)
    .set({
      status: "provisioning",
      isActive: true,
    })
    .where(eq(deviceTable.id, device.id))
    .returning();

  const currentDevice = provisioningDevice ?? device;
  let mqttProvisioned = false;
  let syncMessage: string | undefined;

  try {
    await provisionDeviceInAsterisk({
      groupId: group.id,
      sipUser: currentDevice.sipUser,
      extension: currentDevice.extension,
      mqttTopic: currentDevice.mqttTopic,
      sipPassword: currentDevice.sipPassword,
      deviceId: currentDevice.id,
      deviceName: currentDevice.name,
    });

    if (currentDevice.macAddress) {
      try {
        await provisionDeviceOverMqtt({
          extension: currentDevice.extension,
          sipUser: currentDevice.sipUser,
          deviceIp: currentDevice.deviceIp,
          macAddress: currentDevice.macAddress,
          sipPassword: currentDevice.sipPassword,
        });
        mqttProvisioned = true;
      } catch (error) {
        syncMessage =
          error instanceof Error
            ? error.message
            : "Nao foi possivel conectar no device pelo IP salvo. O device pode estar desligado ou pode ter recebido outro IP via DHCP.";
        console.warn("Device HTTPS/MQTT provisioning did not complete before SIP check", {
          deviceId: currentDevice.id,
          error,
        });
      }
    }

    await waitForDeviceRegistrationInAsterisk({
      deviceIp: currentDevice.deviceIp,
      extension: currentDevice.extension,
      sipUser: currentDevice.sipUser,
    });

    const [activeDevice] = await db
      .update(deviceTable)
      .set({
        status: "active",
      })
      .where(eq(deviceTable.id, currentDevice.id))
      .returning();

    if (!activeDevice) {
      throw new AppError("DEVICE_CREATION_FAILED");
    }

    return activeDevice;
  } catch (error) {
    syncMessage =
      syncMessage ??
      (error instanceof Error
        ? error.message
        : "Nao foi possivel concluir a sincronizacao do device.");
    console.error("Device sync failed", {
      deviceId: currentDevice.id,
      error,
      mqttProvisioned,
    });

    const [failedDevice] = await db
      .update(deviceTable)
      .set({
        status: "failed",
      })
      .where(eq(deviceTable.id, currentDevice.id))
      .returning();

    return {
      ...(failedDevice ?? currentDevice),
      syncMessage,
    };
  }
}
