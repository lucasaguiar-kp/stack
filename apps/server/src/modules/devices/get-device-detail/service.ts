import { db } from "@stack-pbx/db";
import { getAuthorizedDeviceOrThrow } from "../_shared/device-access";
import {
  createDefaultDeviceConfig,
  isMissingRelationError,
  mergeWithProvisionedDeviceConfig,
} from "../_shared/device-config-defaults";
import { sendDeviceMqttRequest } from "../_shared/device-mqtt-client";
import type { Input, Output } from "./schema";

const DETAIL_MQTT_TIMEOUT_MS = 2500;

type DeviceConfigsResponse = {
  audio?: {
    codecs_disabled?: string[];
    codecs_enabled?: string[];
    dtmf_audio_enabled?: boolean;
    voip_started_beep_enabled?: boolean;
    volume_microphone?: number;
    volume_speaker?: number;
  };
  calls?: Record<string, unknown>;
  gpio?: Record<string, unknown>;
  mqtt?: {
    broker_address?: string;
    mqtt_enabled?: boolean;
    mqtt_password?: string;
    mqtt_port?: number;
    mqtt_username?: string;
    publish_topic?: string;
    subscribe_topic?: string;
    tls_connection_enabled?: boolean;
  };
  network?: {
    dns_primary_server?: string;
    dns_secondary_server?: string;
    gateway_ip?: string;
    http_token_enabled?: boolean;
    ip_address?: string;
    is_dhcp?: boolean;
    netmask?: string;
    vocalize_ip?: boolean;
  };
  sip?: {
    is_registered_on_pabx?: boolean;
    status?: string;
  };
};

type DeviceAudiosResponse = Record<
  string,
  {
    file_name: string;
    file_size: number;
  }
>;

function buildResolvedConfig(input: {
  device: {
    extension: string;
    mqttTopic: string;
    sipPassword: string;
    sipUser: string;
  };
  mqttConfigs?: DeviceConfigsResponse;
}) {
  const baseConfig = mergeWithProvisionedDeviceConfig(createDefaultDeviceConfig(), {
    extension: input.device.extension,
    mqttTopic: input.device.mqttTopic,
    sipPassword: input.device.sipPassword,
    sipUser: input.device.sipUser,
  }) as Output["config"];

  const liveConfig = input.mqttConfigs;

  return {
    ...baseConfig,
    audioConfig: {
      ...baseConfig.audioConfig,
      advanced: {
        ...baseConfig.audioConfig?.advanced,
        beepOnBootEnabled:
          liveConfig?.audio?.voip_started_beep_enabled ??
          baseConfig.audioConfig?.advanced?.beepOnBootEnabled,
        dtmfPlaybackEnabled:
          liveConfig?.audio?.dtmf_audio_enabled ??
          baseConfig.audioConfig?.advanced?.dtmfPlaybackEnabled,
      },
      codecSettings: {
        ...baseConfig.audioConfig?.codecSettings,
        enabled:
          liveConfig?.audio?.codecs_enabled ?? baseConfig.audioConfig?.codecSettings?.enabled,
      },
      volume: {
        ...baseConfig.audioConfig?.volume,
        microphone:
          liveConfig?.audio?.volume_microphone ?? baseConfig.audioConfig?.volume?.microphone,
        speaker: liveConfig?.audio?.volume_speaker ?? baseConfig.audioConfig?.volume?.speaker,
      },
    },
    mqttConfig: {
      ...baseConfig.mqttConfig,
      advanced: {
        ...baseConfig.mqttConfig?.advanced,
        tlsEnabled:
          liveConfig?.mqtt?.tls_connection_enabled ?? baseConfig.mqttConfig?.advanced?.tlsEnabled,
      },
      connection: {
        ...baseConfig.mqttConfig?.connection,
        brokerAddress:
          liveConfig?.mqtt?.broker_address ?? baseConfig.mqttConfig?.connection?.brokerAddress,
        mqttEnabled:
          liveConfig?.mqtt?.mqtt_enabled ?? baseConfig.mqttConfig?.connection?.mqttEnabled,
        password: liveConfig?.mqtt?.mqtt_password ?? baseConfig.mqttConfig?.connection?.password,
        port: liveConfig?.mqtt?.mqtt_port ?? baseConfig.mqttConfig?.connection?.port,
        publishTopic:
          liveConfig?.mqtt?.publish_topic ?? baseConfig.mqttConfig?.connection?.publishTopic,
        subscribeTopic:
          liveConfig?.mqtt?.subscribe_topic ?? baseConfig.mqttConfig?.connection?.subscribeTopic,
        username: liveConfig?.mqtt?.mqtt_username ?? baseConfig.mqttConfig?.connection?.username,
      },
    },
    networkConfig: {
      ...baseConfig.networkConfig,
      advanced: {
        ...baseConfig.networkConfig?.advanced,
        httpApiTokenEnabled:
          liveConfig?.network?.http_token_enabled ??
          baseConfig.networkConfig?.advanced?.httpApiTokenEnabled,
        ipAnnouncementEnabled:
          liveConfig?.network?.vocalize_ip ??
          baseConfig.networkConfig?.advanced?.ipAnnouncementEnabled,
      },
      connection: {
        ...baseConfig.networkConfig?.connection,
        dhcpEnabled:
          liveConfig?.network?.is_dhcp ?? baseConfig.networkConfig?.connection?.dhcpEnabled,
        dnsPrimary:
          liveConfig?.network?.dns_primary_server ??
          baseConfig.networkConfig?.connection?.dnsPrimary,
        dnsSecondary:
          liveConfig?.network?.dns_secondary_server ??
          baseConfig.networkConfig?.connection?.dnsSecondary,
        gateway: liveConfig?.network?.gateway_ip ?? baseConfig.networkConfig?.connection?.gateway,
        ipAddress:
          liveConfig?.network?.ip_address ?? baseConfig.networkConfig?.connection?.ipAddress,
        subnetMask:
          liveConfig?.network?.netmask ?? baseConfig.networkConfig?.connection?.subnetMask,
      },
    },
    sipConfig: {
      ...baseConfig.sipConfig,
      authentication: {
        ...baseConfig.sipConfig?.authentication,
        registrationEnabled:
          liveConfig?.sip?.is_registered_on_pabx ??
          baseConfig.sipConfig?.authentication?.registrationEnabled,
      },
    },
  };
}

