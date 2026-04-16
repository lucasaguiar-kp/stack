import { APP_ERROR_MAP } from "../../../core/errors/error-map";
import { handleError } from "../../../core/http/error-handler";
import { protectedProcedure } from "../../../procedures";
import { deleteDeviceGroupSchema } from "./schema";
import { deleteDeviceGroup } from "./service";

export const deleteDeviceGroupRoute = protectedProcedure
  .route({
    method: "DELETE",
    path: "/groups/:groupId",
    description: "Delete a group",
    tags: ["groups"],
    successStatus: 204,
  })
  .meta({ authRequired: true })
  .input(deleteDeviceGroupSchema.omit({ requesterId: true }))
  .errors({
    UNAUTHORIZED: APP_ERROR_MAP.UNAUTHORIZED,
    USER_NOT_FOUND: APP_ERROR_MAP.USER_NOT_FOUND,
    DEVICE_GROUP_NOT_FOUND: APP_ERROR_MAP.DEVICE_GROUP_NOT_FOUND,
    DEVICE_GROUP_HAS_DEVICES: APP_ERROR_MAP.DEVICE_GROUP_HAS_DEVICES,
  })
  .handler(async ({ context, input }) => {
    try {
      await deleteDeviceGroup({
        ...input,
        requesterId: context.session.user.id,
      });
    } catch (error) {
      handleError(error);
    }
  });
