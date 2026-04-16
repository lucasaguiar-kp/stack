import { createFileRoute } from "@tanstack/react-router";
import { AccountSettingsContent } from "@/components/account-settings-content";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSession } from "@/lib/route-guards";

export const Route = createFileRoute("/(private)/account/")({
  beforeLoad: requireSession,
  component: AccountPage,
});

function AccountPage() {
  return (
    <div className="flex flex-1 flex-col">
      <AppBreadcrumb
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Conta" },
        ]}
      />

      <div className="flex flex-1 flex-col gap-6 p-6">
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle>Conta</CardTitle>
            <CardDescription>
              Atualize suas informações pessoais e altere sua senha.
            </CardDescription>
          </CardHeader>
        </Card>

        <AccountSettingsContent />
      </div>
    </div>
  );
}
