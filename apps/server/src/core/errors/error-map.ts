export const APP_ERROR_MAP = {
  // ---------------------------------------------------------------------------
  // System
  // ---------------------------------------------------------------------------

  INTERNAL_SERVER_ERROR: {
    status: 500,
    message: "Internal server error",
  },

  INVALID_REQUEST: {
    status: 400,
    message: "Invalid request",
  },

  UNAUTHORIZED: {
    status: 401,
    message: "Unauthorized",
  },

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------

  USER_NOT_FOUND: {
    status: 404,
    message: "User not found",
  },

  MEMBER_PBX_IDENTITY_NOT_FOUND: {
    status: 404,
    message: "Member PBX identity not found",
  },

  USER_ALREADY_MEMBER: {
    status: 409,
    message: "User is already a member",
  },

  USER_CANNOT_REMOVE_SELF: {
    status: 409,
    message: "User cannot remove themselves from organization",
  },

  USER_NOT_ALLOWED_IN_ORGANIZATION: {
    status: 403,
    message: "User is not allowed in this organization",
  },

  USER_NOT_OWNER_OF_ORGANIZATION: {
    status: 403,
    message: "User is not the owner of the organization",
  },

  // ---------------------------------------------------------------------------
  // Device Groups
  // ---------------------------------------------------------------------------

  DEVICE_GROUP_NOT_FOUND: {
    status: 404,
    message: "Device group not found",
  },

  DEVICE_GROUP_NAME_ALREADY_EXISTS: {
    status: 409,
    message: "A device group with this name already exists in this organization",
  },

  DEVICE_GROUP_HAS_DEVICES: {
    status: 409,
    message: "Device group has devices and cannot be deleted",
  },

  // ---------------------------------------------------------------------------
  // Devices
  // ---------------------------------------------------------------------------

  DEVICE_NOT_FOUND: {
    status: 404,
    message: "Device not found",
  },

  DEVICE_EXTENSION_ALREADY_EXISTS: {
    status: 409,
    message: "A device with this extension already exists in this organization",
  },

  DEVICE_MQTT_TOPIC_ALREADY_EXISTS: {
    status: 409,
    message: "A device with this MQTT topic already exists",
  },

  DEVICE_CREATION_FAILED: {
    status: 500,
    message: "Failed to create device",
  },

  DEVICE_AUDIO_UPLOAD_FAILED: {
    status: 500,
    message: "Failed to upload device audio",
  },

  ASTERISK_NOT_CONFIGURED: {
    status: 500,
    message: "Asterisk integration is not configured",
  },

  ASTERISK_PROVISIONING_FAILED: {
    status: 500,
    message: "Failed to provision the device in Asterisk",
  },

  ASTERISK_RELOAD_FAILED: {
    status: 500,
    message: "Failed to reload Asterisk after provisioning changes",
  },

  // ---------------------------------------------------------------------------
  // Test Call
  // ---------------------------------------------------------------------------

  TEST_CALL_FAILED: {
    status: 500,
    message: "Failed to initiate test call",
  },

  MQTT_BROKER_NOT_CONFIGURED: {
    status: 500,
    message: "MQTT broker is not configured",
  },

  // ---------------------------------------------------------------------------
  // Multicast
  // ---------------------------------------------------------------------------

  MULTICAST_ADDRESS_NOT_ALLOCATED: {
    status: 500,
    message: "Multicast address has not been allocated for this group",
  },

  MULTICAST_CONFIG_NOT_FOUND: {
    status: 404,
    message: "Multicast config not found for this group",
  },
} as const;

export type AppErrorCode = keyof typeof APP_ERROR_MAP;
