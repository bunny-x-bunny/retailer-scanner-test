import { FLAG, MIN_LENGTH } from "./cashier-reader";
import { isEnter, isModifierKey, keyChar, type KeyStroke } from "./keys";

/**
 * Splits the page's key stream into scans.
 *
 * A scanner types a whole code in a few tens of milliseconds; a person does not. So a burst ends
 * when the keys stop: shortly after an Enter — long enough to catch a CR LF or any suffix behind
 * it — or, for a scanner that sends no Enter at all, after a longer pause. A flag after an Enter is
 * the next scan, and closes the one before.
 */
export class BurstCollector {
  private strokes: KeyStroke[] = [];
  private sawEnter = false;

  constructor(readonly afterEnterMs = 150, readonly quietMs = 700) {}

  get open() { return this.strokes.length > 0; }

  /** Adds a stroke. Returns the previous burst when this stroke starts a new scan. */
  push(stroke: KeyStroke): KeyStroke[] | null {
    const closed = this.sawEnter && keyChar(stroke) === FLAG ? this.take() : null;
    this.strokes.push(stroke);
    if (isEnter(stroke)) this.sawEnter = true;
    return closed;
  }

  /** When `poll` will next have a burst to give, or null when there is none. */
  deadline(): number | null {
    const last = this.strokes.at(-1);
    return last ? last.t + (this.sawEnter ? this.afterEnterMs : this.quietMs) : null;
  }

  /** The burst, once the keys have stopped for long enough. */
  poll(now: number): KeyStroke[] | null {
    const due = this.deadline();
    return due !== null && now >= due ? this.take() : null;
  }

  private take() {
    const burst = this.strokes;
    this.strokes = [];
    this.sawEnter = false;
    return burst;
  }
}

/**
 * A few keys pressed by a person rather than a scan: ignored, so clicking about and pressing Enter
 * on a button logs nothing. Anything with a flag in it is always a scan attempt.
 */
export function looksManual(burst: readonly KeyStroke[]): boolean {
  const typed = burst.filter((s) => !isModifierKey(s));
  if (typed.some((s) => keyChar(s) === FLAG || s.key === FLAG)) return false;
  return typed.length < MIN_LENGTH;
}
