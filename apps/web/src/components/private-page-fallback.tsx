import { Loader2 } from "lucide-react";
import { PrivateShell } from "@/components/private-shell";
import { Card, CardContent } from "@/components/ui/card";

export function PrivatePageFallback({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <PrivateShell title={title} description={description}>
      <Card className="border-border/60 bg-card/80 py-0 backdrop-blur-sm">
        <CardContent className="text-muted-foreground flex items-center gap-2 px-5 py-6 text-sm md:px-6">
          <Loader2 className="size-4 animate-spin" />
          Loading page...
        </CardContent>
      </Card>
    </PrivateShell>
  );
}
