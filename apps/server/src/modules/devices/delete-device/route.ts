import { APP_ERROR_MAP } from "../../../core/errors/error-map";
import { handleError } from "../../../core/http/error-handler";
import { protectedProcedure } from "../../../procedures";
import { deleteDeviceSchema } from "./schema";
import { deleteDevice } from "./service";

export const deleteDeviceRoute = protectedProcedure
  .route({
    method: "DELETE",
    path: "/devices/:deviceId",
    description: "Delete a device",
    tags: ["devices"],
    successStatus: 204,
  })
  .meta({ authRequired: true })
  .input(deleteDeviceSchema.omit({ requesterId: true }))
  .errors({
    UNAUTHORIZED: APP_ERROR_MAP.UNAUTHORIZED,
    USER_NOT_FOUND: APP_ERROR_MAP.USER_NOT_FOUND,
    DEVICE_NOT_FOUND: APP_ERROR_MAP.DEVICE_NOT_FOUND,
    ASTERISK_NOT_CONFIGURED: APP_ERROR_MAP.ASTERISK_NOT_CONFIGURED,
    ASTERISK_PROVISIONING_FAILED: APP_ERROR_MAP.ASTERISK_PROVISIONING_FAILED,
    ASTERISK_RELOAD_FAILED: APP_ERROR_MAP.ASTERISK_RELOAD_FAILED,
  })
  .handler(async ({ context, input }) => {
    try {
      await deleteDevice({
        ...input,
        requesterId: context.session.user.id,
      });
    } catch (error) {
      return handleError(error) as never;
    }
  });
