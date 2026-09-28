"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { BarcodeStage, type Prefs } from "@/components/barcode-stage";
import { PrintSheet } from "@/components/print-sheet";
import { SampleList } from "@/components/sample-list";
import { ScanJournal } from "@/components/scan-journal";
import { type JournalEntry, ScanResult } from "@/components/scan-result";
import { SetupGuide } from "@/components/setup-guide";
import { useBeep } from "@/hooks/use-beep";
import { useScanCapture } from "@/hooks/use-scan-capture";
import { useStoredState } from "@/hooks/use-stored-state";
import { useWindowFocus } from "@/hooks/use-window-focus";
import { buildReport } from "@/lib/report";
import { nextUntested, resultOf, type Results, statusOf, unreadableResult } from "@/lib/results";
import { analyze, type Verdict } from "@/lib/scanner/analyze";
import type { KeyStroke } from "@/lib/scanner/keys";
import { SAMPLES, sampleById } from "@/lib/samples";

const DEFAULT_PREFS: Prefs = { autoAdvance: true, sound: true, zoom: 1 };
const NO_PREFS: Partial<Prefs> = {};
const NO_RESULTS: Results = {};
const FIRST = SAMPLES[0]!;
const JOURNAL_LENGTH = 50;
/** Long enough to see the green, short enough not to wait for it. */
const ADVANCE_AFTER_MS = 900;

const KEY = { prefs: "scanner-test:v1:prefs", results: "scanner-test:v1:results", current: "scanner-test:v1:current" };

export function ScannerTester() {
  const [storedPrefs, setStoredPrefs] = useStoredState(KEY.prefs, NO_PREFS);
  const [results, setResults] = useStoredState(KEY.results, NO_RESULTS);
  const [currentId, setCurrentId] = useStoredState(KEY.current, FIRST.id);
  const prefs = useMemo(() => ({ ...DEFAULT_PREFS, ...storedPrefs }), [storedPrefs]);
  const current = sampleById(currentId) ?? FIRST;

  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [shownId, setShownId] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ key: number; verdict: Verdict } | null>(null);
  const entryCount = useRef(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const focused = useWindowFocus();
  const beep = useBeep();

  /** Moves on from `fromId` once the technician has seen the result, unless they moved first. */
  const advanceFrom = (fromId: string, updated: Results) => {
    clearTimeout(advanceTimer.current);
    const next = nextUntested(SAMPLES, updated, fromId);
    if (!next) return;
    advanceTimer.current = setTimeout(() => {
      setCurrentId((id) => (id === fromId ? next.id : id));
    }, ADVANCE_AFTER_MS);
  };

  const onScan = (burst: KeyStroke[]) => {
    const analysis = analyze(burst, SAMPLES, current);
    const entry: JournalEntry = { id: ++entryCount.current, at: new Date(), analysis };
    setJournal((j) => [entry, ...j].slice(0, JOURNAL_LENGTH));
    setShownId(entry.id);
    setFlash({ key: entry.id, verdict: analysis.verdict });
    if (prefs.sound) beep(analysis.verdict);

    const { sample } = analysis;
    clearTimeout(advanceTimer.current);
    if (!sample) return;
    const updated = { ...results, [sample.id]: resultOf(analysis) };
    setResults(updated);
    setCurrentId(sample.id);
    if (analysis.verdict === "pass" && prefs.autoAdvance) advanceFrom(sample.id, updated);
  };

  const receiving = useScanCapture(onScan);

  const step = (by: -1 | 1) => {
    clearTimeout(advanceTimer.current);
    const i = SAMPLES.indexOf(current);
    setCurrentId(SAMPLES[(i + by + SAMPLES.length) % SAMPLES.length]!.id);
  };

  const markUnreadable = () => {
    const updated = { ...results, [current.id]: unreadableResult() };
    setResults(updated);
    const next = nextUntested(SAMPLES, updated, current.id);
    if (next) setCurrentId(next.id);
  };

  const reset = () => {
    clearTimeout(advanceTimer.current);
    setResults(NO_RESULTS);
    setCurrentId(FIRST.id);
    setJournal([]);
    setShownId(null);
    setFlash(null);
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildReport(SAMPLES, results, { userAgent: navigator.userAgent }));
      toast.success("Отчёт скопирован");
    } catch {
      toast.error("Не удалось скопировать: браузер не дал доступ к буферу обмена");
    }
  };

  return (
    <>
      <div className="min-h-dvh bg-muted/40 print:hidden">
        <AppHeader focused={focused} receiving={receiving} onCopyReport={copyReport} onReset={reset} />
        <main className="grid items-start gap-4 p-4 md:p-6 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_24rem]">
          <SampleList
            className="lg:sticky lg:top-6 lg:row-span-2 xl:row-span-1"
            samples={SAMPLES}
            results={results}
            currentId={current.id}
            onSelect={(id) => { clearTimeout(advanceTimer.current); setCurrentId(id); }}
          />
          <BarcodeStage
            sample={current}
            status={statusOf(results, current)}
            focused={focused}
            flash={flash}
            prefs={prefs}
            onPrefs={(change) => setStoredPrefs((p) => ({ ...p, ...change }))}
            onStep={step}
            onUnreadable={markUnreadable}
          />
          <div className="flex min-w-0 flex-col gap-4">
            <ScanResult entry={journal.find((e) => e.id === shownId) ?? null} />
            <ScanJournal entries={journal} shownId={shownId} onShow={setShownId} />
          </div>
        </main>
        <div className="px-4 pb-6 md:px-6">
          <SetupGuide />
        </div>
      </div>
      <PrintSheet samples={SAMPLES} />
    </>
  );
}
