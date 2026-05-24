import { useMutation } from "@tanstack/react-query";
import { Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { queryClient, orpc } from "@/utils/orpc";

export function SyncDeviceButton({ deviceId }: { deviceId: string }) {
  const syncDevice = useMutation(
    orpc.device.sync.mutationOptions({
      onSuccess: async (device) => {
        await queryClient.invalidateQueries();

        if (device.status === "active") {
          toast.success("Device sincronizado");
          return;
        }

        toast.error(
          device.syncMessage ??
            "Nao foi possivel estabelecer conexao com o device. Ele pode estar desligado ou o IP salvo pode ter mudado via DHCP.",
        );
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <Button
      variant="outline"
      size="icon"
      className="text-muted-foreground hover:text-foreground size-7 rounded p-0.5"
      disabled={syncDevice.isPending}
      onClick={(event) => {
        event.stopPropagation();
        syncDevice.mutate({ deviceId });
      }}
      title="Sincronizar device"
      aria-label="Sincronizar device"
    >
      {syncDevice.isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCcw className="size-4" />
      )}
    </Button>
  );
}
