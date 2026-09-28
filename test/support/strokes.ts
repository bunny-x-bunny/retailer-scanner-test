import type { KeyStroke } from "@/lib/scanner/keys";

const RUSSIAN: Record<string, string> = {
  q: "й", w: "ц", e: "у", r: "к", t: "е", y: "н", u: "г", i: "ш", o: "щ", p: "з", a: "ф", s: "ы",
  d: "в", f: "а", g: "п", h: "р", j: "о", k: "л", l: "д", z: "я", x: "ч", c: "с", v: "м", b: "и",
  n: "т", m: "ь",
};

export function stroke(over: Partial<KeyStroke> & Pick<KeyStroke, "keyCode" | "code" | "key">): KeyStroke {
  return { t: 0, shift: false, ctrl: false, alt: false, meta: false, capsLock: false, ...over };
}

/**
 * The key presses a US-keyboard scanner sends for `text`, `gap` ms apart: Shift before each capital,
 * `\n` for Enter, `\t` for Tab. With `layout: "ru"` the keys are the same and only their text
 * changes — which is what a Windows layout switch does.
 */
export function strokesFor(
  text: string, { start = 0, gap = 5, layout = "us" }: { start?: number; gap?: number; layout?: "us" | "ru" } = {},
): KeyStroke[] {
  const out: KeyStroke[] = [];
  let t = start;
  const press = (s: Parameters<typeof stroke>[0]) => {
    out.push(stroke({ t, ...s }));
    t += gap;
  };
  const letterText = (lower: string) => (layout === "ru" ? RUSSIAN[lower]! : lower);

  for (const ch of text) {
    if (ch === "\n") press({ keyCode: 13, code: "Enter", key: "Enter" });
    else if (ch === "\t") press({ keyCode: 9, code: "Tab", key: "Tab" });
    else if (/[0-9]/.test(ch)) press({ keyCode: ch.charCodeAt(0), code: `Digit${ch}`, key: ch });
    else if (/[a-z]/.test(ch)) {
      press({ keyCode: ch.toUpperCase().charCodeAt(0), code: `Key${ch.toUpperCase()}`, key: letterText(ch) });
    } else if (/[A-Z]/.test(ch)) {
      press({ keyCode: 16, code: "ShiftLeft", key: "Shift", shift: true });
      press({ keyCode: ch.charCodeAt(0), code: `Key${ch}`, key: letterText(ch.toLowerCase()).toUpperCase(), shift: true });
    } else if (ch === "-") press({ keyCode: 189, code: "Minus", key: "-" });
    else if (ch === "]") press({ keyCode: 221, code: "BracketRight", key: layout === "ru" ? "ъ" : "]" });
    else if (ch === ".") press({ keyCode: 190, code: "Period", key: layout === "ru" ? "ю" : "." });
    else if (ch === " ") press({ keyCode: 32, code: "Space", key: " " });
    else throw new Error(`strokesFor: no key for ${JSON.stringify(ch)}`);
  }
  return out;
}
