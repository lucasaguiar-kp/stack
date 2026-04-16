import { env } from "@stack-pbx/env/server";
import mqtt from "mqtt";
import { randomUUID } from "node:crypto";
import { AppError } from "../../../core/errors/app-error";
import { markDeviceOnlineByTopic } from "./device-presence";
import {
  buildDeviceCommandTopic,
  buildDeviceResponseTopics,
  normalizeDeviceMacAddress,
} from "./mqtt-provisioning";

const MQTT_CONNECT_TIMEOUT_MS = 5000;
const MQTT_STATUS_TIMEOUT_MS = 10000;
const SUCCESS_MESSAGES = ["success", "204 - OK No Content", "200 - OK"];

type DeviceMqttStatusResponse<TParams = unknown> = {
  id?: string;
  message?: string;
  params?: TParams;
  status?: string;
};

type DeviceMqttRequestOptions = {
  connectTimeoutMs?: number;
  macAddress: string;
  path: string;
  params?: Record<string, unknown>;
  responseTimeoutMs?: number;
  waitForStatus?: boolean;
};

function buildBrokerUrl() {
  if (!env.MQTT_BROKER_HOST) {
    throw new AppError("MQTT_BROKER_NOT_CONFIGURED");
  }

  const protocol = env.MQTT_BROKER_USE_TLS ? "mqtts" : "mqtt";

  return `${protocol}://${env.MQTT_BROKER_HOST}:${env.MQTT_BROKER_PORT}`;
}

async function withMqttClient<T>(
  handler: (client: mqtt.MqttClient) => Promise<T>,
  options?: { connectTimeoutMs?: number },
) {
  const brokerUrl = buildBrokerUrl();
  const connectTimeoutMs = options?.connectTimeoutMs ?? MQTT_CONNECT_TIMEOUT_MS;

  return await new Promise<T>((resolve, reject) => {
    const client = mqtt.connect(brokerUrl, {
      username: env.MQTT_BROKER_USERNAME,
      password: env.MQTT_BROKER_PASSWORD,
      reconnectPeriod: 0,
      connectTimeout: connectTimeoutMs,
    });

    let settled = false;

    const finish = (error?: Error, value?: T) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(connectTimeout);

      const finalize = () => {
        if (error) {
          reject(error);
          return;
        }

        resolve(value as T);
      };

      client.end(Boolean(error), undefined, finalize);
    };

    const connectTimeout = setTimeout(() => {
      finish(
        new AppError("DEVICE_CREATION_FAILED", {
          message: "Timed out while connecting to the MQTT broker",
        }),
      );
    }, connectTimeoutMs);

    client.once("error", (error) => {
      finish(
        new AppError("DEVICE_CREATION_FAILED", {
          message: `Failed to connect to the MQTT broker: ${error.message}`,
        }),
      );
    });

    client.once("connect", async () => {
      clearTimeout(connectTimeout);

      try {
        const result = await handler(client);
        finish(undefined, result);
      } catch (error) {
        finish(error instanceof Error ? error : new Error("Unknown MQTT error"));
      }
    });
  });
}

async function subscribe(client: mqtt.MqttClient, topic: string) {
  await new Promise<void>((resolve, reject) => {
    client.subscribe(topic, { qos: 1 }, (error) => {
      if (error) {
        reject(
          new AppError("DEVICE_CREATION_FAILED", {
            message: `Failed subscribing to ${topic}: ${error.message}`,
          }),
        );
        return;
      }

      resolve();
    });
  });
}

async function publish(client: mqtt.MqttClient, topic: string, payload: unknown) {
  await new Promise<void>((resolve, reject) => {
    client.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
      if (error) {
        reject(
          new AppError("DEVICE_CREATION_FAILED", {
            message: `Failed publishing to ${topic}: ${error.message}`,
          }),
        );
        return;
      }

      resolve();
    });
  });
}

async function waitForStatus<TParams>(input: {
  client: mqtt.MqttClient;
  requestId: string;
  responseTimeoutMs?: number;
  statusTopics: string[];
}) {
  return await new Promise<DeviceMqttStatusResponse<TParams>>((resolve, reject) => {
    const statusTopics = new Set(input.statusTopics);
    let settled = false;

    const finish = (error?: Error, response?: DeviceMqttStatusResponse<TParams>) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      input.client.off("message", handleMessage);

      input.client.unsubscribe([...statusTopics], () => {
        if (error) {
          reject(error);
          return;
        }

        resolve(response ?? {});
      });
    };

    const handleMessage = (topic: string, payload: Buffer) => {
      if (!statusTopics.has(topic)) {
        return;
      }

      try {
        const parsed = JSON.parse(payload.toString()) as DeviceMqttStatusResponse<TParams>;

        if (parsed.id !== input.requestId) {
          return;
        }

        if (!parsed.status) {
          return;
        }

        if (!SUCCESS_MESSAGES.includes(parsed.status)) {
          finish(
            new AppError("DEVICE_CREATION_FAILED", {
              message: parsed.message ?? "Device rejected the MQTT request",
            }),
          );
          return;
        }

        finish(undefined, parsed);
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
          message: "Timed out waiting for the device MQTT response",
        }),
      );
    }, input.responseTimeoutMs ?? MQTT_STATUS_TIMEOUT_MS);

    input.client.on("message", handleMessage);
  });
}

export async function sendDeviceMqttRequest<TParams = unknown>(
  options: DeviceMqttRequestOptions,
) {
  const macAddress = normalizeDeviceMacAddress(options.macAddress);
  const topicBase = macAddress;
  const requestId = randomUUID().replace(/[^a-fA-F0-9]/g, "").slice(0, 8);
  const topic = buildDeviceCommandTopic(macAddress);
  const statusTopics = buildDeviceResponseTopics(macAddress);

  return await withMqttClient(async (client) => {
    if (options.waitForStatus ?? true) {
      await Promise.all(statusTopics.map((statusTopic) => subscribe(client, statusTopic)));
    }

    const statusPromise =
      options.waitForStatus ?? true
        ? waitForStatus<TParams>({
            client,
            requestId,
            responseTimeoutMs: options.responseTimeoutMs,
            statusTopics,
          })
        : undefined;

    await publish(client, topic, {
      id: requestId,
      path: options.path,
      params: options.params ?? {},
    });

    if (!statusPromise) {
      await markDeviceOnlineByTopic(topicBase).catch(() => undefined);
      return {
        id: requestId,
        message: "published",
        params: undefined,
        status: "success",
      } as DeviceMqttStatusResponse<TParams>;
    }

    const response = await statusPromise;
    await markDeviceOnlineByTopic(topicBase).catch(() => undefined);
    return response;
  }, {
    connectTimeoutMs: options.connectTimeoutMs,
  });
}
