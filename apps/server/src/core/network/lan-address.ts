import { env } from "@stack-pbx/env/server";
import os from "node:os";

function isUsableIpv4(address: string) {
  return (
    !address.startsWith("127.") &&
    !address.startsWith("169.254.") &&
    !address.startsWith("0.") &&
    address.split(".").length === 4
  );
}

function isPrivateIpv4(address: string) {
  const [a, b] = address.split(".").map((part) => Number(part));

  return (
    a === 10 ||
    (a === 172 && typeof b === "number" && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

export function getCurrentLanAddress() {
  const configuredHost = env.PBX_HOST;
  const addresses = Object.values(os.networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address)
    .filter(isUsableIpv4);

  if (configuredHost && addresses.includes(configuredHost)) {
    return configuredHost;
  }

  return addresses.find(isPrivateIpv4) ?? addresses[0] ?? configuredHost ?? "127.0.0.1";
}

export function getNetworkIdentity() {
  const currentHost = getCurrentLanAddress();
  const configuredHost = env.PBX_HOST ?? currentHost;

  return {
    configuredHost,
    currentHost,
    hostChanged: configuredHost !== currentHost,
  };
}

export function buildPublicMqttUrl(host = getCurrentLanAddress()) {
  const protocol = env.MQTT_BROKER_USE_TLS ? "mqtts" : "mqtt";

  return `${protocol}://${host}:${env.MQTT_BROKER_PORT}`;
}
