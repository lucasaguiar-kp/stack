import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_30%),radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--chart-1)_18%,transparent),transparent_28%),linear-gradient(180deg,color-mix(in_oklab,var(--background)_96%,black_4%),var(--background))]">
      <div
        className={cn(
          "mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <Card className="border-border/60 bg-card/85 py-0 backdrop-blur-sm">
        <CardHeader className="gap-3 px-5 py-5 md:px-6 md:py-6">
          {eyebrow ? <Badge variant="outline">{eyebrow}</Badge> : null}
          <div className="space-y-2">
            <CardTitle className="text-2xl font-semibold tracking-tight md:text-3xl">
              {title}
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm md:text-[13px]">
              {description}
            </CardDescription>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div> : null}
        </CardHeader>
      </Card>
      {aside ? <div className="grid gap-4">{aside}</div> : null}
    </section>
  );
}

export function StatsGrid({
  items,
  className,
}: {
  items: Array<{
    label: string;
    value: string;
    hint?: string;
  }>;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-3 md:grid-cols-3", className)}>
      {items.map((item) => (
        <Card
          key={item.label}
          size="sm"
          className="border-border/60 bg-card/80 py-0 backdrop-blur-sm"
        >
          <CardContent className="space-y-2 px-4 py-4">
            <p className="text-muted-foreground text-[11px] tracking-[0.18em] uppercase">
              {item.label}
            </p>
            <p className="text-xl font-semibold tracking-tight">{item.value}</p>
            {item.hint ? <p className="text-muted-foreground text-xs">{item.hint}</p> : null}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
