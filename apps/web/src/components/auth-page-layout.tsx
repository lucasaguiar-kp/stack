import { AlertTriangle, LockKeyhole, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Loader from "@/components/loader";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

type DesktopServiceStatus = {
  name: string;
  found: boolean;
  state: {
    label: string;
    isRunning: boolean;
  };
  error: string | null;
};

declare global {
  interface Window {
    khompStackDesktop?: {
      getServiceStatus: (serviceName: string) => Promise<DesktopServiceStatus>;
    };
  }
}

const WINDOWS_SERVICE_NAMES = [
  "KhompStack-Backend",
  "KhompStack-Mqtt",
  "KhompStack-FreeSWITCH",
  "KhompStack-Ingest",
  "KhompStack-MulticastAgent",
];

export function AuthPageLayout({ defaultTab }: { defaultTab: "sign-in" | "sign-up" }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [serviceStatuses, setServiceStatuses] = useState<DesktopServiceStatus[]>([]);
  const [isCheckingServices, setIsCheckingServices] = useState(false);
  const setupStatus = useQuery(orpc.setup.status.queryOptions());
  const allowRegistration = setupStatus.data?.allowRegistration ?? false;
  const isFirstAccess = setupStatus.data?.hasUsers === false;

  useEffect(() => {
    if (isFirstAccess && activeTab !== "sign-up") {
      setActiveTab("sign-up");
      return;
    }

    if (!allowRegistration && activeTab === "sign-up") {
      setActiveTab("sign-in");
    }
  }, [activeTab, allowRegistration, isFirstAccess]);

  async function checkWindowsServices() {
    if (!window.khompStackDesktop) {
      return;
    }

    setIsCheckingServices(true);
    try {
      const statuses = await Promise.all(
        WINDOWS_SERVICE_NAMES.map((serviceName) =>
          window.khompStackDesktop!.getServiceStatus(serviceName),
        ),
      );
      setServiceStatuses(statuses);
    } finally {
      setIsCheckingServices(false);
    }
  }

  useEffect(() => {
    if (setupStatus.isError) {
      void checkWindowsServices();
    }
  }, [setupStatus.isError]);

  if (setupStatus.isLoading) {
    return <Loader />;
  }

  if (setupStatus.isError) {
    const errorMessage =
      setupStatus.error instanceof Error ? setupStatus.error.message : "Failed to fetch";

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <Card className="w-full max-w-2xl border-destructive/40">
          <CardHeader className="gap-3">
            <Badge variant="destructive" className="w-fit gap-2">
              <AlertTriangle className="size-3.5" />
              Backend local indisponivel
            </Badge>
            <div className="space-y-1.5">
              <CardTitle>Khomp Stack nao conseguiu conectar na API local</CardTitle>
              <CardDescription>
                O desktop abriu, mas o backend em http://127.0.0.1:3000 nao respondeu.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 font-mono text-xs">
              {errorMessage}
            </div>

            {serviceStatuses.length > 0 ? (
              <div className="grid gap-2">
                {serviceStatuses.map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                  >
                    <span className="font-medium">{service.name}</span>
                    <Badge variant={service.state.isRunning ? "secondary" : "destructive"}>
                      {service.found ? service.state.label : "NOT FOUND"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              Verifique os logs em C:\ProgramData\Khomp Stack\logs, principalmente
              install-services.log e backend.
            </div>

            <Button onClick={() => void checkWindowsServices()} disabled={isCheckingServices}>
              <RefreshCw data-icon="inline-start" />
              {isCheckingServices ? "Verificando" : "Verificar servicos"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--chart-2)_18%,transparent),transparent_28%),radial-gradient(circle_at_bottom_right,color-mix(in_oklab,var(--primary)_24%,transparent),transparent_32%),linear-gradient(180deg,color-mix(in_oklab,var(--background)_94%,black_6%),var(--background))]">
      <div className="flex h-full items-center justify-center">
        <section className="mx-auto w-full max-w-2xl p-4">
          <Card className="border-border/60 bg-card/90 backdrop-blur-md">
            <CardHeader className="gap-3 px-5 py-5 md:px-6 md:py-6">
              <Badge variant="secondary" className="w-fit gap-2 px-3 py-1">
                <LockKeyhole className="size-3" />
                Acesso privado
              </Badge>
              <div className="space-y-1.5">
                <CardTitle className="text-2xl font-semibold tracking-tight">KHOMP</CardTitle>
                <CardDescription>
                  {isFirstAccess
                    ? "Primeiro acesso detectado. Crie a conta de administracao da plataforma."
                    : "Faça login para acessar grupos e devices."}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 md:px-6 md:pb-6">
              <div className="space-y-5">
                <div className="flex items-center gap-2 border-b pb-3">
                  {!isFirstAccess ? (
                    <Button
                      type="button"
                      variant={activeTab === "sign-in" ? "default" : "ghost"}
                      size="sm"
                      className="rounded-full"
                      onClick={() => setActiveTab("sign-in")}
                    >
                      Entrar
                    </Button>
                  ) : null}
                  {allowRegistration && !isFirstAccess ? (
                    <Button
                      type="button"
                      variant={activeTab === "sign-up" ? "default" : "ghost"}
                      size="sm"
                      className="rounded-full"
                      onClick={() => setActiveTab("sign-up")}
                    >
                      Criar conta
                    </Button>
                  ) : null}
                  {isFirstAccess ? (
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      Criar admin
                    </Badge>
                  ) : null}
                </div>

                {activeTab === "sign-in" ? (
                  <SignInForm
                    onSwitchToSignUp={allowRegistration ? () => setActiveTab("sign-up") : undefined}
                    embedded
                  />
                ) : (
                  <SignUpForm
                    allowRegistration={allowRegistration}
                    isInitialAdminSetup={isFirstAccess}
                    onSwitchToSignIn={isFirstAccess ? undefined : () => setActiveTab("sign-in")}
                    embedded
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
