/**
 * Key presses, as CashierApp reads them — a port of `Infrastructure/Devices/ScanKeyMap.cs`.
 *
 * The till decodes a scan from **virtual keys**, not from the text the keyboard layout produces: on
 * a till switched to Russian the A key types «ф» and the till still reads «a». In a browser
 * `KeyboardEvent.keyCode` is that virtual key on Windows, so it is what this reads too. `key` is kept
 * to explain things to a person, and as a last resort for synthetic events that carry nothing else.
 */

/** One `keydown`, reduced to what the analysis needs. */
export interface KeyStroke {
  /** Milliseconds on `performance.now()`'s clock (`KeyboardEvent.timeStamp`). */
  t: number;
  /** The Windows virtual key. 0, or 229 while an IME composes, when the browser has none. */
  keyCode: number;
  /** The physical key: `KeyA`, `Numpad7`, `BracketRight`. */
  code: string;
  /** What the layout made of it: `a`, `ф`, `Enter`. */
  key: string;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
  capsLock: boolean;
}

export function strokeOf(e: KeyboardEvent): KeyStroke {
  return {
    t: e.timeStamp || performance.now(),
    keyCode: e.keyCode || 0,
    code: e.code,
    key: e.key,
    shift: e.shiftKey,
    ctrl: e.ctrlKey,
    alt: e.altKey,
    meta: e.metaKey,
    capsLock: e.getModifierState?.("CapsLock") ?? false,
  };
}

/** The Windows virtual keys this module has an opinion about. */
export const VK = {
  TAB: 9,
  ENTER: 13,
  SHIFT: 16,
  CONTROL: 17,
  ALT: 18,
  CAPS_LOCK: 20,
  SPACE: 32,
  LWIN: 91,
  RWIN: 92,
  NUMPAD0: 96,
  NUMPAD9: 105,
  SUBTRACT: 109,
  NUM_LOCK: 144,
  SCROLL_LOCK: 145,
  OEM_MINUS_FIREFOX: 173,
  OEM_MINUS: 189,
  /** `]` on a US layout — the AIM flag. */
  OEM_6: 221,
} as const;

const BY_CODE: Record<string, number> = {
  Enter: VK.ENTER, NumpadEnter: VK.ENTER, Tab: VK.TAB, Space: VK.SPACE,
  Minus: VK.OEM_MINUS, NumpadSubtract: VK.SUBTRACT, BracketRight: VK.OEM_6,
  ShiftLeft: VK.SHIFT, ShiftRight: VK.SHIFT, ControlLeft: VK.CONTROL, ControlRight: VK.CONTROL,
  AltLeft: VK.ALT, AltRight: VK.ALT, CapsLock: VK.CAPS_LOCK, NumLock: VK.NUM_LOCK,
};

const BY_KEY: Record<string, number> = {
  "-": VK.OEM_MINUS, "]": VK.OEM_6, Enter: VK.ENTER, Tab: VK.TAB, " ": VK.SPACE, Shift: VK.SHIFT,
};

/**
 * The virtual key: from `keyCode`, else from the physical key, else from the text.
 *
 * A real key always has a key code on Windows, so the fallbacks never override one; they only let
 * automation and some remote-desktop clients be read at all — and the text fallback reads ASCII
 * only, as a US layout would type it.
 */
export function virtualKey(s: KeyStroke): number {
  if (s.keyCode && s.keyCode !== 229) return s.keyCode;

  const { code, key } = s;
  if (/^Key[A-Z]$/.test(code)) return code.charCodeAt(3);
  if (/^Digit[0-9]$/.test(code)) return code.charCodeAt(5);
  if (/^Numpad[0-9]$/.test(code)) return VK.NUMPAD0 + Number(code[6]);
  if (BY_CODE[code]) return BY_CODE[code];

  if (/^[A-Za-z]$/.test(key)) return key.toUpperCase().charCodeAt(0);
  if (/^[0-9]$/.test(key)) return key.charCodeAt(0);
  return BY_KEY[key] ?? 0;
}

export const isEnter = (s: KeyStroke) => virtualKey(s) === VK.ENTER;
export const isTab = (s: KeyStroke) => virtualKey(s) === VK.TAB;

const MODIFIER_VKS: readonly number[] = [
  VK.SHIFT, VK.CONTROL, VK.ALT, VK.CAPS_LOCK, VK.LWIN, VK.RWIN, VK.NUM_LOCK, VK.SCROLL_LOCK,
];
const MODIFIER_KEYS = ["Shift", "Control", "Alt", "AltGraph", "Meta", "OS", "CapsLock", "NumLock", "ScrollLock"];

