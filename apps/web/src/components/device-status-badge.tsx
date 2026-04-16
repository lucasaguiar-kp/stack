import { Badge } from "@/components/ui/badge";

export function DeviceStatusBadge({ status }: { status: string }) {
  const variant =
    status === "active" ? "default" : status === "failed" ? "destructive" : "secondary";

  return <Badge variant={variant}>{status}</Badge>;
}
