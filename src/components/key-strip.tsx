import { ArrowRightToLine, CornerDownLeft, Space } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AnnotatedStroke, Role } from "@/lib/scanner/cashier-reader";
import { keyLabel } from "@/lib/scanner/keys";

const ROLE: Record<Role, { text: string; look: string }> = {
  flag: { text: "AIM: флаг «]»", look: "bg-aim/10 text-aim font-semibold" },
  symbology: { text: "AIM: буква символики", look: "bg-aim/10 text-aim font-semibold" },
  modifier: { text: "AIM: модификатор", look: "bg-aim/10 text-aim font-semibold" },
  data: { text: "код", look: "bg-muted" },
  enter: { text: "Enter: скан завершён", look: "bg-success/10 text-success" },
  lost: {
    text: "Потеряно: CashierApp взял клавишу, но скан сорвался",
    look: "border border-dashed text-muted-foreground line-through",
  },
  passed: {
    text: "Попадёт в поле ввода",
    look: "bg-destructive/10 text-destructive ring-1 ring-destructive ring-inset font-semibold",
  },
  enterPassed: {
    text: "Enter не завершил скан: попадёт на экран и может нажать кнопку",
    look: "bg-destructive/10 text-destructive ring-1 ring-destructive ring-inset",
  },
  modifierKey: { text: "Клавиша-модификатор", look: "" },
};

function KeyFace({ annotated }: { annotated: AnnotatedStroke }) {
  const { stroke, char, role } = annotated;
  if (role === "enter" || role === "enterPassed") return <CornerDownLeft className="size-3.5" aria-label="Enter" />;
  if (stroke.key === "Tab") return <ArrowRightToLine className="size-3.5" aria-label="Tab" />;
  if (stroke.key === " ") return <Space className="size-3.5" aria-label="пробел" />;
  return <>{char ?? keyLabel(stroke)}</>;
}

function KeyChip({ annotated, t0 }: { annotated: AnnotatedStroke; t0: number }) {
  const { stroke, char, role } = annotated;
  const modifiers = [stroke.shift && "Shift", stroke.ctrl && "Ctrl", stroke.alt && "Alt"].filter(Boolean);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "relative inline-grid h-7 min-w-6 place-items-center rounded-md px-1 font-mono text-sm",
              ROLE[role].look,
            )}
          />
        }
      >
        <KeyFace annotated={annotated} />
        {stroke.shift && char && /[A-Z]/.test(char) && (
          <span className="absolute -top-1.5 -right-1 text-[10px] leading-none text-muted-foreground">⇧</span>
        )}
      </TooltipTrigger>
      <TooltipContent className="flex-col items-start gap-0.5">
        <span className="font-medium">{ROLE[role].text}</span>
        <span className="font-mono opacity-80">
          key «{stroke.key}» · code {stroke.code || "—"} · keyCode {stroke.keyCode}
          {modifiers.length > 0 && ` · ${modifiers.join("+")}`}
        </span>
        <span className="opacity-80">+{Math.round(stroke.t - t0)} мс</span>
      </TooltipContent>
    </Tooltip>
  );
}

const LEGEND = [
  { label: "AIM", swatch: "bg-aim" },
  { label: "код", swatch: "bg-muted-foreground/30" },
  { label: "Enter", swatch: "bg-success" },
  { label: "попадёт в поле ввода", swatch: "bg-destructive" },
  { label: "потеряно", swatch: "border border-dashed border-muted-foreground" },
];

/** Every key the scanner pressed, coloured by what CashierApp made of it. */
export function KeyStrip({ strokes }: { strokes: readonly AnnotatedStroke[] }) {
  const t0 = strokes[0]?.stroke.t ?? 0;
  const visible = strokes.filter((a) => a.role !== "modifierKey");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {visible.map((a, i) => <KeyChip key={i} annotated={a} t0={t0} />)}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {LEGEND.map(({ label, swatch }) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", swatch)} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
