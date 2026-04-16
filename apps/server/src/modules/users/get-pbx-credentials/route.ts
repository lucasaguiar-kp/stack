import { APP_ERROR_MAP } from "../../../core/errors/error-map";
import { handleError } from "../../../core/http/error-handler";
import { protectedProcedure } from "../../../procedures";
import { getUserPbxCredentialsOutputSchema } from "./schema";
import { getUserPbxCredentials } from "./service";

export const getUserPbxCredentialsRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/users/me/pbx-credentials",
    description: "Get the authenticated user PBX credentials",
    tags: ["users"],
    successStatus: 200,
  })
  .meta({ authRequired: true })
  .output(getUserPbxCredentialsOutputSchema)
  .errors({
    UNAUTHORIZED: APP_ERROR_MAP.UNAUTHORIZED,
    USER_NOT_FOUND: APP_ERROR_MAP.USER_NOT_FOUND,
    MEMBER_PBX_IDENTITY_NOT_FOUND: APP_ERROR_MAP.MEMBER_PBX_IDENTITY_NOT_FOUND,
  })
  .handler(async ({ context }) => {
    try {
      return await getUserPbxCredentials({
        requesterId: context.session.user.id,
      });
    } catch (error) {
      return handleError(error) as never;
    }
  });