export async function getDeviceDetail(input: Input): Promise<Output> {
  const { device, group } = await getAuthorizedDeviceOrThrow(input);
  const audioAssets = await db.query.deviceAudioAsset
    .findMany({
      where: (deviceAudioAsset, { eq }) => eq(deviceAudioAsset.deviceId, device.id),
      orderBy: (deviceAudioAsset, { asc, desc }) => [
        asc(deviceAudioAsset.sortOrder),
        desc(deviceAudioAsset.createdAt),
      ],
    })
    .catch((error) => {
      if (isMissingRelationError(error)) {
        return [];
      }

      throw error;
    });
  const [mqttConfigsResult, mqttAudiosResult] = device.macAddress
    ? await Promise.allSettled([
        sendDeviceMqttRequest<DeviceConfigsResponse>({
          macAddress: device.macAddress,
          path: "v1/configs",
          connectTimeoutMs: DETAIL_MQTT_TIMEOUT_MS,
          responseTimeoutMs: DETAIL_MQTT_TIMEOUT_MS,
        }),
        sendDeviceMqttRequest<DeviceAudiosResponse>({
          macAddress: device.macAddress,
          path: "v1/audios",
          connectTimeoutMs: DETAIL_MQTT_TIMEOUT_MS,
          responseTimeoutMs: DETAIL_MQTT_TIMEOUT_MS,
        }),
      ])
    : [undefined, undefined, undefined];

  const mqttConfigs =
    mqttConfigsResult?.status === "fulfilled" ? mqttConfigsResult.value.params : undefined;
  const mqttAudios =
    mqttAudiosResult?.status === "fulfilled" ? mqttAudiosResult.value.params : undefined;
  const config = buildResolvedConfig({
    device: {
      extension: device.extension,
      mqttTopic: device.mqttTopic,
      sipPassword: device.sipPassword,
      sipUser: device.sipUser,
    },
    mqttConfigs,
  });
  const stateConfig = config.stateConfig as Output["config"]["stateConfig"];
  const sipConfig = config.sipConfig as Output["config"]["sipConfig"];
  const audioConfig = config.audioConfig as Output["config"]["audioConfig"];
  const taskConfig = config.taskConfig as Output["config"]["taskConfig"];

  const resolvedAudioAssets =
    mqttAudios && Object.keys(mqttAudios).length > 0
      ? Object.entries(mqttAudios).map(([audioIndex, audio]) => {
          const storedAudio = audioAssets.find((asset) => asset.name === audio.file_name);

          return {
            audioIndex,
            createdAt: storedAudio?.createdAt ?? new Date(),
            id: storedAudio?.id ?? `${device.id}:${audioIndex}`,
            name: audio.file_name,
            originalFileName: storedAudio?.originalFileName ?? audio.file_name,
            sizeBytes: audio.file_size,
            status: storedAudio?.status ?? ("active" as const),
            updatedAt: storedAudio?.updatedAt ?? new Date(),
          };
        })
      : audioAssets.map((audio) => ({
          ...audio,
          audioIndex:
            audio.sortOrder > 0
              ? String(audio.sortOrder)
              : audio.storagePath?.split("/").at(-1) || undefined,
        }));

  const live: Output["live"] = {
    configs: {
      audio: {
        codecs_enabled: mqttConfigs?.audio?.codecs_enabled ?? audioConfig?.codecSettings?.enabled,
        dtmf_audio_enabled:
          mqttConfigs?.audio?.dtmf_audio_enabled ?? audioConfig?.advanced?.dtmfPlaybackEnabled,
        voip_started_beep_enabled:
          mqttConfigs?.audio?.voip_started_beep_enabled ?? audioConfig?.advanced?.beepOnBootEnabled,
        volume_microphone: mqttConfigs?.audio?.volume_microphone ?? audioConfig?.volume?.microphone,
        volume_speaker: mqttConfigs?.audio?.volume_speaker ?? audioConfig?.volume?.speaker,
      },
    },
    network: {
      dns_primary_server:
        mqttConfigs?.network?.dns_primary_server ?? stateConfig?.network?.dnsPrimary,
      dns_secondary_server:
        mqttConfigs?.network?.dns_secondary_server ?? stateConfig?.network?.dnsSecondary,
      gateway_ip: mqttConfigs?.network?.gateway_ip ?? stateConfig?.network?.gateway,
      http_token_enabled: mqttConfigs?.network?.http_token_enabled,
      ip_address: mqttConfigs?.network?.ip_address ?? stateConfig?.network?.ipAddress,
      is_dhcp: mqttConfigs?.network?.is_dhcp,
      netmask: mqttConfigs?.network?.netmask ?? stateConfig?.network?.subnetMask,
      vocalize_ip: mqttConfigs?.network?.vocalize_ip,
    },
    relays: undefined,
    schedulerTasks: taskConfig?.jobs,
    sip: {
      is_registered_on_pabx:
        mqttConfigs?.sip?.is_registered_on_pabx ?? sipConfig?.authentication?.registrationEnabled,
      status: mqttConfigs?.sip?.status ?? stateConfig?.callState,
    },
    system: {
      app_version: stateConfig?.system?.softwareVersion,
      kernel_version: stateConfig?.system?.kernelVersion,
      mac_address: stateConfig?.network?.macAddress ?? device.macAddress ?? undefined,
      serial_number: stateConfig?.system?.serialNumber,
    },
  };

  return {
    audioAssets: resolvedAudioAssets,
    config: {
      stateConfig: config.stateConfig ?? {},
      sipConfig: config.sipConfig ?? {},
      networkConfig: config.networkConfig ?? {},
      mqttConfig: config.mqttConfig ?? {},
      audioConfig: config.audioConfig ?? {},
      sensorFlowConfig: config.sensorFlowConfig ?? {},
      relayConfig: config.relayConfig ?? {},
      ledConfig: config.ledConfig ?? {},
      multicastConfig: config.multicastConfig ?? {},
      callConfig: config.callConfig ?? {},
      taskConfig: config.taskConfig ?? {},
      systemConfig: config.systemConfig ?? {},
    },
    device: {
      ...device,
      groupName: group.name,
    },
    live,
  };
}
