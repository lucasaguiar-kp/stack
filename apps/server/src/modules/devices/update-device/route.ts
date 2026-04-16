import { APP_ERROR_MAP } from "../../../core/errors/error-map";
import { handleError } from "../../../core/http/error-handler";
import { protectedProcedure } from "../../../procedures";
import { updateDeviceSchema } from "./schema";
import { updateDevice } from "./service";

export const updateDeviceRoute = protectedProcedure
  .route({
    method: "PATCH",
    path: "/devices/:deviceId",
    description: "Update a device",
    tags: ["devices"],
    successStatus: 200,
  })
  .meta({ authRequired: true })
  .input(updateDeviceSchema.omit({ requesterId: true }))
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
      return await updateDevice({
        ...input,
        requesterId: context.session.user.id,
      });
    } catch (error) {
      return handleError(error) as never;
    }
  });
