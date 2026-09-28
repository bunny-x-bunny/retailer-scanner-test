import { describe, expect, test } from "bun:test";
import bwipjs from "bwip-js/node";
import { PNG } from "pngjs";
import { type ReaderOptions, readBarcodes } from "zxing-wasm/reader";
import { barcodeOptions } from "@/lib/barcode/options";
import { analyze } from "@/lib/scanner/analyze";
import { MIN_LENGTH } from "@/lib/scanner/cashier-reader";
import { type Encoder, SAMPLES, sampleById } from "@/lib/samples";
import { strokesFor } from "./support/strokes";

/** GS1 mod-10: the last digit of an EAN, UPC, ITF-14 or GTIN. */
function gs1Valid(digits: string) {
  const sum = [...digits.slice(0, -1)].reverse()
    .reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1));
}

/** UPC-E to the UPC-A it stands for. */
function expandUpce(e: string) {
  const [ns, d1, d2, d3, d4, d5, d6, check] = [...e];
  const middle = d6! <= "2" ? `${d1}${d2}${d6}0000${d3}${d4}${d5}`
    : d6 === "3" ? `${d1}${d2}${d3}00000${d4}${d5}`
    : d6 === "4" ? `${d1}${d2}${d3}${d4}00000${d5}`
    : `${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  return `${ns}${middle}${check}`;
}

const codesOf = (id: string) => {
  const s = sampleById(id)!;
  return [s.data, ...(s.alternatives ?? []).map((a) => a.data)];
};

describe("the sample set", () => {
  test("ids are unique, and no code belongs to two cards", () => {
    expect(new Set(SAMPLES.map((s) => s.id)).size).toBe(SAMPLES.length);
    const owner = new Map<string, string>();
    for (const s of SAMPLES) {
      for (const code of codesOf(s.id)) {
        expect(owner.get(code.toLowerCase()) ?? s.id).toBe(s.id);
        owner.set(code.toLowerCase(), s.id);
      }
    }
  });

  test.each(SAMPLES.map((s) => [s.id, s] as const))("%s is something CashierApp can receive", (id, s) => {
    for (const code of codesOf(id)) {
      expect(code).toMatch(/^[A-Za-z0-9-]+$/);
      expect(code.length).toBeGreaterThanOrEqual(MIN_LENGTH);
    }
    expect(s.symbology).toMatch(/^[A-Za-z]$/);
    for (const m of s.modifiers) expect(m).toMatch(/^[0-9]$/);
  });

  test("check digits are right", () => {
    for (const id of ["ean13", "ean8", "upca", "itf14"]) expect(gs1Valid(sampleById(id)!.data)).toBe(true);
    expect(gs1Valid(sampleById("databar")!.data.slice(2))).toBe(true);
    const upce = sampleById("upce")!;
    expect(expandUpce(upce.data)).toBe(upce.alternatives![0]!.data);
    expect(gs1Valid(expandUpce(upce.data))).toBe(true);
  });

  test("the receipt card is a UUID, as CashierApp's receipt QR is", () => {
    expect(sampleById("receipt")!.data)
      .toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

/** zxing-cpp's name for each encoder, so the decoder may not guess another format. */
const FORMAT: Record<Encoder, NonNullable<ReaderOptions["formats"]>[number]> = {
  ean13: "EAN13", ean8: "EAN8", upca: "UPCA", upce: "UPCE", code128: "Code128", code39: "Code39",
  itf14: "ITF", databaromni: "DataBar", rationalizedCodabar: "Codabar", qrcode: "QRCode",
  datamatrix: "DataMatrix", pdf417: "PDF417", azteccode: "Aztec",
};

async function decode(encoder: Encoder, options: object) {
  const png = PNG.sync.read(await bwipjs.toBuffer({
    ...options, paddingwidth: 12, paddingheight: 12, backgroundcolor: "FFFFFF",
  } as Parameters<typeof bwipjs.toBuffer>[0]));
  const image = { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height, colorSpace: "srgb" };
  return readBarcodes(image as ImageData, { formats: [FORMAT[encoder]], textMode: "Plain", tryHarder: true });
}

/**
 * The page draws what it claims to. zxing-cpp stands in for the scanner: it reads the picture the
 * page shows and reports the symbology identifier a scanner would send — so the pictures and the
 * expectations are checked against each other with no scanner on the bench.
 */
describe("a reference decoder reads each card as the card says", () => {
  test.each(SAMPLES.map((s) => [s.id, s] as const))("%s", async (_, s) => {
    const results = await decode(s.encoder, barcodeOptions(s));
    expect(results).toHaveLength(1);
    const [result] = results;
    expect(result!.isValid).toBe(true);

    const aim = result!.symbologyIdentifier;
    expect(aim[1]).toBe(s.symbology);
    expect(s.modifiers).toContain(aim[2]!);
    const sameSymbology = (s.alternatives ?? []).filter((a) => !a.symbology).map((a) => a.data);
    expect([s.data, ...sameSymbology]).toContain(result!.text);

    // Typed the way a scanner types it, what the decoder read is accepted for this card.
    const verdict = analyze(strokesFor(`${aim}${result!.text}\n`), SAMPLES, s);
    expect(verdict.sample).toBe(s);
    expect(verdict.verdict).toBe(result!.text === s.data ? "pass" : "warn");
  });
});
