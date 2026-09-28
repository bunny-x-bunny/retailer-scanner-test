import { describe, expect, test } from "bun:test";
import { type Analysis, analyze } from "@/lib/scanner/analyze";
import { TIMEOUT_MS } from "@/lib/scanner/cashier-reader";
import type { KeyStroke } from "@/lib/scanner/keys";
import { aimOf, SAMPLES, sampleById } from "@/lib/samples";
import { stroke, strokesFor } from "../support/strokes";

const check = (keys: string, opts: Parameters<typeof strokesFor>[1] = {}, current?: string) =>
  analyze(strokesFor(keys, opts), SAMPLES, current ? sampleById(current) ?? null : null);

const said = (a: Analysis, level?: "error" | "warn" | "info") =>
  a.issues.filter((i) => !level || i.level === level).map((i) => i.text).join("\n");

describe("a scanner set up right", () => {
  test.each(SAMPLES.map((s) => [s.id, s] as const))("%s passes", (_, sample) => {
    const a = check(`${aimOf(sample)}${sample.data}\n`);
    expect(said(a)).toBe("");
    expect(a.verdict).toBe("pass");
    expect(a.sample).toBe(sample);
  });

  test("every listed modifier passes", () => {
    expect(check("]I114607001771514\n").verdict).toBe("pass");
  });

  test("a Russian layout passes, with a note", () => {
    const a = check("]C0Rt-128-xYz9\n", { layout: "ru" });
    expect(a.verdict).toBe("pass");
    expect(said(a, "info")).toContain("Раскладка не английская");
  });

  test("digits from the keypad pass, with a note", () => {
    const keys = strokesFor("]E04607001771517\n").map((s) => /^Digit/.test(s.code)
      ? { ...s, keyCode: 96 + Number(s.key), code: `Numpad${s.key}` } : s);
    const a = analyze(keys, SAMPLES);
    expect(a.verdict).toBe("pass");
    expect(said(a, "info")).toContain("NumPad");
  });
});

describe("the frame: ]cm, code, Enter", () => {
  test("no AIM identifier fails, and still names the card", () => {
    const a = check("4607001771517\n");
    expect(a.verdict).toBe("fail");
    expect(a.sample?.id).toBe("ean13");
    expect(said(a, "error")).toContain("Нет AIM-идентификатора");
  });

  test("no Enter fails", () => {
    const a = check("]E04607001771517");
    expect(a.verdict).toBe("fail");
    expect(a.sample?.id).toBe("ean13");
    expect(said(a, "error")).toContain("Нет Enter");
  });

  test("neither: both are named", () => {
    const a = check("4607001771517");
    expect(said(a, "error")).toContain("Нет AIM-идентификатора");
    expect(said(a, "error")).toContain("Нет Enter");
  });

  test("Tab instead of Enter is called that, and not also an unreadable character", () => {
    const a = check("]E04607001771517\t");
    expect(said(a, "error")).toContain("заканчивается Tab");
    expect(said(a, "error")).not.toContain("не принимает");
  });

  test("a prefix fails even though the till reads the code", () => {
    const a = check("x]E04607001771517\n");
    expect(a.scan?.code).toBe("4607001771517");
    expect(a.verdict).toBe("fail");
    expect(said(a, "error")).toContain("Перед AIM-идентификатором");
  });

  test("a second Enter is a button press on the till", () => {
    expect(said(check("]E04607001771517\n\n"), "error")).toContain("ещё один Enter");
  });

  test("a suffix after Enter fails", () => {
    expect(said(check("]E04607001771517\nab"), "error")).toContain("После Enter лишние клавиши");
  });

  test("a character the till cannot read fails", () => {
    const a = check("]A0RT-39-2026.\n");
    expect(a.verdict).toBe("fail");
    expect(a.sample?.id).toBe("code39");
    expect(said(a, "error")).toContain("«.»");
  });

  test("slower than the till's limit fails", () => {
    const a = check("]E04607001771517\n", { gap: 200 });
    expect(a.verdict).toBe("fail");
    expect(said(a, "error")).toContain(`дольше ${TIMEOUT_MS} мс`);
  });

  test("slow but inside the limit warns", () => {
    const a = check("]E04607001771517\n", { gap: 80 });
    expect(a.verdict).toBe("warn");
    expect(said(a, "warn")).toContain("медленный");
  });
});

