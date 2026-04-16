import { Loader2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type GroupOption = {
  id: string;
  name: string;
};

export function DeviceForm({
  mode = "create",
  groups,
  initialGroupId,
  initialName,
  initialMacAddress,
  initialDeviceIp,
  isPending,
  onCancel,
  leadingContent,
  onSubmit,
}: {
  mode?: "create" | "edit";
  groups: GroupOption[];
  initialGroupId?: string;
  initialName?: string;
  initialMacAddress?: string | null;
  initialDeviceIp?: string | null;
  isPending: boolean;
  onCancel?: () => void;
  leadingContent?: ReactNode;
  onSubmit: (values: {
    deviceIp: string;
    groupId: string;
    name: string;
    macAddress: string;
  }) => Promise<unknown>;
  showCard?: boolean;
}) {
  const [groupId, setGroupId] = useState(initialGroupId ?? "");
  const [name, setName] = useState(initialName ?? "");
  const [macAddress, setMacAddress] = useState(initialMacAddress ?? "");
  const [deviceIp, setDeviceIp] = useState(initialDeviceIp ?? "");

  const selectedGroup = groups.find((group) => group.id === groupId);

  useEffect(() => {
    setGroupId(initialGroupId ?? groups[0]?.id ?? "");
  }, [groups, initialGroupId]);

  useEffect(() => {
    setName(initialName ?? "");
  }, [initialName]);

  useEffect(() => {
    setMacAddress(initialMacAddress ?? "");
  }, [initialMacAddress]);

  useEffect(() => {
    setDeviceIp(initialDeviceIp ?? "");
  }, [initialDeviceIp]);

  return (
    <form
      className="flex h-full min-h-0 flex-col"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit({
          deviceIp: deviceIp.trim(),
          groupId,
          name: name.trim(),
          macAddress: macAddress.trim(),
        });
      }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {leadingContent ? <div className="mb-4">{leadingContent}</div> : null}

        <div className="grid gap-4">
          <div className="grid gap-2">
          <Label htmlFor="device-group-select">Grupo</Label>
          <Select value={groupId} onValueChange={(value) => setGroupId(value ?? "")}>
            <SelectTrigger id="device-group-select" className="bg-background/70 w-full">
              <SelectValue placeholder="Selecione um grupo">{selectedGroup?.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="device-name">Nome</Label>
            <Input
              id="device-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Corneta Recepcao"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="device-mac">Endereco MAC</Label>
            <Input
              id="device-mac"
              value={macAddress}
              required={mode === "create"}
              disabled={mode === "edit"}
              onChange={(event) => setMacAddress(event.target.value)}
              placeholder="AA:BB:CC:DD:EE:FF"
            />
            <p className="text-muted-foreground text-xs">
              {mode === "create"
                ? "O backend usa este MAC para enviar o payload inicial de provisionamento MQTT para o device em um topico como F8:03:32:03:8D:1D/."
                : "O endereco MAC identifica o device fisico e nao pode ser alterado apos o cadastro."}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="device-ip">IP da corneta</Label>
            <Input
              id="device-ip"
              value={deviceIp}
              required
              onChange={(event) => setDeviceIp(event.target.value)}
              placeholder="192.168.1.40"
            />
            <p className="text-muted-foreground text-xs">
              O backend usa este IP para configurar o broker MQTT da corneta via HTTPS.
            </p>
          </div>
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
        <Button
          type="submit"
          disabled={
            isPending ||
            !groupId ||
            name.trim().length < 1 ||
            deviceIp.trim().length < 1 ||
            (mode === "create" && macAddress.trim().length < 1)
          }
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {mode === "create" ? "Salvar device" : "Salvar alteracoes"}
        </Button>
      </div>
    </form>
  );
}
