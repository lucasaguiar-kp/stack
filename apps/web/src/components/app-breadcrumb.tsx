import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CreateDeviceDialog } from "@/components/create-device-dialog";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { GroupListItem } from "@/components/group-card";
import { orpc } from "@/utils/orpc";

interface BreadcrumbEntry {
  label: string;
  href?: string;
}

interface AppBreadcrumbProps {
  items: BreadcrumbEntry[];
}

export function AppBreadcrumb({ items }: AppBreadcrumbProps) {
  const groups = useQuery(orpc.group.list.queryOptions({ input: {} }));
  const groupList: GroupListItem[] = (groups.data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    extension: g.extension,
    description: g.description,
    deviceCount: g.deviceCount,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  }));

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />

      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <span key={item.label} className="flex items-center gap-2">
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink render={item.href ? <Link to={item.href} /> : undefined}>
                      {item.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-2">
        <CreateGroupDialog />
        <CreateDeviceDialog groups={groupList} />
      </div>
    </header>
  );
}