describe("keys a scanner should not send", () => {
  test("GS sent as Ctrl+] is named", () => {
    const keys = strokesFor("]C0Rt-128]xYz9\n");
    const gs = keys.findLastIndex((s) => s.code === "BracketRight");
    keys[gs] = { ...keys[gs]!, ctrl: true };
    const a = analyze(keys, SAMPLES);
    expect(a.verdict).toBe("fail");
    expect(said(a, "error")).toContain("Ctrl+]");
    expect(said(a, "error")).not.toContain("начал скан заново");
  });

  test("Alt-codes are named", () => {
    const keys: KeyStroke[] = [
      stroke({ keyCode: 18, code: "AltLeft", key: "Alt", alt: true }),
      ...["0", "0", "9", "3"].map((d, i) =>
        stroke({ t: i + 1, keyCode: 96 + Number(d), code: `Numpad${d}`, key: d, alt: true })),
      ...strokesFor("E04607001771517\n", { start: 10 }),
    ];
    const a = analyze(keys, SAMPLES);
    expect(a.verdict).toBe("fail");
    expect(said(a, "error")).toContain("Alt-кодами");
  });

  test("keypad digits with NumLock off are named", () => {
    const keys = strokesFor("]E04607001771517\n").map((s) => s.key === "1"
      ? { ...s, keyCode: 35, code: "Numpad1", key: "End" } : s);
    const a = analyze(keys, SAMPLES);
    expect(a.verdict).toBe("fail");
    expect(said(a, "error")).toContain("NumLock");
  });
});

describe("against the card", () => {
  test("the wrong symbology fails", () => {
    const a = check("]C04607001771517\n");
    expect(a.verdict).toBe("fail");
    expect(said(a, "error")).toContain("]C0");
  });

  test("the wrong modifier warns", () => {
    const a = check("]E046009333\n");
    expect(a.verdict).toBe("warn");
    expect(a.sample?.id).toBe("ean8");
    expect(said(a, "warn")).toContain("]E4");
  });

  test("letters in the wrong case fail a product", () => {
    const a = check("]C0RT-128-XYZ9\n");
    expect(a.verdict).toBe("fail");
    expect(a.sample?.id).toBe("code128");
    expect(said(a, "error")).toContain("Регистр");
  });

  test("letters in the wrong case only warn on a receipt", () => {
    const a = check("]Q1CC99375E-6BE6-49B7-966F-3997967EBE4C\n");
    expect(a.verdict).toBe("warn");
    expect(a.sample?.id).toBe("receipt");
  });

  test.each([
    ["upca", "]E00036000291452\n"],
    ["upce", "]E0012345000065\n"],
    ["databar", "]e004601234567893\n"],
    ["databar", "]E04601234567893\n"],
    ["codabar", "]F0A40012345B\n"],
  ])("%s: a configurable form warns (%j)", (id, keys) => {
    const a = check(keys);
    expect(a.sample?.id).toBe(id);
    expect(a.verdict).toBe("warn");
  });

  test("a code from outside the set is described, not failed", () => {
    const a = check("]C0ABCD-1234\n");
    expect(a.sample).toBeNull();
    expect(a.verdict).toBe("pass");
    expect(said(a, "info")).toContain("ABCD-1234");
  });

  test("errors come before warnings, warnings before notes", () => {
    const a = check("x]E046009333\n", { layout: "ru" });
    const levels = a.issues.map((i) => i.level);
    expect(levels).toEqual([...levels].sort((x, y) =>
      ["error", "warn", "info"].indexOf(x) - ["error", "warn", "info"].indexOf(y)));
    expect(levels).toContain("error");
    expect(levels).toContain("warn");
  });
});
