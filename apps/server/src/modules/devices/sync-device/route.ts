import { APP_ERROR_MAP } from "../../../core/errors/error-map";
import { handleError } from "../../../core/http/error-handler";
import { protectedProcedure } from "../../../procedures";
import { syncDeviceOutputSchema, syncDeviceSchema } from "./schema";
import { syncDevice } from "./service";

export const syncDeviceRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/devices/:deviceId/sync",
    description: "Retry PBX and MQTT synchronization for a device",
    tags: ["devices"],
    successStatus: 200,
  })
  .meta({ authRequired: true })
  .input(syncDeviceSchema.omit({ requesterId: true }))
  .output(syncDeviceOutputSchema)
  .errors({
    UNAUTHORIZED: APP_ERROR_MAP.UNAUTHORIZED,
    USER_NOT_FOUND: APP_ERROR_MAP.USER_NOT_FOUND,
    DEVICE_NOT_FOUND: APP_ERROR_MAP.DEVICE_NOT_FOUND,
    DEVICE_GROUP_NOT_FOUND: APP_ERROR_MAP.DEVICE_GROUP_NOT_FOUND,
    MQTT_BROKER_NOT_CONFIGURED: APP_ERROR_MAP.MQTT_BROKER_NOT_CONFIGURED,
    ASTERISK_NOT_CONFIGURED: APP_ERROR_MAP.ASTERISK_NOT_CONFIGURED,
    ASTERISK_RELOAD_FAILED: APP_ERROR_MAP.ASTERISK_RELOAD_FAILED,
  })
  .handler(async ({ context, input }) => {
    try {
      return await syncDevice({
        ...input,
        requesterId: context.session.user.id,
      });
    } catch (error) {
      return handleError(error) as never;
    }
  });
