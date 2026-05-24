import {
  Activity,
  Globe,
  Headphones,
  Lightbulb,
  ListChecks,
  MonitorSpeaker,
  Phone,
  Radio,
  Server,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { DeviceListItem } from "@/components/device-card";

export type DeviceDetailData = {
  audioAssets: Array<{
    audioIndex?: string;
    createdAt: string | Date;
    id: string;
    name: string;
    originalFileName: string;
    sizeBytes?: number | null;
    status: "draft" | "active" | "archived";
    updatedAt: string | Date;
  }>;
  config: {
    stateConfig?: {
      network?: {
        dnsPrimary?: string;
        dnsSecondary?: string;
        gateway?: string;
        ipAddress?: string;
        macAddress?: string;
        subnetMask?: string;
      };
      system?: {
        kernelVersion?: string;
        model?: string;
        serialNumber?: string;
        softwareVersion?: string;
      };
    };
    callConfig?: {
      advanced?: {
        autoAnswerEnabled?: boolean;
        callLimitEnabled?: boolean;
        playPreambleEnabled?: boolean;
        relayDuringCallEnabled?: boolean;
      };
      timings?: {
        answerTimeoutSeconds?: number;
        maxConversationSeconds?: number;
      };
    };
    audioConfig?: {
      advanced?: {
        beepOnBootEnabled?: boolean;
        dtmfPlaybackEnabled?: boolean;
      };
      codecSettings?: {
        enabled?: string[];
      };
      volume?: {
        microphone?: number;
        speaker?: number;
      };
    };
    mqttConfig?: {
      advanced?: {
        tlsEnabled?: boolean;
      };
      connection?: {
        brokerAddress?: string;
        mqttEnabled?: boolean;
        password?: string;
        port?: number;
        username?: string;
      };
    };
    networkConfig?: {
      advanced?: {
        httpApiTokenEnabled?: boolean;
        ipAnnouncementEnabled?: boolean;
      };
      connection?: {
        dhcpEnabled?: boolean;
        dnsPrimary?: string;
        dnsSecondary?: string;
        gateway?: string;
        ipAddress?: string;
        subnetMask?: string;
      };
    };
    sipConfig?: {
      advanced?: {
        maxRegistrationSeconds?: number;
        optionsEnabled?: boolean;
        pbxSipPort?: number;
        proxyEnabled?: boolean;
        registrationMessageFrequencySeconds?: number;
        rtpPortMax?: number;
        rtpPortMin?: number;
        sipPort?: number;
        stunEnabled?: boolean;
        whitelistEnabled?: boolean;
      };
      authentication?: {
        authUsername?: string;
        displayName?: string;
        pbxIpAddress?: string;
        registrationEnabled?: boolean;
        transportProtocol?: "udp" | "tcp" | "tls";
        userPassword?: string;
        username?: string;
      };
    };
    systemConfig?: {
      debug?: {
        enabled?: boolean;
      };
    };
  };
  device: DeviceListItem;
  live: {
    configs?: {
      audio?: {
        codecs_disabled?: string[];
        codecs_enabled?: string[];
        dtmf_audio_enabled?: boolean;
        voip_started_beep_enabled?: boolean;
        volume_microphone?: number;
        volume_speaker?: number;
      };
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
    system?: {
      app_version?: string;
      kernel_version?: string;
      mac_address?: string;
      serial_number?: string;
    };
  };
};

export type AudioConfigDraft = {
  beepOnBootEnabled: boolean;
  dtmfPlaybackEnabled: boolean;
  enabledCodecs: string[];
  microphoneVolume: number;
  speakerVolume: number;
};

export type SipAuthDraft = {
  authUsername: string;
  displayName: string;
  pbxIpAddress: string;
  registrationEnabled: boolean;
  transportProtocol: "udp" | "tcp" | "tls";
  userPassword: string;
  username: string;
};

export type SipAdvancedDraft = {
  maxRegistrationSeconds: number;
  optionsEnabled: boolean;
  pbxSipPort: number;
  proxyEnabled: boolean;
  registrationMessageFrequencySeconds: number;
  rtpPortMax: number;
  rtpPortMin: number;
  sipPort: number;
  stunEnabled: boolean;
  whitelistEnabled: boolean;
};

export type NetworkConnectionDraft = {
  dhcpEnabled: boolean;
  dnsPrimary: string;
  dnsSecondary: string;
  gateway: string;
  ipAddress: string;
  subnetMask: string;
};

export type NetworkAdvancedDraft = {
  httpApiTokenEnabled: boolean;
  ipAnnouncementEnabled: boolean;
};

export type MqttConnectionDraft = {
  brokerAddress: string;
  mqttEnabled: boolean;
  password: string;
  port: number;
  username: string;
};

export type MqttAdvancedDraft = {
  tlsEnabled: boolean;
};

export type CallTimingsDraft = {
  answerTimeoutSeconds: number;
  maxConversationSeconds: number;
};

export type CallBehaviorDraft = {
  autoAnswerEnabled: boolean;
  callLimitEnabled: boolean;
  playPreambleEnabled: boolean;
  relayDuringCallEnabled: boolean;
};

export type SystemDebugDraft = {
  enabled: boolean;
};

export type CommandPreview = {
  params?: Record<string, unknown>;
  path: string;
  title: string;
  topic: string;
};

export type PendingAction = {
  execute: () => Promise<void>;
  preview: CommandPreview;
};

export function normalizeDeviceDetailData(detail: DeviceDetailData) {
  const device = (detail.device ?? {}) as Partial<DeviceListItem>;
  const normalizedDevice: DeviceListItem = {
    connectionStatus:
      device.connectionStatus === "online" ||
      device.connectionStatus === "offline" ||
      device.connectionStatus === "unknown"
        ? device.connectionStatus
        : "unknown",
    createdAt: device.createdAt ?? new Date().toISOString(),
    extension: device.extension ?? "",
    groupId: device.groupId ?? "",
    groupName: device.groupName ?? "",
    id: device.id ?? "",
    isActive: device.isActive ?? false,
    lastSeenAt: device.lastSeenAt ?? null,
    macAddress: device.macAddress ?? null,
    mqttTopic: device.mqttTopic ?? "",
    name: device.name ?? "Device",
    sipPassword: device.sipPassword ?? "",
    sipUser: device.sipUser ?? "",
    status:
      device.status === "active" || device.status === "failed" || device.status === "provisioning"
        ? device.status
        : "provisioning",
    updatedAt: device.updatedAt ?? new Date().toISOString(),
  };

  return {
    ...detail,
    audioAssets: detail.audioAssets ?? [],
    device: normalizedDevice,
    config: {
      ...detail.config,
      audioConfig: detail.config?.audioConfig ?? {},
    },
    live: detail.live ?? {},
  };
}

export function sortStrings(values: string[]) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

export function areStringArraysEqual(left: string[], right: string[]) {
  const sortedLeft = sortStrings(left);
  const sortedRight = sortStrings(right);

  if (sortedLeft.length !== sortedRight.length) {
    return false;
  }

  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

export function isSameRecord<T extends Record<string, string | number | boolean>>(
  left: T,
  right: T,
) {
  return Object.keys(left).every((key) => left[key] === right[key]);
}

export function buildAudioConfigBaseline(detail: DeviceDetailData): AudioConfigDraft {
  const liveAudio = detail.live?.configs?.audio;
  const persistedAudio = detail.config?.audioConfig;

  return {
    beepOnBootEnabled:
      liveAudio?.voip_started_beep_enabled ?? persistedAudio?.advanced?.beepOnBootEnabled ?? false,
    dtmfPlaybackEnabled:
      liveAudio?.dtmf_audio_enabled ?? persistedAudio?.advanced?.dtmfPlaybackEnabled ?? true,
    enabledCodecs: liveAudio?.codecs_enabled ??
      persistedAudio?.codecSettings?.enabled ?? ["G711A", "G711U", "G726", "G729A"],
    microphoneVolume: liveAudio?.volume_microphone ?? persistedAudio?.volume?.microphone ?? 5,
    speakerVolume: liveAudio?.volume_speaker ?? persistedAudio?.volume?.speaker ?? 5,
  };
}

export function buildSipAuthBaseline(detail: DeviceDetailData): SipAuthDraft {
  const persisted = detail.config?.sipConfig?.authentication;
  return {
    authUsername: persisted?.authUsername ?? detail.device.sipUser,
    displayName: persisted?.displayName ?? detail.device.name,
    pbxIpAddress: persisted?.pbxIpAddress ?? "",
    registrationEnabled: persisted?.registrationEnabled ?? true,
    transportProtocol: persisted?.transportProtocol ?? "udp",
    userPassword: persisted?.userPassword ?? detail.device.sipPassword,
    username: persisted?.username ?? detail.device.sipUser,
  };
}

export function buildSipAdvancedBaseline(detail: DeviceDetailData): SipAdvancedDraft {
  const persisted = detail.config?.sipConfig?.advanced;
  return {
    maxRegistrationSeconds: persisted?.maxRegistrationSeconds ?? 60,
    optionsEnabled: persisted?.optionsEnabled ?? true,
    pbxSipPort: persisted?.pbxSipPort ?? 5060,
    proxyEnabled: persisted?.proxyEnabled ?? false,
    registrationMessageFrequencySeconds: persisted?.registrationMessageFrequencySeconds ?? 15,
    rtpPortMax: persisted?.rtpPortMax ?? 20000,
    rtpPortMin: persisted?.rtpPortMin ?? 10000,
    sipPort: persisted?.sipPort ?? 5060,
    stunEnabled: persisted?.stunEnabled ?? false,
    whitelistEnabled: persisted?.whitelistEnabled ?? true,
  };
}

export function buildNetworkConnectionBaseline(detail: DeviceDetailData): NetworkConnectionDraft {
  const persisted = detail.config?.networkConfig?.connection;
  const liveNetwork = detail.live?.network;
  const stateNetwork = detail.config?.stateConfig?.network;
  return {
    dhcpEnabled: persisted?.dhcpEnabled ?? liveNetwork?.is_dhcp ?? true,
    dnsPrimary:
      persisted?.dnsPrimary ?? liveNetwork?.dns_primary_server ?? stateNetwork?.dnsPrimary ?? "",
    dnsSecondary:
      persisted?.dnsSecondary ??
      liveNetwork?.dns_secondary_server ??
      stateNetwork?.dnsSecondary ??
      "",
    gateway: persisted?.gateway ?? liveNetwork?.gateway_ip ?? stateNetwork?.gateway ?? "",
    ipAddress: persisted?.ipAddress ?? liveNetwork?.ip_address ?? stateNetwork?.ipAddress ?? "",
    subnetMask: persisted?.subnetMask ?? liveNetwork?.netmask ?? stateNetwork?.subnetMask ?? "",
  };
}

export function buildNetworkAdvancedBaseline(detail: DeviceDetailData): NetworkAdvancedDraft {
  const persisted = detail.config?.networkConfig?.advanced;
  const liveNetwork = detail.live?.network;
  return {
    httpApiTokenEnabled: persisted?.httpApiTokenEnabled ?? liveNetwork?.http_token_enabled ?? true,
    ipAnnouncementEnabled: persisted?.ipAnnouncementEnabled ?? liveNetwork?.vocalize_ip ?? true,
  };
}

export function buildMqttConnectionBaseline(detail: DeviceDetailData): MqttConnectionDraft {
  const persisted = detail.config?.mqttConfig?.connection;
  return {
    brokerAddress: persisted?.brokerAddress ?? "",
    mqttEnabled: persisted?.mqttEnabled ?? true,
    password: persisted?.password ?? "",
    port: persisted?.port ?? 1883,
    username: persisted?.username ?? detail.device.sipUser,
  };
}

export function buildMqttAdvancedBaseline(detail: DeviceDetailData): MqttAdvancedDraft {
  const persisted = detail.config?.mqttConfig?.advanced;
  return {
    tlsEnabled: persisted?.tlsEnabled ?? false,
  };
}

export function buildCallTimingsBaseline(detail: DeviceDetailData): CallTimingsDraft {
  const persisted = detail.config?.callConfig?.timings;
  return {
    answerTimeoutSeconds: persisted?.answerTimeoutSeconds ?? 30,
    maxConversationSeconds: persisted?.maxConversationSeconds ?? 180,
  };
}

export function buildCallBehaviorBaseline(detail: DeviceDetailData): CallBehaviorDraft {
  const persisted = detail.config?.callConfig?.advanced;
  return {
    autoAnswerEnabled: persisted?.autoAnswerEnabled ?? false,
    callLimitEnabled: persisted?.callLimitEnabled ?? true,
    playPreambleEnabled: persisted?.playPreambleEnabled ?? false,
    relayDuringCallEnabled: persisted?.relayDuringCallEnabled ?? true,
  };
}

export function buildSystemDebugBaseline(detail: DeviceDetailData): SystemDebugDraft {
  return {
    enabled: detail.config?.systemConfig?.debug?.enabled ?? false,
  };
}

export function buildAudioConfigPatch(input: {
  baseline: AudioConfigDraft;
  current: AudioConfigDraft;
}) {
  const config: {
    audioConfig?: {
      advanced?: {
        beepOnBootEnabled?: boolean;
        dtmfPlaybackEnabled?: boolean;
      };
      codecSettings?: {
        enabled?: string[];
      };
      volume?: {
        microphone?: number;
        speaker?: number;
      };
    };
  } = {};

  const audioConfig: NonNullable<typeof config.audioConfig> = {};
  const advanced: NonNullable<NonNullable<typeof config.audioConfig>["advanced"]> = {};
  const codecSettings: NonNullable<NonNullable<typeof config.audioConfig>["codecSettings"]> = {};
  const volume: NonNullable<NonNullable<typeof config.audioConfig>["volume"]> = {};

  if (input.current.beepOnBootEnabled !== input.baseline.beepOnBootEnabled) {
    advanced.beepOnBootEnabled = input.current.beepOnBootEnabled;
  }

  if (input.current.dtmfPlaybackEnabled !== input.baseline.dtmfPlaybackEnabled) {
    advanced.dtmfPlaybackEnabled = input.current.dtmfPlaybackEnabled;
  }

  if (!areStringArraysEqual(input.current.enabledCodecs, input.baseline.enabledCodecs)) {
    codecSettings.enabled = sortStrings(input.current.enabledCodecs);
  }

  if (input.current.microphoneVolume !== input.baseline.microphoneVolume) {
    volume.microphone = input.current.microphoneVolume;
  }

  if (input.current.speakerVolume !== input.baseline.speakerVolume) {
    volume.speaker = input.current.speakerVolume;
  }

  if (Object.keys(advanced).length > 0) {
    audioConfig.advanced = advanced;
  }

  if (Object.keys(codecSettings).length > 0) {
    audioConfig.codecSettings = codecSettings;
  }

  if (Object.keys(volume).length > 0) {
    audioConfig.volume = volume;
  }

  if (Object.keys(audioConfig).length > 0) {
    config.audioConfig = audioConfig;
  }

  return config;
}

export const deviceDetailTabs: Array<{
  icon: LucideIcon;
  label: string;
  disabled: boolean;
  value:
    | "estado"
    | "sip"
    | "rede"
    | "mqtt"
    | "audio"
    | "sensores"
    | "rele"
    | "leds"
    | "multicast"
    | "chamadas"
    | "tarefas"
    | "sistema";
}> = [
  { value: "estado", label: "Estado", icon: Activity, disabled: false },
  { value: "sip", label: "SIP", icon: Phone, disabled: false },
  { value: "rede", label: "Rede", icon: Globe, disabled: false },
  { value: "mqtt", label: "MQTT", icon: Radio, disabled: false },
  { value: "audio", label: "Áudio", icon: Headphones, disabled: false },
  { value: "sensores", label: "Sensores", icon: Activity, disabled: true },
  { value: "rele", label: "Relé", icon: Zap, disabled: true },
  { value: "leds", label: "LEDs", icon: Lightbulb, disabled: true },
  { value: "multicast", label: "Multicast RTP", icon: MonitorSpeaker, disabled: false },
  { value: "chamadas", label: "Chamadas", icon: Phone, disabled: false },
  { value: "tarefas", label: "Tarefas", icon: ListChecks, disabled: true },
  { value: "sistema", label: "Sistema", icon: Server, disabled: false },
];

export const codecCatalog = [
  { label: "G.711 μ-law", mqttName: "G711U" },
  { label: "G.711 A-law", mqttName: "G711A" },
  { label: "G.726", mqttName: "G726" },
  { label: "G.729", mqttName: "G729A" },
];

export function maskSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(maskSensitive);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (["data", "new_password", "old_password", "password", "userPassword"].includes(key)) {
          return [key, "[hidden]"];
        }

        return [key, maskSensitive(nestedValue)];
      }),
    );
  }

  return value;
}

export function createCommandPreview(
  device: DeviceListItem,
  input: Omit<CommandPreview, "topic">,
): CommandPreview {
  return {
    ...input,
    params: input.params ? (maskSensitive(input.params) as Record<string, unknown>) : undefined,
    topic: `${device.mqttTopic}/`,
  };
}
