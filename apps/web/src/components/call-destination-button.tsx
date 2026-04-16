import { PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { useBrowserPhone } from "@/components/browser-phone-provider";
import { Button } from "@/components/ui/button";

export function CallDestinationButton({
  destination,
  label = "Ligar",
  variant = "outline",
}: {
  destination?: string | null;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
}) {
  const browserPhone = useBrowserPhone();

  return (
    <Button
      variant={variant}
      size="sm"
      disabled={
        !destination ||
        !browserPhone.hasCredentials ||
        !browserPhone.isSecureContext ||
        (browserPhone.status !== "registered" && browserPhone.status !== "idle")
      }
      onClick={() => {
        if (!destination) {
          return;
        }

        void browserPhone.call(destination).catch((error) => {
          toast.error(error instanceof Error ? error.message : "Unable to start the call.");
        });
      }}
    >
      <PhoneCall className="size-4" />
      {label}
    </Button>
  );
}
