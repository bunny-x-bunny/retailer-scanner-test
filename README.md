# Проверка сканера штрихкодов для CashierApp

A single page for setting up a barcode scanner for the CashierApp till. It shows barcodes of every
type the till knows, and when one is scanned it checks the key presses the scanner typed against what
CashierApp needs: **the AIM identifier `]cm`, the code, and Enter — nothing before, between or after.**
When something is wrong it says what to change in the scanner's settings. The interface is in Russian;
it is for the people who set up tills.

## Using it

1. Open the page on the till (or any Windows PC with the scanner plugged in) and click on it — a scanner
   types into whichever window has focus.
2. Scan the code on screen. The page tells which card was scanned by its content, so a printed sheet can
   be scanned in any order («Печать листа»; laser scanners cannot read a screen).
3. Each card ends up «Верно», «С замечаниями» or «Ошибка»; «Не читается» records a code the scanner
   will not read at all. «Скопировать отчёт» puts a plain-text summary on the clipboard for support.

## What «correct» means here

The verdict is CashierApp's own, because `src/lib/scanner/` is a port of the till's scan reading:

| Here | In CashierApp (`src/CashierApp/Infrastructure/Devices/`) |
|---|---|
| `keys.ts` → `keyChar` | `ScanKeyMap.cs` — reads **virtual keys**, not layout text, so a Russian layout is fine |
| `cashier-reader.ts` → `ScanReader` | `BarcodeScanReader.cs` — `]`, a letter, a digit, then data; 2 s timeout; at least 4 characters |
| `cashier-reader.ts` → `simulate` | `BarcodeScanHook.cs` — which keys are taken, which reach the focused field |

**When the till's reader changes, change these to match** — the page is only worth having while its
answer is the till's answer. `test/scanner/cashier-reader.test.ts` mirrors `BarcodeScanReaderTests`.

`analyze.ts` turns that result into advice, one small rule per problem (no AIM ID, a prefix, Tab
instead of Enter, CR LF, Alt-codes, NumLock off, case flipped, wrong symbology or modifier, too slow…).
The samples (`src/lib/samples.ts`) are CashierApp's barcode-type shortlist plus the receipt QR; each
lists the code, the identifier, and the other forms a scanner may legitimately be configured to send
(UPC-A as EAN-13, Codabar with start/stop characters), which only warn.

`test/samples.test.ts` renders every card with bwip-js and reads it back with zxing-cpp, which also
reports the AIM identifier a scanner would send — so the pictures and the expectations are checked
against each other without a scanner.

## Development

[Bun](https://bun.sh), Next.js (static export), Tailwind CSS v4, shadcn/ui on Base UI, lucide-react.

```bash
bun install
bun dev              # http://localhost:3000
bun test             # logic and barcode round-trips
bun run lint
bun run typecheck
bun run build        # static site in out/
```

UI components come from shadcn: `bunx shadcn@latest add <component>`.

## Publishing

`.github/workflows/pages.yml` tests, builds and deploys every push to `master` to GitHub Pages. Once,
in the repository settings: **Pages → Build and deployment → Source: GitHub Actions**. The workflow
passes the site's sub-path to the build as `PAGES_BASE_PATH`.
