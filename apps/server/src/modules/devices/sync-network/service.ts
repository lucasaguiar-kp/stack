import { db } from "@stack-pbx/db";
import { device as deviceTable, user as userSchema } from "@stack-pbx/db/schema/index";
import { eq } from "drizzle-orm";
import { AppError } from "../../../core/errors/app-error";
import { getCurrentLanAddress } from "../../../core/network/lan-address";
import { provisionDeviceInAsterisk } from "../_shared/asterisk-provisioning";
import { provisionDeviceOverMqtt } from "../_shared/mqtt-provisioning";
import type { Input, Output } from "./schema";

export async function syncNetworkDevices(input: Input): Promise<Output> {
  const user = await db.query.user.findFirst({
    where: eq(userSchema.id, input.requesterId),
  });

  if (!user) {
    throw new AppError("USER_NOT_FOUND");
  }

  const currentHost = getCurrentLanAddress();
  const devices = await db.query.device.findMany({
    where: eq(deviceTable.userId, user.id),
  });

  const results: Output["results"] = [];

  for (const device of devices) {
    if (!device.macAddress) {
      results.push({
        deviceId: device.id,
        deviceName: device.name,
        message: "Device sem MAC cadastrado.",
        status: "skipped",
      });
      continue;
    }

    try {
      await provisionDeviceInAsterisk({
        deviceId: device.id,
        deviceName: device.name,
        extension: device.extension,
        groupId: device.groupId,
        mqttTopic: device.mqttTopic,
        sipPassword: device.sipPassword,
        sipUser: device.sipUser,
      });

      await provisionDeviceOverMqtt({
        deviceIp: device.deviceIp,
        extension: device.extension,
        macAddress: device.macAddress,
        sipPassword: device.sipPassword,
        sipUser: device.sipUser,
      });

      await db
        .update(deviceTable)
        .set({
          isActive: true,
          status: "active",
        })
        .where(eq(deviceTable.id, device.id));

      results.push({
        deviceId: device.id,
        deviceName: device.name,
        status: "synced",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel conectar no device. Ele pode estar desligado ou com IP alterado via DHCP.";

      await db
        .update(deviceTable)
        .set({
          status: "failed",
        })
        .where(eq(deviceTable.id, device.id));

      results.push({
        deviceId: device.id,
        deviceName: device.name,
        message,
        status: "failed",
      });
    }
  }

  return {
    currentHost,
    failed: results.filter((result) => result.status === "failed").length,
    results,
    skipped: results.filter((result) => result.status === "skipped").length,
    synced: results.filter((result) => result.status === "synced").length,
    total: results.length,
  };
}
