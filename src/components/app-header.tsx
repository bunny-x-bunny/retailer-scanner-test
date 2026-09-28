"use client";

import { ClipboardCopy, Printer, RotateCcw } from "lucide-react";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

function FocusIndicator({ focused, receiving }: { focused: boolean; receiving: boolean }) {
  // The prerendered page is not listening yet: say so, or a scan made during loading is lost unexplained.
  const live = useHydrated();
  const [label, tone] = !live ? ["Загрузка…", "bg-muted text-muted-foreground"]
    : !focused ? ["Страница не в фокусе", "bg-destructive/10 text-destructive"]
    : receiving ? ["Идёт скан…", "bg-aim/10 text-aim"]
    : ["Готов к сканированию", "bg-success/10 text-success"];
  return (
    <span
      role="status"
      className={cn("inline-flex h-8 w-52 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium", tone)}
    >
      <span className={cn("size-2 rounded-full bg-current", receiving && focused && "animate-pulse")} />
      {label}
    </span>
  );
}

function ResetButton({ onReset }: { onReset: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" />}>
        <RotateCcw />
        Сбросить
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Сбросить результаты?</AlertDialogTitle>
          <AlertDialogDescription>
            Все отметки и журнал будут очищены — проверку придётся пройти заново.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => { onReset(); setOpen(false); }}>
            Сбросить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** The site header, with the test page's own status and actions. */
export function AppHeader({ focused, receiving, onCopyReport, onReset }: {
  focused: boolean;
  receiving: boolean;
  onCopyReport: () => void;
  onReset: () => void;
}) {
  return (
    <SiteHeader
      subtitle={
        <>
          Для CashierApp сканер передаёт AIM-идентификатор <Kbd className="font-mono text-aim">]cm</Kbd>, код
          и <Kbd className="text-success">Enter</Kbd> — и больше ничего.
        </>
      }
    >
      <FocusIndicator focused={focused} receiving={receiving} />
      <Button variant="outline" onClick={onCopyReport}>
        <ClipboardCopy />
        Скопировать отчёт
      </Button>
      <Button variant="outline" onClick={() => window.print()}>
        <Printer />
        Печать листа
      </Button>
      <ResetButton onReset={onReset} />
    </SiteHeader>
  );
}
