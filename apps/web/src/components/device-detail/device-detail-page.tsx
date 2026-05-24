import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Menu, Mic, Phone, Settings, Wifi, WifiOff, X } from "lucide-react";
import { useState } from "react";
import { CallDestinationButton } from "@/components/call-destination-button";
import { DeviceAudioRecordDialog } from "@/components/device-detail/device-audio-record-dialog";
import { DeviceCredentialsDialog } from "@/components/device-detail/device-credentials-dialog";
import { DeviceDetailContent } from "@/components/device-detail/device-detail-content";
import { MqttCommandPreviewDialog } from "@/components/device-detail/mqtt-command-preview-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useDeviceDetailViewModel,
  type DeviceDetailData,
} from "@/hooks/use-device-detail-view-model";

export function DeviceDetailPage({
  detail,
  activeTab = "estado",
  onTabChange,
}: {
  detail: DeviceDetailData;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}) {
  const viewModel = useDeviceDetailViewModel(detail);
  const device = detail.device;
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  if (!device) {
    return null;
  }

  return (
    <div className="flex h-full min-w-0 flex-col gap-6">
      <div className="border-border/40 bg-card flex flex-wrap items-center gap-4 rounded-xl border px-5 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
            <Settings className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-lg font-bold">{device.name}</h1>
              <span className={`flex items-center gap-1 ${viewModel.statusColor}`}>
                {device.connectionStatus === "online" ? (
                  <Wifi className="size-3.5" />
                ) : (
                  <WifiOff className="size-3.5" />
                )}
                <span className="text-xs font-medium">{device.connectionStatus}</span>
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {device.groupName}
              </Badge>
              {device.macAddress ? (
                <Badge variant="outline" className="font-mono text-[10px]">
                  {device.macAddress}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="ml-auto hidden flex-wrap items-center justify-end gap-2 md:flex">
          <Button
            type="button"
            variant={viewModel.previewEnabled ? "default" : "outline"}
            onClick={() => viewModel.setPreviewEnabled(!viewModel.previewEnabled)}
          >
            {viewModel.previewEnabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            {viewModel.previewEnabled ? "Preview MQTT ativo" : "Preview MQTT inativo"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => viewModel.setAudioRecordDialogOpen(true)}
          >
            <Mic className="size-4" />
            Gravar e tocar
          </Button>
          <CallDestinationButton destination={device.extension} label="Ligar para Dispositivo" />
        </div>
      </div>

      <DeviceDetailContent
        vm={viewModel}
        detail={detail}
        device={device}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      <Button
        size="icon"
        className="bg-primary hover:bg-primary/90 fixed right-5 bottom-5 z-40 size-14 rounded-full shadow-lg md:hidden"
        onClick={() => setMobileActionsOpen((current) => !current)}
      >
        {mobileActionsOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        <span className="sr-only">Abrir ações do device</span>
      </Button>

      <div
        className={`fixed right-5 bottom-24 z-40 grid gap-3 transition-all md:hidden ${
          mobileActionsOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <Button
          type="button"
          variant={viewModel.previewEnabled ? "default" : "outline"}
          className="h-11 justify-start gap-2 rounded-full px-4 shadow-lg"
          onClick={() => {
            viewModel.setPreviewEnabled(!viewModel.previewEnabled);
            setMobileActionsOpen(false);
          }}
        >
          {viewModel.previewEnabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          {viewModel.previewEnabled ? "Preview ativo" : "Ativar preview"}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-11 justify-start gap-2 rounded-full px-4 shadow-lg"
          onClick={() => {
            viewModel.setAudioRecordDialogOpen(true);
            setMobileActionsOpen(false);
          }}
        >
          <Mic className="size-4" />
          Gravar e tocar
        </Button>

        <Button
          type="button"
          className="bg-primary hover:bg-primary/90 h-11 justify-start gap-2 rounded-full px-4 shadow-lg"
          disabled={!viewModel.canCall}
          onClick={() => {
            viewModel.handleDeviceCall();
            setMobileActionsOpen(false);
          }}
        >
          <Phone className="size-4" />
          Ligar
        </Button>
      </div>

      <DeviceCredentialsDialog
        defaultUsername="admin"
        onSubmit={viewModel.handleUpdateCredentials}
        open={viewModel.credentialsDialogOpen}
        onOpenChange={viewModel.setCredentialsDialogOpen}
        pending={viewModel.commandPending}
      />

      <DeviceAudioRecordDialog
        open={viewModel.audioRecordDialogOpen}
        onOpenChange={viewModel.setAudioRecordDialogOpen}
        onSend={viewModel.handlePlayTemporaryAudio}
        pending={viewModel.uploadAudioPending}
      />

      <MqttCommandPreviewDialog
        open={Boolean(viewModel.pendingPreview)}
        preview={viewModel.pendingPreview}
        onOpenChange={(open) => {
          if (!open) {
            viewModel.closePendingPreview();
          }
        }}
        onConfirm={() => {
          void viewModel.confirmPendingAction();
        }}
      />
    </div>
  );
}
