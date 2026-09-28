/**
 * Turns the till's reading of a burst into a verdict and advice: which card was scanned, and what
 * to change in the scanner's settings.
 *
 * Each rule looks at one thing and says what it found in words a shop technician can act on. The
 * rules never decide what the till does — `simulate` does — so a rule can be wrong about the advice
 * but not about the outcome.
 */
import { aimOf, type Sample, symbologyName } from "@/lib/samples";
import {
  type AnnotatedStroke, type CashierScan, FLAG, MIN_LENGTH, type Simulation, simulate, TIMEOUT_MS,
} from "./cashier-reader";
import { identify, type Match } from "./identify";
import {
  isEnter, isKeypadDigit, isModifierKey, isTab, keyChar, keyLabel, type KeyStroke, usCharacter, virtualKey, VK,
} from "./keys";

export type Level = "error" | "warn" | "info";
export type Verdict = "pass" | "warn" | "fail";

export interface Issue {
  level: Level;
  text: string;
}

export interface Analysis {
  verdict: Verdict;
  /** The card this was a scan of, when it can be told. */
  sample: Sample | null;
  /** What the till raised. Null: it raised nothing. */
  scan: CashierScan | null;
  strokes: AnnotatedStroke[];
  /** Errors first, then warnings, then notes. */
  issues: Issue[];
  /** First key to last, modifier keys included. */
  durationMs: number;
}

interface Context {
  burst: readonly KeyStroke[];
  sim: Simulation;
  scan: CashierScan | null;
  match: Match | null;
  /** Index of the first flag, or -1. */
  flagAt: number;
  /** Index of the Enter that completed the last scan, or -1. */
  scanEnd: number;
  endsWithTab: boolean;
}

type Rule = (c: Context) => Issue | null;

const error = (text: string): Issue => ({ level: "error", text });
const warn = (text: string): Issue => ({ level: "warn", text });
const info = (text: string): Issue => ({ level: "info", text });

const quote = (strokes: readonly KeyStroke[]) => strokes.map((s) => `«${keyLabel(s)}»`).join(" ");
const abandonedFor = (c: Context, reason: string) => c.sim.abandoned.find((a) => a.reason === reason);
const leaked = (a: AnnotatedStroke) => a.role === "passed" || a.role === "enterPassed";

// ── The frame: ]cm … Enter ────────────────────────────────────────────────────────────────────────

const missingAim: Rule = ({ flagAt, burst }) => {
  if (flagAt >= 0) return null;
  const bracket = burst.find((s) => s.key === FLAG);
  if (bracket) {
    return error(`«]» набран не той клавишей (код клавиши ${bracket.keyCode || bracket.code}). ` +
      "CashierApp читает клавиши, а не символы: переключите сканер на эмуляцию английской (US) клавиатуры.");
  }
  return error("Нет AIM-идентификатора: скан не начинается с «]». Включите в сканере передачу " +
    "AIM ID (Symbology Identifier, «AIM Code ID»).");
};

const prefix: Rule = ({ flagAt, sim }) => {
  const before = sim.strokes.slice(0, Math.max(flagAt, 0)).filter(leaked).map((a) => a.stroke);
  if (!before.length) return null;
  return error(`Перед AIM-идентификатором лишние клавиши ${quote(before)} — в CashierApp они попадут ` +
    "в поле ввода. Уберите префикс в настройках сканера: первым должен идти «]».");
};

const brokenIdentifier: Rule = (c) => {
  const broken = abandonedFor(c, "symbology") ?? abandonedFor(c, "modifier");
  if (broken) {
    const got = c.sim.strokes[broken.at]?.stroke;
    const what = got ? `«${keyLabel(got)}»` : "другое";
    return broken.reason === "symbology"
      ? error(`После «]» должна идти буква символики, а пришло ${what}. Похоже, сканер передаёт не ` +
        "AIM ID, а свой префикс.")
      : error(`После «]» и буквы должна идти цифра-модификатор, а пришло ${what}.`);
  }
  if (abandonedFor(c, "incomplete")) return error("Enter пришёл раньше, чем закончился AIM-идентификатор.");
  return null;
};

const timeout: Rule = (c) => abandonedFor(c, "expired")
  ? error(`Скан длился дольше ${TIMEOUT_MS} мс — CashierApp ждёт Enter не дольше. Уберите задержку ` +
    "между символами в настройках сканера.")
  : null;

const tooShort: Rule = (c) => abandonedFor(c, "short")
  ? error(`Код короче ${MIN_LENGTH} символов — CashierApp такие сканы не принимает.`)
  : null;

const missingEnter: Rule = ({ sim, flagAt, endsWithTab }) => {
  if (sim.strokes.some((a, i) => i > flagAt && isEnter(a.stroke))) return null;
  return endsWithTab
    ? error("Скан заканчивается Tab, а нужен Enter. Настройте суффикс сканера: Enter (CR).")
    : error("Нет Enter в конце скана. Настройте суффикс сканера: Enter (CR).");
};

