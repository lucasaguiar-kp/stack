import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Layers3, RadioTower, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { useBrowserPhone } from "@/components/browser-phone-provider";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { DeviceCard, type DeviceListItem } from "@/components/device-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import type { GroupListItem } from "@/components/group-card";

export const Route = createFileRoute("/(private)/")({
  beforeLoad: requireSession,
  component: DashboardHome,
});

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof RadioTower;
  color: string;
}) {
  return (
    <Card className="border-border/40 bg-card py-0">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
          <div className={`flex size-10 items-center justify-center rounded-lg ${color}`}>
            <Icon className="size-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardHome() {
  const groups = useQuery(orpc.group.list.queryOptions({ input: {} }));
  const devices = useQuery(orpc.device.list.queryOptions({ input: {} }));

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");

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

  const normalizedSearch = search.trim().toLowerCase();

  const groupedSections = useMemo(() => {
    return groupList
      .filter((group) => groupFilter === "all" || group.id === groupFilter)
      .map((group) => {
        const devicesInGroup = allDevices.filter((device) => device.groupId === group.id);
        const groupMatches =
          normalizedSearch === "" ||
          group.name.toLowerCase().includes(normalizedSearch) ||
          String(group.extension ?? "").includes(normalizedSearch);

        const visibleDevices = devicesInGroup.filter((device) => {
          if (groupMatches) {
            return true;
          }

          return (
            device.name.toLowerCase().includes(normalizedSearch) ||
            String(device.extension).includes(normalizedSearch)
          );
        });

        return { group, visibleDevices };
      })
      .filter(
        (section) =>
          section.visibleDevices.length > 0 ||
          (normalizedSearch === "" && section.group.deviceCount === 0),
      );
  }, [allDevices, groupFilter, groupList, normalizedSearch]);

  const unassignedDevices = useMemo(() => {
    if (groupFilter !== "all") {
      return [];
    }

    return allDevices.filter((device) => {
      if (groupList.some((group) => group.id === device.groupId)) {
        return false;
      }

      if (normalizedSearch === "") {
        return true;
      }

      return (
        device.name.toLowerCase().includes(normalizedSearch) ||
        String(device.extension).includes(normalizedSearch)
      );
    });
  }, [allDevices, groupFilter, groupList, normalizedSearch]);

  const onlineCount = useMemo(
    () => allDevices.filter((d) => d.connectionStatus === "online").length,
    [allDevices],
  );
  const offlineCount = useMemo(
    () => allDevices.filter((d) => d.connectionStatus === "offline").length,
    [allDevices],
  );

  const browserPhone = useBrowserPhone();

  function handleDeviceCall(device: DeviceListItem) {
    void browserPhone.call(device.extension).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar a chamada.");
    });
  }

  const isLoading = groups.isLoading || devices.isLoading;

  return (
    <div className="flex flex-col">
      <AppBreadcrumb items={[{ label: "Dashboard" }]} />

      <div className="flex flex-1 flex-col gap-6 p-6">
        <Card className="border-border/40">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold">Dashboard por Grupo</h2>
                <p className="text-muted-foreground text-sm">
                  Cards de devices agrupados por grupo.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:flex-wrap md:items-center md:justify-end">
                <div className="relative w-full md:w-72">
                  <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                  <Input
                    id="dashboard-search"
                    placeholder="Buscar por nome de device ou grupo..."
                    title="Buscar por nome de device ou grupo..."
                    aria-label="Buscar por nome de device ou grupo"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 w-full pl-8 text-sm"
                  />
                </div>
                <Select value={groupFilter} onValueChange={(v) => setGroupFilter(v ?? "all")}>
                  <SelectTrigger id="group-filter" className="h-9 w-full text-sm md:w-44">
                    <SelectValue placeholder="Filtrar por grupo">
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
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card className="border-border/40">
            <CardContent className="text-muted-foreground py-10 text-center text-sm">
              Carregando dashboard...
            </CardContent>
          </Card>
        ) : groupedSections.length === 0 && unassignedDevices.length === 0 ? (
          <Card className="border-border/40">
            <CardContent className="py-10">
              {groupList.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                  <div>
                    <p className="text-sm font-medium">Nenhum grupo cadastrado.</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Crie o primeiro grupo para começar a organizar os devices.
                    </p>
                  </div>
                  <CreateGroupDialog />
                </div>
              ) : (
                <p className="text-muted-foreground text-center text-sm">
                  Nenhum grupo ou device encontrado com os filtros aplicados.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupedSections.map(({ group, visibleDevices }) => (
              <Card key={group.id} className="border-border/40 py-0">
                <CardContent className="p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                        <Layers3 className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{group.name}</h3>
                          {group.extension ? (
                            <Badge variant="outline">{group.extension}</Badge>
                          ) : null}
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {group.description ?? "Grupo sem descrição."}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {visibleDevices.length} device{visibleDevices.length === 1 ? "" : "s"}
                    </Badge>
                  </div>

                  {visibleDevices.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {visibleDevices.map((device) => (
                        <DeviceCard
                          key={device.id}
                          device={device}
                          groups={groupList}
                          onCall={handleDeviceCall}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
                      Nenhum device neste grupo.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {unassignedDevices.length > 0 ? (
              <Card className="border-border/40 py-0">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">Sem grupo</h3>
                      <p className="text-muted-foreground text-sm">
                        Devices sem um grupo associado válido.
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {unassignedDevices.length} device{unassignedDevices.length === 1 ? "" : "s"}
                    </Badge>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {unassignedDevices.map((device) => (
                      <DeviceCard
                        key={device.id}
                        device={device}
                        groups={groupList}
                        onCall={handleDeviceCall}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
