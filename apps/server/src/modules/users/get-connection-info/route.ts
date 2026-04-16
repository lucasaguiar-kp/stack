import { APP_ERROR_MAP } from "../../../core/errors/error-map";
import { handleError } from "../../../core/http/error-handler";
import { protectedProcedure } from "../../../procedures";
import { getUserConnectionInfoOutputSchema } from "./schema";
import { getUserConnectionInfo } from "./service";

export const getUserConnectionInfoRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/users/me/connection-info",
    description: "Get the authenticated user SIP credentials and MQTT broker credentials",
    tags: ["users"],
    successStatus: 200,
  })
  .meta({ authRequired: true })
  .output(getUserConnectionInfoOutputSchema)
  .errors({
    UNAUTHORIZED: APP_ERROR_MAP.UNAUTHORIZED,
    USER_NOT_FOUND: APP_ERROR_MAP.USER_NOT_FOUND,
    MEMBER_PBX_IDENTITY_NOT_FOUND: APP_ERROR_MAP.MEMBER_PBX_IDENTITY_NOT_FOUND,
  })
  .handler(async ({ context }) => {
    try {
      return await getUserConnectionInfo({
        requesterId: context.session.user.id,
      });
    } catch (error) {
      return handleError(error) as never;
    }
  });
