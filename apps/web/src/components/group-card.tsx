import { useNavigate } from "@tanstack/react-router";
import { Layers3, MoreVertical, Pencil, PhoneCall, Trash2 } from "lucide-react";
import { useState } from "react";
import { DeleteGroupButton, GroupSettingsDialog } from "@/components/group-settings-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface GroupListItem {
  id: string;
  name: string;
  extension?: string | null;
  description?: string | null;
  deviceCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export function GroupCard({
  group,
  onGroupCall,
}: {
  group: GroupListItem;
  onGroupCall?: (group: GroupListItem) => void;
}) {
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div
        className="border-border/50 bg-card hover:border-primary/30 group hover:shadow-primary/5 flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 transition-all hover:shadow-md"
        onClick={() => navigate({ to: "/groups/$groupId", params: { groupId: group.id } })}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Layers3 className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{group.name}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px]">
                {group.deviceCount} devices
              </Badge>
              {group.extension ? (
                <Badge variant="outline" className="text-[10px]">
                  Ext. {group.extension}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="text-primary hover:bg-primary/10 hover:text-primary shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onGroupCall?.(group);
            }}
            disabled={!group.extension}
          >
            <PhoneCall className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                />
              }
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setEditOpen(true);
                }}
              >
                <Pencil className="mr-2 size-3.5" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="mr-2 size-3.5" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <GroupSettingsDialog group={group} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteGroupButton group={group} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
