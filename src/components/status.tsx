import { Ban, Circle, CircleAlert, CircleCheck, CircleX, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Status } from "@/lib/results";

export const STATUS_LABEL: Record<Status, string> = {
  pass: "Верно",
  warn: "С замечаниями",
  fail: "Ошибка",
  unreadable: "Не читается",
  untested: "Не проверен",
};

const LOOK: Record<Status, { icon: LucideIcon; tone: string }> = {
  pass: { icon: CircleCheck, tone: "text-success" },
  warn: { icon: CircleAlert, tone: "text-warning" },
  fail: { icon: CircleX, tone: "text-destructive" },
  unreadable: { icon: Ban, tone: "text-destructive" },
  untested: { icon: Circle, tone: "text-muted-foreground/40" },
};

/** Background tint for a verdict panel. */
export const STATUS_SURFACE: Record<Status, string> = {
  pass: "bg-success/10",
  warn: "bg-warning/10",
  fail: "bg-destructive/10",
  unreadable: "bg-destructive/10",
  untested: "bg-muted",
};

export function StatusIcon({ status, className }: { status: Status; className?: string }) {
  const { icon: Icon, tone } = LOOK[status];
  return <Icon aria-label={STATUS_LABEL[status]} className={cn("size-4 shrink-0", tone, className)} />;
}

export function StatusText({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", LOOK[status].tone, className)}>
      <StatusIcon status={status} />
      <span className={status === "untested" ? "text-muted-foreground" : undefined}>
        {STATUS_LABEL[status]}
      </span>
    </span>
  );
}
