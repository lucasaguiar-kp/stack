import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";

export function PrivateShell({
  children,
  title,
  description,
  actions,
}: {
  children: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mt-2 flex flex-1 flex-col gap-2 px-4 md:mr-2 md:px-0">
      <Card className="border-border/60 bg-card/80 py-0 shadow-[0_1px_0_0_color-mix(in_oklab,var(--border)_80%,transparent)] backdrop-blur-sm">
        <CardHeader className="gap-4 px-5 py-5 md:px-6 md:py-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <CardTitle className="text-2xl font-semibold tracking-tight md:text-3xl">
                  {title}
                </CardTitle>
                <CardDescription className="max-w-3xl text-sm md:text-[13px]">
                  {description}
                </CardDescription>
              </div>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </CardHeader>
      </Card>

      {children}
    </div>
  );
}
