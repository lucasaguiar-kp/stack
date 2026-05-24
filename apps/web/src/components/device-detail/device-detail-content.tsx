import {
  Activity,
  AudioLines,
  Bug,
  CalendarClock,
  CircleDot,
  Clock,
  Cpu,
  FileAudio2,
  Globe,
  Lightbulb,
  Lock,
  MonitorSpeaker,
  Network,
  PauseIcon,
  Phone,
  PlayIcon,
  Radio,
  RefreshCw,
  RotateCcw,
  Scan,
  Settings2,
  Shield,
  ShieldCheck,
  Timer,
  ToggleLeft,
  Trash2,
  Volume2,
  Wrench,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  CodecCheckbox,
  FlowActionCard,
  InfoRow,
  SectionCard,
  SelectField,
  SliderField,
  SwitchField,
  TextField,
} from "@/components/device-detail/device-detail-fields";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deviceDetailTabs,
  type DeviceDetailData,
  codecCatalog,
} from "@/hooks/use-device-detail-view-model";
import type { DeviceListItem } from "@/components/device-card";
import type { useDeviceDetailViewModel } from "@/hooks/use-device-detail-view-model";

type ViewModel = ReturnType<typeof useDeviceDetailViewModel>;

const disabledTabs = new Set(["sensores", "rele", "leds", "tarefas"]);

function LedIndicator({
  label,
  color,
  state,
}: {
  label: string;
  color: "green" | "red" | "off";
  state: string;
}) {
  const colorMap = {
    green: "bg-emerald-500 shadow-[0_0_10px_2px] shadow-emerald-500/50",
    red: "bg-red-500 shadow-[0_0_10px_2px] shadow-red-500/50",
    off: "bg-muted-foreground/30",
  };

  return (
    <div className="border-border/40 bg-background/60 flex items-center gap-4 rounded-xl border px-4 py-3">
      <span className={`size-3.5 shrink-0 rounded-full ${colorMap[color]}`} />
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{state}</p>
      </div>
    </div>
  );
}

