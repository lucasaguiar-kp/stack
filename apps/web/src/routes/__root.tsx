import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { DevicePresenceSync } from "@/components/device-presence-sync";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { orpc } from "@/utils/orpc";
import type { QueryClient } from "@tanstack/react-query";
import "../index.css";

export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "KHOMP",
      },
      {
        name: "description",
        content: "KHOMP management console",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

function RootComponent() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isAuthRoute = pathname === "/login" || pathname === "/signup";

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <TooltipProvider>
          <div
            className={
              isAuthRoute
                ? "bg-background text-foreground grid min-h-svh grid-rows-[auto_1fr]"
                : "bg-background text-foreground min-h-svh"
            }
          >
            {isAuthRoute ? null : <DevicePresenceSync />}
            <main className="min-h-0">
              <Outlet />
            </main>
          </div>
          <Toaster richColors />
        </TooltipProvider>
      </ThemeProvider>
      {/* <TanStackRouterDevtools position="bottom-left" /> */}
      {/* <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" /> */}
    </>
  );
}
