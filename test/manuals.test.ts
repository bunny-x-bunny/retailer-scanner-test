import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { readBarcodes } from "zxing-wasm/reader";
import { codesOf, MANUALS } from "@/lib/manuals";

/**
 * The manual's images are cropped right up to the bars, with no quiet zone — fine for a scanner
 * aimed at a page with margins, not for a decoder handed the bare file. So it gets a white border.
 */
function withQuietZone(png: PNG, pad = 20): ImageData {
  const width = png.width + pad * 2;
  const height = png.height + pad * 2;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 0; y < png.height; y++) {
    const from = y * png.width * 4;
    data.set(png.data.subarray(from, from + png.width * 4), ((y + pad) * width + pad) * 4);
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

describe.each(MANUALS.map((m) => [m.name, m] as const))("%s", (_, manual) => {
  test.each(codesOf(manual).map((c) => [c.file, c] as const))("%s says what the step says", async (_, code) => {
    const png = PNG.sync.read(readFileSync(`public/${code.file}`));
    expect([png.width, png.height]).toEqual([code.width, code.height]);
    const [result, ...rest] = await readBarcodes(withQuietZone(png), { tryHarder: true, textMode: "Plain" });
    expect(rest).toHaveLength(0);
    expect(result?.format).toBe("Code128");
    expect(result?.text).toBe(code.payload);
  });

  test("every image in its folder is used, so none is left behind stale", () => {
    const used = new Set(codesOf(manual).map((c) => c.file));
    for (const file of readdirSync(`public/manuals/${manual.id}`)) {
      expect(used).toContain(`manuals/${manual.id}/${file}`);
    }
  });
});

test("ids are unique", () => {
  expect(new Set(MANUALS.map((m) => m.id)).size).toBe(MANUALS.length);
});
