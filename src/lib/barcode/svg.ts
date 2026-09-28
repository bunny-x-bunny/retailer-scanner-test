/**
 * Barcode pictures, as SVG.
 *
 * Imported encoder by encoder rather than through `toSVG`, which looks the encoder up by name and so
 * pulls every one of bwip-js's hundred-odd symbologies into the bundle.
 */
import {
  azteccode, code128, code39, databaromni, datamatrix, drawingSVG, ean13, ean8, itf14, pdf417,
  qrcode, rationalizedCodabar, upca, upce,
} from "bwip-js/browser";
import type { Encoder, Sample } from "@/lib/samples";
import { barcodeOptions } from "./options";

type Draw = (opts: ReturnType<typeof barcodeOptions>, drawing: ReturnType<typeof drawingSVG>) => string;

const ENCODERS: Record<Encoder, Draw> = {
  ean13, ean8, upca, upce, code128, code39, itf14, databaromni, rationalizedCodabar, qrcode,
  datamatrix, pdf417, azteccode,
};

const cache = new Map<string, string>();

export function barcodeSvg(sample: Sample): string {
  let svg = cache.get(sample.id);
  if (!svg) {
    svg = ENCODERS[sample.encoder](barcodeOptions(sample), drawingSVG());
    cache.set(sample.id, svg);
  }
  return svg;
}

/**
 * The width to draw a sample at, in CSS pixels.
 *
 * Linear codes go by their own geometry — 1.6 px per bwip-js unit, so at the default zoom a module
 * is a whole number of device pixels on a typical till screen and the edges stay sharp. Matrix codes
 * are simply sized to be comfortable for an imager.
 */
export function barcodeWidth(sample: Sample, svg: string, zoom: number): number {
  if (sample.matrix) return Math.round(280 * zoom);
  const viewBoxWidth = Number(/viewBox="[\d.]+ [\d.]+ ([\d.]+)/.exec(svg)?.[1] ?? 300);
  return Math.round(viewBoxWidth * 1.6 * zoom);
}
