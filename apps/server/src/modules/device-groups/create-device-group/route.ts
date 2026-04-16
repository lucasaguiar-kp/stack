import { APP_ERROR_MAP } from "../../../core/errors/error-map";
import { handleError } from "../../../core/http/error-handler";
import { protectedProcedure } from "../../../procedures";
import { createDeviceGroupSchema } from "./schema";
import { createDeviceGroup } from "./service";

export const createDeviceGroupRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/groups",
    description: "Create a new group",
    tags: ["groups"],
    successStatus: 201,
  })
  .meta({ authRequired: true })
  .input(createDeviceGroupSchema.omit({ requesterId: true }))
  .errors({
    UNAUTHORIZED: APP_ERROR_MAP.UNAUTHORIZED,
    USER_NOT_FOUND: APP_ERROR_MAP.USER_NOT_FOUND,
    DEVICE_GROUP_NAME_ALREADY_EXISTS: APP_ERROR_MAP.DEVICE_GROUP_NAME_ALREADY_EXISTS,
  })
  .handler(async ({ context, input }) => {
    try {
      return await createDeviceGroup({
        ...input,
        requesterId: context.session.user.id,
      });
    } catch (error) {
      return handleError(error) as never;
    }
  });
