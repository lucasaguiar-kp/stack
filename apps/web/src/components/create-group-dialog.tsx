import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { OrganizationForm } from "@/components/organization-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { queryClient, orpc } from "@/utils/orpc";

export function CreateGroupDialog() {
  const [open, setOpen] = useState(false);
  const createGroup = useMutation(
    orpc.group.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast.success("Grupo criado");
        setOpen(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button>
            <Plus className="size-4" />
            Novo grupo
          </Button>
        }
      />
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>Criar grupo</SheetTitle>
          <SheetDescription>Crie um grupo sem sair da tela atual.</SheetDescription>
        </SheetHeader>
        <OrganizationForm
          mode="create"
          isPending={createGroup.isPending}
          onCancel={() => setOpen(false)}
          onSubmit={(values) => createGroup.mutateAsync(values)}
        />
      </SheetContent>
    </Sheet>
  );
}
