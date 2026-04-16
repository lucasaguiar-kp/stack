import { CheckCircle2, Copy, Download, ExternalLink, RefreshCw, X } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface SystemUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: {
    branch: string | null;
    currentCommit: string | null;
    latestCommit: string | null;
    repository: string | null;
    updateCommand: string;
    hasUpdate: boolean;
    unavailableReason: string | null;
  };
}

function shortCommit(value: string | null) {
  return value ? value.slice(0, 7) : "n/a";
}

export function SystemUpdateDialog({ open, onOpenChange, status }: SystemUpdateDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  if (!open) {
    return null;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(status.updateCommand);
      toast.success("Comando copiado");
    } catch {
      toast.error("Nao foi possivel copiar o comando");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b px-6 py-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Atualizar sistema</h2>
            <p className="text-sm text-muted-foreground">
              Use o comando abaixo no Windows PowerShell para baixar a ultima versao e recriar os
              containers.
            </p>
          </div>

          <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)}>
            <X />
          </Button>
        </div>

        <div className="grid gap-6 px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Branch
              </div>
              <div className="mt-2 font-medium">{status.branch ?? "n/a"}</div>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Atual
              </div>
              <div className="mt-2 font-mono text-sm">{shortCommit(status.currentCommit)}</div>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Remoto
              </div>
              <div className="mt-2 font-mono text-sm">{shortCommit(status.latestCommit)}</div>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              {status.hasUpdate ? (
                <>
                  <Download className="size-4 text-primary" />
                  Atualizacao disponivel
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 text-primary" />
                  Sistema ja atualizado
                </>
              )}
            </div>

            <pre className="overflow-x-auto rounded-lg border bg-background p-4 font-mono text-xs leading-6 whitespace-pre-wrap">
              {status.updateCommand}
            </pre>

            {status.unavailableReason ? (
              <p className="mt-3 text-xs text-muted-foreground">{status.unavailableReason}</p>
            ) : null}
          </div>

          {status.repository ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="size-4" />
              Repositorio:
              <a
                href={status.repository}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline underline-offset-4"
              >
                {status.repository}
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>

          <Button onClick={() => void handleCopy()}>
            <Copy data-icon="inline-start" />
            Copiar comando
          </Button>
        </div>
      </div>
    </div>
  );
}
