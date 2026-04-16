import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { BrowserPhoneProvider } from "@/components/browser-phone-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireSession } from "@/lib/route-guards";

export const Route = createFileRoute("/(private)")({
  beforeLoad: requireSession,
  component: PrivateLayout,
});

function PrivateLayout() {
  return (
    <BrowserPhoneProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-1 flex-col">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </BrowserPhoneProvider>
  );
}
