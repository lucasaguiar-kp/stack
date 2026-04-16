import { KeyRound, Save, User2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { SystemUpdateCard } from "@/components/system-update-card";

export function AccountSettingsContent() {
  const { data: session, isPending } = authClient.useSession();
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    setName(session?.user.name ?? "");
  }, [session?.user.name]);

  const trimmedName = name.trim();
  const canSaveName = trimmedName.length >= 2 && trimmedName !== (session?.user.name ?? "");
  const passwordsMatch = newPassword === confirmPassword;
  const canChangePassword =
    currentPassword.length >= 8 &&
    newPassword.length >= 8 &&
    confirmPassword.length >= 8 &&
    passwordsMatch;

  async function handleUpdateName() {
    setIsSavingName(true);

    await authClient.updateUser(
      { name: trimmedName },
      {
        onSuccess: () => {
          toast.success("Nome atualizado");
        },
        onError: (error) => {
          toast.error(error.error.message || error.error.statusText);
        },
      },
    );

    setIsSavingName(false);
  }

  async function handleChangePassword() {
    if (!passwordsMatch) {
      toast.error("As senhas nao coincidem");
      return;
    }

    setIsSavingPassword(true);

    await authClient.changePassword(
      {
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      },
      {
        onSuccess: () => {
          toast.success("Senha atualizada");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (error) => {
          toast.error(error.error.message || error.error.statusText);
        },
      },
    );

    setIsSavingPassword(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User2 className="size-4" />
            Dados pessoais
          </CardTitle>
          <CardDescription>
            Atualize seu nome de exibição e confira o email da conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void handleUpdateName();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="account-name">Nome</Label>
            <Input
              id="account-name"
              name="account-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome"
              disabled={isPending}
            />
            {trimmedName.length > 0 && trimmedName.length < 2 ? (
              <p className="text-destructive text-xs">O nome deve ter pelo menos 2 caracteres</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label>Email</Label>
            <Input value={session?.user.email ?? ""} disabled />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={!canSaveName || isSavingName || isPending}>
              <Save data-icon="inline-start" />
              {isSavingName ? "Salvando..." : "Salvar nome"}
            </Button>
          </div>
        </form>
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4" />
            Segurança
          </CardTitle>
          <CardDescription>
            Altere sua senha e revogue outras sessões ativas.
          </CardDescription>
        </CardHeader>
        <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void handleChangePassword();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="current-password">Senha atual</Label>
            <Input
              id="current-password"
              name="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Sua senha atual"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              name="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Pelo menos 8 caracteres"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <Input
              id="confirm-password"
              name="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repita a nova senha"
            />
            {confirmPassword.length > 0 && !passwordsMatch ? (
              <p className="text-destructive text-xs">As senhas nao coincidem</p>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={!canChangePassword || isSavingPassword}>
              <KeyRound data-icon="inline-start" />
              {isSavingPassword ? "Atualizando..." : "Alterar senha"}
            </Button>
          </div>
        </form>
        </CardContent>
      </Card>

      <SystemUpdateCard />
    </div>
  );
}
