import { db } from "@stack-pbx/db";
import { device as deviceTable } from "@stack-pbx/db/schema/index";
import { eq } from "drizzle-orm";

export async function markDeviceOnlineByTopic(mqttTopic: string) {
  await db
    .update(deviceTable)
    .set({
      connectionStatus: "online",
      lastSeenAt: new Date(),
    })
    .where(eq(deviceTable.mqttTopic, mqttTopic));
}
