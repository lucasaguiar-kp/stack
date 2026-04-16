import { APP_ERROR_MAP } from "../../../core/errors/error-map";
import { handleError } from "../../../core/http/error-handler";
import { protectedProcedure } from "../../../procedures";
import { listDeviceGroupsOutputSchema, listDeviceGroupsSchema } from "./schema";
import { listDeviceGroups } from "./service";

export const listDeviceGroupsRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/groups",
    description: "List groups",
    tags: ["groups"],
    successStatus: 200,
  })
  .meta({ authRequired: true })
  .input(listDeviceGroupsSchema.omit({ requesterId: true }))
  .output(listDeviceGroupsOutputSchema)
  .errors({
    UNAUTHORIZED: APP_ERROR_MAP.UNAUTHORIZED,
    USER_NOT_FOUND: APP_ERROR_MAP.USER_NOT_FOUND,
  })
  .handler(async ({ context, input }) => {
    try {
      return await listDeviceGroups({
        ...input,
        requesterId: context.session.user.id,
      });
    } catch (error) {
      return handleError(error) as never;
    }
  });
