import type { JournalEntry } from "@/components/scan-result";
import { StatusIcon } from "@/components/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/** This visit's scans, newest first. Not kept across reloads: the per-card results are. */
export function ScanJournal({ entries, shownId, onShow }: {
  entries: readonly JournalEntry[];
  shownId: number | null;
  onShow: (id: number) => void;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Журнал</CardTitle>
      </CardHeader>
      <CardContent className="px-1.5">
        {entries.length === 0 ? (
          <p className="px-1.5 text-sm text-muted-foreground">Пока пусто</p>
        ) : (
          // A scroll area scrolls only inside a definite height; a short journal just sits there.
          <ScrollArea className={entries.length > 8 ? "h-72" : undefined}>
            <ol>
              {entries.map(({ id, at, analysis }) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onShow(id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm outline-none",
                      "hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                      id === shownId && "bg-muted",
                    )}
                  >
                    <StatusIcon status={analysis.verdict} className="size-3.5" />
                    <span className="flex-1 truncate">{analysis.sample?.name ?? "Код не из набора"}</span>
                    <time className="text-xs text-muted-foreground tabular-nums">
                      {at.toLocaleTimeString("ru-RU")}
                    </time>
                  </button>
                </li>
              ))}
            </ol>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
