import { APP_ERROR_MAP } from "../../../core/errors/error-map";
import { handleError } from "../../../core/http/error-handler";
import { protectedProcedure } from "../../../procedures";
import { getDeviceDetail } from "./service";
import { getDeviceDetailSchema } from "./schema";

export const getDeviceDetailRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/devices/:deviceId/detail",
    description: "Get device detail, stored configuration, and live MQTT state when available",
    tags: ["devices"],
    successStatus: 200,
  })
  .meta({ authRequired: true })
  .input(getDeviceDetailSchema.omit({ requesterId: true }))
  .errors({
    UNAUTHORIZED: APP_ERROR_MAP.UNAUTHORIZED,
    USER_NOT_FOUND: APP_ERROR_MAP.USER_NOT_FOUND,
    DEVICE_NOT_FOUND: APP_ERROR_MAP.DEVICE_NOT_FOUND,
    DEVICE_GROUP_NOT_FOUND: APP_ERROR_MAP.DEVICE_GROUP_NOT_FOUND,
    MQTT_BROKER_NOT_CONFIGURED: APP_ERROR_MAP.MQTT_BROKER_NOT_CONFIGURED,
  })
  .handler(async ({ context, input }) => {
    try {
      return await getDeviceDetail({
        ...input,
        requesterId: context.session.user.id,
      });
    } catch (error) {
      return handleError(error) as never;
    }
  });
