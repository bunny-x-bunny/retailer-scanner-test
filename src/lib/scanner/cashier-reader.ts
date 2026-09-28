/**
 * What CashierApp does with a burst of key presses — a port of
 * `Infrastructure/Devices/BarcodeScanReader.cs` (the state machine) and `BarcodeScanHook.cs` (how
 * the window feeds it). Kept close to the C# on purpose: the answer here is only worth having if it
 * is the till's answer.
 */
import { isEnter, isModifierKey, keyChar, type KeyStroke } from "./keys";

/** The AIM flag character, ASCII 93 — the first thing a scan sends. */
export const FLAG = "]";
/** `BarcodeScanReader.Timeout`: from the flag to Enter. */
export const TIMEOUT_MS = 2000;
/** `BarcodeScanReader.MinLength`: counted after the identifier. */
export const MIN_LENGTH = 4;

/** One scan the till raised. */
export interface CashierScan {
  /** `]cm`, as the scanner sent it. */
  aim: string;
  symbology: string;
  modifier: string;
  code: string;
  /** Flag to Enter. */
  durationMs: number;
}

/** Why a capture ended without a scan. */
export type Abandon =
  | "restart" //    a fresh flag started over
  | "expired" //    more than TIMEOUT_MS since the flag
  | "symbology" //  ] followed by something that is not a letter
  | "modifier" //   ]c followed by something that is not a digit
  | "incomplete" // Enter before the identifier was whole
  | "short" //      Enter after fewer than MIN_LENGTH characters
  | "unfinished"; // the burst ended with no Enter at all

type Stage = "idle" | "symbology" | "modifier" | "body";

const isLetter = (c: string) => /^[A-Za-z]$/.test(c);
const isDigit = (c: string) => /^[0-9]$/.test(c);

/**
 * `BarcodeScanReader`. The C# reader also abandons on a non-code character in the body; that branch
 * is left out because nothing can reach it — the hook only offers what `ScanKeyMap` decodes, and
 * that is letters, digits, `-` and the flag.
 */
class ScanReader {
  private stage: Stage = "idle";
  private buffer = "";
  private symbology = "";
  private modifier = "";
  private startedAt = 0;

  get capturing() { return this.stage !== "idle"; }
  get current() { return this.stage; }

  accept(c: string, now: number): { consumed: boolean; abandoned?: Abandon } {
    let abandoned: Abandon | undefined;
    if (this.capturing && this.expired(now)) {
      this.reset();
      abandoned = "expired";
    }

    // A fresh flag always starts over, whatever stage we were at.
    if (c === FLAG) {
      if (this.capturing) abandoned = "restart";
      this.reset();
      this.stage = "symbology";
      this.startedAt = now;
      return { consumed: true, abandoned };
    }

    switch (this.stage) {
      case "idle":
        return { consumed: false, abandoned };
      case "symbology":
        if (!isLetter(c)) return this.giveUp("symbology");
        this.symbology = c;
        this.stage = "modifier";
        return { consumed: true };
      case "modifier":
        if (!isDigit(c)) return this.giveUp("modifier");
        this.modifier = c;
        this.stage = "body";
        return { consumed: true };
      case "body":
        this.buffer += c;
        return { consumed: true };
    }
  }

  tryComplete(now: number): { scan?: CashierScan; abandoned?: Abandon } {
    if (!this.capturing) return {};
    const { stage, buffer: code, symbology, modifier, startedAt } = this;
    const expired = this.expired(now);
    this.reset();
    if (stage !== "body") return { abandoned: "incomplete" };
    if (expired) return { abandoned: "expired" };
    if (code.length < MIN_LENGTH) return { abandoned: "short" };
    return {
      scan: { aim: `]${symbology}${modifier}`, symbology, modifier, code, durationMs: now - startedAt },
    };
  }

  private giveUp(reason: Abandon) {
    this.reset();
    return { consumed: false, abandoned: reason };
  }

  private reset() {
    this.stage = "idle";
    this.buffer = "";
    this.symbology = "";
    this.modifier = "";
  }

  private expired(now: number) { return now - this.startedAt > TIMEOUT_MS; }
}

/**
 * What one key press became in the till.
 *
 * - `flag` · `symbology` · `modifier` · `data` · `enter` — part of a scan the till raised.
 * - `lost` — taken by the reader for a scan that was then dropped: typed nowhere.
 * - `passed` — not taken, so it reaches whatever field has focus.
 * - `enterPassed` — an Enter that completed nothing, so it reaches the screen and may press a button.
 * - `modifierKey` — Shift and the like: let through, harmlessly.
 */
export type Role =
  | "flag" | "symbology" | "modifier" | "data" | "enter"
  | "lost" | "passed" | "enterPassed" | "modifierKey";

export interface AnnotatedStroke {
  stroke: KeyStroke;
  /** What the till read off the key, if anything. */
  char: string | null;
  role: Role;
}

export interface Simulation {
  strokes: AnnotatedStroke[];
  scans: CashierScan[];
  /** Every capture that ended without a scan, and the stroke that ended it. */
  abandoned: { reason: Abandon; at: number }[];
}

const STAGE_ROLE: Record<Stage, Role> = {
  idle: "flag", symbology: "symbology", modifier: "modifier", body: "data",
};

/** `BarcodeScanHook.OnPreviewKeyDown`, over a recorded burst. */
export function simulate(strokes: readonly KeyStroke[]): Simulation {
  const reader = new ScanReader();
  const out: AnnotatedStroke[] = [];
  const scans: CashierScan[] = [];
  const abandoned: Simulation["abandoned"] = [];
  let capture: number[] = [];

  const drop = (reason: Abandon, at: number) => {
    for (const i of capture) out[i]!.role = "lost";
    capture = [];
    abandoned.push({ reason, at });
  };

  strokes.forEach((stroke, i) => {
    if (isEnter(stroke)) {
      const wasCapturing = reader.capturing;
      const { scan, abandoned: why } = reader.tryComplete(stroke.t);
      if (scan) {
        scans.push(scan);
        capture = [];
        out.push({ stroke, char: null, role: "enter" });
        return;
      }
      if (wasCapturing && why) drop(why, i);
      out.push({ stroke, char: null, role: "enterPassed" });
      return;
    }

    const char = keyChar(stroke);
    if (char === null) {
      out.push({ stroke, char, role: isModifierKey(stroke) ? "modifierKey" : "passed" });
      return;
    }

    const stage = reader.current;
    const { consumed, abandoned: why } = reader.accept(char, stroke.t);
    if (why) drop(why, i);
    if (!consumed) {
      out.push({ stroke, char, role: "passed" });
      return;
    }
    capture.push(i);
    out.push({ stroke, char, role: char === FLAG ? "flag" : STAGE_ROLE[stage] });
  });

  if (capture.length) drop("unfinished", strokes.length - 1);
  return { strokes: out, scans, abandoned };
}
