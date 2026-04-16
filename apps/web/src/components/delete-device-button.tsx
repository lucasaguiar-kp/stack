import { useMutation } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { queryClient, orpc } from "@/utils/orpc";

export function DeleteDeviceButton({
  deviceId,
  deviceName,
  groupId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  deviceId: string;
  deviceName: string;
  groupId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const deleteDevice = useMutation(
    orpc.device.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        controlledOnOpenChange?.(false);
        toast.success("Device removed");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function stopPropagation(event: MouseEvent) {
    event.stopPropagation();
  }

  return (
    <AlertDialog open={controlledOpen} onOpenChange={controlledOnOpenChange}>
      {controlledOpen === undefined && (
        <AlertDialogTrigger render={<Button variant="outline" size="sm" onClick={stopPropagation} />}>
          <Trash2 className="size-4" />
          Remover
        </AlertDialogTrigger>
      )}
      <AlertDialogContent size="sm" onClick={stopPropagation}>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover device</AlertDialogTitle>
          <AlertDialogDescription>
            Remova <strong>{deviceName}</strong> deste grupo e do provisionamento do PBX.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={stopPropagation}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteDevice.isPending}
            onClick={(event) => {
              stopPropagation(event);
              deleteDevice.mutate({ deviceId, groupId });
            }}
          >
            {deleteDevice.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Remover device
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
