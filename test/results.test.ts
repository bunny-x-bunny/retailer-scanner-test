import { describe, expect, test } from "bun:test";
import { buildReport } from "@/lib/report";
import { nextUntested, resultOf, type Results, summarize, unreadableResult } from "@/lib/results";
import { analyze } from "@/lib/scanner/analyze";
import { SAMPLES } from "@/lib/samples";
import { strokesFor } from "./support/strokes";

const scanned = (keys: string) => resultOf(analyze(strokesFor(keys), SAMPLES), 0);

describe("results", () => {
  const results: Results = {
    ean13: scanned("]E04607001771517\n"),
    ean8: scanned("]E046009333\n"),
    upca: unreadableResult(0),
  };

  test("a stored result keeps errors and warnings, not notes", () => {
    const r = scanned("]C0Rt-128-xYz9\n");
    expect(r.status).toBe("pass");
    expect(r.issues).toEqual([]);
    expect(scanned("]E046009333\n").issues.map((i) => i.level)).toEqual(["warn"]);
  });

  test("the summary counts an unreadable card as a failure", () => {
    expect(summarize(SAMPLES, results)).toEqual({
      pass: 1, warn: 1, fail: 1, untested: SAMPLES.length - 3, total: SAMPLES.length,
    });
  });

  test("the next untested card skips the checked ones and wraps", () => {
    expect(nextUntested(SAMPLES, results, "ean13")?.id).toBe("upce");
    const allButFirst = Object.fromEntries(SAMPLES.slice(1).map((s) => [s.id, unreadableResult(0)]));
    expect(nextUntested(SAMPLES, allButFirst, SAMPLES.at(-1)!.id)?.id).toBe(SAMPLES[0]!.id);
    const all = { ...allButFirst, [SAMPLES[0]!.id]: unreadableResult(0) };
    expect(nextUntested(SAMPLES, all, "ean13")).toBeNull();
  });

  test("the report says what came in for each card", () => {
    const report = buildReport(SAMPLES, results, { date: new Date(0), userAgent: "test" });
    expect(report).toContain("Итог: верно 1, с замечаниями 1, ошибок 1");
    expect(report).toContain("✓ EAN-13 (]E0 4607001771517) — пришло ]E0 4607001771517");
    expect(report).toContain("! EAN-8 (]E4 46009333) — пришло ]E0 46009333\n    · Модификатор AIM");
    expect(report).toContain("✕ UPC-A (]E0 036000291452) — не читается");
    expect(report).toContain("○ Aztec (]z0 RT-AZ-3mN6) — не проверен");
  });
});
