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
    BETTER_AUTH_SECRET: z.string().min(32),
    INTERNAL_SERVER_URL: z.url().optional(),
    PBX_HOST: z.string().min(1).optional(),
    MQTT_BROKER_HOST: z.string().min(1).optional(),
    MQTT_BROKER_PORT: z.coerce.number().int().positive().default(1883),
    MQTT_BROKER_USERNAME: z.string().min(1).optional(),
    MQTT_BROKER_PASSWORD: z.string().min(1).optional(),
    MQTT_BROKER_USE_TLS: envBoolean.default(false),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

export const env = {
  ...rawEnv,
  INTERNAL_SERVER_URL: rawEnv.INTERNAL_SERVER_URL ?? "http://127.0.0.1:3000",
  MQTT_BROKER_HOST: rawEnv.MQTT_BROKER_HOST ?? rawEnv.PBX_HOST,
};
