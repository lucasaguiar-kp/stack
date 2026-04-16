import { Play } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const statusColors = {
  success: "bg-emerald-500 shadow-emerald-500/40",
  warning: "bg-amber-500 shadow-amber-500/40",
  error: "bg-red-500 shadow-red-500/40",
  muted: "bg-muted-foreground/40",
};

export function InfoRow({
  label,
  value,
  mono,
  status,
}: {
  label: string;
  value: string;
  mono?: boolean;
  status?: "success" | "warning" | "error" | "muted";
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className={`flex items-center gap-2 text-sm font-medium ${mono ? "font-mono" : ""}`}>
        {status && <span className={`size-2 rounded-full shadow-sm ${statusColors[status]}`} />}
        {value}
      </span>
    </div>
  );
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="border-border/40 bg-card overflow-hidden">
      <CardHeader>
        {action ? <CardAction>{action}</CardAction> : null}
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-4" />
            </div>
          )}
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {description ? (
              <CardDescription className="text-xs">{description}</CardDescription>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="divide-border/30 divide-y">{children}</CardContent>
    </Card>
  );
}

export function FieldBlock({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function TextField({
  label,
  defaultValue,
  onChange,
  placeholder,
  mono,
  readOnly,
  type = "text",
  value,
  disabled,
}: {
  label: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
  readOnly?: boolean;
  type?: string;
  value?: string;
  disabled?: boolean;
}) {
  return (
    <FieldBlock label={label}>
      <Input
        type={type}
        defaultValue={defaultValue}
        value={value}
        placeholder={placeholder}
        className={mono ? "font-mono" : undefined}
        onChange={(event) => onChange?.(event.target.value)}
        readOnly={readOnly}
        disabled={disabled}
      />
    </FieldBlock>
  );
}

export function SwitchField({
  label,
  description,
  defaultChecked,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="border-border/40 bg-background/60 flex items-center justify-between rounded-xl border px-3 py-2.5">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
      </div>
      <Switch
        defaultChecked={defaultChecked}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export function SelectField({
  label,
  defaultValue,
  options,
  disabled,
  onValueChange,
  value,
}: {
  label: string;
  defaultValue: string;
  options: Array<{ label: string; value: string }>;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  value?: string;
}) {
  return (
    <FieldBlock label={label}>
      <Select
        defaultValue={defaultValue}
        disabled={disabled}
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue != null) {
            onValueChange?.(nextValue);
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldBlock>
  );
}

export function SliderField({
  label,
  value,
  min = 0,
  max = 100,
  unit = "%",
  step = 10,
  onValueChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  step?: number;
  onValueChange?: (value: number) => void;
}) {
  return (
    <FieldBlock label={label}>
      <div className="border-border/40 bg-background/60 rounded-xl border px-3 py-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Ajuste atual</span>
          <Badge variant="outline">{value * 10 + unit}</Badge>
        </div>
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={(nextValue) => {
            const resolved = Array.isArray(nextValue) ? nextValue[0] : nextValue;
            if (typeof resolved === "number") {
              onValueChange?.(resolved);
            }
          }}
        />
      </div>
    </FieldBlock>
  );
}

export function CodecCheckbox({
  name,
  enabled,
  onCheckedChange,
  disabled,
}: {
  name: string;
  enabled: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "border-border/40 bg-background/60 hover:bg-background/80 flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
        disabled && "opacity-50",
      )}
    >
      <Checkbox
        checked={enabled}
        onCheckedChange={(checked) => onCheckedChange?.(Boolean(checked))}
        disabled={disabled}
      />
      <div className="flex-1">
        <p className="text-sm font-medium">{name}</p>
      </div>
      <Badge variant={enabled ? "secondary" : "outline"} className="text-[10px]">
        {enabled ? "Ativado" : "Desativado"}
      </Badge>
    </label>
  );
}

export function FlowActionCard({
  title,
  description,
  step,
  children,
  onTest,
  testLabel = "Testar",
  testPending = false,
}: {
  title: string;
  description?: string;
  step?: number;
  children: ReactNode;
  onTest: () => void;
  testLabel?: string;
  testPending?: boolean;
}) {
  return (
    <div className="border-border/40 bg-background/50 grid gap-4 rounded-2xl border p-4">
      <div className="flex items-start gap-3">
        {step != null && (
          <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
            {step}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {description ? (
            <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4">{children}</div>
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={onTest} disabled={testPending}>
          {testPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          {testLabel}
        </Button>
      </div>
    </div>
  );
}
