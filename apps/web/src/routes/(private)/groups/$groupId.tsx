import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Eye, Layers3, Radio, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { CallDestinationButton } from "@/components/call-destination-button";
import { GroupMulticastDialog } from "@/components/group-multicast-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireSession } from "@/lib/route-guards";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/(private)/groups/$groupId")({
  beforeLoad: requireSession,
  component: GroupDetailRoute,
});

function GroupDetailRoute() {
  const { groupId } = Route.useParams();
  const [multicastOpen, setMulticastOpen] = useState(false);
  const groups = useQuery(orpc.group.list.queryOptions({ input: {} }));
  const devices = useQuery({
    ...orpc.device.list.queryOptions({ input: { groupId } }),
    enabled: Boolean(groupId),
  });

  const group = groups.data?.find((g) => g.id === groupId);

  if (groups.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground text-sm">Grupo não encontrado.</p>
        <Button variant="outline" size="sm" render={<Link to="/" />}>
          Voltar ao Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="border-border/40 flex flex-wrap items-center gap-4 border-b px-6 py-4">
        <Button variant="ghost" size="sm" render={<Link to="/" />}>
          <ArrowLeft className="mr-1 size-4" />
          Voltar
        </Button>
        <div className="flex flex-1 items-center gap-3">
          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
            <Layers3 className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{group.name}</h1>
            {group.description ? (
              <p className="text-muted-foreground text-sm">{group.description}</p>
            ) : null}
          </div>
        </div>
        <CallDestinationButton destination={group.extension} label="Chamada em Grupo" />
        <Button variant="outline" size="sm" onClick={() => setMulticastOpen(true)}>
          <Radio className="mr-1 size-4" />
          Multicast
        </Button>
      </div>

      <GroupMulticastDialog
        open={multicastOpen}
        onOpenChange={setMulticastOpen}
        groupId={groupId}
      />

      {/* Data table */}
      <div className="flex-1 overflow-auto p-6">
        <Card className="border-border/40 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Dispositivos ({devices.data?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="pl-6">Nome</TableHead>
                  <TableHead>MAC</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ramal</TableHead>
                  <TableHead className="pr-6 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <p className="text-muted-foreground text-sm">Carregando devices...</p>
                    </TableCell>
                  </TableRow>
                ) : (devices.data?.length ?? 0) > 0 ? (
                  devices.data?.map((device) => (
                    <TableRow key={device.id} className="border-border/30">
                      <TableCell className="pl-6 font-medium">{device.name}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {device.macAddress ?? "--"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            device.connectionStatus === "online"
                              ? "default"
                              : device.connectionStatus === "unknown"
                                ? "secondary"
                                : "destructive"
                          }
                          className="gap-1 text-[10px]"
                        >
                          {device.connectionStatus === "online" ? (
                            <Wifi className="size-3" />
                          ) : (
                            <WifiOff className="size-3" />
                          )}
                          {device.connectionStatus === "online"
                            ? "Online"
                            : device.connectionStatus === "offline"
                              ? "Offline"
                              : "Aviso"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{device.extension}</TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <CallDestinationButton destination={device.extension} />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1 px-2"
                              render={
                              <Link
                                to="/devices/$deviceId"
                                params={{ deviceId: device.id }}
                                search={{ tab: "estado" }}
                              />
                              }
                            >
                            <Eye className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <p className="text-muted-foreground text-sm">
                        Nenhum dispositivo neste grupo.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
