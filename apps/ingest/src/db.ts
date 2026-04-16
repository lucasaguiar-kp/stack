import { db } from "@stack-pbx/db";
import { device as deviceTable } from "@stack-pbx/db/schema/index";
import { and, eq, ne } from "drizzle-orm";

export async function loadActiveDevices() {
  return db.query.device.findMany({
    where: and(eq(deviceTable.isActive, true), eq(deviceTable.status, "active")),
  });
}

export async function markDeviceOnline(mqttTopic: string) {
  return await db
    .update(deviceTable)
    .set({
      connectionStatus: "online",
      lastSeenAt: new Date(),
    })
    .where(and(eq(deviceTable.mqttTopic, mqttTopic), ne(deviceTable.connectionStatus, "online")))
    .returning({
      id: deviceTable.id,
      connectionStatus: deviceTable.connectionStatus,
    });
}

export async function markDeviceOffline(mqttTopic: string) {
  return await db
    .update(deviceTable)
    .set({
      connectionStatus: "offline",
    })
    .where(and(eq(deviceTable.mqttTopic, mqttTopic), ne(deviceTable.connectionStatus, "offline")))
    .returning({
      id: deviceTable.id,
      connectionStatus: deviceTable.connectionStatus,
    });
}
