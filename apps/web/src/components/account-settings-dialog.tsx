import { User2 } from "lucide-react";
import { AccountSettingsContent } from "@/components/account-settings-content";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AccountSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-5 py-5 md:px-6 md:py-6">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User2 className="size-5" />
            Conta
          </DialogTitle>
          <DialogDescription>Atualize seu nome e senha sem sair da tela atual.</DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-5 md:px-6 md:pb-6">
          <AccountSettingsContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