// ── Keys the till cannot read ─────────────────────────────────────────────────────────────────────

const unreadable: Rule = ({ sim, flagAt, scanEnd, burst, endsWithTab }) => {
  if (flagAt < 0) return null;
  const inside = sim.strokes
    .slice(flagAt, scanEnd < 0 ? undefined : scanEnd)
    .filter((a) => a.role === "passed" && a.char === null && !a.stroke.alt && !a.stroke.ctrl)
    .map((a) => a.stroke)
    .filter((s) => !(endsWithTab && s === burst.at(-1)));
  if (!inside.length) return null;
  return error(`В коде есть символы, которые CashierApp не принимает: ${quote(inside)}. Они выпадут ` +
    "из кода и попадут в поле ввода. Допустимы только латинские буквы, цифры и дефис.");
};

const isGroupSeparator = (s: KeyStroke) => s.ctrl && virtualKey(s) === VK.OEM_6;

const groupSeparator: Rule = ({ burst }) => burst.some(isGroupSeparator)
  ? error("Сканер передаёт разделитель GS как Ctrl+] — CashierApp примет его за начало нового скана. " +
    "Отключите передачу GS (FNC1) в настройках сканера.")
  : null;

const restarted: Rule = (c) => abandonedFor(c, "restart") && !c.burst.some(isGroupSeparator)
  ? error("Внутри скана снова пришёл «]», и CashierApp начал скан заново: всё, что было до него, потеряно.")
  : null;

const controlKeys: Rule = ({ burst }) => {
  const keys = burst.filter((s) => s.ctrl && !s.alt && !isModifierKey(s) && !isGroupSeparator(s));
  return keys.length
    ? error(`Сканер передаёт управляющие символы: ${quote(keys)}. CashierApp их не понимает — уберите ` +
      "их из префикса и суффикса.")
    : null;
};

const altCodes: Rule = ({ burst }) => burst.some((s) => s.alt && !s.ctrl && !isModifierKey(s))
  ? error("Сканер набирает символы Alt-кодами (Alt + цифры на NumPad). CashierApp их не видит — " +
    "выключите в сканере режим «ALT-коды» / «Emulate ALT+Keypad».")
  : null;

const numLockOff = (burst: readonly KeyStroke[]) => burst.some((s) =>
  isKeypadDigit(s) && !s.alt && !(virtualKey(s) >= VK.NUMPAD0 && virtualKey(s) <= VK.NUMPAD9));

const keypadWithoutNumLock: Rule = ({ burst }) => numLockOff(burst)
  ? error("Цифры приходят с цифрового блока при выключенном NumLock — вместо цифр стрелки и " +
    "Home/End, CashierApp их не видит. Включите NumLock или переключите сканер на верхний ряд цифр.")
  : null;

// ── After the scan ────────────────────────────────────────────────────────────────────────────────

const suffix: Rule = ({ sim, scanEnd }) => {
  if (scanEnd < 0) return null;
  const after = sim.strokes.slice(scanEnd + 1).filter(leaked).map((a) => a.stroke);
  if (!after.length) return null;
  return after.every(isEnter)
    ? error("После Enter идёт ещё один Enter (суффикс CR LF?). В CashierApp он нажмёт кнопку на " +
      "экране. Оставьте в суффиксе один Enter.")
    : error(`После Enter лишние клавиши ${quote(after)} — в CashierApp они попадут в поле ввода. ` +
      "В суффиксе сканера должен остаться только Enter.");
};

const severalScans: Rule = ({ sim }) => sim.scans.length > 1
  ? error(`Один скан CashierApp прочитал как ${sim.scans.length} разных.`)
  : null;

// ── Against the card ──────────────────────────────────────────────────────────────────────────────

const wrongSymbology: Rule = ({ scan, match }) => {
  if (!scan || !match) return null;
  const { sample } = match;
  const expected = match.alternative?.symbology ?? sample.symbology;
  if (scan.symbology === expected) return null;
  return error(`Сканер сообщает ${scan.aim} (${symbologyName(scan.symbology, scan.modifier)}), а это ` +
    `${sample.name} — ${aimOf(sample)}. CashierApp сохранит товар с неверным типом штрихкода.`);
};

const wrongModifier: Rule = ({ scan, match }) => {
  if (!scan || !match || match.alternative?.symbology) return null;
  const { sample } = match;
  if (scan.symbology !== sample.symbology || sample.modifiers.includes(scan.modifier)) return null;
  const allowed = sample.modifiers.map((m) => aimOf(sample, m)).join(" или ");
  const name = symbologyName(scan.symbology, scan.modifier);
  const renamed = name !== symbologyName(sample.symbology, sample.modifiers[0]) ? ` («${name}»)` : "";
  return warn(`Модификатор AIM: ожидался ${allowed}, пришёл ${scan.aim}. Код дойдёт, но в CashierApp у ` +
    `товара сохранится тип ${scan.aim}${renamed}.`);
};

