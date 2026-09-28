import { StatusIcon, STATUS_LABEL } from "@/components/status";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type Results, statusOf, summarize } from "@/lib/results";
import { aimOf, type Sample } from "@/lib/samples";

const GROUPS: { group: Sample["group"]; title: string }[] = [
  { group: "main", title: "Основные" },
  { group: "extra", title: "Дополнительные" },
];

function Progress({ samples, results }: { samples: readonly Sample[]; results: Results }) {
  const main = samples.filter((s) => s.group === "main");
  const { pass, warn, fail, total } = summarize(main, results);
  const done = pass + warn + fail;
  const note = fail ? `ошибок: ${fail}` : warn ? `замечаний: ${warn}` : done === total ? "всё верно" : "";
  const share = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>
          Проверено <b className="font-semibold text-foreground">{done} из {total}</b>
        </span>
        <span>{note}</span>
      </div>
      <div
        role="img"
        aria-label={`Верно ${pass}, с замечаниями ${warn}, ошибок ${fail}`}
        className="flex h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <span className="bg-success" style={{ width: share(pass) }} />
        <span className="bg-warning" style={{ width: share(warn) }} />
        <span className="bg-destructive" style={{ width: share(fail) }} />
      </div>
    </div>
  );
}

export function SampleList({ samples, results, currentId, onSelect, className }: {
  samples: readonly Sample[];
  results: Results;
  currentId: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <Card size="sm" className={cn("gap-3", className)}>
      <CardHeader className="border-b">
        <Progress samples={samples} results={results} />
      </CardHeader>
      <CardContent className="px-2">
        <nav aria-label="Штрихкоды" className="flex gap-4 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {GROUPS.map(({ group, title }) => (
            <div key={group} className="flex gap-1 lg:flex-col">
              <h2 className="hidden px-2 pt-1 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase lg:block">
                {title}
              </h2>
              {samples.filter((s) => s.group === group).map((sample) => {
                const status = statusOf(results, sample);
                const current = sample.id === currentId;
                return (
                  <button
                    key={sample.id}
                    type="button"
                    aria-current={current || undefined}
                    title={`${sample.name}: ${STATUS_LABEL[status].toLowerCase()}`}
                    onClick={() => onSelect(sample.id)}
                    className={cn(
                      "flex h-9 shrink-0 items-center gap-2.5 rounded-md px-2 text-left text-sm outline-none",
                      "hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                      current && "bg-muted font-medium",
                    )}
                  >
                    <StatusIcon status={status} />
                    <span className="flex-1 whitespace-nowrap">{sample.name}</span>
                    <span className="hidden font-mono text-xs text-muted-foreground lg:inline">{aimOf(sample)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </CardContent>
    </Card>
  );
}
