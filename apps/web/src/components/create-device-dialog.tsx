import { useMutation } from "@tanstack/react-query";
import { Info, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DeviceForm } from "@/components/device-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient, orpc } from "@/utils/orpc";

type GroupOption = {
  id: string;
  name: string;
};

export function CreateDeviceDialog({
  groups,
  initialGroupId,
}: {
  groups: GroupOption[];
  initialGroupId?: string;
}) {
  const [open, setOpen] = useState(false);
  const createDevice = useMutation(
    orpc.device.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast.success("Device salvo");
        setOpen(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button disabled={!groups.length}>
            <Plus className="size-4" />
            Novo device
          </Button>
        }
      />
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-2xl">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>Criar device</SheetTitle>
            <SheetDescription>Crie um device e vincule-o a um grupo.</SheetDescription>
          </SheetHeader>
          <DeviceForm
            groups={groups}
            initialGroupId={initialGroupId}
            isPending={createDevice.isPending}
            onSubmit={(values) => createDevice.mutateAsync(values)}
            onCancel={() => setOpen(false)}
            leadingContent={
              <div className="grid gap-3">
                <Alert>
                  <Info className="size-4" />
                  <AlertTitle>Como descobrir o IP da corneta pelo MAC</AlertTitle>
                  <AlertDescription>
                    Confirme que a corneta está ligada na mesma rede do computador e copie o MAC da
                    etiqueta do device.
                  </AlertDescription>
                </Alert>

                <Tabs defaultValue="windows" className="gap-3">
                  <TabsList className="w-full">
                    <TabsTrigger value="windows">Windows</TabsTrigger>
                    <TabsTrigger value="linux">Linux</TabsTrigger>
                  </TabsList>

                  <TabsContent value="windows" className="rounded-lg border p-3">
                    <p className="text-muted-foreground">
                      1. Abra o Prompt de Comando.
                      <br />
                      2. Rode <code className="rounded bg-muted px-1 py-0.5">arp -a</code>.
                      <br />
                      3. Procure a linha cujo MAC bate com o da corneta.
                      <br />
                      4. O IP exibido na mesma linha é o IP do device.
                    </p>
                  </TabsContent>

                  <TabsContent value="linux" className="rounded-lg border p-3">
                    <p className="text-muted-foreground">
                      1. Abra o terminal.
                      <br />
                      2. Rode <code className="rounded bg-muted px-1 py-0.5">sudo arp-scan -l</code>.
                      <br />
                      3. Procure a linha cujo MAC bate com o da corneta.
                      <br />
                      4. O IP no início da linha é o IP da corneta.
                      <br />
                      <br />
                      Se <code className="rounded bg-muted px-1 py-0.5">arp-scan</code> não estiver instalado,
                      use:
                      <br />
                      <code className="mt-1 inline-block rounded bg-muted px-1 py-0.5">
                        ip neigh | grep AA:BB:CC:DD:EE:FF
                      </code>
                    </p>
                  </TabsContent>
                </Tabs>
              </div>
            }
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
