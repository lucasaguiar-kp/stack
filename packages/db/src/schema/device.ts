import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { user } from "./auth";

export const deviceGroupMulticastSourceTypeEnum = pgEnum("device_group_multicast_source_type", [
  "radio_url",
  "audio_file",
]);

export const deviceStatusEnum = pgEnum("device_status", ["provisioning", "active", "failed"]);
export const deviceConnectionStatusEnum = pgEnum("device_connection_status", [
  "online",
  "offline",
  "unknown",
]);
export const deviceAudioAssetStatusEnum = pgEnum("device_audio_asset_status", [
  "draft",
  "active",
  "archived",
]);

export const deviceGroup = pgTable(
  "device_group",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    extension: text("extension"),
    multicastAddress: text("multicast_address"),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("device_group_userId_idx").on(table.userId),
    unique("device_group_extension_unique").on(table.extension),
  ],
);

export const device = pgTable(
  "device",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => deviceGroup.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    extension: text("extension").notNull(),
    sipUser: text("sip_user").notNull(),
    sipPassword: text("sip_password").notNull(),
    macAddress: text("mac_address"),
    deviceIp: text("device_ip"),
    mqttTopic: text("mqtt_topic").notNull(),
    status: deviceStatusEnum("status").default("provisioning").notNull(),
    connectionStatus: deviceConnectionStatusEnum("connection_status").default("unknown").notNull(),
    lastSeenAt: timestamp("last_seen_at"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("device_userId_idx").on(table.userId),
    index("device_groupId_idx").on(table.groupId),
    index("device_mqttTopic_idx").on(table.mqttTopic),
    unique("device_mqttTopic_unique").on(table.mqttTopic),
  ],
);

export const deviceAudioAsset = pgTable(
  "device_audio_asset",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    deviceId: text("device_id")
      .notNull()
      .references(() => device.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    originalFileName: text("original_file_name").notNull(),
    storagePath: text("storage_path").notNull(),
    mimeType: text("mime_type"),
    durationMs: integer("duration_ms"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    status: deviceAudioAssetStatusEnum("status").default("draft").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("device_audio_asset_deviceId_idx").on(table.deviceId),
    unique("device_audio_asset_deviceId_name_unique").on(table.deviceId, table.name),
  ],
);

export const deviceGroupMulticastConfig = pgTable(
  "device_group_multicast_config",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    groupId: text("group_id")
      .notNull()
      .unique()
      .references(() => deviceGroup.id, { onDelete: "cascade" }),
    sourceType: deviceGroupMulticastSourceTypeEnum("source_type").notNull(),
    sourceUrl: text("source_url"),
    audioFileData: text("audio_file_data"),
    audioFileName: text("audio_file_name"),
    participantDeviceIds: text("participant_device_ids").array().notNull().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("device_group_multicast_config_groupId_idx").on(table.groupId)],
);

export const deviceGroupRelations = relations(deviceGroup, ({ many, one }) => ({
  devices: many(device),
  multicastConfig: one(deviceGroupMulticastConfig, {
    fields: [deviceGroup.id],
    references: [deviceGroupMulticastConfig.groupId],
  }),
  user: one(user, {
    fields: [deviceGroup.userId],
    references: [user.id],
  }),
}));

export const deviceGroupMulticastConfigRelations = relations(
  deviceGroupMulticastConfig,
  ({ one }) => ({
    group: one(deviceGroup, {
      fields: [deviceGroupMulticastConfig.groupId],
      references: [deviceGroup.id],
    }),
  }),
);

export const deviceRelations = relations(device, ({ one }) => ({
  group: one(deviceGroup, {
    fields: [device.groupId],
    references: [deviceGroup.id],
  }),
  user: one(user, {
    fields: [device.userId],
    references: [user.id],
  }),
}));

export const deviceAudioAssetRelations = relations(deviceAudioAsset, ({ one }) => ({
  device: one(device, {
    fields: [deviceAudioAsset.deviceId],
    references: [device.id],
  }),
}));
