import { db } from "@stack-pbx/db";
import {
  device as deviceTable,
  deviceGroup as deviceGroupTable,
  deviceGroupMulticastConfig as multicastConfigTable,
} from "@stack-pbx/db/schema/index";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { AppError } from "../../../core/errors/app-error";
import { allocateMulticastAddress } from "../../users/_shared/pbx";
import { sendDeviceMqttRequest } from "../../devices/_shared/device-mqtt-client";
import {
  getMulticastStreamStatus,
  startMulticastStream,
  stopMulticastStream,
} from "../_shared/multicast-stream-manager";
import type {
  GetGroupMulticastStatusInput,
  GroupMulticastStatusOutput,
  StartGroupMulticastInput,
  StopGroupMulticastInput,
  UpdateGroupMulticastConfigInput,
} from "./schema";

async function getGroupOrThrow(groupId: string, requesterId: string) {
  const group = await db.query.deviceGroup.findFirst({
    where: and(eq(deviceGroupTable.id, groupId), eq(deviceGroupTable.userId, requesterId)),
  });

  if (!group) {
    throw new AppError("DEVICE_GROUP_NOT_FOUND");
  }

  return group;
}

async function ensureMulticastAddress(groupId: string, requesterId: string) {
  const group = await getGroupOrThrow(groupId, requesterId);

  if (group.multicastAddress) {
    return group as typeof group & { multicastAddress: string };
  }

  const multicastAddress = await allocateMulticastAddress();

  await db
    .update(deviceGroupTable)
    .set({ multicastAddress })
    .where(eq(deviceGroupTable.id, groupId));

  return { ...group, multicastAddress };
}

async function sendMulticastMqttToDevices(
  groupId: string,
  requesterId: string,
  multicastAddress: string,
  participantDeviceIds: string[],
) {
  const devices = await db.query.device.findMany({
    where: and(eq(deviceTable.groupId, groupId), eq(deviceTable.userId, requesterId)),
  });

  const participantSet = new Set(participantDeviceIds);

  await Promise.allSettled(
    devices
      .filter((d) => d.macAddress)
      .map((d) =>
        sendDeviceMqttRequest({
          macAddress: d.macAddress!,
          path: "v1/configs",
          params: {
            multicast: {
              rtp_1_address: multicastAddress,
              rtp_1_enabled: participantSet.has(d.id),
            },
          },
          waitForStatus: false,
        }),
      ),
  );
}

async function writeAudioTempFile(base64Data: string, fileName: string): Promise<string> {
  const tempId = randomUUID();
  const ext = path.extname(fileName) || ".wav";
  const tempInputPath = path.join(tmpdir(), `multicast-in-${tempId}${ext}`);
  await fs.writeFile(tempInputPath, Buffer.from(base64Data, "base64"));
  return tempInputPath;
}

export async function updateGroupMulticastConfig(input: UpdateGroupMulticastConfigInput) {
  await ensureMulticastAddress(input.groupId, input.requesterId);

  const existing = await db.query.deviceGroupMulticastConfig.findFirst({
    where: eq(multicastConfigTable.groupId, input.groupId),
  });

  const values = {
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl ?? null,
    audioFileData: input.audioFileData ?? null,
    audioFileName: input.audioFileName ?? null,
    participantDeviceIds: input.participantDeviceIds,
  };

  if (existing) {
    await db
      .update(multicastConfigTable)
      .set(values)
      .where(eq(multicastConfigTable.id, existing.id));
  } else {
    await db.insert(multicastConfigTable).values({ groupId: input.groupId, ...values });
  }
}

export async function startGroupMulticast(input: StartGroupMulticastInput) {
  const group = await ensureMulticastAddress(input.groupId, input.requesterId);

  const config = await db.query.deviceGroupMulticastConfig.findFirst({
    where: eq(multicastConfigTable.groupId, input.groupId),
  });

  if (!config) {
    throw new AppError("MULTICAST_CONFIG_NOT_FOUND");
  }

  if (config.sourceType === "radio_url") {
    if (!config.sourceUrl) {
      throw new AppError("INVALID_REQUEST", { message: "Radio URL is required" });
    }
    startMulticastStream(input.groupId, group.multicastAddress, {
      type: "radio_url",
      url: config.sourceUrl,
    });
  } else {
    if (!config.audioFileData || !config.audioFileName) {
      throw new AppError("INVALID_REQUEST", { message: "Audio file is required" });
    }
    const tempFilePath = await writeAudioTempFile(config.audioFileData, config.audioFileName);
    startMulticastStream(input.groupId, group.multicastAddress, {
      type: "audio_file",
      filePath: tempFilePath,
    });
  }

  await sendMulticastMqttToDevices(
    input.groupId,
    input.requesterId,
    group.multicastAddress,
    config.participantDeviceIds,
  );
}

export async function stopGroupMulticast(input: StopGroupMulticastInput) {
  const group = await ensureMulticastAddress(input.groupId, input.requesterId);

  stopMulticastStream(input.groupId);

  await sendMulticastMqttToDevices(input.groupId, input.requesterId, group.multicastAddress, []);
}

export async function getGroupMulticastStatus(
  input: GetGroupMulticastStatusInput,
): Promise<GroupMulticastStatusOutput> {
  const group = await getGroupOrThrow(input.groupId, input.requesterId);

  const status = getMulticastStreamStatus(input.groupId);

  const config = await db.query.deviceGroupMulticastConfig.findFirst({
    where: eq(multicastConfigTable.groupId, input.groupId),
  });

  return {
    running: status.running,
    address: group.multicastAddress ?? null,
    config: config
      ? {
          groupId: input.groupId,
          sourceType: config.sourceType,
          sourceUrl: config.sourceUrl ?? null,
          audioFileName: config.audioFileName ?? null,
          participantDeviceIds: config.participantDeviceIds ?? [],
        }
      : null,
  };
}
