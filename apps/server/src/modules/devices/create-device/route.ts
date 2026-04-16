import { ORPCError } from "@orpc/server";
import { AppError } from "../../../core/errors/app-error";
import { APP_ERROR_MAP } from "../../../core/errors/error-map";
import { protectedProcedure } from "../../../procedures";
import { createDeviceSchema } from "./schema";
import { createDevice } from "./service";

export const createDeviceRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/devices",
    description: "Create a new device with auto-generated SIP credentials and MQTT topic",
    tags: ["devices"],
    successStatus: 201,
  })
  .meta({ authRequired: true })
  .input(createDeviceSchema.omit({ requesterId: true }))
  .errors({
    UNAUTHORIZED: APP_ERROR_MAP.UNAUTHORIZED,
    USER_NOT_FOUND: APP_ERROR_MAP.USER_NOT_FOUND,
    DEVICE_GROUP_NOT_FOUND: APP_ERROR_MAP.DEVICE_GROUP_NOT_FOUND,
    DEVICE_EXTENSION_ALREADY_EXISTS: APP_ERROR_MAP.DEVICE_EXTENSION_ALREADY_EXISTS,
    DEVICE_MQTT_TOPIC_ALREADY_EXISTS: APP_ERROR_MAP.DEVICE_MQTT_TOPIC_ALREADY_EXISTS,
    DEVICE_CREATION_FAILED: APP_ERROR_MAP.DEVICE_CREATION_FAILED,
    MQTT_BROKER_NOT_CONFIGURED: APP_ERROR_MAP.MQTT_BROKER_NOT_CONFIGURED,
    ASTERISK_NOT_CONFIGURED: APP_ERROR_MAP.ASTERISK_NOT_CONFIGURED,
    ASTERISK_PROVISIONING_FAILED: APP_ERROR_MAP.ASTERISK_PROVISIONING_FAILED,
    ASTERISK_RELOAD_FAILED: APP_ERROR_MAP.ASTERISK_RELOAD_FAILED,
  })
  .handler(async ({ context, input, errors }) => {
    try {
      return await createDevice({
        ...input,
        requesterId: context.session.user.id,
      });
    } catch (error) {
      if (error instanceof AppError) {
        const orpcErrors = errors as Record<
          string,
          (options?: { message?: string; cause?: Error }) => Error
        >;
        const createError = orpcErrors[error.code];

        if (createError) {
          throw createError({
            message: error.message,
            cause: error,
          });
        }
      }

      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        cause: error instanceof Error ? error : undefined,
      });
    }
  });
