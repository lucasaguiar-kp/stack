import { LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Loader from "@/components/loader";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export function AuthPageLayout({ defaultTab }: { defaultTab: "sign-in" | "sign-up" }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
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

  if (setupStatus.isLoading) {
    return <Loader />;
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
