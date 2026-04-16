import { z } from "zod";

const unknownRecordSchema = z.record(z.string(), z.unknown());

export const deviceStateConfigSchema = z.object({
  callState: z.string().optional(),
  mqttBrokerState: z.string().optional(),
  network: z
    .object({
      dnsPrimary: z.string().optional(),
      dnsSecondary: z.string().optional(),
      gateway: z.string().optional(),
      ipAddress: z.string().optional(),
      macAddress: z.string().optional(),
      subnetMask: z.string().optional(),
    })
    .optional(),
  sipAccountState: z.string().optional(),
  system: z
    .object({
      kernelVersion: z.string().optional(),
      model: z.string().optional(),
      serialNumber: z.string().optional(),
      softwareVersion: z.string().optional(),
    })
    .optional(),
});

export const deviceSipConfigSchema = z.object({
  advanced: z
    .object({
      maxRegistrationSeconds: z.number().int().nonnegative().optional(),
      optionsEnabled: z.boolean().optional(),
      pbxSipPort: z.number().int().positive().optional(),
      proxyEnabled: z.boolean().optional(),
      registrationMessageFrequencySeconds: z.number().int().nonnegative().optional(),
      rtpPortMax: z.number().int().nonnegative().optional(),
      rtpPortMin: z.number().int().nonnegative().optional(),
      sipPort: z.number().int().positive().optional(),
      stunEnabled: z.boolean().optional(),
      whitelistEnabled: z.boolean().optional(),
    })
    .optional(),
  authentication: z
    .object({
      authUsername: z.string().optional(),
      displayName: z.string().optional(),
      pbxIpAddress: z.string().optional(),
      registrationEnabled: z.boolean().optional(),
      transportProtocol: z.enum(["udp", "tcp", "tls"]).optional(),
      userPassword: z.string().optional(),
      username: z.string().optional(),
    })
    .optional(),
});

export const deviceNetworkConfigSchema = z.object({
  advanced: z
    .object({
      httpApiTokenEnabled: z.boolean().optional(),
      ipAnnouncementEnabled: z.boolean().optional(),
    })
    .optional(),
  connection: z
    .object({
      dhcpEnabled: z.boolean().optional(),
      dnsPrimary: z.string().optional(),
      dnsSecondary: z.string().optional(),
      gateway: z.string().optional(),
      ipAddress: z.string().optional(),
      subnetMask: z.string().optional(),
    })
    .optional(),
});

export const deviceMqttConfigSchema = z.object({
  advanced: z
    .object({
      tlsEnabled: z.boolean().optional(),
    })
    .optional(),
  connection: z
    .object({
      brokerAddress: z.string().optional(),
      mqttEnabled: z.boolean().optional(),
      password: z.string().optional(),
      port: z.number().int().positive().optional(),
      publishTopic: z.string().optional(),
      subscribeTopic: z.string().optional(),
      username: z.string().optional(),
    })
    .optional(),
});

export const deviceAudioConfigSchema = z.object({
  advanced: z
    .object({
      beepOnBootEnabled: z.boolean().optional(),
      dtmfPlaybackEnabled: z.boolean().optional(),
    })
    .optional(),
  codecSettings: z
    .object({
      disabled: z.array(z.string()).optional(),
      enabled: z.array(z.string()).optional(),
    })
    .optional(),
  volume: z
    .object({
      microphone: z.number().int().nonnegative().optional(),
      speaker: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

export const deviceSensorFlowConfigSchema = z.object({
  sensor1: unknownRecordSchema.optional(),
  sensor2: unknownRecordSchema.optional(),
  triggers: z.array(unknownRecordSchema).optional(),
  visualNodes: z.array(unknownRecordSchema).optional(),
});

export const deviceRelayConfigSchema = z.object({
  manualActivation: z
    .object({
      activateCode: z.string().optional(),
      deactivateCode: z.string().optional(),
    })
    .optional(),
  timedActivation: z
    .object({
      activationCode: z.string().optional(),
      durationSeconds: z.number().int().nonnegative().optional(),
    })
    .optional(),
  visualNodes: z.array(unknownRecordSchema).optional(),
});

export const deviceLedConfigSchema = z.object({
  indicators: unknownRecordSchema.optional(),
});

export const deviceMulticastConfigSchema = z.object({
  groups: z
    .array(
      z.object({
        enabled: z.boolean(),
        index: z.number().int().nonnegative(),
      }),
    )
    .optional(),
});

export const deviceCallConfigSchema = z.object({
  advanced: z
    .object({
      autoAnswerEnabled: z.boolean().optional(),
      callLimitEnabled: z.boolean().optional(),
      playPreambleEnabled: z.boolean().optional(),
      relayDuringCallEnabled: z.boolean().optional(),
    })
    .optional(),
  timings: z
    .object({
      answerTimeoutSeconds: z.number().int().nonnegative().optional(),
      maxConversationSeconds: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

export const deviceTaskConfigSchema = z.object({
  jobs: z.array(unknownRecordSchema).optional(),
});

export const deviceSystemConfigSchema = z.object({
  credentials: z
    .object({
      username: z.string().optional(),
    })
    .optional(),
  debug: z
    .object({
      enabled: z.boolean().optional(),
    })
    .optional(),
});

export const deviceFullConfigSchema = z.object({
  stateConfig: deviceStateConfigSchema.default({}),
  sipConfig: deviceSipConfigSchema.default({}),
  networkConfig: deviceNetworkConfigSchema.default({}),
  mqttConfig: deviceMqttConfigSchema.default({}),
  audioConfig: deviceAudioConfigSchema.default({}),
  sensorFlowConfig: deviceSensorFlowConfigSchema.default({}),
  relayConfig: deviceRelayConfigSchema.default({}),
  ledConfig: deviceLedConfigSchema.default({}),
  multicastConfig: deviceMulticastConfigSchema.default({}),
  callConfig: deviceCallConfigSchema.default({}),
  taskConfig: deviceTaskConfigSchema.default({}),
  systemConfig: deviceSystemConfigSchema.default({}),
});

export const deviceConfigUpdateSchema = deviceFullConfigSchema.partial();

export type DeviceConfigUpdate = z.infer<typeof deviceConfigUpdateSchema>;
