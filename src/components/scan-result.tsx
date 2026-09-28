import { CircleX, Info, ScanLine, TriangleAlert } from "lucide-react";
import { ExpectedSequence } from "@/components/expected-sequence";
import { KeyStrip } from "@/components/key-strip";
import { STATUS_SURFACE, StatusIcon } from "@/components/status";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Analysis, Level } from "@/lib/scanner/analyze";

export interface JournalEntry {
  id: number;
  at: Date;
  analysis: Analysis;
}

const time = (d: Date) => d.toLocaleTimeString("ru-RU");

const TITLE = { pass: "Верно", warn: "Работает, но есть замечания", fail: "Ошибка" } as const;

const ISSUE_ICON: Record<Level, { icon: typeof Info; tone: string }> = {
  error: { icon: CircleX, tone: "text-destructive" },
  warn: { icon: TriangleAlert, tone: "text-warning" },
  info: { icon: Info, tone: "text-muted-foreground" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Waiting() {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <ScanLine className="size-8 text-muted-foreground" aria-hidden />
      <p className="font-medium">Отсканируйте штрихкод</p>
      <p className="max-w-64 text-sm text-muted-foreground">
        Результат появится здесь. Можно сканировать любой код со страницы или с распечатки.
      </p>
    </div>
  );
}

export function ScanResult({ entry }: { entry: JournalEntry | null }) {
  if (!entry) {
    return (
      <Card>
        <Waiting />
      </Card>
    );
  }

  const { analysis: a, at } = entry;
  const title = !a.sample && a.scan && a.verdict === "pass" ? "Код прочитан" : TITLE[a.verdict];
  const keys = a.strokes.filter((s) => s.role !== "modifierKey");
  const gaps = keys.slice(1).map((k, i) => k.stroke.t - keys[i]!.stroke.t);

  return (
    <Card aria-live="polite">
      <CardContent className="space-y-4">
        <div className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5", STATUS_SURFACE[a.verdict])}>
          <StatusIcon status={a.verdict} className="size-6" />
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">
              {a.sample?.name ?? "Код не из набора"} · {time(at)}
            </p>
          </div>
        </div>

        {a.sample && (
          <Section title="Ожидалось">
            <ExpectedSequence sample={a.sample} className="text-sm" />
          </Section>
        )}

        <Section title="Получено — по клавишам">
          <KeyStrip strokes={a.strokes} />
        </Section>

        <Section title="CashierApp получит">
          {a.scan ? (
            <p className="font-mono text-sm break-all">
              <span className="font-semibold text-aim">{a.scan.aim}</span>
              {a.scan.code}
            </p>
          ) : (
            <p className="text-sm text-destructive">Ничего: скан не распознан, клавиши уйдут в поле ввода.</p>
          )}
        </Section>

        {a.issues.length > 0 && (
          <Section title="Замечания">
            <ul className="space-y-2">
              {a.issues.map((issue, i) => {
                const { icon: Icon, tone } = ISSUE_ICON[issue.level];
                return (
                  <li key={i} className={cn("flex gap-2 text-sm", issue.level === "info" && "text-muted-foreground")}>
                    <Icon className={cn("mt-0.5 size-4 shrink-0", tone)} aria-hidden />
                    <span>{issue.text}</span>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        <p className="text-xs text-muted-foreground">
          {Math.round(a.durationMs)} мс · клавиш: {keys.length}
          {gaps.length > 0 && ` · самая долгая пауза ${Math.round(Math.max(...gaps))} мс`}
        </p>
      </CardContent>
    </Card>
  );
}
