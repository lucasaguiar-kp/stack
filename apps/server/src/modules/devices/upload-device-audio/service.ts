import { db } from "@stack-pbx/db";
import { deviceAudioAsset as deviceAudioAssetTable } from "@stack-pbx/db/schema/index";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { AppError } from "../../../core/errors/app-error";
import { convertAudioFileToDeviceBase64 } from "../_shared/audio-converter";
import { getAuthorizedDeviceOrThrow } from "../_shared/device-access";
import { isMissingRelationError } from "../_shared/device-config-defaults";
import { sendDeviceMqttRequest } from "../_shared/device-mqtt-client";

type UploadDeviceAudioInput = {
  audioName?: string;
  deviceId: string;
  file: File;
  playNow?: boolean;
  requesterId: string;
};

function stripFileExtension(value: string) {
  return value.replace(/\.[^/.]+$/, "");
}

function sanitizeAudioName(value: string) {
  const baseName = stripFileExtension(value);
  const normalized = baseName
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

  return normalized || "audio";
}

export async function uploadDeviceAudio(input: UploadDeviceAudioInput) {
  if (!(input.file instanceof File)) {
    throw new AppError("INVALID_REQUEST", {
      message: "Audio file is required",
    });
  }

  const { device } = await getAuthorizedDeviceOrThrow({
    deviceId: input.deviceId,
    requesterId: input.requesterId,
  });

  if (!device.macAddress) {
    throw new AppError("DEVICE_NOT_FOUND", {
      message: "Device does not have a MAC address configured",
    });
  }

  const requestedAudioName = input.audioName?.trim() || stripFileExtension(input.file.name);
  const displayName = requestedAudioName || "Audio";
  const deviceAudioSlug = sanitizeAudioName(displayName);
  const deviceAudioName = input.playNow
    ? deviceAudioSlug
    : `${deviceAudioSlug}-${randomUUID()
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 8)
        .toLowerCase()}`;
  const audioFileName = `${deviceAudioName}.wav`;
  const audioRaw = await convertAudioFileToDeviceBase64(input.file, deviceAudioName);

  await sendDeviceMqttRequest({
    macAddress: device.macAddress,
    path: input.playNow ? "v1/audios/upload-play" : "v1/audios/upload",
    params: {
      data: audioRaw,
      file: audioFileName,
    },
  });

  if (input.playNow) {
    return {
      audioIndex: undefined,
      audioName: audioFileName,
      displayName,
      deviceId: device.id,
      playNow: true,
    };
  }

  // Upload MQTT respondeu com sucesso — salva otimisticamente no DB sem re-consultar o device
  try {
    const existingAsset = await db.query.deviceAudioAsset.findFirst({
      where: and(
        eq(deviceAudioAssetTable.deviceId, device.id),
        eq(deviceAudioAssetTable.name, audioFileName),
      ),
    });

    const nextValues = {
      mimeType: input.file.type || "audio/wav",
      name: audioFileName,
      originalFileName: `${displayName}.wav`,
      sizeBytes: input.file.size,
      sortOrder: 0,
      status: "active" as const,
      storagePath: `mqtt://${device.id}/pending`,
    };

    if (existingAsset) {
      await db
        .update(deviceAudioAssetTable)
        .set(nextValues)
        .where(eq(deviceAudioAssetTable.id, existingAsset.id));
    } else {
      await db.insert(deviceAudioAssetTable).values({
        deviceId: device.id,
        ...nextValues,
      });
    }
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error;
    }
  }

  return {
    audioName: audioFileName,
    displayName,
    deviceId: device.id,
    playNow: false,
  };
}
