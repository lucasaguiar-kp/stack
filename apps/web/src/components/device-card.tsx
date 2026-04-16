import { useNavigate } from "@tanstack/react-router";
import { MoreVertical, Pencil, Phone, Trash2, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { DeleteDeviceButton } from "@/components/delete-device-button";
import { EditDeviceDialog } from "@/components/edit-device-dialog";
import { SyncDeviceButton } from "@/components/sync-device-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface DeviceListItem {
  id: string;
  groupId: string;
  name: string;
  extension: string;
  sipUser: string;
  sipPassword: string;
  macAddress?: string | null;
  deviceIp?: string | null;
  mqttTopic: string;
  status: "provisioning" | "active" | "failed";
  connectionStatus: "online" | "offline" | "unknown";
  lastSeenAt?: Date | string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  groupName: string;
}

function ConnectionDot({ status }: { status: DeviceListItem["connectionStatus"] }) {
  const color =
    status === "online" ? "bg-success" : status === "offline" ? "bg-destructive" : "bg-warning";

  return (
    <span className="relative flex size-2">
      {status === "online" && (
        <span
          className={`absolute inline-flex size-full animate-ping rounded-full ${color} opacity-40`}
        />
      )}
      <span className={`relative inline-flex size-2 rounded-full ${color}`} />
    </span>
  );
}

export function DeviceCard({
  device,
  groups,
  onCall,
}: {
  device: DeviceListItem;
  groups?: { id: string; name: string }[];
  onCall?: (device: DeviceListItem) => void;
}) {
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isDisconnected = device.connectionStatus !== "online";

  return (
    <Card
      className={`group border-border/50 bg-card py-0 transition-all ${
        isDisconnected
          ? "cursor-default opacity-85"
          : "hover:border-primary/30 hover:bg-card/90 hover:shadow-primary/5 cursor-pointer hover:shadow-lg"
      }`}
      onClick={() => {
        if (editOpen || deleteOpen || isDisconnected) {
          return;
        }

        navigate({
          to: "/devices/$deviceId",
          params: { deviceId: device.id },
          search: { tab: "estado" },
        });
      }}
    >
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <ConnectionDot status={device.connectionStatus} />
            <h3 className="text-sm font-semibold">{device.name}</h3>
          </div>
          <div className="flex items-center gap-1">
            <Badge
              variant={
                device.status === "active"
                  ? "default"
                  : device.status === "failed"
                    ? "destructive"
                  : "secondary"
              }
              className="text-[10px]"
            >
              {device.status}
            </Badge>
            {device.status === "failed" ? <SyncDeviceButton deviceId={device.id} /> : null}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground -mr-1 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  />
                }
              >
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="mr-2 size-3.5" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 size-3.5" />
                  Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">MAC</span>
            <span className="text-foreground/80 font-mono">{device.macAddress ?? "--"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Conexão</span>
            <span className="flex items-center gap-1">
              {device.connectionStatus === "online" ? (
                <Wifi className="text-success size-3" />
              ) : (
                <WifiOff className="text-muted-foreground size-3" />
              )}
              <span
                className={
                  device.connectionStatus === "online"
                    ? "text-success font-medium"
                    : device.connectionStatus === "unknown"
                      ? "text-warning font-medium"
                      : "text-destructive"
                }
              >
                {device.connectionStatus}
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Ramal</span>
            <span className="font-mono font-medium">{device.extension}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Senha PBX</span>
            <span className="text-foreground/60 font-mono">{device.sipPassword}</span>
          </div>
        </div>

        <div className="mt-4">
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 w-full gap-2"
            disabled={isDisconnected}
            onClick={(e) => {
              e.stopPropagation();
              onCall?.(device);
            }}
          >
            <Phone className="size-3.5" />
            Ligar
          </Button>
        </div>
      </CardContent>

      {groups && (
        <EditDeviceDialog
          device={device}
          groups={groups}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}

      <DeleteDeviceButton
        deviceId={device.id}
        deviceName={device.name}
        groupId={device.groupId}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </Card>
  );
}
