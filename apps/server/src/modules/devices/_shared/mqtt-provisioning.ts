import { env } from "@stack-pbx/env/server";
import mqtt from "mqtt";
import { randomUUID } from "node:crypto";
import { AppError } from "../../../core/errors/app-error";

const MAC_ADDRESS_HEX_LENGTH = 12;
const MQTT_PROVISIONING_TIMEOUT_MS = 5000;
const MQTT_STATUS_TIMEOUT_MS = 10000;
const DEFAULT_DEVICE_SIP_PORT = 5060;
const SUCCESS_MESSAGES = ["success", "204 - OK No Content", "200 - OK"];

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

function buildBrokerUrl() {
  if (!env.MQTT_BROKER_HOST) {
    throw new AppError("MQTT_BROKER_NOT_CONFIGURED");
  }

  const protocol = env.MQTT_BROKER_USE_TLS ? "mqtts" : "mqtt";

  return `${protocol}://${env.MQTT_BROKER_HOST}:${env.MQTT_BROKER_PORT}`;
}

function getPbxAddress() {
  return env.ASTERISK_DEVICE_HOST;
}

function getPbxSipPort() {
  return env.ASTERISK_DEVICE_SIP_PORT ?? DEFAULT_DEVICE_SIP_PORT;
}

function getPersistentSubscribeTopic(macAddress: string) {
  return `${buildDeviceCommandTopic(macAddress)}`;
}

function getPersistentPublishTopic(macAddress: string) {
  return `${buildDeviceCommandTopic(macAddress)}`;
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

  const brokerAddress = env.PBX_HOST ?? env.MQTT_BROKER_HOST;

  if (!brokerAddress) {
    throw new AppError("MQTT_BROKER_NOT_CONFIGURED");
  }

  const payload = JSON.stringify({
    mqtt: {
      mqtt_enabled: true,
      broker_address: brokerAddress,
      mqtt_port: env.MQTT_BROKER_PORT,
      mqtt_username: env.MQTT_BROKER_USERNAME ?? "",
      mqtt_password: env.MQTT_BROKER_PASSWORD ?? "",
      subscribe_topic: getPersistentSubscribeTopic(input.macAddress),
      publish_topic: getPersistentPublishTopic(input.macAddress),
      tls_connection_enabled: env.MQTT_BROKER_USE_TLS,
    },
  });

  console.info("Updating device MQTT config over HTTPS", {
    brokerAddress,
    deviceIp: input.deviceIp,
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
    console.info("Device MQTT config updated over HTTPS", { deviceIp: input.deviceIp });
    console.debug("Device MQTT HTTPS response", {
      body: response.body,
      deviceIp: input.deviceIp,
      statusCode: response.statusCode,
    });
  } catch (error) {
    console.error("Failed to configure device MQTT broker over HTTPS", {
      brokerAddress,
      error: error instanceof Error ? error.message : error,
      deviceIp: input.deviceIp,
      payload,
    });
    throw error instanceof Error
      ? new AppError("DEVICE_CREATION_FAILED", {
          message: `Failed to configure device MQTT broker over HTTPS: ${error.message}`,
        })
      : new AppError("DEVICE_CREATION_FAILED", {
          message: "Failed to configure device MQTT broker over HTTPS",
        });
  }
}

async function subscribeToDeviceStatusTopic(options: {
  client: mqtt.MqttClient;
  macAddress: string;
}) {
  const statusTopics = buildDeviceResponseTopics(options.macAddress);

  await new Promise<void>((resolve, reject) => {
    options.client.subscribe(statusTopics, { qos: 1 }, (error) => {
      if (error) {
        reject(
          new AppError("DEVICE_CREATION_FAILED", {
            message: `Failed subscribing to device response topics: ${error.message}`,
          }),
        );
        return;
      }

      resolve();
    });
  });
}

async function monitorDeviceStatus(options: {
  client: mqtt.MqttClient;
  macAddress: string;
  requestId: string;
}) {
  const statusTopics = new Set(buildDeviceResponseTopics(options.macAddress));

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      options.client.off("message", handleMessage);

      options.client.unsubscribe([...statusTopics], () => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    };

    const handleMessage = (topic: string, payload: Buffer) => {
      if (!statusTopics.has(topic)) {
        return;
      }

      try {
        const message = JSON.parse(payload.toString()) as {
          id?: string;
          status?: string;
        };

        if (message.id !== options.requestId) {
          return;
        }

        if (!message.status) {
          return;
        }

        if (!SUCCESS_MESSAGES.includes(message.status)) {
          finish(
            new AppError("DEVICE_CREATION_FAILED", {
              message: "Device rejected the MQTT provisioning payload",
            }),
          );
          return;
        }

        finish();
      } catch {
        finish(
          new AppError("DEVICE_CREATION_FAILED", {
            message: "Device returned an invalid MQTT status payload",
          }),
        );
      }
    };

    const timeout = setTimeout(() => {
      finish(
        new AppError("DEVICE_CREATION_FAILED", {
          message: "Timed out waiting for device MQTT provisioning confirmation",
        }),
      );
    }, MQTT_STATUS_TIMEOUT_MS);

    options.client.on("message", handleMessage);
  });
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

  const topic = buildDeviceCommandTopic(input.macAddress);
  const requestId = randomUUID()
    .replace(/[^a-fA-F0-9]/g, "")
    .substring(0, 8);

  const payload = {
    id: requestId,
    path: "v1/configs",
    params: {
      audio: {
        volume_microphone: 3,
        volume_speaker: 3,
        codecs_enabled: ["G711A", "G711U", "G726", "G729A"],
        dtmf_audio_enabled: true,
      },
      network: {
        vocalize_ip: false,
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
    },
  };

  const brokerUrl = buildBrokerUrl();

  await new Promise<void>((resolve, reject) => {
    const client = mqtt.connect(brokerUrl, {
      username: env.MQTT_BROKER_USERNAME,
      password: env.MQTT_BROKER_PASSWORD,
      reconnectPeriod: 0,
      connectTimeout: MQTT_PROVISIONING_TIMEOUT_MS,
    });

    let settled = false;

    const finish = (error?: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(connectTimeout);

      if (error) {
        client.end(true);
        reject(
          new AppError("DEVICE_CREATION_FAILED", {
            message: `Failed to publish device MQTT provisioning: ${error.message}`,
          }),
        );
        return;
      }

      client.end(false, undefined, () => resolve());
    };

    const connectTimeout = setTimeout(() => {
      finish(new Error("Timed out while connecting to the MQTT broker"));
    }, MQTT_PROVISIONING_TIMEOUT_MS);

    client.once("error", (error) => finish(error));
    client.once("connect", async () => {
      clearTimeout(connectTimeout);

      try {
        await subscribeToDeviceStatusTopic({
          client,
          macAddress: input.macAddress,
        });

        const statusPromise = monitorDeviceStatus({
          client,
          macAddress: input.macAddress,
          requestId,
        });

        client.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
          if (error) {
            finish(error);
            return;
          }

          void statusPromise
            .then(() => finish())
            .catch((statusError) => {
              finish(
                statusError instanceof Error
                  ? statusError
                  : new Error("Unknown MQTT monitoring error"),
              );
            });
        });
      } catch (error) {
        finish(error instanceof Error ? error : new Error("Unknown MQTT monitoring error"));
      }
    });
  });
}
