import { useState } from "react";
import { TextField } from "@/components/device-detail/device-detail-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DeviceCredentialsDialog({
  defaultUsername,
  onSubmit,
  open,
  onOpenChange,
  pending = false,
}: {
  defaultUsername?: string;
  onSubmit: (input: { currentPassword: string; newPassword: string }) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending?: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Atualização de credenciais</DialogTitle>
          <DialogDescription>
            Atualize o acesso local do device com validação de senha atual e nova senha.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <TextField label="Usuário" value={defaultUsername ?? "admin"} readOnly />
          <TextField
            label="Senha atual"
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
          />
          <TextField
            label="Nova senha"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
          />
          <TextField
            label="Confirmar a senha"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
          {!passwordsMatch && confirmPassword ? (
            <p className="text-destructive text-xs">As senhas não coincidem.</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!currentPassword || !passwordsMatch || pending}
            onClick={() => {
              onSubmit({
                currentPassword,
                newPassword,
              });
              onOpenChange(false);
            }}
          >
            Salvar credenciais
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
