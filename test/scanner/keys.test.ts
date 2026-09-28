import { describe, expect, test } from "bun:test";
import { keyChar, keyLabel } from "@/lib/scanner/keys";
import { stroke } from "../support/strokes";

describe("keyChar — CashierApp's ScanKeyMap", () => {
  test("letters take their case from Shift, digits ignore it", () => {
    expect(keyChar(stroke({ keyCode: 65, code: "KeyA", key: "a" }))).toBe("a");
    expect(keyChar(stroke({ keyCode: 65, code: "KeyA", key: "A", shift: true }))).toBe("A");
    expect(keyChar(stroke({ keyCode: 49, code: "Digit1", key: "!", shift: true }))).toBe("1");
  });

  test("the layout does not matter: «ф» on the A key is still a", () => {
    expect(keyChar(stroke({ keyCode: 65, code: "KeyA", key: "ф" }))).toBe("a");
    expect(keyChar(stroke({ keyCode: 221, code: "BracketRight", key: "ъ" }))).toBe("]");
  });

  test("both minus keys, and Firefox's own key code for one", () => {
    for (const keyCode of [189, 173, 109]) {
      expect(keyChar(stroke({ keyCode, code: "Minus", key: "-" }))).toBe("-");
    }
  });

  test("the physical key stands in when there is no key code", () => {
    expect(keyChar(stroke({ keyCode: 0, code: "KeyQ", key: "q" }))).toBe("q");
    expect(keyChar(stroke({ keyCode: 229, code: "Numpad7", key: "7" }))).toBe("7");
  });

  test("a synthetic key with neither is read from its text, ASCII only", () => {
    expect(keyChar(stroke({ keyCode: 0, code: "", key: "]" }))).toBe("]");
    expect(keyChar(stroke({ keyCode: 0, code: "", key: "E", shift: true }))).toBe("E");
    expect(keyChar(stroke({ keyCode: 0, code: "", key: "ф" }))).toBeNull();
    // A real key code always wins over the text: the Russian-layout case.
    expect(keyChar(stroke({ keyCode: 70, code: "", key: "а" }))).toBe("f");
  });

  test("punctuation, space and Alt-held keys are not code characters", () => {
    expect(keyChar(stroke({ keyCode: 190, code: "Period", key: "." }))).toBeNull();
    expect(keyChar(stroke({ keyCode: 32, code: "Space", key: " " }))).toBeNull();
    expect(keyChar(stroke({ keyCode: 97, code: "Numpad1", key: "1", alt: true }))).toBeNull();
  });
});

describe("keyLabel", () => {
  test("names a printable key by its US character, whatever the layout typed", () => {
    expect(keyLabel(stroke({ keyCode: 190, code: "Period", key: "ю" }))).toBe(".");
    expect(keyLabel(stroke({ keyCode: 88, code: "KeyX", key: "ч" }))).toBe("x");
    expect(keyLabel(stroke({ keyCode: 191, code: "Slash", key: ",", shift: true }))).toBe("?");
  });

  test("names keys the way a message should", () => {
    expect(keyLabel(stroke({ keyCode: 32, code: "Space", key: " " }))).toBe("пробел");
    expect(keyLabel(stroke({ keyCode: 74, code: "KeyJ", key: "j", ctrl: true }))).toBe("Ctrl+J");
    expect(keyLabel(stroke({ keyCode: 97, code: "Numpad1", key: "1", alt: true }))).toBe("Alt+1");
  });
});
