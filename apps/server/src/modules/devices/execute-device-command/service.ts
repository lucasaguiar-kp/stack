import { db } from "@stack-pbx/db";
import { deviceAudioAsset as deviceAudioAssetTable } from "@stack-pbx/db/schema/index";
import { and, eq, or } from "drizzle-orm";
import { AppError } from "../../../core/errors/app-error";
import { getAuthorizedDeviceOrThrow } from "../_shared/device-access";
import { sendDeviceMqttRequest } from "../_shared/device-mqtt-client";
import type { Input, Output } from "./schema";

function assertDeviceMacAddress(macAddress: string | null | undefined): string {
  if (!macAddress) {
    throw new AppError("DEVICE_NOT_FOUND", {
      message: "Device does not have a MAC address configured",
    });
  }

  return macAddress;
}

export async function executeDeviceCommand(input: Input): Promise<Output> {
  const { device } = await getAuthorizedDeviceOrThrow(input);
  const macAddress = assertDeviceMacAddress(device.macAddress);

  const run = async (path: string, params?: Record<string, unknown>) => {
    const response = await sendDeviceMqttRequest({
      macAddress,
      path,
      params,
    });

    return {
      data: response.params,
      deviceId: device.id,
      type: input.command.type,
    };
  };

  switch (input.command.type) {
    case "get-audios":
      return await run("v1/audios");
    case "play-audio":
      return await run(`v1/audios/${input.command.audioId}/play`, {
        milli_seconds_between_play: input.command.milliSecondsBetweenPlay,
        number_of_times: input.command.numberOfTimes,
      });
    case "stop-audio":
      return await run("v1/audios/stop");
    case "upload-audio":
      return await run("v1/audios/upload", {
        data: input.command.data,
        file: input.command.fileName,
      });
    case "upload-and-play-audio":
      return await run("v1/audios/upload-play", {
        data: input.command.data,
        file: input.command.fileName,
      });
    case "delete-audio":
      const deleteResponse = await run(`v1/audios/${input.command.audioId}`);
      await db
        .delete(deviceAudioAssetTable)
        .where(
          and(
            eq(deviceAudioAssetTable.deviceId, device.id),
            or(
              eq(deviceAudioAssetTable.storagePath, `mqtt://${device.id}/${input.command.audioId}`),
              eq(deviceAudioAssetTable.sortOrder, Number(input.command.audioId) || -1),
            ),
          ),
        )
        .catch(() => undefined);
      return deleteResponse;
    case "get-audio-playback-status":
      return await run("v1/audios/is-playing");
    case "get-relays":
      return await run("v1/relays");
    case "set-relay":
      return await run(`v1/relays/${input.command.relayId}`, {
        activate: input.command.activate ?? true,
        mode: input.command.mode,
        pulse_interval_seconds: input.command.pulseIntervalSeconds,
      });
    case "get-sip-status":
      return await run("v1/sip");
    case "make-sip-call":
      return await run("v1/sip/make-call", {
        destination: input.command.destination,
        type: input.command.mode,
      });
    case "drop-sip-call":
      return await run("v1/sip/drop-call");
    case "get-system-status":
      return await run("v1/system");
    case "get-system-logs":
      return await run("v1/system/logs");
    case "reboot":
      return await run("v1/system/reboot");
    case "factory-reset":
      return await run("v1/system/factory-reset");
    case "update-firmware":
      return await run("v1/system/update-firmware", {
        file_name: input.command.fileName,
        file_url: input.command.fileUrl,
      });
    case "change-password":
      return await run("v1/auth/change-password", {
        new_password: input.command.newPassword,
        old_password: input.command.oldPassword,
      });
    case "list-scheduler-tasks":
      return await run("v1/scheduler/tasks");
    case "create-scheduler-task":
      return await run("v1/scheduler/tasks", input.command.task);
    case "update-scheduler-task":
      return await run(`v1/scheduler/tasks/${input.command.taskId}`, input.command.task);
    case "delete-scheduler-task":
      return await run(`v1/scheduler/tasks/${input.command.taskId}`);
  }
}
