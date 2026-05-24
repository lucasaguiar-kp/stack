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
    PBX_PROVIDER: z.enum(["asterisk", "freeswitch"]).default("asterisk"),
    MULTICAST_AGENT_HOST: z.string().min(1).default("127.0.0.1"),
    MULTICAST_AGENT_PORT: z.coerce.number().int().positive().default(3010),
    WINDOWS_PROGRAM_FILES_DIR: z.string().min(1).default("C:\\Program Files\\Khomp Stack"),
    WINDOWS_PROGRAM_DATA_DIR: z.string().min(1).default("C:\\ProgramData"),
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
    FREESWITCH_AUTO_PROVISION: envBoolean.default(false),
    FREESWITCH_CONFIG_DIR: z.string().min(1).optional(),
    FREESWITCH_DIALPLAN_DIR: z.string().min(1).optional(),
    FREESWITCH_DIRECTORY_DIR: z.string().min(1).optional(),
    FREESWITCH_DOMAIN: z.string().min(1).optional(),
    FREESWITCH_ESL_HOST: z.string().min(1).optional(),
    FREESWITCH_ESL_PORT: z.coerce.number().int().positive().default(8021),
    FREESWITCH_ESL_PASSWORD: z.string().min(1).optional(),
    FREESWITCH_RTP_END_PORT: z.coerce.number().int().positive().default(10100),
    FREESWITCH_RTP_START_PORT: z.coerce.number().int().positive().default(10000),
    FREESWITCH_SIP_PORT: z.coerce.number().int().positive().default(5060),
    FREESWITCH_WS_PORT: z.coerce.number().int().positive().default(5066),
    MULTICAST_ADDRESS_BASE: z
      .string()
      .regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}$/)
      .default("239.255.0"),
    MULTICAST_ADDRESS_START: z.coerce.number().int().min(0).max(255).default(1),
    MULTICAST_ADDRESS_MAX: z.coerce.number().int().min(0).max(255).default(254),
    MULTICAST_RELAY_HOST: z.string().min(1).optional(),
    MULTICAST_RELAY_PORT: z.coerce.number().int().positive().optional(),
    MULTICAST_LOCAL_ADDR: z.string().min(1).optional(),
    MULTICAST_TTL: z.coerce.number().int().min(1).max(255).default(32),
    MULTICAST_RTP_PAYLOAD_SIZE: z.coerce.number().int().positive().default(160),
    MULTICAST_AUDIO_CODEC: z.enum(["pcma", "pcmu"]).default("pcma"),
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
const resolvedFreeSwitchDomain = rawEnv.FREESWITCH_DOMAIN ?? rawEnv.PBX_HOST;
const resolvedFreeSwitchEslHost = rawEnv.FREESWITCH_ESL_HOST ?? "127.0.0.1";

export const env = {
  ...rawEnv,
  ASTERISK_AMI_HOST: resolvedAsteriskAmiHost,
  ASTERISK_DEVICE_HOST: resolvedAsteriskDeviceHost,
  FREESWITCH_DOMAIN: resolvedFreeSwitchDomain,
  FREESWITCH_ESL_HOST: resolvedFreeSwitchEslHost,
  MQTT_BROKER_HOST: resolvedMqttBrokerHost,
  MQTT_PUBLIC_URL: resolvedMqttPublicUrl,
};
