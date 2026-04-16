import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function DataTableToolbar({
  title,
  description,
  children,
  actions,
  canReset,
  onReset,
  className,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
  actions?: ReactNode;
  canReset?: boolean;
  onReset?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div>
        {title ? <h2 className="text-base font-semibold">{title}</h2> : null}
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {canReset && onReset ? (
          <Button variant="outline" size="sm" onClick={onReset}>
            Limpar filtros
          </Button>
        ) : null}
        {actions}
      </div>
    </div>
  );
}
