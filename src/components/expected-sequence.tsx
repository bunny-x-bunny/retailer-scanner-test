import { CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { aimOf, type Sample } from "@/lib/samples";

/** `]E0` · code · Enter — what the scanner has to type for a card, in the colours the page uses. */
export function ExpectedSequence({ sample, className }: { sample: Sample; className?: string }) {
  return (
    <span className={cn("font-mono break-all", className)}>
      <span className="font-semibold text-aim">{aimOf(sample)}</span>
      {sample.data}
      <span className="ms-1.5 inline-flex items-center gap-0.5 font-semibold whitespace-nowrap text-success">
        <CornerDownLeft className="size-3.5" aria-hidden />
        Enter
      </span>
      {sample.modifiers.length > 1 && (
        <span className="ms-2 font-sans text-xs text-muted-foreground">
          модификатор {sample.modifiers.join(" или ")}
        </span>
      )}
    </span>
  );
}
