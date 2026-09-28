import { describe, expect, test } from "bun:test";
import { simulate, TIMEOUT_MS } from "@/lib/scanner/cashier-reader";
import { strokesFor } from "../support/strokes";

// The cases of CashierApp's BarcodeScanReaderTests, through the hook.
describe("simulate — CashierApp's BarcodeScanReader and BarcodeScanHook", () => {
  test("a full scan yields the code without the identifier", () => {
    const { scans } = simulate(strokesFor("]E01234567890123\n"));
    expect(scans).toEqual([expect.objectContaining({ aim: "]E0", code: "1234567890123" })]);
  });

  test("nothing before the flag is taken", () => {
    const { strokes, scans } = simulate(strokesFor("5E\n"));
    expect(scans).toHaveLength(0);
    expect(strokes.map((a) => a.role)).toEqual(["passed", "modifierKey", "passed", "enterPassed"]);
  });

  test("a flag followed by a non-letter gives up and lets that key through", () => {
    const { strokes, abandoned } = simulate(strokesFor("]5\n"));
    expect(strokes.map((a) => a.role)).toEqual(["lost", "passed", "enterPassed"]);
    expect(abandoned[0]!.reason).toBe("symbology");
  });

  test("a symbology followed by a non-digit gives up", () => {
    const { scans, abandoned } = simulate(strokesFor("]Ex1234\n"));
    expect(scans).toHaveLength(0);
    expect(abandoned[0]!.reason).toBe("modifier");
  });

  test("an identifier with no data is not a scan, and its Enter goes through", () => {
    for (const keys of ["]E0\n", "]E\n", "]\n"]) {
      const { strokes, scans } = simulate(strokesFor(keys));
      expect(scans).toHaveLength(0);
      expect(strokes.at(-1)!.role).toBe("enterPassed");
    }
  });

  test("too little data is not a scan", () => {
    expect(simulate(strokesFor("]E0123\n")).abandoned[0]!.reason).toBe("short");
  });

  test("a scan completed after the timeout is discarded", () => {
    const keys = strokesFor("]E01234567890123\n");
    keys.at(-1)!.t = TIMEOUT_MS + 100;
    const { scans, abandoned } = simulate(keys);
    expect(scans).toHaveLength(0);
    expect(abandoned[0]!.reason).toBe("expired");
  });

  test("a second flag restarts the scan", () => {
    const { scans, abandoned } = simulate(strokesFor("]E09999]E01234567890123\n"));
    expect(scans).toEqual([expect.objectContaining({ code: "1234567890123" })]);
    expect(abandoned[0]!.reason).toBe("restart");
  });

  test("a dashed UUID survives", () => {
    const uuid = "cc99375e-6be6-49b7-966f-3997967ebe4c";
    expect(simulate(strokesFor(`]Q1${uuid}\n`)).scans[0]!.code).toBe(uuid);
  });

  test("a burst that ends mid-scan loses what it took", () => {
    const { strokes, abandoned } = simulate(strokesFor("]E01234567890123"));
    expect(strokes.filter((a) => a.role !== "modifierKey").every((a) => a.role === "lost")).toBe(true);
    expect(abandoned[0]!.reason).toBe("unfinished");
  });

  test("a key the map does not know drops out of the code rather than ending the scan", () => {
    // BarcodeScanHook only offers the reader what ScanKeyMap decodes, so the reader's own «a
    // non-code character abandons» rule never sees a «.»: it reaches the focused field instead.
    const { scans, strokes } = simulate(strokesFor("]A0RT-39.2026\n"));
    expect(scans[0]!.code).toBe("RT-392026");
    expect(strokes.find((a) => a.stroke.key === ".")!.role).toBe("passed");
  });
});
