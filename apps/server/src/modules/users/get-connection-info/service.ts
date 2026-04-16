import { env } from "@stack-pbx/env/server";
import { getUserPbxCredentials } from "../get-pbx-credentials/service";
import type { Input, Output } from "./schema";

function getMqttConnectionDetails() {
  const configured = Boolean(env.MQTT_PUBLIC_URL || env.MQTT_BROKER_HOST);
  const fallbackProtocol = env.MQTT_BROKER_USE_TLS ? "mqtts" : "mqtt";
  const fallbackHost = env.MQTT_BROKER_HOST ?? "";
  const fallbackPort = env.MQTT_BROKER_HOST ? env.MQTT_BROKER_PORT : null;

  if (!env.MQTT_PUBLIC_URL) {
    return {
      configured,
      publicUrl: "",
      protocol: fallbackProtocol,
      host: fallbackHost,
      port: fallbackPort,
      username: env.MQTT_BROKER_USERNAME ?? "",
      password: env.MQTT_BROKER_PASSWORD ?? "",
      tlsEnabled: env.MQTT_BROKER_USE_TLS,
    } satisfies Output["mqtt"];
  }

  try {
    const parsedUrl = new URL(env.MQTT_PUBLIC_URL);

    return {
      configured,
      publicUrl: env.MQTT_PUBLIC_URL,
      protocol: parsedUrl.protocol.replace(/:$/, "") || fallbackProtocol,
      host: parsedUrl.hostname || fallbackHost,
      port: parsedUrl.port ? Number(parsedUrl.port) : fallbackPort,
      username: env.MQTT_BROKER_USERNAME ?? "",
      password: env.MQTT_BROKER_PASSWORD ?? "",
      tlsEnabled: env.MQTT_BROKER_USE_TLS,
    } satisfies Output["mqtt"];
  } catch {
    return {
      configured,
      publicUrl: env.MQTT_PUBLIC_URL,
      protocol: fallbackProtocol,
      host: fallbackHost,
      port: fallbackPort,
      username: env.MQTT_BROKER_USERNAME ?? "",
      password: env.MQTT_BROKER_PASSWORD ?? "",
      tlsEnabled: env.MQTT_BROKER_USE_TLS,
    } satisfies Output["mqtt"];
  }
}

export async function getUserConnectionInfo(input: Input): Promise<Output> {
  const pbx = await getUserPbxCredentials(input);

  return {
    pbx,
    mqtt: getMqttConnectionDetails(),
  };
}
