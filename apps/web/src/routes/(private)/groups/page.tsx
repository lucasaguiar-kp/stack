import { useQuery } from "@tanstack/react-query";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DeleteGroupButton, GroupSettingsDialog } from "@/components/group-settings-dialog";
import type { GroupListItem } from "@/components/group-card";
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
import { requireSession } from "@/lib/route-guards";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/(private)/groups/")({
  beforeLoad: requireSession,
  component: GroupsPage,
});

function GroupRowActions({ group }: { group: GroupListItem }) {
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label="Ações do grupo" />}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onClick={() => navigate({ to: "/groups/$groupId", params: { groupId: group.id } })}
          >
            <ChevronRight className="size-4" />
            Ver detalhes
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Remover
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GroupSettingsDialog group={group} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteGroupButton group={group} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}

function GroupsPage() {
  const groups = useQuery(orpc.group.list.queryOptions({ input: {} }));
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

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

  const filteredGroups = useMemo(() => {
    if (!search) return groupList;
    return groupList.filter(
      (g) =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.extension && String(g.extension).includes(search)),
    );
  }, [groupList, search]);

  const columns = useMemo<ColumnDef<GroupListItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Nome" />
        ),
        cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
      },
      {
        accessorKey: "extension",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Ramal" />
        ),
        cell: ({ row }) =>
          row.original.extension ? (
            <Badge variant="outline">{row.original.extension}</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          ),
      },
      {
        accessorKey: "deviceCount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Devices" />
        ),
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.deviceCount ?? 0} devices</Badge>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <GroupRowActions group={row.original} />
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredGroups,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col">
      <AppBreadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Grupos" }]} />

      <div className="flex flex-1 flex-col gap-6 p-6">
        <Card className="border-border/40">
          <CardContent className="p-0">
            <DataTable
              table={table}
              emptyMessage={
                groups.isLoading
                  ? "Carregando grupos..."
                  : groupList.length === 0
                    ? "Nenhum grupo cadastrado."
                    : "Nenhum grupo encontrado."
              }
            >
              <DataTableToolbar
                title="Grupos"
                description={`${filteredGroups.length} de ${groupList.length} grupos`}
                canReset={Boolean(search)}
                onReset={() => setSearch("")}
              >
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                  <Input
                    id="group-search"
                    placeholder="Buscar por nome ou ramal..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 w-56 pl-8 text-sm"
                  />
                </div>
              </DataTableToolbar>
            </DataTable>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