const wrongCode: Rule = ({ scan, match }) => {
  if (!scan || !match) return null;
  const { sample, target } = match;
  if (scan.code === sample.data) return null;
  if (match.alternative && scan.code === target) return warn(match.alternative.note);
  if (scan.code.toLowerCase() === target.toLowerCase()) {
    const text = `Регистр букв не совпадает: ожидалось «${target}», пришло «${scan.code}». Похоже на ` +
      "Caps Lock или принудительный регистр в настройках сканера.";
    return sample.caseInsensitive
      ? warn(`${text} Номер чека CashierApp прочитает, но товар с буквами — нет.`)
      : error(`${text} CashierApp ищет товар с учётом регистра.`);
  }
  return error(`CashierApp получит «${scan.code}» вместо «${sample.data}».`);
};

const unknownCode: Rule = ({ scan, match }) => scan && !match
  ? info(`Этого кода нет в наборе. CashierApp получит: ${scan.aim} «${scan.code}» ` +
    `(${symbologyName(scan.symbology, scan.modifier)}).`)
  : null;

// ── Worth knowing, whatever the verdict ───────────────────────────────────────────────────────────

const slowScan: Rule = ({ scan }) => scan && scan.durationMs > TIMEOUT_MS / 2
  ? warn(`Скан медленный: ${Math.round(scan.durationMs)} мс при пределе CashierApp ${TIMEOUT_MS} мс.`)
  : null;

const capsLock: Rule = ({ burst }) => burst.some((s) => s.capsLock)
  ? info("Включён Caps Lock. CashierApp смотрит на Shift, а не на Caps Lock, но некоторые сканеры " +
    "переворачивают регистр — надёжнее выключить.")
  : null;

const keypad: Rule = ({ burst }) => burst.some(isKeypadDigit) && !numLockOff(burst)
  ? info("Цифры набираются на цифровом блоке (NumPad). CashierApp их принимает, но при выключенном " +
    "NumLock сканер перестанет работать — надёжнее верхний ряд цифр.")
  : null;

const handTyped: Rule = ({ burst, scan }) => {
  const typed = burst.filter((s) => !isModifierKey(s));
  if (scan || typed.length < 2) return null;
  const perKey = (typed.at(-1)!.t - typed[0]!.t) / (typed.length - 1);
  return perKey > 60
    ? info(`Клавиши шли медленно (≈${Math.round(perKey)} мс на клавишу) — похоже на ручной ввод, а не скан.`)
    : null;
};

const RULES: readonly Rule[] = [
  missingAim, prefix, brokenIdentifier, timeout, tooShort, missingEnter,
  unreadable, groupSeparator, restarted, controlKeys, altCodes, keypadWithoutNumLock,
  suffix, severalScans,
  wrongSymbology, wrongModifier, wrongCode, unknownCode,
  slowScan, capsLock, keypad, handTyped,
];

const LEVEL_ORDER: Record<Level, number> = { error: 0, warn: 1, info: 2 };

/**
 * Everything the keys spelled: the till's reading where it has one, the US character elsewhere —
 * never the layout's text, so which layout Windows is on changes nothing here.
 */
function spelled(burst: readonly KeyStroke[]): string {
  return burst
    .filter((s) => !isModifierKey(s) && !isEnter(s))
    .map((s) => keyChar(s) ?? usCharacter(s) ?? "")
    .join("");
}

const withoutAim = (s: string) => s.replace(/^.*?\][A-Za-z][0-9]/, "");

export function analyze(
  burst: readonly KeyStroke[], samples: readonly Sample[], current: Sample | null = null,
): Analysis {
  const sim = simulate(burst);
  const scan = sim.scans.at(-1) ?? null;
  const reading = spelled(burst);
  const match = identify([scan?.code ?? "", withoutAim(reading), reading], samples, current);

  const context: Context = {
    burst, sim, scan, match,
    flagAt: sim.strokes.findIndex((a) => a.char === FLAG),
    scanEnd: sim.strokes.findLastIndex((a) => a.role === "enter"),
    endsWithTab: burst.length > 0 && isTab(burst.at(-1)!),
  };
  const issues = RULES
    .map((rule) => rule(context))
    .filter((i): i is Issue => i !== null)
    .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  const verdict: Verdict = !scan || issues.some((i) => i.level === "error") ? "fail"
    : issues.some((i) => i.level === "warn") ? "warn"
    : "pass";

  return {
    verdict,
    sample: match?.sample ?? null,
    scan,
    strokes: sim.strokes,
    issues,
    durationMs: burst.length ? burst.at(-1)!.t - burst[0]!.t : 0,
  };
}