function FlowStepVisual({ steps }: { steps: string[] }) {
  return (
    <div className="bg-background/50 border-border/40 flex flex-wrap items-center gap-1.5 rounded-xl border p-3">
      {steps.map((step, i) => (
        <span key={step} className="flex items-center gap-1.5">
          <span className="bg-primary/10 text-primary inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium">
            {step}
          </span>
          {i < steps.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
        </span>
      ))}
    </div>
  );
}

function PendingSendAction() {
  return (
    <Button size="sm" disabled>
      Enviar
    </Button>
  );
}

function PendingDirtySendAction({ dirty, sectionLabel }: { dirty: boolean; sectionLabel: string }) {
  return (
    <Button
      size="sm"
      disabled={!dirty}
      onClick={() => {
        toast.info(`O envio da seção "${sectionLabel}" ainda não foi conectado ao backend.`);
      }}
    >
      Enviar
    </Button>
  );
}

export function DeviceDetailContent({
  vm,
  detail,
  device,
  activeTab = "estado",
  onTabChange,
}: {
  vm: ViewModel;
  detail: DeviceDetailData;
  device: DeviceListItem;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}) {
  const {
    audioAssets,
    currentPlayingAudioIndex,
    audioInputResetKey,
    audioUploadName,
    audioAdvancedDirty,
    audioCodecDirty,
    audioVolumeDirty,
    beepOnBootEnabled,
    callBehavior,
    callBehaviorDirty,
    callTimings,
    callTimingsDirty,
    callStatus,
    commandPending,
    dtmfPlaybackEnabled,
    enabledCodecs,
    isAudioPlaying,
    lastSeen,
    microphoneVolume,
    mqttAdvanced,
    mqttAdvancedDirty,
    mqttConnection,
    mqttConnectionDirty,
    networkAdvanced,
    networkAdvancedDirty,
    networkConnection,
    networkConnectionDirty,
    selectedAudioFile,
    sipAdvanced,
    sipAdvancedDirty,
    sipAuth,
    sipAuthDirty,
    speakerVolume,
    systemDebug,
    systemDebugDirty,
    updateAudioPending,
    uploadAudioPending,
    sendAudioConfig: onConfirmAudioConfig,
    sendCallBehaviorConfig: onConfirmCallBehaviorConfig,
    sendCallTimingsConfig: onConfirmCallTimingsConfig,
    sendMqttAdvancedConfig: onConfirmMqttAdvancedConfig,
    sendMqttConnectionConfig: onConfirmMqttConnectionConfig,
    sendNetworkAdvancedConfig: onConfirmNetworkAdvancedConfig,
    sendNetworkConnectionConfig: onConfirmNetworkConnectionConfig,
    sendSipAdvancedConfig: onConfirmSipAdvancedConfig,
    sendSipAuthenticationConfig: onConfirmSipAuthConfig,
    sendSystemDebugConfig: onConfirmSystemDebugConfig,
    handleDeleteAudio: onDeleteAudio,
    handleDropCall: onDropCall,
    handlePlayAudio: onPlayAudio,
    handleRestartDevice: onRestartDevice,
    handleRestoreDevice: onRestoreDevice,
    handleSelectedAudioFile: onSelectAudioFile,
    handleStopAudio: onStopAudio,
    handleTestAction: onTestAction,
    toggleCodec: onToggleCodec,
    handleUploadAudio: onUploadAudio,
    setAudioUploadName,
    setCallBehavior,
    setCallTimings,
    setBeepOnBootEnabled,
    setDtmfPlaybackEnabled,
    setMqttAdvanced,
    setMqttConnection,
    setMicrophoneVolume,
    setNetworkAdvanced,
    setNetworkConnection,
    setSpeakerVolume,
    setSipAdvanced,
    setSipAuth,
    setSystemDebug,
  } = vm;
  const onOpenCredentials = () => vm.setCredentialsDialogOpen(true);
  const live = detail.live ?? {};
  const isOnline = device.connectionStatus === "online";
  const systemInfo = live.system;
  const stateNetwork = detail.config?.stateConfig?.network;
  const networkInfo = {
    dnsPrimary: live.network?.dns_primary_server ?? stateNetwork?.dnsPrimary ?? "--",
    dnsSecondary: live.network?.dns_secondary_server ?? stateNetwork?.dnsSecondary ?? "--",
    gateway: live.network?.gateway_ip ?? stateNetwork?.gateway ?? "--",
    ipAddress: live.network?.ip_address ?? stateNetwork?.ipAddress ?? "--",
    subnetMask: live.network?.netmask ?? stateNetwork?.subnetMask ?? "--",
  };
  const [dirtySections, setDirtySections] = useState<Record<string, boolean>>({});
  const [pendingSystemAction, setPendingSystemAction] = useState<"reboot" | "factory-reset" | null>(
    null,
  );
  const [pendingAudioRemoval, setPendingAudioRemoval] = useState<{
    audioIndex: string;
    label: string;
  } | null>(null);
  const audioLibrary = audioAssets ?? [];

  function markDirty(sectionKey: string) {
    setDirtySections((current) => {
      if (current[sectionKey]) {
        return current;
      }

      return {
        ...current,
        [sectionKey]: true,
      };
    });
  }

  return (
    <Tabs
      value={activeTab}
      defaultValue="estado"
      onValueChange={onTabChange}
      className="flex h-full min-w-0 flex-col"
    >
      <div className="border-border/40 min-w-0 border-b px-6 pt-2">
        <ScrollArea className="h-10 w-full">
          <TabsList variant="line" className="min-w-max gap-0">
            {deviceDetailTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                disabled={disabledTabs.has(tab.value) || tab.disabled}
                className="gap-1.5 px-3 py-2"
              >
                <tab.icon className="size-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>
      </div>

      <div className="min-w-0 overflow-y-scroll p-6 pb-24">
        {/* ── Estado ────────────────────────────────────── */}
        <TabsContent value="estado">
          <div className="grid gap-4 xl:grid-cols-3">
            <SectionCard
              icon={Activity}
              title="Informações de estado"
              description="Visão operacional imediata"
            >
              <InfoRow
                label="Conta SIP 1"
                value={live.sip?.is_registered_on_pabx ? "Registrada" : "Sem registro"}
                status={live.sip?.is_registered_on_pabx ? "success" : "error"}
              />
              <InfoRow
                label="Broker MQTT"
                value={isOnline ? "Conectado" : "Desconectado"}
                status={isOnline ? "success" : "error"}
              />
              <InfoRow
                label="Estado de Chamada"
                value={callStatus}
                status={callStatus === "Ocioso" ? "muted" : "warning"}
              />
            </SectionCard>
            <SectionCard
              icon={Network}
              title="Informações de Rede"
              description="Endereçamento e resolução"
            >
              <InfoRow label="Endereço MAC" value={device.macAddress ?? "--"} mono />
              <InfoRow label="LAN Endereço IP" value={networkInfo.ipAddress} mono />
              <InfoRow label="Máscara de sub-rede" value={networkInfo.subnetMask} mono />
              <InfoRow label="Gateway da rede" value={networkInfo.gateway} mono />
              <InfoRow label="DNS primário" value={networkInfo.dnsPrimary} mono />
              <InfoRow label="DNS secundário" value={networkInfo.dnsSecondary} mono />
            </SectionCard>
            <SectionCard
              icon={Cpu}
              title="Informações do Sistema"
              description="Identidade do hardware"
            >
              <InfoRow label="Modelo" value="Khomp IoT Door Station" />
              <InfoRow
                label="Número Serial"
                value={systemInfo?.serial_number ?? `KH-${device.id.slice(0, 8).toUpperCase()}`}
                mono
              />
              <InfoRow label="Versão do software" value={systemInfo?.app_version ?? "v3.2.18"} />
              <InfoRow
                label="Versão do kernel"
                value={systemInfo?.kernel_version ?? "Linux 6.1.54-khomp"}
              />
            </SectionCard>
          </div>
        </TabsContent>

        {/* ── SIP ───────────────────────────────────────── */}
        <TabsContent value="sip">
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              icon={Lock}
              title="Autenticação"
              description="Registro e credenciais SIP"
              action={
                <Button size="sm" onClick={onConfirmSipAuthConfig} disabled={!sipAuthDirty}>
                  {sipAuthDirty ? "Enviar" : "Sem alterações"}
                </Button>
              }
            >
              <div className="grid gap-4">
                <SwitchField
                  label="Habilitar registro SIP"
                  checked={sipAuth.registrationEnabled}
                  onCheckedChange={(checked) =>
                    setSipAuth((current) => ({ ...current, registrationEnabled: checked }))
                  }
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label="Usuário"
                    value={sipAuth.username}
                    onChange={(value) => setSipAuth((current) => ({ ...current, username: value }))}
                    mono
                    disabled
                  />
                  <TextField
                    label="Auth username"
                    value={sipAuth.authUsername}
                    onChange={(value) =>
                      setSipAuth((current) => ({ ...current, authUsername: value }))
                    }
                    mono
                    disabled
                  />
                  <TextField
                    label="Nome de exibição"
                    value={sipAuth.displayName}
                    onChange={(value) =>
                      setSipAuth((current) => ({ ...current, displayName: value }))
                    }
                    disabled
                  />
                  <TextField
                    label="Senha do usuário"
                    value={sipAuth.userPassword}
                    onChange={(value) =>
                      setSipAuth((current) => ({ ...current, userPassword: value }))
                    }
                    mono
                    disabled
                  />
                  <TextField
                    label="Endereço IP PABX"
                    value={sipAuth.pbxIpAddress}
                    onChange={(value) =>
                      setSipAuth((current) => ({ ...current, pbxIpAddress: value }))
                    }
                    mono
                    disabled
                  />
                  <SelectField
                    label="Protocolo de Transporte SIP"
                    value={sipAuth.transportProtocol}
                    onValueChange={(value) =>
                      setSipAuth((current) => ({
                        ...current,
                        transportProtocol: value as "udp" | "tcp" | "tls",
                      }))
                    }
                    defaultValue="udp"
                    options={[
                      { label: "UDP", value: "udp" },
                      { label: "TCP", value: "tcp" },
                      { label: "TLS", value: "tls" },
                    ]}
                    disabled
                  />
                </div>
              </div>
            </SectionCard>
            <SectionCard
              icon={Settings2}
              title="Configurações avançadas"
              description="Parâmetros finos do SIP"
              action={
                <Button size="sm" onClick={onConfirmSipAdvancedConfig} disabled={!sipAdvancedDirty}>
                  {sipAdvancedDirty ? "Enviar" : "Sem alterações"}
                </Button>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Porta RTP mínima"
                  value={String(sipAdvanced.rtpPortMin)}
                  onChange={(value) =>
                    setSipAdvanced((current) => ({ ...current, rtpPortMin: Number(value) || 0 }))
                  }
                  mono
                  disabled
                />
                <TextField
                  label="Porta RTP máxima"
                  value={String(sipAdvanced.rtpPortMax)}
                  onChange={(value) =>
                    setSipAdvanced((current) => ({ ...current, rtpPortMax: Number(value) || 0 }))
                  }
                  mono
                  disabled
                />
                <TextField
                  label="Porta SIP PABX IP"
                  value={String(sipAdvanced.pbxSipPort)}
                  onChange={(value) =>
                    setSipAdvanced((current) => ({ ...current, pbxSipPort: Number(value) || 0 }))
                  }
                  mono
                  disabled
                />
                <TextField
                  label="Porta SIP"
                  value={String(sipAdvanced.sipPort)}
                  onChange={(value) =>
                    setSipAdvanced((current) => ({ ...current, sipPort: Number(value) || 0 }))
                  }
                  mono
                  disabled
                />
                <TextField
                  label="Tempo máximo para registro SIP (segundos)"
                  value={String(sipAdvanced.maxRegistrationSeconds)}
                  onChange={(value) =>
                    setSipAdvanced((current) => ({
                      ...current,
                      maxRegistrationSeconds: Number(value) || 0,
                    }))
                  }
                  mono
                  disabled
                />
                <TextField
                  label="Frequência de envio de mensagem (segundos)"
                  value={String(sipAdvanced.registrationMessageFrequencySeconds)}
                  onChange={(value) =>
                    setSipAdvanced((current) => ({
                      ...current,
                      registrationMessageFrequencySeconds: Number(value) || 0,
                    }))
                  }
                  mono
                  disabled
                />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <SwitchField
                  label="Habilitar STUN"
                  checked={sipAdvanced.stunEnabled}
                  onCheckedChange={(checked) =>
                    setSipAdvanced((current) => ({ ...current, stunEnabled: checked }))
                  }
                />
                <SwitchField
                  label="Habilitar OPTIONS"
                  checked={sipAdvanced.optionsEnabled}
                  onCheckedChange={(checked) =>
                    setSipAdvanced((current) => ({ ...current, optionsEnabled: checked }))
                  }
                />
                <SwitchField
                  label="Habilitar PROXY"
                  checked={sipAdvanced.proxyEnabled}
                  onCheckedChange={(checked) =>
                    setSipAdvanced((current) => ({ ...current, proxyEnabled: checked }))
                  }
                />
                <SwitchField
                  label="Habilitar Whitelist"
                  checked={sipAdvanced.whitelistEnabled}
                  onCheckedChange={(checked) =>
                    setSipAdvanced((current) => ({ ...current, whitelistEnabled: checked }))
                  }
                />
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* ── Rede ──────────────────────────────────────── */}
        <TabsContent value="rede">
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              icon={Globe}
              title="Parâmetros de conexão"
              description="Endereçamento e DNS"
              action={
                <Button
                  size="sm"
                  onClick={onConfirmNetworkConnectionConfig}
                  disabled={!networkConnectionDirty}
                >
                  {networkConnectionDirty ? "Enviar" : "Sem alterações"}
                </Button>
              }
            >
              <div className="grid gap-4">
                <SwitchField
                  label="Habilitar DHCP"
                  checked={networkConnection.dhcpEnabled}
                  onCheckedChange={(checked) =>
                    setNetworkConnection((current) => ({ ...current, dhcpEnabled: checked }))
                  }
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label="Endereço IP"
                    value={networkConnection.ipAddress}
                    onChange={(value) =>
                      setNetworkConnection((current) => ({ ...current, ipAddress: value }))
                    }
                    mono
                    disabled
                  />
                  <TextField
                    label="Máscara de Rede"
                    value={networkConnection.subnetMask}
                    onChange={(value) =>
                      setNetworkConnection((current) => ({ ...current, subnetMask: value }))
                    }
                    mono
                    disabled
                  />
                  <TextField
                    label="Gateway"
                    value={networkConnection.gateway}
                    onChange={(value) =>
                      setNetworkConnection((current) => ({ ...current, gateway: value }))
                    }
                    mono
                    disabled
                  />
                  <TextField
                    label="Servidor DNS Primário"
                    value={networkConnection.dnsPrimary}
                    onChange={(value) =>
                      setNetworkConnection((current) => ({ ...current, dnsPrimary: value }))
                    }
                    mono
                    disabled
                  />
                  <TextField
                    label="Servidor DNS Secundário"
                    value={networkConnection.dnsSecondary}
                    onChange={(value) =>
                      setNetworkConnection((current) => ({ ...current, dnsSecondary: value }))
                    }
                    mono
                    disabled
                  />
                </div>
              </div>
            </SectionCard>
            <SectionCard
              icon={Settings2}
              title="Configurações avançadas"
              description="Recursos extras de rede"
              action={
                <Button
                  size="sm"
                  onClick={onConfirmNetworkAdvancedConfig}
                  disabled={!networkAdvancedDirty}
                >
                  {networkAdvancedDirty ? "Enviar" : "Sem alterações"}
                </Button>
              }
            >
              <div className="grid gap-3">
                <SwitchField
                  label="Habilitar Vocalização por IP"
                  checked={networkAdvanced.ipAnnouncementEnabled}
                  onCheckedChange={(checked) =>
                    setNetworkAdvanced((current) => ({
                      ...current,
                      ipAnnouncementEnabled: checked,
                    }))
                  }
                />
                <SwitchField
                  label="Habilitar Token para API HTTP"
                  checked={networkAdvanced.httpApiTokenEnabled}
                  onCheckedChange={(checked) =>
                    setNetworkAdvanced((current) => ({ ...current, httpApiTokenEnabled: checked }))
                  }
                />
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* ── MQTT ──────────────────────────────────────── */}
        <TabsContent value="mqtt">
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              icon={Radio}
              title="Parâmetros de conexão"
              description="Broker e autenticação MQTT"
              action={
                <Button
                  size="sm"
                  onClick={onConfirmMqttConnectionConfig}
                  disabled={!mqttConnectionDirty}
                >
                  {mqttConnectionDirty ? "Enviar" : "Sem alterações"}
                </Button>
              }
            >
              <div className="grid gap-4">
                <SwitchField
                  label="Habilitar MQTT"
                  checked={mqttConnection.mqttEnabled}
                  onCheckedChange={(checked) =>
                    setMqttConnection((current) => ({ ...current, mqttEnabled: checked }))
                  }
                  disabled
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label="Endereço do broker"
                    value={mqttConnection.brokerAddress}
                    onChange={(value) =>
                      setMqttConnection((current) => ({ ...current, brokerAddress: value }))
                    }
                    mono
                    disabled
                  />
                  <TextField
                    label="Porta MQTT"
                    value={String(mqttConnection.port)}
                    onChange={(value) =>
                      setMqttConnection((current) => ({ ...current, port: Number(value) || 0 }))
                    }
                    mono
                    disabled
                  />
                  <TextField
                    label="Usuário"
                    value={mqttConnection.username}
                    onChange={(value) =>
                      setMqttConnection((current) => ({ ...current, username: value }))
                    }
                    mono
                    disabled
                  />
                  <TextField
                    label="Senha"
                    value={mqttConnection.password}
                    onChange={(value) =>
                      setMqttConnection((current) => ({ ...current, password: value }))
                    }
                    mono
                    disabled
                  />
                </div>
              </div>
            </SectionCard>
            <SectionCard
              icon={Shield}
              title="Configurações avançadas"
              description="Segurança da conexão"
              action={
                <Button
                  size="sm"
                  onClick={onConfirmMqttAdvancedConfig}
                  disabled={!mqttAdvancedDirty}
                >
                  {mqttAdvancedDirty ? "Enviar" : "Sem alterações"}
                </Button>
              }
            >
              <SwitchField
                label="Habilitar Conexão segura (TLS)"
                checked={mqttAdvanced.tlsEnabled}
                onCheckedChange={(checked) => setMqttAdvanced({ tlsEnabled: checked })}
              />
            </SectionCard>
          </div>
        </TabsContent>

        {/* ── Áudio ─────────────────────────────────────── */}
        <TabsContent value="audio">
          <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-start">
            <div className="xl:sticky xl:top-6">
              <SectionCard
                icon={FileAudio2}
                title="Operação de áudio"
                description="Gerenciamento de arquivos e reprodução"
                action={
                  <Button
                    type="button"
                    size="sm"
                    onClick={onUploadAudio}
                    disabled={uploadAudioPending || !selectedAudioFile}
                  >
                    {uploadAudioPending ? "Adicionando..." : "Adicionar"}
                  </Button>
                }
              >
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Áudios armazenados</p>
                    <p className="text-muted-foreground text-xs">
                      Arquivos persistidos na memória do device prontos para reprodução.
                    </p>
                  </div>
                  {audioLibrary.length > 0 ? (
                    audioLibrary.map((audio) => (
                      <div
                        key={audio.id}
                        className="border-border/40 bg-background/60 flex items-center justify-between rounded-xl border px-3 py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                            <FileAudio2 className="size-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {audio.originalFileName || audio.name}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              Slot {audio.audioIndex ?? "--"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={!audio.audioIndex}
                            onClick={() => {
                              if (audio.audioIndex) {
                                if (
                                  isAudioPlaying &&
                                  currentPlayingAudioIndex === String(audio.audioIndex)
                                ) {
                                  onStopAudio();
                                  return;
                                }

                                onPlayAudio(audio.audioIndex);
                              }
                            }}
                          >
                            {isAudioPlaying &&
                            currentPlayingAudioIndex === String(audio.audioIndex) ? (
                              <PauseIcon className="size-4" />
                            ) : (
                              <PlayIcon className="size-4" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={!audio.audioIndex}
                            onClick={() => {
                              if (audio.audioIndex) {
                                setPendingAudioRemoval({
                                  audioIndex: audio.audioIndex,
                                  label: audio.originalFileName || audio.name,
                                });
                              }
                            }}
                          >
                            <Trash2 className="text-destructive size-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground rounded-xl border border-dashed px-3 py-4 text-sm">
                      Nenhum áudio enviado para este device ainda.
                    </div>
                  )}
                </div>

                <div className="mt-2 grid gap-2 rounded-xl border border-dashed p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Adicionar áudio ao device</p>
                    <p className="text-muted-foreground text-xs">
                      O arquivo é convertido para WAV, enviado para a memória da corneta e depois
                      listado com o slot real retornado pelo device.
                    </p>
                  </div>
                  <Input
                    placeholder="Nome do áudio no device"
                    value={audioUploadName}
                    onChange={(event) => setAudioUploadName(event.target.value)}
                  />
                  <Input
                    key={audioInputResetKey}
                    type="file"
                    accept="audio/*"
                    onChange={(event) => onSelectAudioFile(event.target.files?.[0] ?? null)}
                  />
                  {selectedAudioFile ? (
                    <p className="text-muted-foreground text-xs">{selectedAudioFile.name}</p>
                  ) : null}
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <SectionCard
                  icon={Volume2}
                  title="Configurações de volume"
                  description="Níveis de reprodução e captura"
                  action={
                    <Button
                      size="sm"
                      onClick={onConfirmAudioConfig}
                      disabled={updateAudioPending || !audioVolumeDirty}
                    >
                      Enviar
                    </Button>
                  }
                >
                  <div className="grid gap-4">
                    <SliderField
                      label="Volume de alto-falante"
                      value={speakerVolume}
                      onValueChange={setSpeakerVolume}
                      step={1}
                      max={10}
                      min={1}
                    />
                    <SliderField
                      label="Volume de microfone"
                      value={microphoneVolume}
                      onValueChange={setMicrophoneVolume}
                      step={1}
                      max={10}
                      min={1}
                    />
                  </div>
                </SectionCard>
                <SectionCard
                  icon={AudioLines}
                  title="Configurações de Codec de áudio"
                  description="Codecs habilitados e disponíveis"
                  action={
                    <Button
                      size="sm"
                      onClick={onConfirmAudioConfig}
                      disabled={updateAudioPending || !audioCodecDirty}
                    >
                      Enviar
                    </Button>
                  }
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {codecCatalog.map((codec) => (
                      <CodecCheckbox
                        key={codec.mqttName}
                        name={codec.label}
                        enabled={enabledCodecs.includes(codec.mqttName)}
                        onCheckedChange={(checked) => onToggleCodec(codec.mqttName, checked)}
                        disabled
                      />
                    ))}
                  </div>
                </SectionCard>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <SectionCard
                  icon={Settings2}
                  title="Configurações avançadas"
                  description="Recursos adicionais de áudio"
                  action={
                    <Button
                      size="sm"
                      onClick={onConfirmAudioConfig}
                      disabled={updateAudioPending || !audioAdvancedDirty}
                    >
                      Enviar
                    </Button>
                  }
                >
                  <div className="grid gap-3">
                    <SwitchField
                      label="Habilitar reprodução de áudio por DTMF"
                      checked={dtmfPlaybackEnabled}
                      onCheckedChange={setDtmfPlaybackEnabled}
                    />
                    <SwitchField
                      label="Habilitar beep audível ao iniciar o dispositivo"
                      checked={beepOnBootEnabled}
                      onCheckedChange={setBeepOnBootEnabled}
                    />
                  </div>
                </SectionCard>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Sensores ──────────────────────────────────── */}
        <TabsContent value="sensores">
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              icon={Scan}
              title="Fluxo do Sensor 1"
              description="Configure a leitura e a ação principal do sensor"
              action={
                <PendingDirtySendAction
                  dirty={Boolean(dirtySections.sensor1)}
                  sectionLabel="Sensores / Fluxo 1"
                />
              }
            >
              <div className="grid gap-4" onChangeCapture={() => markDirty("sensor1")}>
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="Modo"
                    defaultValue="pulso"
                    onValueChange={() => markDirty("sensor1")}
                    options={[
                      { label: "Pulso", value: "pulso" },
                      { label: "Contato seco", value: "contato" },
                    ]}
                  />
                  <TextField label="Debounce (ms)" defaultValue="250" mono />
                </div>
                <FlowActionCard
                  step={1}
                  title="Chamada em ramal"
                  description="O sensor pode disparar uma chamada interna para um ramal configurado."
                  onTest={() => onTestAction("chamada em ramal")}
                >
                  <TextField label="Ramal" defaultValue="1001" mono />
                </FlowActionCard>
                <FlowActionCard
                  step={2}
                  title="Reproduzir arquivo de áudio"
                  description="Depois da chamada, o device pode reproduzir um áudio específico."
                  onTest={() => onTestAction("reprodução de áudio")}
                >
                  <SelectField
                    label="Áudio"
                    defaultValue="boas-vindas.wav"
                    options={audioLibrary.map((audio) => ({
                      label: audio.name,
                      value: audio.id,
                    }))}
                  />
                  <TextField label="Repetir áudio" defaultValue="2" mono />
                  <SwitchField
                    label="Habilitar relé durante a reprodução do áudio"
                    onCheckedChange={() => markDirty("sensor1")}
                  />
                </FlowActionCard>
              </div>
            </SectionCard>
            <SectionCard
              icon={Scan}
              title="Fluxo do Sensor 2"
              description="Monte alternativas para o segundo sensor"
              action={
                <PendingDirtySendAction
                  dirty={Boolean(dirtySections.sensor2)}
                  sectionLabel="Sensores / Fluxo 2"
                />
              }
            >
              <div className="grid gap-4" onChangeCapture={() => markDirty("sensor2")}>
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="Modo"
                    defaultValue="contato"
                    onValueChange={() => markDirty("sensor2")}
                    options={[
                      { label: "Contato seco", value: "contato" },
                      { label: "Pulso", value: "pulso" },
                    ]}
                  />
                  <TextField label="Debounce (ms)" defaultValue="180" mono />
                </div>
                <FlowActionCard
                  step={1}
                  title="Chamada para endereço IP"
                  description="Dispare a chamada para um destino SIP por IP."
                  onTest={() => onTestAction("chamada por IP")}
                >
                  <TextField label="Endereço IP" defaultValue="192.168.15.55" mono />
                </FlowActionCard>
                <FlowActionCard
                  step={2}
                  title="Modo delivery"
                  description="Acione o fluxo de entrega configurado no dispositivo."
                  onTest={() => onTestAction("modo delivery")}
                >
                  <SelectField
                    label="Tipo de entrega"
                    defaultValue="padrao"
                    onValueChange={() => markDirty("sensor2")}
                    options={[
                      { label: "Padrão", value: "padrao" },
                      { label: "Silenciosa", value: "silenciosa" },
                      { label: "Com confirmação", value: "confirmacao" },
                    ]}
                  />
                </FlowActionCard>
              </div>
            </SectionCard>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <FlowActionCard
              title="Temporizador do relé"
              description="Configure um tempo de ativação temporária do relé a partir do fluxo."
              onTest={() => onTestAction("temporizador do relé")}
            >
              <TextField label="Tempo" defaultValue="5" mono />
            </FlowActionCard>
            <FlowActionCard
              title="Whitelist"
              description="Controle adicional antes de disparar o fluxo principal."
              onTest={() => onTestAction("whitelist")}
            >
              <SelectField
                label="Política"
                defaultValue="permitir"
                options={[
                  { label: "Permitir", value: "permitir" },
                  { label: "Negar", value: "negar" },
                ]}
              />
            </FlowActionCard>
            <FlowActionCard
              title="Resumo visual do fluxo"
              description="Ordem de execução configurada."
              onTest={() => onTestAction("fluxo completo")}
            >
              <FlowStepVisual
                steps={["Sensor detecta", "Debounce", "Ação principal", "Ação auxiliar"]}
              />
            </FlowActionCard>
          </div>
        </TabsContent>

        {/* ── Relé ──────────────────────────────────────── */}
        <TabsContent value="rele">
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              icon={Timer}
              title="Ativação temporizada do relé"
              description="Execução com tempo pré-definido"
              action={
                <PendingDirtySendAction
                  dirty={Boolean(dirtySections.relayTimed)}
                  sectionLabel="Relé / Temporizado"
                />
              }
            >
              <div className="grid gap-4" onChangeCapture={() => markDirty("relayTimed")}>
                <FlowActionCard
                  step={1}
                  title="Fluxo temporizado"
                  description="Quando acionado, o relé permanece ativo pelo tempo definido abaixo."
                  onTest={() => onTestAction("ativação temporizada do relé")}
                >
                  <TextField label="Código de ativação" defaultValue="*55" mono />
                  <TextField label="Tempo de ativação do relé (segundos)" defaultValue="3" mono />
                </FlowActionCard>
              </div>
            </SectionCard>
            <SectionCard
              icon={ToggleLeft}
              title="Ativação manual do relé"
              description="Controle direto por código"
              action={
                <PendingDirtySendAction
                  dirty={Boolean(dirtySections.relayManual)}
                  sectionLabel="Relé / Manual"
                />
              }
            >
              <div className="grid gap-4" onChangeCapture={() => markDirty("relayManual")}>
                <FlowActionCard
                  step={1}
                  title="Fluxo manual"
                  description="Defina códigos distintos para ligar e desligar o relé."
                  onTest={() => onTestAction("ativação manual do relé")}
                >
                  <TextField label="Código para ativar relé" defaultValue="*51" mono />
                  <TextField label="Código para desativar relé" defaultValue="*50" mono />
                </FlowActionCard>
              </div>
            </SectionCard>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <FlowActionCard
              title="Resumo do fluxo do relé"
              description="Ordem de execução aplicada ao relé."
              onTest={() => onTestAction("fluxo do relé")}
            >
              <FlowStepVisual
                steps={["Código recebido", "Validação", "Acionamento", "Temporização", "Retorno"]}
              />
            </FlowActionCard>
            <FlowActionCard
              title="Integração com chamada"
              description="Ajuste como o relé participa do fluxo de chamada."
              onTest={() => onTestAction("integração relé chamada")}
            >
              <SwitchField label="Habilitar relé durante chamada" defaultChecked />
              <SelectField
                label="Momento de acionamento"
                defaultValue="atendimento"
                options={[
                  { label: "No atendimento", value: "atendimento" },
                  { label: "No encerramento", value: "encerramento" },
                ]}
              />
            </FlowActionCard>
            <FlowActionCard
              title="Proteção de acionamento"
              description="Evite acionamentos indevidos com um passo extra de validação."
              onTest={() => onTestAction("proteção do relé")}
            >
              <SwitchField label="Exigir confirmação" defaultChecked />
              <TextField label="Tempo entre tentativas (segundos)" defaultValue="10" mono />
            </FlowActionCard>
          </div>
        </TabsContent>

        {/* ── LEDs ──────────────────────────────────────── */}
        <TabsContent value="leds">
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              icon={Lightbulb}
              title="Indicadores LED"
              description="Estado visual dos LEDs físicos do dispositivo"
            >
              <div className="grid gap-3">
                <LedIndicator
                  label="LED Status"
                  color={isOnline ? "green" : "off"}
                  state={isOnline ? "Verde — Fixo" : "Apagado"}
                />
                <LedIndicator
                  label="LED Rede"
                  color={isOnline ? "green" : "red"}
                  state={isOnline ? "Verde — Fixo" : "Vermelho — Fixo"}
                />
                <LedIndicator
                  label="LED SIP"
                  color={isOnline ? "green" : "off"}
                  state={isOnline ? "Verde — Fixo" : "Apagado"}
                />
                <LedIndicator label="LED Chamada" color="off" state="Apagado — ocioso" />
              </div>
            </SectionCard>
            <SectionCard
              icon={Settings2}
              title="Configurações de LED"
              description="Comportamento visual dos indicadores"
              action={
                <PendingDirtySendAction dirty={Boolean(dirtySections.leds)} sectionLabel="LEDs" />
              }
            >
              <div className="grid gap-3">
                <SwitchField
                  label="Habilitar indicação LED ao ring"
                  defaultChecked
                  onCheckedChange={() => markDirty("leds")}
                />
                <SwitchField
                  label="Habilitar LED de rede"
                  defaultChecked
                  onCheckedChange={() => markDirty("leds")}
                />
                <SwitchField
                  label="Modo noturno (brilho reduzido)"
                  onCheckedChange={() => markDirty("leds")}
                />
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* ── Multicast RTP ─────────────────────────────── */}
        <TabsContent value="multicast">
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              icon={MonitorSpeaker}
              title="Grupo Multicast 1"
              description="Primeiro grupo de distribuição RTP"
              action={
                <PendingDirtySendAction
                  dirty={Boolean(dirtySections.multicast1)}
                  sectionLabel="Multicast RTP / Grupo 1"
                />
              }
            >
              <div className="grid gap-4" onChangeCapture={() => markDirty("multicast1")}>
                <SwitchField
                  label="Habilitar Grupo Multicast RTP 1"
                  defaultChecked
                  onCheckedChange={() => markDirty("multicast1")}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Endereço Multicast" defaultValue="239.0.0.1" mono />
                  <TextField label="Porta" defaultValue="4000" mono />
                </div>
                <SelectField
                  label="Prioridade"
                  defaultValue="normal"
                  onValueChange={() => markDirty("multicast1")}
                  options={[
                    { label: "Alta", value: "alta" },
                    { label: "Normal", value: "normal" },
                    { label: "Baixa", value: "baixa" },
                  ]}
                />
              </div>
            </SectionCard>
            <SectionCard
              icon={MonitorSpeaker}
              title="Grupo Multicast 2"
              description="Segundo grupo de distribuição RTP"
              action={
                <PendingDirtySendAction
                  dirty={Boolean(dirtySections.multicast2)}
                  sectionLabel="Multicast RTP / Grupo 2"
                />
              }
            >
              <div className="grid gap-4" onChangeCapture={() => markDirty("multicast2")}>
                <SwitchField
                  label="Habilitar Grupo Multicast RTP 2"
                  onCheckedChange={() => markDirty("multicast2")}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Endereço Multicast" defaultValue="239.0.0.2" mono />
                  <TextField label="Porta" defaultValue="4002" mono />
                </div>
                <SelectField
                  label="Prioridade"
                  defaultValue="normal"
                  onValueChange={() => markDirty("multicast2")}
                  options={[
                    { label: "Alta", value: "alta" },
                    { label: "Normal", value: "normal" },
                    { label: "Baixa", value: "baixa" },
                  ]}
                />
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* ── Chamadas ──────────────────────────────────── */}
        <TabsContent value="chamadas">
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              icon={Clock}
              title="Temporizações"
              description="Limites de tempo para chamadas"
              action={
                <Button size="sm" onClick={onConfirmCallTimingsConfig} disabled={!callTimingsDirty}>
                  {callTimingsDirty ? "Enviar" : "Sem alterações"}
                </Button>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Tempo máximo de conversação (segundos)"
                  value={String(callTimings.maxConversationSeconds)}
                  onChange={(value) =>
                    setCallTimings((current) => ({
                      ...current,
                      maxConversationSeconds: Number(value) || 0,
                    }))
                  }
                  mono
                />
                <TextField
                  label="Tempo máximo de espera de resposta (segundos)"
                  value={String(callTimings.answerTimeoutSeconds)}
                  onChange={(value) =>
                    setCallTimings((current) => ({
                      ...current,
                      answerTimeoutSeconds: Number(value) || 0,
                    }))
                  }
                  mono
                />
              </div>
            </SectionCard>
            <SectionCard
              icon={Phone}
              title="Comportamento de chamada"
              description="Configurações avançadas de chamada"
              action={
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={onConfirmCallBehaviorConfig}
                    disabled={!callBehaviorDirty}
                  >
                    {callBehaviorDirty ? "Enviar" : "Sem alterações"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onDropCall}
                    disabled={commandPending}
                  >
                    Encerrar chamada
                  </Button>
                </div>
              }
            >
              <div className="grid gap-3 md:grid-cols-2">
                <SwitchField
                  label="Habilitar limite de chamada"
                  checked={callBehavior.callLimitEnabled}
                  onCheckedChange={(checked) =>
                    setCallBehavior((current) => ({ ...current, callLimitEnabled: checked }))
                  }
                />
                <SwitchField
                  label="Habilitar atendimento automático"
                  checked={callBehavior.autoAnswerEnabled}
                  onCheckedChange={(checked) =>
                    setCallBehavior((current) => ({ ...current, autoAnswerEnabled: checked }))
                  }
                />
                <SwitchField
                  label="Habilitar relé durante chamada"
                  checked={callBehavior.relayDuringCallEnabled}
                  onCheckedChange={(checked) =>
                    setCallBehavior((current) => ({ ...current, relayDuringCallEnabled: checked }))
                  }
                />
                <SwitchField
                  label="Habilitar reproduzir preâmbulo"
                  checked={callBehavior.playPreambleEnabled}
                  onCheckedChange={(checked) =>
                    setCallBehavior((current) => ({ ...current, playPreambleEnabled: checked }))
                  }
                />
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* ── Tarefas ───────────────────────────────────── */}
        <TabsContent value="tarefas">
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              icon={CalendarClock}
              title="Status de provisionamento"
              description="Estado atual do ciclo de vida do dispositivo"
            >
              <InfoRow
                label="Provisionamento"
                value={
                  device.status === "active"
                    ? "Ativo"
                    : device.status === "provisioning"
                      ? "Provisionando"
                      : "Falhou"
                }
                status={
                  device.status === "active"
                    ? "success"
                    : device.status === "provisioning"
                      ? "warning"
                      : "error"
                }
              />
              <InfoRow
                label="Conectividade"
                value={isOnline ? "Online" : "Offline"}
                status={isOnline ? "success" : "error"}
              />
              <InfoRow
                label="Última atualização"
                value={new Date(device.updatedAt).toLocaleString("pt-BR")}
              />
              <InfoRow label="Último contato" value={lastSeen} />
            </SectionCard>
            <SectionCard
              icon={CircleDot}
              title="Sincronização de configuração"
              description="Estado da configuração aplicada ao device"
            >
              <InfoRow label="Configuração enviada" value="Sim" status="success" />
              <InfoRow label="Firmware atualizado" value="Sim" status="success" />
              <InfoRow label="Áudios sincronizados" value="3 / 3" status="success" />
              <InfoRow label="Certificados TLS" value="Não configurado" status="muted" />
            </SectionCard>
          </div>
        </TabsContent>

        {/* ── Sistema ───────────────────────────────────── */}
        <TabsContent value="sistema">
          <div className="grid gap-4 xl:grid-cols-3">
            <SectionCard
              icon={Wrench}
              title="Ações do dispositivo"
              description="Operações administrativas"
            >
              <div className="grid gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => setPendingSystemAction("reboot")}
                  disabled={commandPending}
                >
                  <RefreshCw className="size-4" />
                  Reiniciar device
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="justify-start"
                  onClick={() => setPendingSystemAction("factory-reset")}
                  disabled={commandPending}
                >
                  <RotateCcw className="size-4" />
                  Restaurar device
                </Button>
              </div>
            </SectionCard>
            <SectionCard
              icon={Bug}
              title="Nível de Debug"
              description="Telemetria e suporte"
              action={
                <Button size="sm" onClick={onConfirmSystemDebugConfig} disabled={!systemDebugDirty}>
                  {systemDebugDirty ? "Enviar" : "Sem alterações"}
                </Button>
              }
            >
              <SwitchField
                label="Habilitar nível de debug"
                description="Esta configuração é salva no servidor e enviada somente após revisão."
                checked={systemDebug.enabled}
                onCheckedChange={(checked) => setSystemDebug({ enabled: checked })}
              />
            </SectionCard>
            <SectionCard
              icon={ShieldCheck}
              title="Atualização de credenciais"
              description="Gerencie credenciais administrativas"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Acessos locais do device</p>
                  <p className="text-muted-foreground text-xs">
                    Atualize usuário e senha administrativa no modal.
                  </p>
                </div>
                <Button type="button" onClick={onOpenCredentials}>
                  <ShieldCheck className="size-4" />
                  Atualizar credenciais
                </Button>
              </div>
            </SectionCard>
          </div>
        </TabsContent>
      </div>

      <AlertDialog
        open={pendingSystemAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingSystemAction(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader className="place-items-start text-left">
            <AlertDialogTitle>
              {pendingSystemAction === "reboot"
                ? "Confirmar reinicialização"
                : "Confirmar restauração"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSystemAction === "reboot"
                ? "O device será reiniciado e pode ficar indisponível por alguns instantes."
                : "O device será restaurado para o padrão de fábrica. Essa ação é destrutiva."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant={pendingSystemAction === "factory-reset" ? "destructive" : "default"}
              onClick={() => {
                if (pendingSystemAction === "reboot") {
                  onRestartDevice();
                }

                if (pendingSystemAction === "factory-reset") {
                  onRestoreDevice();
                }

                setPendingSystemAction(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingAudioRemoval !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAudioRemoval(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader className="place-items-start text-left">
            <AlertDialogTitle>Confirmar remoção do áudio</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAudioRemoval
                ? `O áudio "${pendingAudioRemoval.label}" será removido da memória do device.`
                : "O áudio será removido da memória do device."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingAudioRemoval) {
                  onDeleteAudio(pendingAudioRemoval.audioIndex);
                }

                setPendingAudioRemoval(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
