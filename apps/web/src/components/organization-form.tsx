import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OrganizationForm({
  mode,
  initialValues,
  isPending,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit";
  initialValues?: {
    name: string;
  };
  isPending: boolean;
  onCancel?: () => void;
  onSubmit: (values: { name: string }) => Promise<unknown>;
  showCard?: boolean;
}) {
  const [name, setName] = useState(initialValues?.name ?? "");

  useEffect(() => {
    setName(initialValues?.name ?? "");
  }, [initialValues?.name]);

  return (
    <form
      className="flex h-full min-h-0 flex-col"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit({
          name: name.trim(),
        });
      }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="grid gap-2">
          <Label htmlFor="organization-name">Nome</Label>
          <Input
            id="organization-name"
            name="name"
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Acme Telecom..."
          />
        </div>
      </div>

      <div className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky bottom-0 flex items-center justify-between gap-3 border-t px-6 py-4 backdrop-blur">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={isPending || name.trim().length < 3}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {mode === "create" ? "Criar grupo" : "Salvar alteracoes"}
        </Button>
      </div>
    </form>
  );
}
