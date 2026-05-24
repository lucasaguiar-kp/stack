import { env } from "@stack-pbx/env/server";
import { getCurrentLanAddress } from "../../../core/network/lan-address";
import { AppError } from "../../../core/errors/app-error";

const MAC_ADDRESS_HEX_LENGTH = 12;
const MQTT_PROVISIONING_TIMEOUT_MS = 5000;
const DEFAULT_DEVICE_SIP_PORT = 5060;

type ProvisionDeviceOverMqttInput = {
  deviceIp?: string | null;
  extension: string;
  macAddress: string;
  sipPassword: string;
  sipUser: string;
};

export function buildDeviceTopicBase(macAddress: string) {
  return normalizeDeviceMacAddress(macAddress);
}

export function buildDeviceCommandTopic(macAddress: string) {
  return `${buildDeviceTopicBase(macAddress)}/`;
}

export function buildDeviceStatusTopic(macAddress: string) {
  return `${buildDeviceTopicBase(macAddress)}/status`;
}

export function buildDeviceResponseTopics(macAddress: string) {
  return [buildDeviceCommandTopic(macAddress), buildDeviceStatusTopic(macAddress)];
}

export function normalizeDeviceMacAddress(value: string) {
  const normalized = value.replace(/[^a-fA-F0-9]/g, "").toUpperCase();

  if (normalized.length !== MAC_ADDRESS_HEX_LENGTH) {
    throw new AppError("DEVICE_CREATION_FAILED", {
      message: "Device MAC address must contain exactly 12 hexadecimal characters",
    });
  }

  const octets = normalized.match(/.{2}/g);

  if (!octets) {
    throw new AppError("DEVICE_CREATION_FAILED", {
      message: "Failed to normalize the device MAC address",
    });
  }

  return octets.join(":");
}

function getPbxAddress() {
  return env.PBX_PROVIDER === "freeswitch" ? getCurrentLanAddress() : env.ASTERISK_DEVICE_HOST;
}

function getPbxSipPort() {
  return env.PBX_PROVIDER === "freeswitch"
    ? env.FREESWITCH_SIP_PORT
    : (env.ASTERISK_DEVICE_SIP_PORT ?? DEFAULT_DEVICE_SIP_PORT);
}

function getPersistentSubscribeTopic(macAddress: string) {
  return `${buildDeviceCommandTopic(macAddress)}`;
}

function getPersistentPublishTopic(macAddress: string) {
  return `${buildDeviceCommandTopic(macAddress)}`;
}

function buildProvisioningConfig(input: ProvisionDeviceOverMqttInput) {
  const currentHost = getCurrentLanAddress();

  return {
    audio: {
      volume_microphone: 3,
      volume_speaker: 3,
      codecs_enabled: ["G711A", "G711U", "G726", "G729A"],
      dtmf_audio_enabled: true,
    },
    mqtt: {
      mqtt_enabled: true,
      broker_address: currentHost,
      mqtt_port: env.MQTT_BROKER_PORT,
      mqtt_username: env.MQTT_BROKER_USERNAME ?? "",
      mqtt_password: env.MQTT_BROKER_PASSWORD ?? "",
      subscribe_topic: getPersistentSubscribeTopic(input.macAddress),
      publish_topic: getPersistentPublishTopic(input.macAddress),
      tls_connection_enabled: env.MQTT_BROKER_USE_TLS,
    },
    network: {
      vocalize_ip: true,
    },
    sip: {
      sip_register_on_pabx_enabled: true,
      pabx_address: getPbxAddress(),
      pabx_sip_port: getPbxSipPort(),
      sip_call_ip_port: getPbxSipPort(),
      username: input.sipUser,
      display_name: input.extension,
      auth_username: input.sipUser,
      user_password: input.sipPassword,
      stun_enabled: false,
      stun_address: "stun.l.google.com",
      stun_port: 19302,
      send_options_enabled: true,
      send_options_interval: 120,
    },
  };
}

