import type { Analysis, Issue, Verdict } from "@/lib/scanner/analyze";
import type { Sample } from "@/lib/samples";

/** Where a card stands. `unreadable` is the technician's own answer: the scanner never read it. */
export type Status = Verdict | "unreadable" | "untested";

export interface StoredResult {
  status: Exclude<Status, "untested">;
  /** `Date.now()` of the scan. */
  at: number;
  aim?: string;
  code?: string;
  /** Errors and warnings only — the notes describe one scan, not the card. */
  issues: Issue[];
}

export type Results = Readonly<Record<string, StoredResult>>;

export const statusOf = (results: Results, sample: Sample): Status =>
  results[sample.id]?.status ?? "untested";

export function resultOf(analysis: Analysis, at = Date.now()): StoredResult {
  return {
    status: analysis.verdict,
    at,
    aim: analysis.scan?.aim,
    code: analysis.scan?.code,
    issues: analysis.issues.filter((i) => i.level !== "info"),
  };
}

export function unreadableResult(at = Date.now()): StoredResult {
  return {
    status: "unreadable",
    at,
    issues: [{
      level: "error",
      text: "Сканер не читает этот код. Проверьте, включена ли эта символика в настройках сканера.",
    }],
  };
}

export interface Summary {
  pass: number;
  warn: number;
  /** Failed scans and unreadable cards together: both are «does not work». */
  fail: number;
  untested: number;
  total: number;
}

export function summarize(samples: readonly Sample[], results: Results): Summary {
  const summary: Summary = { pass: 0, warn: 0, fail: 0, untested: 0, total: samples.length };
  for (const s of samples) {
    const status = statusOf(results, s);
    summary[status === "unreadable" ? "fail" : status]++;
  }
  return summary;
}

/** The next card after `fromId` nobody has checked yet, or null when all of them have been. */
export function nextUntested(samples: readonly Sample[], results: Results, fromId: string): Sample | null {
  const start = samples.findIndex((s) => s.id === fromId);
  for (let k = 1; k <= samples.length; k++) {
    const s = samples[(start + k) % samples.length]!;
    if (statusOf(results, s) === "untested") return s;
  }
  return null;
}
