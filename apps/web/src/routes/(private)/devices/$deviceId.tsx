import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { DeviceDetailPage } from "@/components/device-detail/device-detail-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { requireSession } from "@/lib/route-guards";
import { orpc } from "@/utils/orpc";
import type { DeviceDetailData } from "@/hooks/use-device-detail-view-model";

const validTabs = new Set([
  "estado",
  "sip",
  "rede",
  "mqtt",
  "audio",
  "sensores",
  "rele",
  "leds",
  "multicast",
  "chamadas",
  "tarefas",
  "sistema",
]);

export const Route = createFileRoute("/(private)/devices/$deviceId")({
  beforeLoad: requireSession,
  component: DeviceDetailRoute,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === "string" && validTabs.has(search.tab) ? search.tab : "estado",
  }),
});

function DeviceDetailRoute() {
  const { deviceId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const detail = useQuery(orpc.device.detail.queryOptions({ input: { deviceId } }));

  const onTabChange = (value: string) => {
    void navigate({
      search: { tab: value } as never,
      replace: true,
    });
  };

  useEffect(() => {
    if (!detail.data?.device || detail.isLoading) {
      return;
    }

    if (detail.data.device.connectionStatus !== "online") {
      toast.info("Device desconectado. Voltando para a dashboard.");
      void navigate({ to: "/" });
    }
  }, [detail.data?.device, detail.isLoading, navigate]);

  if (detail.isLoading) {
    return (
      <div className="flex flex-col">
        <AppBreadcrumb
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Devices", href: "/devices" },
            { label: "Detalhe" },
          ]}
        />
        <div className="flex flex-1 flex-col gap-6 p-6">
          <Card className="border-border/40 py-0">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-2xl">
                  <Spinner className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold">Buscando informacoes do device</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Estamos carregando a configuracao salva e preparando a interface para edicao.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!detail.data?.device) {
    return (
      <div className="flex flex-col">
        <AppBreadcrumb
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Devices", href: "/devices" },
            { label: "Detalhe" },
          ]}
        />
        <div className="flex flex-1 flex-col gap-6 p-6">
          <Card className="border-border/40 py-0">
            <CardContent className="p-8 text-center">
              <p className="text-sm font-medium">Device não encontrado.</p>
              <p className="text-muted-foreground mt-2 text-sm">
                Verifique se o device ainda pertence a este grupo ou se foi removido.
              </p>
              <Button className="mt-4" variant="outline" size="sm" render={<Link to="/devices" />}>
                Ir para devices
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <AppBreadcrumb
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Devices", href: "/devices" },
          { label: detail.data.device.name },
        ]}
      />
      <div className="flex flex-1 flex-col p-6 pt-0">
        <DeviceDetailPage
          detail={detail.data as DeviceDetailData}
          activeTab={tab}
          onTabChange={onTabChange}
        />
      </div>
    </div>
  );
}
