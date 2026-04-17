import { createDeviceGroupRoute } from "./modules/device-groups/create-device-group/route";
import { deleteDeviceGroupRoute } from "./modules/device-groups/delete-device-group/route";
import {
  getGroupMulticastStatusRoute,
  startGroupMulticastRoute,
  stopGroupMulticastRoute,
  updateGroupMulticastConfigRoute,
} from "./modules/device-groups/group-multicast/routes";
import { listDeviceGroupsRoute } from "./modules/device-groups/list-device-groups/route";
import { updateDeviceGroupRoute } from "./modules/device-groups/update-device-group/route";
import { createDeviceRoute } from "./modules/devices/create-device/route";
import { deleteDeviceRoute } from "./modules/devices/delete-device/route";
import { executeDeviceCommandRoute } from "./modules/devices/execute-device-command/route";
import { getDeviceDetailRoute } from "./modules/devices/get-device-detail/route";
import { listDevicesRoute } from "./modules/devices/list-devices/route";
import { syncDeviceRoute } from "./modules/devices/sync-device/route";
import { updateDeviceRoute } from "./modules/devices/update-device/route";
import { updateDeviceConfigRoute } from "./modules/devices/update-device-config/route";
import { getUserConnectionInfoRoute } from "./modules/users/get-connection-info/route";
import { getUserPbxCredentialsRoute } from "./modules/users/get-pbx-credentials/route";
import { getSetupStatusRoute } from "./modules/users/get-setup-status/route";
import { publicProcedure } from "./procedures";
import type { RouterClient } from "@orpc/server";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  setup: {
    status: getSetupStatusRoute,
  },
  user: {
    pbxCredentials: getUserPbxCredentialsRoute,
    connectionInfo: getUserConnectionInfoRoute,
  },
  group: {
    create: createDeviceGroupRoute,
    list: listDeviceGroupsRoute,
    update: updateDeviceGroupRoute,
    delete: deleteDeviceGroupRoute,
    multicast: {
      updateConfig: updateGroupMulticastConfigRoute,
      start: startGroupMulticastRoute,
      stop: stopGroupMulticastRoute,
      status: getGroupMulticastStatusRoute,
    },
  },
  device: {
    create: createDeviceRoute,
    list: listDevicesRoute,
    update: updateDeviceRoute,
    detail: getDeviceDetailRoute,
    updateConfig: updateDeviceConfigRoute,
    command: executeDeviceCommandRoute,
    sync: syncDeviceRoute,
    delete: deleteDeviceRoute,
  },
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
