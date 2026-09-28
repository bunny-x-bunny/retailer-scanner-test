import type { Alternative, Sample } from "@/lib/samples";
import { MIN_LENGTH } from "./cashier-reader";

export interface Match {
  sample: Sample;
  /** How the evidence met the card, best first. */
  kind: "exact" | "alternative" | "case" | "contains";
  /** The card's code — or the alternative's — that it met. */
  target: string;
  alternative?: Alternative;
}

const RANK: Record<Match["kind"], number> = { exact: 0, alternative: 1, case: 2, contains: 3 };

function matches(candidate: string, sample: Sample): Match[] {
  const targets = [
    { target: sample.data, alternative: undefined },
    ...(sample.alternatives ?? []).map((a) => ({ target: a.data, alternative: a })),
  ];
  const found: Match[] = [];
  const lower = candidate.toLowerCase();
  for (const { target, alternative } of targets) {
    if (candidate === target) {
      found.push({ sample, kind: alternative ? "alternative" : "exact", target, alternative });
    } else if (lower === target.toLowerCase()) {
      found.push({ sample, kind: "case", target });
    } else if (target.length >= MIN_LENGTH && lower.includes(target.toLowerCase())) {
      found.push({ sample, kind: "contains", target });
    }
  }
  return found;
}

/**
 * Which card a scan was of.
 *
 * `candidates` are the readings of the scan, most trustworthy first: what the till received, then
 * what the keys spelled. The second matters when the till received nothing — a scanner with no AIM
 * identifier still gets its failure pinned to the card it was pointed at. On a tie the card on
 * screen wins: that is what the scanner was pointed at.
 */
export function identify(
  candidates: readonly string[], samples: readonly Sample[], current: Sample | null,
): Match | null {
  const found = candidates
    .filter(Boolean)
    .flatMap((c) => samples.flatMap((s) => matches(c, s)));
  found.sort((a, b) =>
    RANK[a.kind] - RANK[b.kind]
    || Number(b.sample === current) - Number(a.sample === current)
    || b.target.length - a.target.length);
  return found[0] ?? null;
}
