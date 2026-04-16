import { APP_ERROR_MAP } from "../../../core/errors/error-map";
import { handleError } from "../../../core/http/error-handler";
import { protectedProcedure } from "../../../procedures";
import { listDevicesOutputSchema, listDevicesSchema } from "./schema";
import { listDevices } from "./service";

export const listDevicesRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/devices",
    description: "List devices, optionally filtered by group",
    tags: ["devices"],
    successStatus: 200,
  })
  .meta({ authRequired: true })
  .input(listDevicesSchema.omit({ requesterId: true }))
  .output(listDevicesOutputSchema)
  .errors({
    UNAUTHORIZED: APP_ERROR_MAP.UNAUTHORIZED,
    USER_NOT_FOUND: APP_ERROR_MAP.USER_NOT_FOUND,
  })
  .handler(async ({ context, input }) => {
    try {
      return await listDevices({
        ...input,
        requesterId: context.session.user.id,
      });
    } catch (error) {
      return handleError(error) as never;
    }
  });
