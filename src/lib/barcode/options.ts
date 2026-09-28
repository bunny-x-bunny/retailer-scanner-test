import type { Sample } from "@/lib/samples";

/**
 * bwip-js options for a sample — one place, so the page draws exactly what `samples.test.ts`
 * decodes.
 */
export function barcodeOptions(sample: Sample) {
  const base = { bcid: sample.encoder, text: sample.text };
  if (sample.matrix) return { ...base, scale: 4 };
  switch (sample.encoder) {
    case "pdf417":
      return { ...base, scale: 2, columns: 4 };
    case "databaromni":
      return { ...base, scale: 3, height: 14 };
    default:
      return { ...base, scale: 3, height: 22, includetext: true, textxalign: "center" as const };
  }
}
