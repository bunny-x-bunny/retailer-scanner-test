"use client";

import { Ban, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { BarcodeImage } from "@/components/barcode-image";
import { ExpectedSequence } from "@/components/expected-sequence";
import { StatusText } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Status } from "@/lib/results";
import type { Verdict } from "@/lib/scanner/analyze";
import type { Sample } from "@/lib/samples";

export interface Prefs {
  autoAdvance: boolean;
  sound: boolean;
  zoom: number;
}

export const ZOOM = { min: 0.6, max: 1.6, step: 0.1 } as const;

/** The ring that flashes round the code when a scan of it lands. Keyed, so every scan replays it. */
function Flash({ verdict }: { verdict: Verdict }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 rounded-lg ring-4 ring-inset",
        "animate-out fill-mode-forwards duration-1000 fade-out-0",
        verdict === "pass" ? "ring-success" : verdict === "warn" ? "ring-warning" : "ring-destructive",
      )}
    />
  );
}

function FocusVeil() {
  return (
    <button
      type="button"
      onClick={() => window.focus()}
      className="absolute inset-0 grid place-content-center gap-1 rounded-lg bg-white/90 text-center text-neutral-900"
    >
      <strong className="text-lg text-red-600">Страница не в фокусе</strong>
      <span className="text-sm">Нажмите сюда — иначе сканер печатает в другое окно</span>
    </button>
  );
}

function SwitchField({ id, label, checked, onChange }: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-sm font-normal text-muted-foreground">{label}</Label>
    </div>
  );
}

export function BarcodeStage({ sample, status, focused, flash, prefs, onPrefs, onStep, onUnreadable }: {
  sample: Sample;
  status: Status;
  focused: boolean;
  flash: { key: number; verdict: Verdict } | null;
  prefs: Prefs;
  onPrefs: (change: Partial<Prefs>) => void;
  onStep: (by: -1 | 1) => void;
  onUnreadable: () => void;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{sample.name}</CardTitle>
        <CardDescription>{sample.hint}</CardDescription>
        <CardAction>
          <StatusText status={status} />
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="relative flex min-h-72 items-center justify-center overflow-hidden rounded-lg border bg-white p-4 sm:p-8 lg:min-h-88">
          <BarcodeImage sample={sample} zoom={prefs.zoom} />
          {flash && <Flash key={flash.key} verdict={flash.verdict} />}
          {!focused && <FocusVeil />}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg bg-muted px-3 py-2">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Ожидается</span>
          <ExpectedSequence sample={sample} className="text-base" />
        </div>
      </CardContent>

      <CardFooter className="flex-wrap gap-x-4 gap-y-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Предыдущий" onClick={() => onStep(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" aria-label="Следующий" onClick={() => onStep(1)}>
            <ChevronRight />
          </Button>
          <Button variant="destructive" onClick={onUnreadable}>
            <Ban />
            Не читается
          </Button>
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
            <ZoomOut className="size-4" aria-hidden />
            {/* The slider fills its parent, so the parent carries the width. */}
            <div className="w-28">
              <Slider
                aria-label="Размер штрихкода"
                min={ZOOM.min}
                max={ZOOM.max}
                step={ZOOM.step}
                value={[prefs.zoom]}
                onValueChange={(zoom) => onPrefs({ zoom: Array.isArray(zoom) ? zoom[0]! : zoom })}
              />
            </div>
            <ZoomIn className="size-4" aria-hidden />
          </div>
          <SwitchField
            id="auto-advance"
            label="Автопереход"
            checked={prefs.autoAdvance}
            onChange={(autoAdvance) => onPrefs({ autoAdvance })}
          />
          <SwitchField id="sound" label="Звук" checked={prefs.sound} onChange={(sound) => onPrefs({ sound })} />
        </div>
      </CardFooter>
    </Card>
  );
}
