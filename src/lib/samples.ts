/**
 * The barcodes the page shows, and what a correctly configured scanner must type for each.
 *
 * The main set is CashierApp's own shortlist (`BarcodeType.Offered` in the till) plus the receipt QR
 * a sales slip carries; the extra set is what `ScannedBarcode` can name but no shop here prints.
 *
 * Every `data` value is something CashierApp can receive: ASCII letters, digits and `-`, at least
 * four characters. The till's scan reader decodes nothing else (`ScanKeyMap`), so a sample outside
 * that alphabet would test CashierApp rather than the scanner. `samples.test.ts` holds them to it.
 */

/** bwip-js encoder names this page uses. */
export type Encoder =
  | "ean13" | "ean8" | "upca" | "upce" | "code128" | "code39" | "itf14" | "databaromni"
  | "rationalizedCodabar" | "qrcode" | "datamatrix" | "pdf417" | "azteccode";

/** Another answer a scanner may legitimately be configured to give. Accepted with a warning. */
export interface Alternative {
  data: string;
  /** Symbology letter, when the alternative also changes it (DataBar sent as EAN-13). */
  symbology?: string;
  note: string;
}

export interface Sample {
  id: string;
  name: string;
  group: "main" | "extra";
  /** One line: what this card is for. */
  hint: string;
  encoder: Encoder;
  /** What bwip-js is given — for DataBar and Codabar not the same as what the scanner types. */
  text: string;
  /** The `c` of `]cm`. Case matters: `]d` is Data Matrix, `]D` is nothing. */
  symbology: string;
  /** Modifiers that are simply right, the usual one first. Any other digit only warns. */
  modifiers: readonly [string, ...string[]];
  /** The code, as CashierApp must receive it after the identifier. */
  data: string;
  alternatives?: Alternative[];
  /** A receipt UUID: `Guid.TryParse` ignores case, so a case change only warns. */
  caseInsensitive?: boolean;
  /** Two-dimensional: drawn square, without human-readable text. */
  matrix?: boolean;
}

