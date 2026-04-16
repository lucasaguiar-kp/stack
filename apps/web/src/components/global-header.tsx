import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, LogOut, Moon, Settings, Sun } from "lucide-react";
import { useState } from "react";
import { AccountSettingsDialog } from "@/components/account-settings-dialog";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenuCheckboxItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

export function GlobalHeader() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const { setTheme, theme } = useTheme();

  const userName = session?.user?.name ?? session?.user?.email ?? "Usuário";
  const initials = userName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);

  return (
    <>
      <header className="border-border/40 bg-card/60 sticky top-0 z-50 flex h-14 items-center justify-between border-b px-6 backdrop-blur-xl">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <Building2 className="size-4" />
          </div>
          <span className="text-sm font-bold tracking-tight">KHOMP</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="ring-ring/40 hover:ring-ring/60 flex items-center gap-2 rounded-full transition-shadow outline-none focus-visible:ring-2"
              />
            }
          >
            <Avatar className="size-8 cursor-pointer">
              <AvatarFallback className="bg-primary/15 text-primary text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{userName}</p>
                {session?.user?.email ? (
                  <p className="text-muted-foreground text-xs">{session.user.email}</p>
                ) : null}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsAccountDialogOpen(true)}>
              <Settings className="mr-2 size-4" />
              Conta
            </DropdownMenuItem>

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
      </header>

      <AccountSettingsDialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen} />
    </>
  );
}
