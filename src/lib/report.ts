import { type Results, statusOf, summarize } from "@/lib/results";
import { aimOf, type Sample } from "@/lib/samples";

const SIGN = { pass: "✓", warn: "!", fail: "✕", unreadable: "✕", untested: "○" } as const;

function line(sample: Sample, results: Results): string {
  const r = results[sample.id];
  const head = `${SIGN[statusOf(results, sample)]} ${sample.name} (${aimOf(sample)} ${sample.data})`;
  if (!r) return `${head} — не проверен`;
  if (r.status === "unreadable") return `${head} — не читается`;
  const got = r.aim ? ` — пришло ${r.aim} ${r.code}` : " — CashierApp ничего не получил";
  return [head + got, ...r.issues.map((i) => `    · ${i.text}`)].join("\n");
}

/**
 * A plain-text report, for pasting into a chat with support. The totals are the main set's — the
 * optional cards are listed, but an unchecked one is not a gap.
 */
export function buildReport(
  samples: readonly Sample[], results: Results, { date = new Date(), userAgent = "" } = {},
): string {
  const main = samples.filter((s) => s.group === "main");
  const extra = samples.filter((s) => s.group === "extra");
  const s = summarize(main, results);
  return [
    "Проверка сканера для CashierApp",
    `Дата: ${date.toLocaleString("ru-RU")}`,
    ...(userAgent ? [`Браузер: ${userAgent}`] : []),
    `Итог: верно ${s.pass}, с замечаниями ${s.warn}, ошибок ${s.fail}, не проверено ${s.untested} ` +
      `(из ${s.total} основных)`,
    "",
    "Основные",
    ...main.map((sample) => line(sample, results)),
    "",
    "Дополнительные",
    ...extra.map((sample) => line(sample, results)),
  ].join("\n");
}
