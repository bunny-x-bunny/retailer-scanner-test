import { type Results, statusOf, summarize } from "@/lib/results";
import { aimOf, type Sample } from "@/lib/samples";

const SIGN = { pass: "✓", warn: "!", fail: "✕", unreadable: "✕", untested: "○" } as const;

/** A plain-text report, for pasting into a chat with support. */
export function buildReport(
  samples: readonly Sample[], results: Results, { date = new Date(), userAgent = "" } = {},
): string {
  const s = summarize(samples, results);
  const lines = samples.map((sample) => {
    const r = results[sample.id];
    const head = `${SIGN[statusOf(results, sample)]} ${sample.name} (${aimOf(sample)} ${sample.data})`;
    if (!r) return `${head} — не проверен`;
    if (r.status === "unreadable") return `${head} — не читается`;
    const got = r.aim ? ` — пришло ${r.aim} ${r.code}` : " — CashierApp ничего не получил";
    return [head + got, ...r.issues.map((i) => `    · ${i.text}`)].join("\n");
  });
  return [
    "Проверка сканера для CashierApp",
    `Дата: ${date.toLocaleString("ru-RU")}`,
    ...(userAgent ? [`Браузер: ${userAgent}`] : []),
    `Итог: верно ${s.pass}, с замечаниями ${s.warn}, ошибок ${s.fail}, не проверено ${s.untested} ` +
      `(из ${s.total})`,
    "",
    ...lines,
  ].join("\n");
}
