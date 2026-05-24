import { useQuery } from "@tanstack/react-query";
import { BadgeAlert, CheckCircle2, Download, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SystemUpdateDialog } from "@/components/system-update-dialog";
import { orpc } from "@/utils/orpc";

function shortCommit(value: string | null) {
  return value ? value.slice(0, 7) : "n/a";
}

function displayVersion(value: string | null) {
  return value ? `v${value.replace(/^v/i, "")}` : "n/a";
}

export function SystemUpdateCard() {
  const [open, setOpen] = useState(false);
  const statusQuery = useQuery(orpc.system.updateStatus.queryOptions());

  const status = useMemo(() => {
    return (
      statusQuery.data ?? {
        isConfigured: false,
        hasUpdate: false,
        repository: null,
        branch: null,
        currentVersion: null,
        latestVersion: null,
        latestTag: null,
        currentCommit: null,
        latestCommit: null,
        installDirectory: null,
        updateCommand: "Abra a ultima release do GitHub e execute o instalador mais recente.",
        releaseUrl: null,
        installerDownloadUrl: null,
        installerAssetName: null,
        unavailableReason: "Carregando status da atualizacao.",
        checkedAt: new Date().toISOString(),
      }
    );
  }, [statusQuery.data]);

  const statusTone = status.hasUpdate
    ? {
        icon: Download,
        title: "Atualizacao disponivel",
        description: "Existe uma nova release no GitHub pronta para instalar.",
      }
    : status.isConfigured
      ? {
          icon: CheckCircle2,
          title: "Sistema atualizado",
          description: "A instalacao atual ja esta alinhada com a ultima release.",
        }
      : {
          icon: BadgeAlert,
          title: "Atualizacao nao configurada",
          description: status.unavailableReason ?? "Nao foi possivel verificar novas versoes.",
        };

  const StatusIcon = statusTone.icon;

  return (
    <>
      <Card className="border-border/40 lg:col-span-2">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="size-4" />
              Atualizacao do sistema
            </CardTitle>
            <CardDescription>
              Verifique se existe uma nova release e baixe o instalador pelo GitHub.
            </CardDescription>
          </div>

          <Button variant={status.hasUpdate ? "default" : "outline"} onClick={() => setOpen(true)}>
            {status.hasUpdate ? <Download data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
            {status.hasUpdate ? "Ver atualizacao" : "Como atualizar"}
          </Button>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <StatusIcon className="size-4 text-primary" />
              {statusTone.title}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{statusTone.description}</p>
          </div>

          <div className="grid gap-2 rounded-xl border bg-muted/20 p-4 text-sm sm:min-w-64">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Instalada</span>
              <span className="font-medium">{displayVersion(status.currentVersion)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Release</span>
              <span className="font-medium">{displayVersion(status.latestVersion)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Commit</span>
              <span className="font-mono">{shortCommit(status.latestCommit)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <SystemUpdateDialog open={open} onOpenChange={setOpen} status={status} />
    </>
  );
}
