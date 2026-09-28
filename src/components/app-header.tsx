"use client";

import { ClipboardCopy, Moon, Printer, RotateCcw, ScanBarcode, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

function FocusIndicator({ focused, receiving }: { focused: boolean; receiving: boolean }) {
  const [label, tone] = !focused ? ["Страница не в фокусе", "bg-destructive/10 text-destructive"]
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

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Сменить тему"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="dark:hidden" />
      <Moon className="hidden dark:block" />
    </Button>
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

export function AppHeader({ focused, receiving, onCopyReport, onReset }: {
  focused: boolean;
  receiving: boolean;
  onCopyReport: () => void;
  onReset: () => void;
}) {
  return (
    <header className="border-b bg-background print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ScanBarcode className="size-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-lg leading-tight font-semibold">Проверка сканера штрихкодов</h1>
            <p className="text-sm text-muted-foreground">
              Для CashierApp сканер передаёт AIM-идентификатор{" "}
              <Kbd className="font-mono text-aim">]cm</Kbd>, код и <Kbd className="text-success">Enter</Kbd>
              {" "}— и больше ничего.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
