import { BarcodeImage } from "@/components/barcode-image";
import { ExpectedSequence } from "@/components/expected-sequence";
import type { Sample } from "@/lib/samples";

/**
 * Every card on paper, for laser scanners — they cannot read a screen. Hidden on screen and the only
 * thing printed.
 */
export function PrintSheet({ samples }: { samples: readonly Sample[] }) {
  return (
    <section aria-hidden className="hidden bg-white text-black print:block">
      <h1 className="text-xl font-semibold">Проверка сканера для CashierApp</h1>
      <p className="mt-1 mb-5 text-xs">
        Откройте страницу проверки и сканируйте коды с листа в любом порядке — страница сама узнает, какой
        код прочитан.
      </p>
      <div className="grid grid-cols-2 gap-4">
        {samples.map((sample) => (
          <div key={sample.id} className="flex break-inside-avoid flex-col gap-2 rounded-md border border-neutral-400 p-4">
            <h2 className="text-sm font-semibold">{sample.name}</h2>
            <div className="flex min-h-36 items-center justify-center">
              <BarcodeImage sample={sample} zoom={sample.matrix ? 0.55 : 0.75} />
            </div>
            <ExpectedSequence sample={sample} className="text-[10px] [&_*]:text-black" />
          </div>
        ))}
      </div>
    </section>
  );
}
