import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Step } from "@/lib/manuals";
import { publicUrl } from "@/lib/public-url";

function StepNumber({ n, className }: { n: number; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-7 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground",
        className,
      )}
    >
      {n}
    </span>
  );
}

/**
 * The manufacturer's image as it is, at half its pixel size — the size the manual shows it at. A white
 * surround gives it the quiet zone the file itself is cropped without.
 */
function ConfigCode({ step }: { step: Step }) {
  const { file, width, height } = step.code;
  return (
    <div className="inline-block max-w-full rounded-md border bg-white p-4">
      <Image
        src={publicUrl(file)}
        alt={`Код настройки: ${step.title}`}
        width={Math.round(width / 2)}
        height={Math.round(height / 2)}
        unoptimized
        // A quarter of a kilobyte each, and a printed page must have them all.
        loading="eager"
        className="h-auto max-w-full"
      />
    </div>
  );
}

/** A step with no code to scan — «check», «start again». */
export function StepNote({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[1.75rem_1fr] gap-x-3">
      <StepNumber n={n} className="bg-muted text-foreground" />
      <div className="space-y-2">
        <p className="leading-7 font-medium">{title}</p>
        {children}
      </div>
    </li>
  );
}

/** Numbered codes to scan, top to bottom. `children` go at the end, numbered on from the codes. */
export function StepList({ steps, children }: { steps: readonly Step[]; children?: React.ReactNode }) {
  return (
    <ol className="space-y-6">
      {steps.map((step, i) => (
        <li key={step.code.file} className="grid grid-cols-[1.75rem_1fr] gap-x-3">
          <StepNumber n={i + 1} />
          <div className="min-w-0 space-y-2">
            <p className="leading-7 font-medium">{step.title}</p>
            {step.detail && <p className="text-sm text-muted-foreground">{step.detail}</p>}
            <ConfigCode step={step} />
          </div>
        </li>
      ))}
      {children}
    </ol>
  );
}
