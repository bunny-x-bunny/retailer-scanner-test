import { describe, expect, test } from "bun:test";
import { BurstCollector, looksManual } from "@/lib/scanner/bursts";
import { strokesFor } from "../support/strokes";

describe("BurstCollector", () => {
  test("a burst ends shortly after Enter", () => {
    const collector = new BurstCollector(150, 700);
    const keys = strokesFor("]E04607001771517\n");
    for (const s of keys) expect(collector.push(s)).toBeNull();
    const last = keys.at(-1)!.t;
    expect(collector.poll(last + 100)).toBeNull();
    expect(collector.poll(last + 150)).toEqual(keys);
    expect(collector.open).toBe(false);
  });

  test("without Enter it waits longer", () => {
    const collector = new BurstCollector(150, 700);
    const keys = strokesFor("]E04607001771517");
    for (const s of keys) collector.push(s);
    expect(collector.deadline()).toBe(keys.at(-1)!.t + 700);
  });

  test("a flag after Enter starts the next scan", () => {
    const collector = new BurstCollector();
    const first = strokesFor("]E04607001771517\n");
    for (const s of first) collector.push(s);
    expect(collector.push(strokesFor("]", { start: 100 })[0]!)).toEqual(first);
    expect(collector.open).toBe(true);
  });
});

describe("looksManual", () => {
  test("a few keys by hand are not a scan; anything with a flag is", () => {
    expect(looksManual(strokesFor("ab\n"))).toBe(true);
    expect(looksManual(strokesFor("]\n"))).toBe(false);
    expect(looksManual(strokesFor("4607001771517\n"))).toBe(false);
  });
});
