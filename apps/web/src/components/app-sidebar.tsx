import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  Building2,
  LayoutDashboard,
  Layers3,
  RadioTower,
  Moon,
  Sun,
  LogOut,
  ChevronsUpDown,
  User2,
  Server,
  Wifi,
  Info,
  RefreshCcw,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";
import { toast } from "sonner";

const dashboardNav = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
];

const managementNav = [
  {
    title: "Grupos",
    url: "/groups",
    icon: Layers3,
  },
  {
    title: "Devices",
    url: "/devices",
    icon: RadioTower,
  },
];

export function AppSidebar() {
  const { isMobile } = useSidebar();
  const { setTheme, theme } = useTheme();
  const navigate = useNavigate();
  const lastAutoSyncedHostRef = useRef<string | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: session } = authClient.useSession();
  const connectionInfo = useQuery({
    ...orpc.user.connectionInfo.queryOptions({ input: undefined }),
    enabled: Boolean(session?.user),
  });
  const syncNetworkDevices = useMutation(
    orpc.device.syncNetwork.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries();

        if (result.failed > 0) {
          toast.warning(
            `Rede atualizada em ${result.synced} device(s). ${result.failed} falharam porque podem estar desligados ou com IP DHCP alterado.`,
          );
          return;
        }

        toast.success(`Rede atualizada em ${result.synced} device(s).`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const networkInfo = connectionInfo.data?.network;

  useEffect(() => {
    if (!networkInfo?.hostChanged || syncNetworkDevices.isPending) {
      return;
    }

    if (lastAutoSyncedHostRef.current === networkInfo.currentHost) {
      return;
    }

    lastAutoSyncedHostRef.current = networkInfo.currentHost;
    syncNetworkDevices.mutate({});
  }, [networkInfo?.currentHost, networkInfo?.hostChanged, syncNetworkDevices]);

  const userName = session?.user?.name ?? session?.user?.email ?? "Usuário";
  const userEmail = session?.user?.email ?? "";
  const initials = userName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);

  function isActive(url: string) {
    if (url === "/") return pathname === "/";
    return pathname.startsWith(url);
  }

  return (
    <Sidebar variant="floating" collapsible="icon">
      {/* Header — Logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/" />}>
              <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">KHOMP</span>
                <span className="text-muted-foreground truncate text-xs">PBX Management</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Content — Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarMenu>
            {dashboardNav.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive(item.url)}
                  render={<Link to={item.url} />}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarMenu>
            {managementNav.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive(item.url)}
                  render={<Link to={item.url} />}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-auto group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Conexão</SidebarGroupLabel>
          <div className="border-sidebar-border bg-sidebar-accent/30 rounded-xl border p-3">
            <div className="mb-3 flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                <RadioTower className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">SIP do usuário</p>
                <p className="text-sidebar-foreground/70 truncate text-xs">
                  {session?.user?.email ?? "Sem sessão"}
                </p>
              </div>
            </div>

            {connectionInfo.isLoading ? (
              <p className="text-sidebar-foreground/70 mb-3 text-xs">Carregando credenciais SIP...</p>
            ) : connectionInfo.data?.pbx ? (
              <div className="mb-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sidebar-foreground/70">Ramal</span>
                  <Badge variant="outline" className="bg-background/80 font-mono">
                    {connectionInfo.data.pbx.extension}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sidebar-foreground/70">Usuário</span>
                  <span className="truncate font-mono">{connectionInfo.data.pbx.sipUser}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sidebar-foreground/70">Senha</span>
                  <span className="truncate font-mono">{connectionInfo.data.pbx.sipPassword}</span>
                </div>
              </div>
            ) : (
              <div className="text-sidebar-foreground/70 mb-3 flex items-start gap-2 text-xs">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <span>Não foi possível carregar as credenciais SIP.</span>
              </div>
            )}

            <SidebarSeparator className="mx-0 my-3" />

            <div className="mb-1 flex items-center gap-2">
              <div className="bg-info/10 text-info flex size-8 items-center justify-center rounded-lg">
                <Server className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">Broker MQTT</p>
                <p className="text-sidebar-foreground/70 flex items-center gap-1 text-xs">
                  <Wifi className="size-3" />
                  {connectionInfo.data?.mqtt.configured ? "Configurado" : "Não configurado"}
                </p>
              </div>
            </div>
            {connectionInfo.isLoading ? (
              <p className="text-sidebar-foreground/70 text-xs">Carregando broker...</p>
            ) : connectionInfo.data?.mqtt.configured ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sidebar-foreground/70">Protocolo</span>
                  <span className="truncate font-mono">{connectionInfo.data.mqtt.protocol}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sidebar-foreground/70">Host</span>
                  <span className="truncate font-mono">{connectionInfo.data.mqtt.host || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sidebar-foreground/70">Porta</span>
                  <span className="truncate font-mono">
                    {connectionInfo.data.mqtt.port ? String(connectionInfo.data.mqtt.port) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sidebar-foreground/70">Usuário</span>
                  <span className="truncate font-mono">{connectionInfo.data.mqtt.username || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sidebar-foreground/70">Senha</span>
                  <span className="truncate font-mono">{connectionInfo.data.mqtt.password || "—"}</span>
                </div>
              </div>
            ) : (
              <div className="text-sidebar-foreground/70 flex items-start gap-2 text-xs">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <span>Broker MQTT não configurado.</span>
              </div>
            )}
            {networkInfo ? (
              <>
                <SidebarSeparator className="mx-0 my-3" />
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sidebar-foreground/70">IP deste PC</span>
                    <span className="truncate font-mono">{networkInfo.currentHost}</span>
                  </div>
                  {networkInfo.hostChanged ? (
                    <div className="border-warning/30 bg-warning/10 text-warning rounded border p-2">
                      <div className="mb-2 flex gap-1.5">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                          O IP do PC mudou. Ressincronize para enviar o novo broker/PBX aos
                          devices.
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-full gap-1.5 text-xs"
                        disabled={syncNetworkDevices.isPending}
                        onClick={() => syncNetworkDevices.mutate({})}
                      >
                        <RefreshCcw
                          className={`size-3 ${syncNetworkDevices.isPending ? "animate-spin" : ""}`}
                        />
                        Sincronizar rede
                      </Button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer — User */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground"
                  />
                }
              >
                <Avatar className="size-8 rounded">
                  <AvatarFallback className="bg-primary/15 text-primary rounded text-xs font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{userName}</span>
                  <span className="text-muted-foreground truncate text-xs">{userEmail}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="min-w-56 rounded"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="size-8 rounded">
                        <AvatarFallback className="bg-primary/15 text-primary rounded text-xs font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{userName}</span>
                        <span className="text-muted-foreground truncate text-xs">{userEmail}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      void navigate({ to: "/account" });
                    }}
                  >
                    <User2 className="mr-2 size-4" />
                    Conta
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Tema</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={theme === "light"}
                    onCheckedChange={() => setTheme("light")}
                  >
                    <Sun className="mr-2 size-4" />
                    Claro
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={theme === "dark"}
                    onCheckedChange={() => setTheme("dark")}
                  >
                    <Moon className="mr-2 size-4" />
                    Escuro
                  </DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await authClient.signOut();
                    void navigate({ to: "/login" });
                  }}
                  className="text-destructive"
                >
                  <LogOut className="mr-2 size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
