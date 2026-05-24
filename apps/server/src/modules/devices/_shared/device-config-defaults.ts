import { env } from "@stack-pbx/env/server";
import { buildPublicMqttUrl, getCurrentLanAddress } from "../../../core/network/lan-address";

const DEFAULT_AUDIO_CODECS = ["G711A", "G711U", "G726", "G729A"];
const DEFAULT_MQTT_PORT = 1883;
const DEFAULT_SIP_PORT = 5060;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T>(target: T, source: unknown): T {
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return (source ?? target) as T;
  }

  const result: Record<string, unknown> = { ...target };

  for (const [key, value] of Object.entries(source)) {
    const currentValue = result[key];

    if (isPlainObject(currentValue) && isPlainObject(value)) {
      result[key] = deepMerge(currentValue, value);
      continue;
    }

    result[key] = value;
  }

  return result as T;
}

export function createDefaultDeviceConfig() {
  return {
    audioConfig: {},
    callConfig: {},
    ledConfig: {},
    multicastConfig: {},
    mqttConfig: {},
    networkConfig: {},
    relayConfig: {},
    sensorFlowConfig: {},
    sipConfig: {},
    stateConfig: {},
    systemConfig: {},
    taskConfig: {},
  };
}

export function createProvisionedDeviceConfig(input: {
  extension: string;
  mqttTopic: string;
  sipPassword: string;
  sipUser: string;
}) {
  const currentHost = getCurrentLanAddress();
  const pbxAddress =
    env.PBX_PROVIDER === "freeswitch"
      ? currentHost
      : (env.ASTERISK_DEVICE_HOST ?? "");
  const sipPort =
    env.PBX_PROVIDER === "freeswitch"
      ? env.FREESWITCH_SIP_PORT
      : (env.ASTERISK_DEVICE_SIP_PORT ?? DEFAULT_SIP_PORT);
  const mqttBrokerAddress = buildPublicMqttUrl(currentHost);

  return {
    ...createDefaultDeviceConfig(),
    audioConfig: {
      advanced: {
        beepOnBootEnabled: false,
        dtmfPlaybackEnabled: true,
      },
      codecSettings: {
        enabled: DEFAULT_AUDIO_CODECS,
      },
      volume: {
        microphone: 3,
        speaker: 3,
      },
    },
    callConfig: {
      advanced: {
        autoAnswerEnabled: false,
        callLimitEnabled: true,
        playPreambleEnabled: false,
        relayDuringCallEnabled: true,
      },
      timings: {
        answerTimeoutSeconds: 30,
        maxConversationSeconds: 180,
      },
    },
    mqttConfig: {
      advanced: {
        tlsEnabled: env.MQTT_BROKER_USE_TLS,
      },
      connection: {
        brokerAddress: mqttBrokerAddress,
        mqttEnabled: true,
        password: env.MQTT_BROKER_PASSWORD ?? "",
        port: env.MQTT_BROKER_PORT ?? DEFAULT_MQTT_PORT,
        publishTopic: `${input.mqttTopic}/events`,
        subscribeTopic: `${input.mqttTopic}/cmd`,
        username: env.MQTT_BROKER_USERNAME ?? "",
      },
    },
    networkConfig: {
      advanced: {
        httpApiTokenEnabled: true,
        ipAnnouncementEnabled: true,
      },
      connection: {
        dhcpEnabled: true,
      },
    },
    sipConfig: {
      advanced: {
        maxRegistrationSeconds: 60,
        optionsEnabled: true,
        pbxSipPort: sipPort,
        proxyEnabled: false,
        registrationMessageFrequencySeconds: 120,
        rtpPortMax: 20000,
        rtpPortMin: 10000,
        sipPort,
        stunEnabled: false,
        whitelistEnabled: true,
      },
      authentication: {
        authUsername: input.sipUser,
        displayName: input.extension,
        pbxIpAddress: pbxAddress,
        registrationEnabled: true,
        transportProtocol: "udp" as const,
        userPassword: input.sipPassword,
        username: input.sipUser,
      },
    },
    systemConfig: {
      credentials: {
        username: "admin",
      },
      debug: {
        enabled: false,
      },
    },
  };
}

export function mergeWithProvisionedDeviceConfig<T extends Record<string, unknown>>(
  currentConfig: T,
  input: {
    extension: string;
    mqttTopic: string;
    sipPassword: string;
    sipUser: string;
  },
) {
  return deepMerge(createProvisionedDeviceConfig(input), currentConfig);
}

export function isMissingRelationError(error: unknown) {
  const cause = (error as { cause?: { code?: string } } | null)?.cause;
  return cause?.code === "42P01";
}