/** Shift, Ctrl and friends: keys that type nothing, which the till lets through harmlessly. */
export const isModifierKey = (s: KeyStroke) =>
  MODIFIER_VKS.includes(virtualKey(s)) || MODIFIER_KEYS.includes(s.key);

/** A digit key on the keypad, whatever NumLock made of it. */
export const isKeypadDigit = (s: KeyStroke) => /^Numpad[0-9]$/.test(s.code);

/**
 * `ScanKeyMap.ToChar`: the character the till reads off a key, or null for «not part of a code».
 *
 * Shift decides the case of a letter and nothing else — `Shift+1` is still `1`. Alt without Ctrl
 * makes WPF report every key as `Key.System`, which the map does not know, so an Alt-code arrives as
 * nothing at all. (Ctrl+Alt is AltGr on Windows and keeps the key.)
 */
export function keyChar(s: KeyStroke): string | null {
  if (s.alt && !s.ctrl) return null;
  const vk = virtualKey(s);
  if (vk >= 48 && vk <= 57) return String.fromCharCode(vk);
  if (vk >= VK.NUMPAD0 && vk <= VK.NUMPAD9) return String.fromCharCode(48 + vk - VK.NUMPAD0);
  if (vk >= 65 && vk <= 90) {
    const letter = String.fromCharCode(vk);
    return s.shift ? letter : letter.toLowerCase();
  }
  if (vk === VK.OEM_MINUS || vk === VK.OEM_MINUS_FIREFOX || vk === VK.SUBTRACT) return "-";
  // The till ignores Shift here too: Shift+] is «}», which no identifier uses.
  if (vk === VK.OEM_6) return "]";
  return null;
}

/** A US keyboard's printable keys other than letters, unshifted and shifted. */
const US_KEYS: Record<string, readonly [string, string]> = {
  Backquote: ["`", "~"], Minus: ["-", "_"], Equal: ["=", "+"], BracketLeft: ["[", "{"],
  BracketRight: ["]", "}"], Backslash: ["\\", "|"], Semicolon: [";", ":"], Quote: ["'", "\""],
  Comma: [",", "<"], Period: [".", ">"], Slash: ["/", "?"],
  Digit1: ["1", "!"], Digit2: ["2", "@"], Digit3: ["3", "#"], Digit4: ["4", "$"], Digit5: ["5", "%"],
  Digit6: ["6", "^"], Digit7: ["7", "&"], Digit8: ["8", "*"], Digit9: ["9", "("], Digit0: ["0", ")"],
  NumpadDecimal: [".", "."], NumpadDivide: ["/", "/"], NumpadMultiply: ["*", "*"], NumpadAdd: ["+", "+"],
};

/**
 * The character a US keyboard prints for this key — what the scanner meant by it, whatever the
 * layout Windows turned it into. A scanner types a code as US key presses, so this is the character
 * that was in the barcode: on a Russian layout the «.» key types «ю», and «.» is the useful answer.
 */
export function usCharacter(s: KeyStroke): string | null {
  const letter = /^Key([A-Z])$/.exec(s.code)?.[1];
  if (letter) return s.shift ? letter : letter.toLowerCase();
  const pair = US_KEYS[s.code];
  return pair ? pair[s.shift ? 1 : 0] : null;
}

const KEY_NAMES: Record<string, string> = {
  Enter: "Enter", Tab: "Tab", " ": "пробел", Escape: "Esc", Backspace: "Backspace",
  ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", Home: "Home", End: "End",
  PageUp: "PgUp", PageDown: "PgDn", Insert: "Ins", Delete: "Del", Clear: "Clear",
  Unidentified: "?",
};

/**
 * A key as a person would name it in a message: «.», «Tab», «Ctrl+J». Printable keys are named by
 * their US character, so a message reads the same whichever layout Windows is on.
 */
export function keyLabel(s: KeyStroke): string {
  const base = KEY_NAMES[s.key] ?? usCharacter(s) ?? (s.key.length === 1 ? s.key : s.key || s.code || "?");
  if (s.ctrl && !s.alt && base.length === 1) return `Ctrl+${base.toUpperCase()}`;
  if (s.alt && !s.ctrl) return `Alt+${base}`;
  return base;
}
