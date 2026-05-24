import { APP_ERROR_MAP } from "../../../core/errors/error-map";
import { handleError } from "../../../core/http/error-handler";
import { protectedProcedure } from "../../../procedures";
import { syncNetworkDevicesOutputSchema, syncNetworkDevicesSchema } from "./schema";
import { syncNetworkDevices } from "./service";

export const syncNetworkDevicesRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/devices/sync-network",
    description: "Resync PBX and MQTT network settings for all devices",
    tags: ["devices"],
    successStatus: 200,
  })
  .meta({ authRequired: true })
  .input(syncNetworkDevicesSchema.omit({ requesterId: true }))
  .output(syncNetworkDevicesOutputSchema)
  .errors({
    UNAUTHORIZED: APP_ERROR_MAP.UNAUTHORIZED,
    USER_NOT_FOUND: APP_ERROR_MAP.USER_NOT_FOUND,
    MQTT_BROKER_NOT_CONFIGURED: APP_ERROR_MAP.MQTT_BROKER_NOT_CONFIGURED,
    ASTERISK_NOT_CONFIGURED: APP_ERROR_MAP.ASTERISK_NOT_CONFIGURED,
    ASTERISK_RELOAD_FAILED: APP_ERROR_MAP.ASTERISK_RELOAD_FAILED,
  })
  .handler(async ({ context }) => {
    try {
      return await syncNetworkDevices({
        requesterId: context.session.user.id,
      });
    } catch (error) {
      return handleError(error) as never;
    }
  });
