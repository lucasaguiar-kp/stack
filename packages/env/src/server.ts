import { createEnv } from "@t3-oss/env-core";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { envBoolean } from "./schemas";

const importMetaDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(importMetaDir, "../../../");

dotenv.config({ path: path.join(workspaceRoot, ".env") });

const rawEnv = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    FRONTEND_URL: z.url().optional(),
    APP_INSTALL_DIR: z.string().min(1).optional(),
    APP_GIT_REMOTE_URL: z.string().min(1).optional(),
    APP_GIT_BRANCH: z.string().min(1).optional(),
    APP_CURRENT_COMMIT: z.string().min(1).optional(),
    PBX_HOST: z.string().min(1).optional(),
    DEVICE_HTTP_PASSWORD: z.string().min(1).default("khomp"),
    DEVICE_HTTP_USERNAME: z.string().min(1).default("admin"),
    MAIL_USER: z.string().min(1).optional(),
    MAIL_PASSWORD: z.string().min(1).optional(),
    MAIL_FROM: z.email().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    // MQTT Broker
    MQTT_BROKER_HOST: z.string().min(1).optional(),
    MQTT_BROKER_PORT: z.coerce.number().int().positive().default(1883),
    MQTT_PUBLIC_URL: z.string().min(1).optional(),
    MQTT_BROKER_USERNAME: z.string().min(1).optional(),
    MQTT_BROKER_PASSWORD: z.string().min(1).optional(),
    MQTT_BROKER_USE_TLS: envBoolean.default(false),
    ASTERISK_AUTO_PROVISION: envBoolean.default(false),
    ASTERISK_AMI_HOST: z.string().min(1).optional(),
    ASTERISK_AMI_PORT: z.coerce.number().int().positive().default(5038),
    ASTERISK_AMI_USERNAME: z.string().min(1).optional(),
    ASTERISK_AMI_PASSWORD: z.string().min(1).optional(),
    ASTERISK_DEVICE_HOST: z.string().min(1).optional(),
    ASTERISK_DEVICE_SIP_PORT: z.coerce.number().int().positive().optional(),
    ASTERISK_DIALPLAN_CONTEXT_PREFIX: z.string().min(1).default("pbx"),
    ASTERISK_PJSIP_TRANSPORT: z.string().min(1).default("transport-udp"),
    ASTERISK_GENERATED_PJSIP_DIR: z.string().min(1).optional(),
    ASTERISK_GENERATED_EXTENSIONS_DIR: z.string().min(1).optional(),
    MULTICAST_ADDRESS_BASE: z
      .string()
      .regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}$/)
      .default("224.0.0"),
    MULTICAST_ADDRESS_START: z.coerce.number().int().min(0).max(255).default(1),
    MULTICAST_ADDRESS_MAX: z.coerce.number().int().min(0).max(255).default(254),
    MULTICAST_RELAY_HOST: z.string().min(1).optional(),
    MULTICAST_RELAY_PORT: z.coerce.number().int().positive().optional(),
    MULTICAST_LOCAL_ADDR: z.string().min(1).optional(),
    MULTICAST_TTL: z.coerce.number().int().min(1).max(255).default(32),
    MULTICAST_RTP_PAYLOAD_SIZE: z.coerce.number().int().positive().default(160),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

const resolvedMqttBrokerHost = rawEnv.MQTT_BROKER_HOST ?? rawEnv.PBX_HOST;
const resolvedMqttPublicUrl =
  rawEnv.MQTT_PUBLIC_URL ??
  (rawEnv.PBX_HOST ? `mqtt://${rawEnv.PBX_HOST}:${rawEnv.MQTT_BROKER_PORT}` : undefined);
const resolvedAsteriskAmiHost = rawEnv.ASTERISK_AMI_HOST ?? rawEnv.PBX_HOST;
const resolvedAsteriskDeviceHost = rawEnv.ASTERISK_DEVICE_HOST ?? rawEnv.PBX_HOST;

export const env = {
  ...rawEnv,
  ASTERISK_AMI_HOST: resolvedAsteriskAmiHost,
  ASTERISK_DEVICE_HOST: resolvedAsteriskDeviceHost,
  MQTT_BROKER_HOST: resolvedMqttBrokerHost,
  MQTT_PUBLIC_URL: resolvedMqttPublicUrl,
};
