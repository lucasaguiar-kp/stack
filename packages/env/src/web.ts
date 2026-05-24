import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

type WebRuntimeConfig = Partial<{
  VITE_ASTERISK_SIP_DOMAIN: string;
  VITE_ASTERISK_WS_URL: string;
  VITE_MQTT_PUBLIC_URL: string;
  VITE_PBX_HOST: string;
  VITE_SERVER_URL: string;
  VITE_WEBRTC_STUN_URLS: string;
}>;

const runtimeConfig =
  typeof globalThis === "undefined"
    ? undefined
    : (
        globalThis as typeof globalThis & {
          __KHOMP_STACK_RUNTIME_CONFIG__?: WebRuntimeConfig;
          window?: { __KHOMP_STACK_RUNTIME_CONFIG__?: WebRuntimeConfig };
        }
      ).window?.__KHOMP_STACK_RUNTIME_CONFIG__ ??
      (
        globalThis as typeof globalThis & {
          __KHOMP_STACK_RUNTIME_CONFIG__?: WebRuntimeConfig;
        }
      ).__KHOMP_STACK_RUNTIME_CONFIG__;

const rawEnv = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_SERVER_URL: z.url(),
    VITE_PBX_HOST: z.string().min(1).optional(),
    VITE_ASTERISK_WS_URL: z.string().min(1).optional(),
    VITE_ASTERISK_SIP_DOMAIN: z.string().min(1).optional(),
    VITE_MQTT_PUBLIC_URL: z.string().min(1).optional(),
    VITE_WEBRTC_STUN_URLS: z.string().min(1).optional(),
  },
  runtimeEnv: {
    ...(import.meta as any).env,
    ...runtimeConfig,
  },
  emptyStringAsUndefined: true,
});

const resolvedAsteriskWsUrl =
  rawEnv.VITE_ASTERISK_WS_URL ??
  (rawEnv.VITE_PBX_HOST ? `ws://${rawEnv.VITE_PBX_HOST}:5066` : undefined);
const resolvedAsteriskSipDomain = rawEnv.VITE_ASTERISK_SIP_DOMAIN ?? rawEnv.VITE_PBX_HOST;
const resolvedMqttPublicUrl =
  rawEnv.VITE_MQTT_PUBLIC_URL ??
  (rawEnv.VITE_PBX_HOST ? `mqtt://${rawEnv.VITE_PBX_HOST}:1883` : undefined);

if (!resolvedAsteriskWsUrl) {
  throw new Error("Missing VITE_ASTERISK_WS_URL or VITE_PBX_HOST");
}

export const env = {
  ...rawEnv,
  VITE_ASTERISK_SIP_DOMAIN: resolvedAsteriskSipDomain,
  VITE_ASTERISK_WS_URL: resolvedAsteriskWsUrl,
  VITE_MQTT_PUBLIC_URL: resolvedMqttPublicUrl,
};
