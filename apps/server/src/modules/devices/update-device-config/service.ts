import { getAuthorizedDeviceOrThrow } from "../_shared/device-access";
import { createDefaultDeviceConfig, mergeWithProvisionedDeviceConfig } from "../_shared/device-config-defaults";
import { sendDeviceMqttRequest } from "../_shared/device-mqtt-client";
import { buildDeviceConfigPatch } from "../_shared/device-mqtt-config-mapper";
import type { Input, Output } from "./schema";

export async function updateDeviceConfig(input: Input): Promise<Output> {
  const { device } = await getAuthorizedDeviceOrThrow(input);
  const { params, syncedSections } = buildDeviceConfigPatch(input.config);

  if (input.syncWithDevice && device.macAddress && Object.keys(params).length > 0) {
    await sendDeviceMqttRequest({
      macAddress: device.macAddress,
      path: "v1/configs",
      params,
    });
  }

  return {
    config: mergeWithProvisionedDeviceConfig(
      {
        ...createDefaultDeviceConfig(),
        ...input.config,
      },
      {
        extension: device.extension,
        mqttTopic: device.mqttTopic,
        sipPassword: device.sipPassword,
        sipUser: device.sipUser,
      },
    ),
    deviceId: device.id,
    storedOnlySections: [],
    syncedSections,
  };
}
