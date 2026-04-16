import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { OrganizationForm } from "@/components/organization-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { queryClient, orpc } from "@/utils/orpc";

type GroupOption = {
  extension?: string | null;
  id: string;
  name: string;
};

export function GroupSettingsDialog({
  group,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  group: GroupOption;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const updateGroup = useMutation(
    orpc.group.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast.success("Grupo atualizado");
        setOpen(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="size-4" />
          Editar
        </Button>
      )}
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>Editar grupo</SheetTitle>
          <SheetDescription>Atualize o nome do grupo.</SheetDescription>
        </SheetHeader>
        <OrganizationForm
          mode="edit"
          initialValues={{ name: group.name }}
          isPending={updateGroup.isPending}
          onCancel={() => setOpen(false)}
          onSubmit={(values) =>
            updateGroup.mutateAsync({
              groupId: group.id,
              name: values.name,
            })
          }
        />
      </SheetContent>
    </Sheet>
  );
}

export function DeleteGroupButton({
  group,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  group: GroupOption;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const deleteGroup = useMutation(
    orpc.group.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast.success("Group deleted");
        navigate({ to: "/" });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <AlertDialog open={controlledOpen} onOpenChange={controlledOnOpenChange}>
      {controlledOpen === undefined && (
        <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
          <Trash2 className="size-4" />
          Remover
        </AlertDialogTrigger>
      )}
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Remover grupo</AlertDialogTitle>
          <AlertDialogDescription>
            Isso vai remover <strong>{group.name}</strong> e a configuracao associada do PBX.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteGroup.isPending}
            onClick={() => deleteGroup.mutate({ groupId: group.id })}
          >
            {deleteGroup.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Remover grupo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
