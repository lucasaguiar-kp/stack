import { useMutation } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { DeviceForm } from "@/components/device-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { queryClient, orpc } from "@/utils/orpc";

type GroupOption = {
  id: string;
  name: string;
};

type DeviceOption = {
  id: string;
  name: string;
  groupId: string;
  macAddress?: string | null;
  deviceIp?: string | null;
};

export function EditDeviceDialog({
  device,
  groups,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  device: DeviceOption;
  groups: GroupOption[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const updateDevice = useMutation(
    orpc.device.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast.success("Device atualizado");
        setOpen(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function stopPropagation(event: MouseEvent) {
    event.stopPropagation();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <SheetTrigger
          render={<Button variant="outline" size="sm" onClick={stopPropagation} />}
        >
          <Pencil className="size-4" />
          Editar
        </SheetTrigger>
      )}
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-xl"
        onClick={stopPropagation}
      >
        <SheetHeader className="border-b px-6 py-5 text-left">
          <SheetTitle>Editar device</SheetTitle>
          <SheetDescription>
            Atualize o nome do device e o grupo associado.
          </SheetDescription>
        </SheetHeader>
        <DeviceForm
          mode="edit"
          groups={groups}
          initialGroupId={device.groupId}
          initialName={device.name}
          initialMacAddress={device.macAddress}
          initialDeviceIp={device.deviceIp}
          isPending={updateDevice.isPending}
          onCancel={() => setOpen(false)}
          onSubmit={(values) =>
            updateDevice.mutateAsync({
              deviceId: device.id,
              deviceIp: values.deviceIp,
              groupId: values.groupId,
              name: values.name,
            })
          }
        />
      </SheetContent>
    </Sheet>
  );
}