export const SAMPLES: readonly Sample[] = [
  {
    id: "ean13", name: "EAN-13", group: "main", encoder: "ean13",
    hint: "Обычный товарный штрихкод, 13 цифр",
    text: "4607001771517", symbology: "E", modifiers: ["0"], data: "4607001771517",
  },
  {
    id: "ean8", name: "EAN-8", group: "main", encoder: "ean8",
    hint: "Короткий EAN для маленьких упаковок, 8 цифр",
    text: "46009333", symbology: "E", modifiers: ["4"], data: "46009333",
  },
  {
    id: "upca", name: "UPC-A", group: "main", encoder: "upca",
    hint: "Американский товарный код, 12 цифр",
    text: "036000291452", symbology: "E", modifiers: ["0"], data: "036000291452",
    alternatives: [{
      data: "0036000291452",
      note: "UPC-A передан как EAN-13, с ведущим нулём. CashierApp найдёт товар, только если он " +
        "заведён в той же форме, — настройте все кассы одинаково.",
    }],
  },
  {
    id: "upce", name: "UPC-E", group: "main", encoder: "upce",
    hint: "Сжатый UPC, 8 цифр",
    text: "01234565", symbology: "E", modifiers: ["0"], data: "01234565",
    alternatives: [
      {
        data: "012345000065",
        note: "UPC-E развёрнут в UPC-A (12 цифр). CashierApp найдёт товар, только если он заведён " +
          "в той же форме.",
      },
      {
        data: "0012345000065",
        note: "UPC-E развёрнут в EAN-13 (13 цифр). CashierApp найдёт товар, только если он заведён " +
          "в той же форме.",
      },
    ],
  },
  {
    id: "code128", name: "Code 128", group: "main", encoder: "code128",
    hint: "Буквы в обоих регистрах, цифры и дефис — проверяет Shift",
    text: "Rt-128-xYz9", symbology: "C", modifiers: ["0"], data: "Rt-128-xYz9",
  },
  {
    id: "code39", name: "Code 39", group: "main", encoder: "code39",
    hint: "Заглавные буквы, цифры и дефис",
    text: "RT-39-2026", symbology: "A", modifiers: ["0"], data: "RT-39-2026",
  },
  {
    id: "itf14", name: "ITF-14", group: "main", encoder: "itf14",
    hint: "Код транспортной упаковки, 14 цифр",
    // ]I1 is «check digit validated and transmitted»: ITF-14 carries one, so both are right.
    text: "14607001771514", symbology: "I", modifiers: ["0", "1"], data: "14607001771514",
  },
  {
    id: "databar", name: "GS1 DataBar", group: "main", encoder: "databaromni",
    hint: "Компактный код весового товара. Часто выключен в сканере по умолчанию",
    // A GTIN of its own: converted to EAN-13 it must not read as the EAN-13 card.
    text: "(01)04601234567893", symbology: "e", modifiers: ["0"], data: "0104601234567893",
    alternatives: [
      {
        data: "04601234567893",
        note: "Сканер отрезает идентификатор применения (01) — стандарт GS1 требует передавать его.",
      },
      {
        symbology: "E", data: "4601234567893",
        note: "Сканер переводит DataBar в EAN-13. Товар найдётся, но тип штрихкода сохранится как " +
          "EAN-13.",
      },
    ],
  },
  {
    id: "codabar", name: "Codabar", group: "main", encoder: "rationalizedCodabar",
    hint: "Цифры — на бланках и в аптеках",
    text: "A40012345B", symbology: "F", modifiers: ["0"], data: "40012345",
    alternatives: [
      {
        data: "A40012345B",
        note: "Сканер передаёт стартовый и стоповый символы Codabar (A…B). Обычно их отключают: " +
          "в коде товара их нет.",
      },
      {
        data: "a40012345b",
        note: "Сканер передаёт стартовый и стоповый символы Codabar (a…b). Обычно их отключают: " +
          "в коде товара их нет.",
      },
    ],
  },
  {
    id: "qr", name: "QR-код", group: "main", encoder: "qrcode", matrix: true,
    hint: "Товарный QR: буквы в обоих регистрах, цифры и дефис",
    text: "RT-QR-7Hq2Lm9x", symbology: "Q", modifiers: ["1"], data: "RT-QR-7Hq2Lm9x",
  },
  {
    id: "receipt", name: "QR чека", group: "main", encoder: "qrcode", matrix: true,
    hint: "Как на чеке CashierApp: номер чека (UUID). Нужен в «Истории продаж»",
    text: "cc99375e-6be6-49b7-966f-3997967ebe4c", symbology: "Q", modifiers: ["1"],
    data: "cc99375e-6be6-49b7-966f-3997967ebe4c", caseInsensitive: true,
  },
  {
    id: "datamatrix", name: "Data Matrix", group: "main", encoder: "datamatrix", matrix: true,
    hint: "Квадратный код для маркировки",
    text: "RT-DM-5kP8wQ2", symbology: "d", modifiers: ["1"], data: "RT-DM-5kP8wQ2",
  },
  {
    id: "pdf417", name: "PDF417", group: "extra", encoder: "pdf417",
    hint: "Многострочный код — на документах и удостоверениях",
    // The three modifiers are three ECI conventions; none of them changes this data.
    text: "RT-PDF417-Zx81", symbology: "L", modifiers: ["0", "1", "2"], data: "RT-PDF417-Zx81",
  },
  {
    id: "aztec", name: "Aztec", group: "extra", encoder: "azteccode", matrix: true,
    hint: "Квадратный код — на билетах",
    text: "RT-AZ-3mN6", symbology: "z", modifiers: ["0"], data: "RT-AZ-3mN6",
  },
];

export const sampleById = (id: string) => SAMPLES.find((s) => s.id === id);

/** The identifier a scanner should send for `sample`: `]E0`. */
export const aimOf = (sample: Sample, modifier = sample.modifiers[0]) =>
  `]${sample.symbology}${modifier}`;

const SYMBOLOGY_NAMES: Record<string, string> = {
  E: "EAN/UPC", Q: "QR-код", d: "Data Matrix", A: "Code 39", C: "Code 128", I: "ITF",
  F: "Codabar", e: "GS1 DataBar", z: "Aztec", L: "PDF417",
};

/** The till's name for an identifier — `ScannedBarcode.SymbologyName` in CashierApp. */
export function symbologyName(symbology: string, modifier: string): string {
  if (symbology === "E" && modifier === "4") return "EAN-8";
  return SYMBOLOGY_NAMES[symbology] ?? `]${symbology}${modifier}`;
}
