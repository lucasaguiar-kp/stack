import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Radio, Square, Triangle, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient, orpc } from "@/utils/orpc";

type Device = {
  id: string;
  name: string;
  extension: string;
  connectionStatus: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function GroupMulticastDialog({ open, onOpenChange, groupId }: Props) {
  const [sourceType, setSourceType] = useState<"radio_url" | "audio_file">("radio_url");
  const [radioUrl, setRadioUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [participantIds, setParticipantIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const devices = useQuery({
    ...orpc.device.list.queryOptions({ input: { groupId } }),
    enabled: open && Boolean(groupId),
  });

  const status = useQuery({
    ...orpc.group.multicast.status.queryOptions({ input: { groupId } }),
    enabled: open && Boolean(groupId),
  });

  useEffect(() => {
    if (status.data?.config) {
      const cfg = status.data.config;
      setSourceType(cfg.sourceType);
      setRadioUrl(cfg.sourceUrl ?? "");
      setParticipantIds(new Set(cfg.participantDeviceIds));
    }
  }, [status.data]);

  const saveConfig = useMutation(
    orpc.group.multicast.updateConfig.mutationOptions({
      onError: (e) => toast.error(e.message),
    }),
  );

  const start = useMutation(
    orpc.group.multicast.start.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(orpc.group.multicast.status.queryOptions({ input: { groupId } }));
        toast.success("Stream multicast iniciado");
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  const stop = useMutation(
    orpc.group.multicast.stop.mutationOptions({
      onMutate: () => {
        const statusQuery = orpc.group.multicast.status.queryOptions({ input: { groupId } });
        queryClient.setQueryData(statusQuery.queryKey, (current: typeof status.data | undefined) =>
          current ? { ...current, running: false } : current,
        );
      },
      onSuccess: () => {
        void queryClient.invalidateQueries(orpc.group.multicast.status.queryOptions({ input: { groupId } }));
        toast.success("Stream multicast parado");
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  const toggleParticipant = (deviceId: string) => {
    setParticipantIds((prev) => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };

  const handleStart = async () => {
    let audioFileData: string | undefined;
    let audioFileName: string | undefined;

    if (sourceType === "audio_file" && audioFile) {
      audioFileData = await fileToBase64(audioFile);
      audioFileName = audioFile.name;
    }

    await saveConfig.mutateAsync({
      groupId,
      sourceType,
      sourceUrl: sourceType === "radio_url" ? radioUrl : undefined,
      audioFileData,
      audioFileName,
      participantDeviceIds: [...participantIds],
    });

    await start.mutateAsync({ groupId });
  };

  const handleStop = () => stop.mutate({ groupId });

  const isRunning = status.data?.running ?? false;
  const isBusy = saveConfig.isPending || start.isPending || stop.isPending;
  const deviceList: Device[] = (devices.data as Device[] | undefined) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="size-4" />
            Multicast do Grupo
          </DialogTitle>
          <DialogDescription>
            {status.data?.address
              ? `Endereço: ${status.data.address}:16384`
              : "Configure e inicie o stream de áudio para os dispositivos do grupo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Status:</span>
            <Badge variant={isRunning ? "default" : "secondary"}>
              {isRunning ? "Transmitindo" : "Parado"}
            </Badge>
          </div>

          {/* Source type tabs */}
          <div className="space-y-2">
            <Label>Fonte de áudio</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={sourceType === "radio_url" ? "default" : "outline"}
                onClick={() => setSourceType("radio_url")}
                disabled={isRunning}
              >
                <Radio className="mr-1 size-3.5" />
                URL de rádio
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sourceType === "audio_file" ? "default" : "outline"}
                onClick={() => setSourceType("audio_file")}
                disabled={isRunning}
              >
                <Upload className="mr-1 size-3.5" />
                Arquivo de áudio
              </Button>
            </div>
          </div>

          {/* Source input */}
          {sourceType === "radio_url" ? (
            <div className="space-y-1.5">
              <Label htmlFor="radio-url">URL da rádio</Label>
              <Input
                id="radio-url"
                placeholder="http://stream.exemplo.com/radio"
                value={radioUrl}
                onChange={(e) => setRadioUrl(e.target.value)}
                disabled={isRunning}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Arquivo de áudio</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRunning}
                >
                  <Upload className="mr-1 size-3.5" />
                  {audioFile ? audioFile.name : "Selecionar arquivo"}
                </Button>
                {audioFile && (
                  <span className="text-muted-foreground text-xs">
                    {(audioFile.size / 1024).toFixed(0)} KB
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          {/* Device list */}
          <div className="space-y-2">
            <Label>Dispositivos participantes</Label>
            {devices.isLoading ? (
              <p className="text-muted-foreground text-sm">Carregando dispositivos...</p>
            ) : deviceList.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum dispositivo neste grupo.</p>
            ) : (
              <div className="border-border/40 max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                {deviceList.map((device) => (
                  <div key={device.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`device-${device.id}`}
                      checked={participantIds.has(device.id)}
                      onCheckedChange={() => toggleParticipant(device.id)}
                      disabled={isRunning}
                    />
                    <label
                      htmlFor={`device-${device.id}`}
                      className="flex flex-1 cursor-pointer items-center justify-between text-sm"
                    >
                      <span>{device.name}</span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {device.extension}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {isRunning ? (
              <Button variant="destructive" onClick={handleStop} disabled={isBusy}>
                {stop.isPending ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : (
                  <Square className="mr-1 size-4" />
                )}
                Parar stream
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                disabled={
                  isBusy ||
                  participantIds.size === 0 ||
                  (sourceType === "radio_url" && !radioUrl.trim()) ||
                  (sourceType === "audio_file" && !audioFile && !status.data?.config?.audioFileName)
                }
              >
                {isBusy ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : (
                  <Triangle className="mr-1 size-4 fill-current" />
                )}
                Iniciar stream
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