async function sendDeviceHttpsRequest<TResponse>(input: {
  body: string;
  deviceIp: string;
  headers: Record<string, string>;
  method: "PATCH" | "POST";
  path: string;
}) {
  console.debug("Sending HTTPS request to device", {
    body: input.body,
    deviceIp: input.deviceIp,
    headers: input.headers,
    method: input.method,
    path: input.path,
  });

  const response = await fetch(`https://${input.deviceIp}${input.path}`, {
    method: input.method,
    headers: {
      "content-type": "application/json",
      ...input.headers,
    },
    body: input.body,
    signal: AbortSignal.timeout(MQTT_PROVISIONING_TIMEOUT_MS),
    tls: {
      rejectUnauthorized: false,
    },
  } as RequestInit & {
    tls: {
      rejectUnauthorized: boolean;
    };
  });

  const body = (await response.text()).trim();
  const statusCode = response.status;

  console.debug("Received response from device HTTPS request", {
    body,
    deviceIp: input.deviceIp,
    path: input.path,
    statusCode,
  });

  if (!response.ok) {
    throw new AppError("DEVICE_CREATION_FAILED", {
      message: `Device HTTPS request failed on ${input.path} with status ${statusCode}: ${body}`,
    });
  }

  let data: TResponse | undefined;

  if (body) {
    try {
      data = JSON.parse(body) as TResponse;
    } catch {
      throw new AppError("DEVICE_CREATION_FAILED", {
        message: `Device HTTPS request returned invalid JSON on ${input.path}`,
      });
    }
  }

  return { body, data, statusCode };
}

async function loginToDeviceOverHttps(deviceIp: string) {
  console.info("Logging into device over HTTPS", { deviceIp });

  const payload = JSON.stringify({
    username: env.DEVICE_HTTP_USERNAME,
    password: env.DEVICE_HTTP_PASSWORD,
  });

  const response = await sendDeviceHttpsRequest<{ token?: string }>({
    body: payload,
    deviceIp,
    method: "POST",
    path: "/v1/auth/login",
    headers: {},
  });

  const token = response.data?.token;

  if (!token) {
    throw new AppError("DEVICE_CREATION_FAILED", {
      message: "Device HTTPS login succeeded but did not return a token",
    });
  }

  console.info("Device HTTPS login succeeded", {
    deviceIp,
    tokenPreview: `${token.slice(0, 6)}...`,
  });
  return token;
}

async function updateDeviceMqttOverHttps(input: ProvisionDeviceOverMqttInput & { token: string }) {
  if (!input.deviceIp) {
    throw new AppError("DEVICE_CREATION_FAILED", {
      message: "Device IP address is required to configure the MQTT broker",
    });
  }

  const brokerAddress = getCurrentLanAddress();

  if (!brokerAddress) {
    throw new AppError("MQTT_BROKER_NOT_CONFIGURED");
  }

  const payload = JSON.stringify(buildProvisioningConfig(input));

  console.info("Updating device MQTT/SIP config over HTTPS", {
    brokerAddress,
    deviceIp: input.deviceIp,
    pbxAddress: getPbxAddress(),
    pbxSipPort: getPbxSipPort(),
    publishTopic: getPersistentPublishTopic(input.macAddress),
    subscribeTopic: getPersistentSubscribeTopic(input.macAddress),
    tokenPreview: `${input.token.slice(0, 6)}...`,
  });
  console.debug("Device MQTT HTTPS payload", {
    deviceIp: input.deviceIp,
    payload,
  });

  try {
    const response = await sendDeviceHttpsRequest({
      body: payload,
      deviceIp: input.deviceIp,
      method: "PATCH",
      path: "/v1/configs",
      headers: {
        Authorization: `Bearer ${input.token}`,
      },
    });
    console.info("Device MQTT/SIP config updated over HTTPS", { deviceIp: input.deviceIp });
    console.debug("Device MQTT HTTPS response", {
      body: response.body,
      deviceIp: input.deviceIp,
      statusCode: response.statusCode,
    });
  } catch (error) {
    console.error("Failed to configure device MQTT/SIP over HTTPS", {
      brokerAddress,
      error: error instanceof Error ? error.message : error,
      deviceIp: input.deviceIp,
      payload,
    });
    throw error instanceof Error
      ? new AppError("DEVICE_CREATION_FAILED", {
      message: `Não foi possível conectar no device pelo IP salvo (${input.deviceIp}). O device pode estar desligado ou pode ter recebido outro IP via DHCP. Erro original: ${error.message}`,
        })
      : new AppError("DEVICE_CREATION_FAILED", {
          message: "Failed to configure device MQTT/SIP over HTTPS",
        });
  }
}

export async function provisionDeviceOverMqtt(input: ProvisionDeviceOverMqttInput) {
  if (!input.deviceIp) {
    throw new AppError("DEVICE_CREATION_FAILED", {
      message: "Device IP address is required to configure the MQTT broker",
    });
  }

  const token = await loginToDeviceOverHttps(input.deviceIp);
  console.debug("Starting HTTPS MQTT update step", {
    deviceIp: input.deviceIp,
    macAddress: input.macAddress,
  });
  await updateDeviceMqttOverHttps({
    ...input,
    token,
  });
  console.debug("HTTPS MQTT update step finished", {
    deviceIp: input.deviceIp,
    macAddress: input.macAddress,
  });
}
