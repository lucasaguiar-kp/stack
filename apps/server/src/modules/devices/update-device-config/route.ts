import { APP_ERROR_MAP } from "../../../core/errors/error-map";
import { handleError } from "../../../core/http/error-handler";
import { protectedProcedure } from "../../../procedures";
import { updateDeviceConfig } from "./service";
import { updateDeviceConfigSchema } from "./schema";

export const updateDeviceConfigRoute = protectedProcedure
  .route({
    method: "PATCH",
    path: "/devices/:deviceId/config",
    description: "Update the persisted device configuration and sync supported sections over MQTT",
    tags: ["devices"],
    successStatus: 200,
  })
  .meta({ authRequired: true })
  .input(updateDeviceConfigSchema.omit({ requesterId: true }))
  .errors({
    UNAUTHORIZED: APP_ERROR_MAP.UNAUTHORIZED,
    USER_NOT_FOUND: APP_ERROR_MAP.USER_NOT_FOUND,
    DEVICE_NOT_FOUND: APP_ERROR_MAP.DEVICE_NOT_FOUND,
    DEVICE_GROUP_NOT_FOUND: APP_ERROR_MAP.DEVICE_GROUP_NOT_FOUND,
    MQTT_BROKER_NOT_CONFIGURED: APP_ERROR_MAP.MQTT_BROKER_NOT_CONFIGURED,
    DEVICE_CREATION_FAILED: APP_ERROR_MAP.DEVICE_CREATION_FAILED,
  })
  .handler(async ({ context, input }) => {
    try {
      return await updateDeviceConfig({
        ...input,
        requesterId: context.session.user.id,
      });
    } catch (error) {
      return handleError(error) as never;
    }
  });
