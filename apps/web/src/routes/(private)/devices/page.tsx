import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Phone,
  RadioTower,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { useBrowserPhone } from "@/components/browser-phone-provider";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DeleteDeviceButton } from "@/components/delete-device-button";
import { DeviceStatusBadge } from "@/components/device-status-badge";
import { EditDeviceDialog } from "@/components/edit-device-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requireSession } from "@/lib/route-guards";
import { orpc } from "@/utils/orpc";
import type { DeviceListItem } from "@/components/device-card";
import type { GroupListItem } from "@/components/group-card";

export const Route = createFileRoute("/(private)/devices/")({
  beforeLoad: requireSession,
  component: DevicesPage,
});

function DeviceRowActions({
  device,
  groups,
  onCall,
}: {
  device: DeviceListItem;
  groups: GroupListItem[];
  onCall: (device: DeviceListItem) => void;
}) {
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label="Ações do device" />}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => onCall(device)}>
            <Phone className="size-4" />
            Ligar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              navigate({
                to: "/devices/$deviceId",
                params: { deviceId: device.id },
                search: { tab: "estado" },
              })
            }
          >
            <ChevronRight className="size-4" />
            Ver detalhes
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" />
            Remover
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditDeviceDialog
        device={device}
        groups={groups}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteDeviceButton
        deviceId={device.id}
        deviceName={device.name}
        groupId={device.groupId}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}

function DevicesPage() {
  const groups = useQuery(orpc.group.list.queryOptions({ input: {} }));
  const devices = useQuery(orpc.device.list.queryOptions({ input: {} }));

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sorting, setSorting] = useState<SortingState>([]);

  const allDevices: DeviceListItem[] = useMemo(
    () => (devices.data ?? []) as DeviceListItem[],
    [devices.data],
  );

  const groupList: GroupListItem[] = useMemo(
    () =>
      (groups.data ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        extension: g.extension,
        description: g.description,
        deviceCount: g.deviceCount,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      })),
    [groups.data],
  );

  const filteredDevices = useMemo(() => {
    return allDevices.filter((d) => {
      const matchesSearch =
        search === "" ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        String(d.extension).includes(search);
      const matchesGroup = groupFilter === "all" || d.groupId === groupFilter;
      const matchesStatus = statusFilter === "all" || d.connectionStatus === statusFilter;
      return matchesSearch && matchesGroup && matchesStatus;
    });
  }, [allDevices, search, groupFilter, statusFilter]);

  const browserPhone = useBrowserPhone();

  function handleDeviceCall(device: DeviceListItem) {
    void browserPhone.call(device.extension).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar a chamada.");
    });
  }

  const columns = useMemo<ColumnDef<DeviceListItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Nome" />,
        cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
      },
      {
        accessorKey: "extension",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Ramal" />,
        cell: ({ row }) => <Badge variant="outline">{row.original.extension}</Badge>,
      },
      {
        id: "groupName",
        accessorFn: (row) => groupList.find((group) => group.id === row.groupId)?.name ?? "",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Grupo" />,
        cell: ({ row }) => {
          const group = groupList.find((item) => item.id === row.original.groupId);
          return group ? (
            <Badge variant="secondary">{group.name}</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          );
        },
      },
      {
        accessorKey: "macAddress",
        header: ({ column }) => <DataTableColumnHeader column={column} title="MAC" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-xs">
            {row.original.macAddress ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "connectionStatus",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <DeviceStatusBadge status={row.original.connectionStatus} />,
      },
      {
        id: "actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DeviceRowActions device={row.original} groups={groupList} onCall={handleDeviceCall} />
          </div>
        ),
      },
    ],
    [groupList],
  );

  const table = useReactTable({
    data: filteredDevices,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col">
      <AppBreadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Devices" }]} />

      <div className="flex flex-1 flex-col gap-6 p-6">
        <Card className="border-border/40">
          <CardContent className="p-0">
            <DataTable
              table={table}
              emptyMessage={
                devices.isLoading
                  ? "Carregando devices..."
                  : allDevices.length === 0
                    ? "Nenhum device cadastrado."
                    : "Nenhum device encontrado com os filtros aplicados."
              }
            >
              <DataTableToolbar
                title="Devices"
                description={`${filteredDevices.length} de ${allDevices.length} dispositivos`}
                canReset={Boolean(search || groupFilter !== "all" || statusFilter !== "all")}
                onReset={() => {
                  setSearch("");
                  setGroupFilter("all");
                  setStatusFilter("all");
                }}
              >
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                  <Input
                    id="device-name-search"
                    placeholder="Buscar por nome ou ramal..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 w-52 pl-8 text-sm"
                  />
                </div>
                <Select value={groupFilter} onValueChange={(v) => setGroupFilter(v ?? "all")}>
                  <SelectTrigger id="devices-group-filter" className="h-8 w-40 text-sm">
                    <SelectValue placeholder="Grupo">
                      {groupFilter === "all"
                        ? "Todos os grupos"
                        : groupList.find((group) => group.id === groupFilter)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    {groupList.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </DataTableToolbar>
            </DataTable>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
