import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeviceGroupForm({
  isPending,
  onSubmit,
  initialValues,
}: {
  isPending: boolean;
  onSubmit: (values: { name: string; description: string | null }) => void;
  initialValues?: { name: string; description?: string | null };
}) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
      <CardHeader className="px-5 py-5 md:px-6 md:py-6">
        <CardTitle>Device group</CardTitle>
        <CardDescription>
          Organize devices by building, floor, queue, or operational area.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5 md:px-6 md:pb-6">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({ name: name.trim(), description: description.trim() || null });
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="device-group-name">Name</Label>
            <Input
              id="device-group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Floor 1"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="device-group-description">Description</Label>
            <Input
              id="device-group-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Front desk speakers and handsets"
            />
          </div>
          <div>
            <Button type="submit" disabled={isPending || name.trim().length < 1}>
              Save group
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
