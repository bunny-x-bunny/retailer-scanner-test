import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { barcodeSvg, barcodeWidth } from "@/lib/barcode/svg";
import type { Sample } from "@/lib/samples";

/**
 * A card's barcode, drawn black on white whatever the theme — a scanner reads contrast, not taste.
 *
 * The markup is bwip-js's own SVG for one of the page's fixed samples, never anything a visitor
 * typed, which is what makes inserting it as HTML safe.
 */
export function BarcodeImage({ sample, zoom = 1, className }: {
  sample: Sample;
  zoom?: number;
  className?: string;
}) {
  const svg = useMemo(() => barcodeSvg(sample), [sample]);
  return (
    <div
      role="img"
      aria-label={`${sample.name}: ${sample.data}`}
      className={cn("max-w-full [&>svg]:block [&>svg]:h-auto [&>svg]:w-full", className)}
      style={{ width: barcodeWidth(sample, svg, zoom) }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
