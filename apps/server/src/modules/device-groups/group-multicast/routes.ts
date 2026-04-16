import { APP_ERROR_MAP } from "../../../core/errors/error-map";
import { handleError } from "../../../core/http/error-handler";
import { protectedProcedure } from "../../../procedures";
import {
  getGroupMulticastStatusSchema,
  groupMulticastStatusOutputSchema,
  startGroupMulticastSchema,
  stopGroupMulticastSchema,
  updateGroupMulticastConfigSchema,
} from "./schema";
import {
  getGroupMulticastStatus,
  startGroupMulticast,
  stopGroupMulticast,
  updateGroupMulticastConfig,
} from "./service";

const MULTICAST_ERRORS = {
  UNAUTHORIZED: APP_ERROR_MAP.UNAUTHORIZED,
  USER_NOT_FOUND: APP_ERROR_MAP.USER_NOT_FOUND,
  DEVICE_GROUP_NOT_FOUND: APP_ERROR_MAP.DEVICE_GROUP_NOT_FOUND,
  MULTICAST_ADDRESS_NOT_ALLOCATED: APP_ERROR_MAP.MULTICAST_ADDRESS_NOT_ALLOCATED,
  MULTICAST_CONFIG_NOT_FOUND: APP_ERROR_MAP.MULTICAST_CONFIG_NOT_FOUND,
  INVALID_REQUEST: APP_ERROR_MAP.INVALID_REQUEST,
};

export const updateGroupMulticastConfigRoute = protectedProcedure
  .route({
    method: "PATCH",
    path: "/groups/:groupId/multicast/config",
    description: "Save multicast config for a group",
    tags: ["groups"],
    successStatus: 204,
  })
  .meta({ authRequired: true })
  .input(updateGroupMulticastConfigSchema.omit({ requesterId: true }))
  .errors(MULTICAST_ERRORS)
  .handler(async ({ context, input }) => {
    try {
      await updateGroupMulticastConfig({ ...input, requesterId: context.session.user.id });
    } catch (error) {
      return handleError(error) as never;
    }
  });

export const startGroupMulticastRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/groups/:groupId/multicast/start",
    description: "Start multicast stream for a group",
    tags: ["groups"],
    successStatus: 204,
  })
  .meta({ authRequired: true })
  .input(startGroupMulticastSchema.omit({ requesterId: true }))
  .errors({ ...MULTICAST_ERRORS, MQTT_BROKER_NOT_CONFIGURED: APP_ERROR_MAP.MQTT_BROKER_NOT_CONFIGURED })
  .handler(async ({ context, input }) => {
    try {
      await startGroupMulticast({ ...input, requesterId: context.session.user.id });
    } catch (error) {
      return handleError(error) as never;
    }
  });

export const stopGroupMulticastRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/groups/:groupId/multicast/stop",
    description: "Stop multicast stream for a group",
    tags: ["groups"],
    successStatus: 204,
  })
  .meta({ authRequired: true })
  .input(stopGroupMulticastSchema.omit({ requesterId: true }))
  .errors({ ...MULTICAST_ERRORS, MQTT_BROKER_NOT_CONFIGURED: APP_ERROR_MAP.MQTT_BROKER_NOT_CONFIGURED })
  .handler(async ({ context, input }) => {
    try {
      await stopGroupMulticast({ ...input, requesterId: context.session.user.id });
    } catch (error) {
      return handleError(error) as never;
    }
  });

export const getGroupMulticastStatusRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/groups/:groupId/multicast/status",
    description: "Get multicast stream status for a group",
    tags: ["groups"],
    successStatus: 200,
  })
  .meta({ authRequired: true })
  .input(getGroupMulticastStatusSchema.omit({ requesterId: true }))
  .output(groupMulticastStatusOutputSchema)
  .errors(MULTICAST_ERRORS)
  .handler(async ({ context, input }) => {
    try {
      return await getGroupMulticastStatus({ ...input, requesterId: context.session.user.id });
    } catch (error) {
      return handleError(error) as never;
    }
  });
