import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function MqttCommandPreviewDialog({
  onConfirm,
  onOpenChange,
  open,
  preview,
}: {
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  preview: {
    params?: Record<string, unknown>;
    path: string;
    title: string;
    topic: string;
  } | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{preview?.title ?? "Preview MQTT"}</DialogTitle>
          <DialogDescription>
            Revise o comando antes de enviar para o device. Campos sensíveis aparecem ocultos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="rounded-xl border px-3 py-2">
            <p className="text-muted-foreground text-xs">Tópico</p>
            <p className="font-mono text-sm">{preview?.topic ?? "--"}</p>
          </div>
          <div className="rounded-xl border px-3 py-2">
            <p className="text-muted-foreground text-xs">Payload</p>
            <pre className="overflow-x-auto text-xs leading-5 whitespace-pre-wrap">
              {JSON.stringify(
                {
                  id: "<generated-on-send>",
                  path: preview?.path,
                  params: preview?.params ?? {},
                },
                null,
                2,
              )}
            </pre>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>Confirmar envio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
