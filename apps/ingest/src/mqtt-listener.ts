import { env } from "@stack-pbx/env/ingest";
import mqtt from "mqtt";
import { loadActiveDevices, markDeviceOffline, markDeviceOnline } from "./db";

const topicDeviceMap = new Map<string, string>();

function buildBrokerUrl(): string {
  const protocol = env.MQTT_BROKER_USE_TLS ? "mqtts" : "mqtt";
  return `${protocol}://${env.MQTT_BROKER_HOST}:${env.MQTT_BROKER_PORT}`;
}

async function notifyServerDevicePresenceChanged(input: {
  connectionStatus: "online" | "offline";
  deviceId: string;
  mqttTopic: string;
}) {
  try {
    const response = await fetch(`${env.INTERNAL_SERVER_URL}/internal/device-presence`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-token": env.BETTER_AUTH_SECRET,
      },
      body: JSON.stringify({
        type: "device.connection-status.changed",
        deviceId: input.deviceId,
        mqttTopic: input.mqttTopic,
        connectionStatus: input.connectionStatus,
        occurredAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error("[INGEST] Failed to notify server about device presence change", {
        deviceId: input.deviceId,
        mqttTopic: input.mqttTopic,
        connectionStatus: input.connectionStatus,
        status: response.status,
      });
    }
  } catch (error) {
    console.error("[INGEST] Failed to reach server for device presence change", {
      deviceId: input.deviceId,
      mqttTopic: input.mqttTopic,
      connectionStatus: input.connectionStatus,
      error: error instanceof Error ? error.message : error,
    });
  }
}

function buildMqttOptions(): mqtt.IClientOptions {
  const options: mqtt.IClientOptions = {
    clientId: `ingest-${Date.now()}`,
    clean: true,
    protocolVersion: 5,
    reconnectPeriod: 5000,
  };

  if (env.MQTT_BROKER_USERNAME) {
    options.username = env.MQTT_BROKER_USERNAME;
  }
  if (env.MQTT_BROKER_PASSWORD) {
    options.password = env.MQTT_BROKER_PASSWORD;
  }

  return options;
}

async function handleMessage(topic: string, payload: Buffer, packet: mqtt.IPublishPacket) {
  console.log(
    `[MQTT] Message received on topic ${topic} (retain=${packet.retain ? "true" : "false"})`,
  );
  const message = payload.toString();
  const normalizedTopic = topic.startsWith("/") ? topic.slice(1) : topic;

  console.log(`[MQTT] ${topic}: ${message}`);

  const baseTopic = normalizedTopic
    .replace(/\/gpio_event\/?$/, "")
    .replace(/\/connection_status\/$/, "");
  const knownDeviceId = topicDeviceMap.get(baseTopic);

  console.log("[INGEST] MQTT message received", {
    baseTopic,
    isKnownDevice: Boolean(knownDeviceId),
    normalizedTopic,
    retained: packet.retain,
    topic,
  });

  if (knownDeviceId) {
    let parsed: { event?: string; status?: string };

    try {
      parsed = JSON.parse(message) as { event?: string; status?: string };
    } catch {
      console.log(`[INGEST] Non-JSON message on ${topic}: ${message}`);
      return;
    }

    try {
      // Device liveness comes from the connection_status topic, not request/response status.
      if (normalizedTopic.endsWith("/connection_status/")) {
        const status = parsed.status === "online" ? "online" : "offline";
        if (status === "online") {
          const updatedRows = await markDeviceOnline(baseTopic);
          console.log(`[INGEST] Device ${baseTopic} online update matched ${updatedRows.length} rows`);
          if (updatedRows[0]) {
            await notifyServerDevicePresenceChanged({
              connectionStatus: "online",
              deviceId: updatedRows[0].id,
              mqttTopic: baseTopic,
            });
          }
        } else {
          const updatedRows = await markDeviceOffline(baseTopic);
          console.log(
            `[INGEST] Device ${baseTopic} offline update matched ${updatedRows.length} rows`,
          );
          if (updatedRows[0]) {
            await notifyServerDevicePresenceChanged({
              connectionStatus: "offline",
              deviceId: updatedRows[0].id,
              mqttTopic: baseTopic,
            });
          }
        }
        console.log(`[INGEST] Device ${baseTopic} status -> ${status}`);
      }

      if (normalizedTopic.endsWith("/gpio_event")) {
        console.log(`[INGEST] Device ${baseTopic} gpio event: ${parsed.event ?? "unknown"}`);
      }
    } catch (error) {
      console.error(
        `[INGEST] Failed to persist MQTT message for ${baseTopic}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}

function bindMessageHandler(client: mqtt.MqttClient) {
  client.on("message", (topic, payload, packet) => {
    void handleMessage(topic, payload, packet);
  });
}

export async function startMqttListener() {
  if (!env.MQTT_BROKER_HOST) {
    console.warn("[INGEST] MQTT_BROKER_HOST not configured. Skipping MQTT listener.");
    return;
  }

  const brokerUrl = buildBrokerUrl();
  const options = buildMqttOptions();

  console.log(`[INGEST] Connecting to MQTT broker at ${brokerUrl}...`);

  const client = mqtt.connect(brokerUrl, options);

  client.on("connect", async () => {
    console.log("[INGEST] Connected to MQTT broker");
    topicDeviceMap.clear();

    await refreshSubscriptions(client);
  });

  bindMessageHandler(client);

  client.on("error", (err) => {
    console.error("[INGEST] MQTT error:", err.message);
  });

  client.on("reconnect", () => {
    console.log("[INGEST] Reconnecting to MQTT broker...");
  });

  client.on("close", () => {
    console.log("[INGEST] MQTT connection closed");
  });

  // Periodically refresh subscriptions (new devices may be added)
  setInterval(async () => {
    if (client.connected) {
      await refreshSubscriptions(client);
    }
  }, 30_000);

  return client;
}

async function refreshSubscriptions(client: mqtt.MqttClient) {
  const devices = await loadActiveDevices();
  const newTopics: string[] = [];

  for (const device of devices) {
    if (!topicDeviceMap.has(device.mqttTopic)) {
      topicDeviceMap.set(device.mqttTopic, device.id);
      newTopics.push(`/${device.mqttTopic}/connection_status/`);
      newTopics.push(`${device.mqttTopic}/gpio_event`);
    }
  }

  if (newTopics.length > 0) {
    await new Promise<void>((resolve, reject) => {
      client.subscribe(newTopics, { qos: 1, rh: 0, rap: true }, (err) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(
          `[INGEST] Subscribed to ${newTopics.length} new topics (${devices.length} devices total)`,
        );
        console.log("[INGEST] Waiting for retained connection_status snapshots from the broker...");
        resolve();
      });
    }).catch((error) => {
      console.error("[INGEST] Subscribe error:", error instanceof Error ? error.message : error);
    });
  } else {
    console.log(`[INGEST] Refreshed device topic map (${devices.length} devices total)`);
  }
}
