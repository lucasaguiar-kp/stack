import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  type CallBehaviorDraft,
  type CallTimingsDraft,
  type CommandPreview,
  type DeviceDetailData,
  type MqttConnectionDraft,
  type NetworkAdvancedDraft,
  type NetworkConnectionDraft,
  type PendingAction,
  type SipAdvancedDraft,
  type SipAuthDraft,
  buildCallBehaviorBaseline,
  buildCallTimingsBaseline,
  buildMqttAdvancedBaseline,
  buildMqttConnectionBaseline,
  buildNetworkAdvancedBaseline,
  buildNetworkConnectionBaseline,
  buildSipAdvancedBaseline,
  buildSipAuthBaseline,
  buildSystemDebugBaseline,
  codecCatalog,
  createCommandPreview,
  isSameRecord,
  normalizeDeviceDetailData,
} from "./device-detail-types";
import { useDeviceAudio } from "./use-device-audio";
import { useBrowserPhone } from "@/components/browser-phone-provider";
import { orpc } from "@/utils/orpc";

// Re-export for consumers
export type { DeviceDetailData } from "./device-detail-types";
export { deviceDetailTabs, codecCatalog } from "./device-detail-types";

export function useDeviceDetailViewModel(detail: DeviceDetailData) {
  const normalizedDetail = normalizeDeviceDetailData(detail);
  const browserPhone = useBrowserPhone();
  const queryClient = useQueryClient();
  const device = normalizedDetail.device;
  const sipAuthBaseline = buildSipAuthBaseline(normalizedDetail);
  const sipAdvancedBaseline = buildSipAdvancedBaseline(normalizedDetail);
  const networkConnectionBaseline = buildNetworkConnectionBaseline(normalizedDetail);
  const networkAdvancedBaseline = buildNetworkAdvancedBaseline(normalizedDetail);
  const mqttConnectionBaseline = buildMqttConnectionBaseline(normalizedDetail);
  const mqttAdvancedBaseline = buildMqttAdvancedBaseline(normalizedDetail);
  const callTimingsBaseline = buildCallTimingsBaseline(normalizedDetail);
  const callBehaviorBaseline = buildCallBehaviorBaseline(normalizedDetail);
  const systemDebugBaseline = buildSystemDebugBaseline(normalizedDetail);

  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [sipAuth, setSipAuth] = useState(sipAuthBaseline);
  const [sipAdvanced, setSipAdvanced] = useState(sipAdvancedBaseline);
  const [networkConnection, setNetworkConnection] = useState(networkConnectionBaseline);
  const [networkAdvanced, setNetworkAdvanced] = useState(networkAdvancedBaseline);
  const [mqttConnection, setMqttConnection] = useState(mqttConnectionBaseline);
  const [mqttAdvanced, setMqttAdvanced] = useState(mqttAdvancedBaseline);
  const [callTimings, setCallTimings] = useState(callTimingsBaseline);
  const [callBehavior, setCallBehavior] = useState(callBehaviorBaseline);
  const [systemDebug, setSystemDebug] = useState(systemDebugBaseline);

  const detailQueryKey = orpc.device.detail.queryOptions({
    input: { deviceId: device.id },
  }).queryKey;

  const commandMutation = useMutation(
    orpc.device.command.mutationOptions({
      onSuccess: (_, variables) => {
        toast.success(`Comando ${variables.command.type} enviado`);
        void queryClient.invalidateQueries({
          queryKey: detailQueryKey,
        });
      },
    }),
  );

  const updateConfigMutation = useMutation(
    orpc.device.updateConfig.mutationOptions({
      onSuccess: () => {
        toast.success("Configuração enviada");
        void queryClient.invalidateQueries({
          queryKey: detailQueryKey,
        });
      },
    }),
  );

  function runWithPreview(action: PendingAction) {
    if (previewEnabled) {
      setPendingAction(action);
      return;
    }

    action.execute().catch((err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Erro ao executar ação");
    });
  }

  async function confirmPendingAction() {
    if (!pendingAction) {
      return;
    }

    const action = pendingAction;
    setPendingAction(null);
    await action.execute();
  }

  function closePendingPreview() {
    setPendingAction(null);
  }

  function sendConfigUpdate(input: {
    config: Record<string, unknown>;
    previewPath?: string;
    previewParams?: Record<string, unknown>;
    previewTitle: string;
    syncWithDevice?: boolean;
  }) {
    const execute = async () => {
      await updateConfigMutation.mutateAsync({
        config: input.config as never,
        deviceId: device.id,
        syncWithDevice: input.syncWithDevice ?? true,
      });
    };

    if (input.previewPath && input.previewParams && Object.keys(input.previewParams).length > 0) {
      runWithPreview({
        execute,
        preview: createCommandPreview(device, {
          title: input.previewTitle,
          path: input.previewPath,
          params: input.previewParams,
        }),
      });
      return;
    }

    void execute();
  }

  function sendDeviceCommand(
    title: string,
    command: Parameters<typeof commandMutation.mutateAsync>[0]["command"],
    preview: Omit<CommandPreview, "title" | "topic">,
    options?: {
      onSuccess?: () => void | Promise<void>;
    },
  ) {
    runWithPreview({
      execute: async () => {
        await commandMutation.mutateAsync({
          command,
          deviceId: device.id,
        });
        await options?.onSuccess?.();
      },
      preview: createCommandPreview(device, {
        ...preview,
        title,
      }),
    });
  }

  // --- Audio domain (delegated) ---
  const audio = useDeviceAudio({
    detail: normalizedDetail,
    device,
    detailQueryKey,
    sendDeviceCommand: sendDeviceCommand as Parameters<
      typeof useDeviceAudio
    >[0]["sendDeviceCommand"],
    runWithPreview,
    updateConfigMutation,
  });

  // --- SIP ---
  function sendSipAuthenticationConfig() {
    const changedAuth: Record<string, unknown> = {};
    const configPatch: Record<string, unknown> = {
      sipConfig: {
        authentication: {},
      },
    };
    const authPatch = (configPatch.sipConfig as { authentication: Record<string, unknown> })
      .authentication;

    for (const key of Object.keys(sipAuth) as Array<keyof SipAuthDraft>) {
      if (sipAuth[key] !== sipAuthBaseline[key]) {
        authPatch[key] = sipAuth[key];
      }
    }

    if (!Object.keys(authPatch).length) {
      toast.info("Nenhuma alteração para enviar em SIP / Autenticação.");
      return;
    }

    if ("registrationEnabled" in authPatch)
      changedAuth.sip_register_on_pabx_enabled = authPatch.registrationEnabled;
    if ("pbxIpAddress" in authPatch) changedAuth.pabx_address = authPatch.pbxIpAddress;
    if ("username" in authPatch) changedAuth.username = authPatch.username;
    if ("displayName" in authPatch) changedAuth.display_name = authPatch.displayName;
    if ("authUsername" in authPatch) changedAuth.auth_username = authPatch.authUsername;
    if ("userPassword" in authPatch) changedAuth.user_password = authPatch.userPassword;
    if ("transportProtocol" in authPatch)
      changedAuth.transport_protocol = authPatch.transportProtocol;

    sendConfigUpdate({
      config: configPatch,
      previewPath: "v1/configs",
      previewParams: { sip: changedAuth },
      previewTitle: "Atualizar SIP / Autenticação",
    });
  }

  function sendSipAdvancedConfig() {
    const advancedPatch: Record<string, unknown> = {};
    const previewSip: Record<string, unknown> = {};
    for (const key of Object.keys(sipAdvanced) as Array<keyof SipAdvancedDraft>) {
      if (sipAdvanced[key] !== sipAdvancedBaseline[key]) {
        advancedPatch[key] = sipAdvanced[key];
      }
    }
    if (!Object.keys(advancedPatch).length) {
      toast.info("Nenhuma alteração para enviar em SIP / Avançado.");
      return;
    }
    if ("pbxSipPort" in advancedPatch) previewSip.pabx_sip_port = advancedPatch.pbxSipPort;
    if ("sipPort" in advancedPatch) previewSip.sip_call_ip_port = advancedPatch.sipPort;
    if ("rtpPortMin" in advancedPatch) previewSip.rtp_port_min = advancedPatch.rtpPortMin;
    if ("rtpPortMax" in advancedPatch) previewSip.rtp_port_max = advancedPatch.rtpPortMax;
    if ("maxRegistrationSeconds" in advancedPatch)
      previewSip.max_registration_seconds = advancedPatch.maxRegistrationSeconds;
    if ("registrationMessageFrequencySeconds" in advancedPatch)
      previewSip.send_options_interval = advancedPatch.registrationMessageFrequencySeconds;
    if ("stunEnabled" in advancedPatch) previewSip.stun_enabled = advancedPatch.stunEnabled;
    if ("optionsEnabled" in advancedPatch)
      previewSip.send_options_enabled = advancedPatch.optionsEnabled;
    if ("proxyEnabled" in advancedPatch) previewSip.proxy_enabled = advancedPatch.proxyEnabled;
    if ("whitelistEnabled" in advancedPatch)
      previewSip.whitelist_enabled = advancedPatch.whitelistEnabled;

    sendConfigUpdate({
      config: { sipConfig: { advanced: advancedPatch } },
      previewPath: "v1/configs",
      previewParams: { sip: previewSip },
      previewTitle: "Atualizar SIP / Avançado",
    });
  }

  // --- Network ---
  function sendNetworkConnectionConfig() {
    const connectionPatch: Record<string, unknown> = {};
    const previewNetwork: Record<string, unknown> = {};
    for (const key of Object.keys(networkConnection) as Array<keyof NetworkConnectionDraft>) {
      if (networkConnection[key] !== networkConnectionBaseline[key]) {
        connectionPatch[key] = networkConnection[key];
      }
    }
    if (!Object.keys(connectionPatch).length) {
      toast.info("Nenhuma alteração para enviar em Rede / Conexão.");
      return;
    }
    if ("dhcpEnabled" in connectionPatch) previewNetwork.dhcp_enabled = connectionPatch.dhcpEnabled;
    if ("ipAddress" in connectionPatch) previewNetwork.ip_address = connectionPatch.ipAddress;
    if ("subnetMask" in connectionPatch) previewNetwork.subnet_mask = connectionPatch.subnetMask;
    if ("gateway" in connectionPatch) previewNetwork.gateway = connectionPatch.gateway;
    if ("dnsPrimary" in connectionPatch) previewNetwork.dns_primary = connectionPatch.dnsPrimary;
    if ("dnsSecondary" in connectionPatch)
      previewNetwork.dns_secondary = connectionPatch.dnsSecondary;

    sendConfigUpdate({
      config: { networkConfig: { connection: connectionPatch } },
      previewPath: "v1/configs",
      previewParams: { network: previewNetwork },
      previewTitle: "Atualizar Rede / Conexão",
    });
  }

  function sendNetworkAdvancedConfig() {
    const advancedPatch: Record<string, unknown> = {};
    const previewNetwork: Record<string, unknown> = {};
    for (const key of Object.keys(networkAdvanced) as Array<keyof NetworkAdvancedDraft>) {
      if (networkAdvanced[key] !== networkAdvancedBaseline[key]) {
        advancedPatch[key] = networkAdvanced[key];
      }
    }
    if (!Object.keys(advancedPatch).length) {
      toast.info("Nenhuma alteração para enviar em Rede / Avançado.");
      return;
    }
    if ("ipAnnouncementEnabled" in advancedPatch)
      previewNetwork.vocalize_ip = advancedPatch.ipAnnouncementEnabled;
    if ("httpApiTokenEnabled" in advancedPatch)
      previewNetwork.http_api_token_enabled = advancedPatch.httpApiTokenEnabled;

    sendConfigUpdate({
      config: { networkConfig: { advanced: advancedPatch } },
      previewPath: "v1/configs",
      previewParams: { network: previewNetwork },
      previewTitle: "Atualizar Rede / Avançado",
    });
  }

  // --- MQTT ---
  function sendMqttConnectionConfig() {
    const connectionPatch: Record<string, unknown> = {};
    const previewMqtt: Record<string, unknown> = {};
    for (const key of Object.keys(mqttConnection) as Array<keyof MqttConnectionDraft>) {
      if (mqttConnection[key] !== mqttConnectionBaseline[key]) {
        connectionPatch[key] = mqttConnection[key];
      }
    }
    if (!Object.keys(connectionPatch).length) {
      toast.info("Nenhuma alteração para enviar em MQTT / Conexão.");
      return;
    }
    if ("brokerAddress" in connectionPatch)
      previewMqtt.broker_address = connectionPatch.brokerAddress;
    if ("mqttEnabled" in connectionPatch) previewMqtt.mqtt_enabled = connectionPatch.mqttEnabled;
    if ("port" in connectionPatch) previewMqtt.port = connectionPatch.port;
    if ("username" in connectionPatch) previewMqtt.username = connectionPatch.username;
    if ("password" in connectionPatch) previewMqtt.password = connectionPatch.password;

    sendConfigUpdate({
      config: { mqttConfig: { connection: connectionPatch } },
      previewPath: "v1/configs",
      previewParams: { mqtt: previewMqtt },
      previewTitle: "Atualizar MQTT / Conexão",
    });
  }

  function sendMqttAdvancedConfig() {
    if (mqttAdvanced.tlsEnabled === mqttAdvancedBaseline.tlsEnabled) {
      toast.info("Nenhuma alteração para enviar em MQTT / Segurança.");
      return;
    }
    sendConfigUpdate({
      config: { mqttConfig: { advanced: { tlsEnabled: mqttAdvanced.tlsEnabled } } },
      previewPath: "v1/configs",
      previewParams: { mqtt: { tls_enabled: mqttAdvanced.tlsEnabled } },
      previewTitle: "Atualizar MQTT / Segurança",
    });
  }

  // --- Calls ---
  function sendCallTimingsConfig() {
    const patch: Record<string, unknown> = {};
    const previewCalls: Record<string, unknown> = {};
    for (const key of Object.keys(callTimings) as Array<keyof CallTimingsDraft>) {
      if (callTimings[key] !== callTimingsBaseline[key]) {
        patch[key] = callTimings[key];
      }
    }
    if (!Object.keys(patch).length) {
      toast.info("Nenhuma alteração para enviar em Chamadas / Temporizações.");
      return;
    }
    if ("maxConversationSeconds" in patch)
      previewCalls.max_conversation_seconds = patch.maxConversationSeconds;
    if ("answerTimeoutSeconds" in patch)
      previewCalls.answer_timeout_seconds = patch.answerTimeoutSeconds;
    sendConfigUpdate({
      config: { callConfig: { timings: patch } },
      previewPath: "v1/configs",
      previewParams: { calls: previewCalls },
      previewTitle: "Atualizar Chamadas / Temporizações",
    });
  }

  function sendCallBehaviorConfig() {
    const patch: Record<string, unknown> = {};
    const previewCalls: Record<string, unknown> = {};
    for (const key of Object.keys(callBehavior) as Array<keyof CallBehaviorDraft>) {
      if (callBehavior[key] !== callBehaviorBaseline[key]) {
        patch[key] = callBehavior[key];
      }
    }
    if (!Object.keys(patch).length) {
      toast.info("Nenhuma alteração para enviar em Chamadas / Comportamento.");
      return;
    }
    if ("callLimitEnabled" in patch) previewCalls.call_limit_enabled = patch.callLimitEnabled;
    if ("autoAnswerEnabled" in patch) previewCalls.auto_answer_enabled = patch.autoAnswerEnabled;
    if ("relayDuringCallEnabled" in patch)
      previewCalls.relay_during_call_enabled = patch.relayDuringCallEnabled;
    if ("playPreambleEnabled" in patch)
      previewCalls.play_preamble_enabled = patch.playPreambleEnabled;
    sendConfigUpdate({
      config: { callConfig: { advanced: patch } },
      previewPath: "v1/configs",
      previewParams: { calls: previewCalls },
      previewTitle: "Atualizar Chamadas / Comportamento",
    });
  }

  // --- System ---
  function sendSystemDebugConfig() {
    if (systemDebug.enabled === systemDebugBaseline.enabled) {
      toast.info("Nenhuma alteração para enviar em Sistema / Debug.");
      return;
    }
    runWithPreview({
      execute: async () => {
        await updateConfigMutation.mutateAsync({
          config: { systemConfig: { debug: { enabled: systemDebug.enabled } } } as never,
          deviceId: device.id,
          syncWithDevice: false,
        });
      },
      preview: {
        title: "Salvar Sistema / Debug",
        topic: "server-only",
        path: "device-config/system/debug",
        params: {
          enabled: systemDebug.enabled,
        },
      },
    });
  }

  function handleRestartDevice() {
    sendDeviceCommand("Reiniciar device", { type: "reboot" }, { path: "v1/system/reboot" });
  }

  function handleRestoreDevice() {
    sendDeviceCommand(
      "Restaurar device",
      { type: "factory-reset" },
      { path: "v1/system/factory-reset" },
    );
  }

  function handleDropCall() {
    sendDeviceCommand("Encerrar chamada", { type: "drop-sip-call" }, { path: "v1/sip/drop-call" });
  }

  function handleUpdateCredentials(input: { currentPassword: string; newPassword: string }) {
    sendDeviceCommand(
      "Atualizar senha do device",
      {
        type: "change-password",
        oldPassword: input.currentPassword,
        newPassword: input.newPassword,
      },
      {
        path: "v1/auth/change-password",
        params: {
          old_password: input.currentPassword,
          new_password: input.newPassword,
        },
      },
    );
  }

  function handleTestAction(label: string) {
    toast.success(`Teste de ${label} preparado`);
  }

  // --- Phone ---
  const statusColor =
    device.connectionStatus === "online"
      ? "text-success"
      : device.connectionStatus === "unknown"
        ? "text-warning"
        : "text-destructive";

  const lastSeen = device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString("pt-BR") : "--";
  const callStatus =
    normalizedDetail.live.sip?.status ??
    (browserPhone.status === "in-call"
      ? "Em chamada"
      : browserPhone.status === "dialing"
        ? "Chamando"
        : browserPhone.status === "incoming"
          ? "Recebendo chamada"
          : "Ocioso");

  const canCall =
    Boolean(device.extension) &&
    browserPhone.hasCredentials &&
    browserPhone.isSecureContext &&
    browserPhone.status === "registered";

  function handleDeviceCall() {
    void browserPhone.call(device.extension).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar a chamada.");
    });
  }

  return {
    // Audio (delegated)
    ...audio,

    // Shared
    callStatus,
    canCall,
    closePendingPreview,
    codecCatalog,
    commandPending: commandMutation.isPending,
    confirmPendingAction,
    credentialsDialogOpen,
    handleDeviceCall,
    handleDropCall,
    handleRestartDevice,
    handleRestoreDevice,
    handleTestAction,
    handleUpdateCredentials,
    lastSeen,
    pendingPreview: pendingAction?.preview ?? null,
    previewEnabled,
    statusColor,
    updateAudioPending: updateConfigMutation.isPending,

    // SIP
    sipAuth,
    sipAuthDirty: !isSameRecord(sipAuth, sipAuthBaseline),
    sipAdvanced,
    sipAdvancedDirty: !isSameRecord(sipAdvanced, sipAdvancedBaseline),
    sendSipAdvancedConfig,
    sendSipAuthenticationConfig,
    setSipAdvanced,
    setSipAuth,

    // Network
    networkAdvanced,
    networkAdvancedDirty: !isSameRecord(networkAdvanced, networkAdvancedBaseline),
    networkConnection,
    networkConnectionDirty: !isSameRecord(networkConnection, networkConnectionBaseline),
    sendNetworkAdvancedConfig,
    sendNetworkConnectionConfig,
    setNetworkAdvanced,
    setNetworkConnection,

    // MQTT
    mqttAdvanced,
    mqttAdvancedDirty: !isSameRecord(mqttAdvanced, mqttAdvancedBaseline),
    mqttConnection,
    mqttConnectionDirty: !isSameRecord(mqttConnection, mqttConnectionBaseline),
    sendMqttAdvancedConfig,
    sendMqttConnectionConfig,
    setMqttAdvanced,
    setMqttConnection,

    // Calls
    callBehavior,
    callBehaviorDirty: !isSameRecord(callBehavior, callBehaviorBaseline),
    callTimings,
    callTimingsDirty: !isSameRecord(callTimings, callTimingsBaseline),
    sendCallBehaviorConfig,
    sendCallTimingsConfig,
    setCallBehavior,
    setCallTimings,

    // System
    systemDebug,
    systemDebugDirty: !isSameRecord(systemDebug, systemDebugBaseline),
    sendSystemDebugConfig,
    setCredentialsDialogOpen,
    setPreviewEnabled,
    setSystemDebug,
  };
}
