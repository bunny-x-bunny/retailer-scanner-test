/**
 * Step-by-step setup for each scanner model: scan these codes, in this order, and the scanner passes
 * every card in the test page's main set. The optional cards (GS1 DataBar, Codabar, PDF417, Aztec)
 * are not required, and their switches are left out on purpose — Codabar, DataBar and Aztec are off
 * from the factory on both Netum models.
 *
 * The codes are the manufacturer's own images, kept as they are in `public/manuals/<model>/`, named
 * as the manual names them. `payload` is what each one decodes to — not shown to anyone, but
 * `manuals.test.ts` decodes every image and checks it against this, so an image cannot be swapped for
 * the wrong command unnoticed.
 *
 * The only setting that differs from the factory defaults is AIM ID. The keyboard layout and the
 * Enter suffix are set explicitly all the same: both are defaults, but a scanner that has been in
 * other hands may have lost them, and each costs one scan.
 */

export interface ConfigCode {
  /** Path under `public/`. */
  file: string;
  /** What the barcode says. Netum's engine codes are bare digits; its own commands look like `%#IFSNO$B`. */
  payload: string;
  width: number;
  height: number;
}

export interface Step {
  title: string;
  detail?: string;
  code: ConfigCode;
}

export interface Problem {
  /** What the technician sees. */
  symptom: string;
  steps: Step[];
}

export interface Manual {
  id: string;
  name: string;
  connection: "проводной" | "беспроводной";
  /** The manufacturer's manual. */
  docs: { ru: string; en: string };
  /** Before the first code: plugging in, pairing. */
  before?: string;
  setup: Step[];
  /** Back to the factory state; the setup is then repeated from the top. */
  reset: Step[];
  problems: Problem[];
}

const code = (model: string, name: string, payload: string, width = 606, height = 237): ConfigCode =>
  ({ file: `manuals/${model}/${name}.png`, payload, width, height });

// The decoding engine both models share — the same codes, byte for byte, in both manuals.
function engineSteps(model: string): Step[] {
  return [
    {
      title: "AIM ID перед кодом",
      detail: "Сканер будет добавлять ]cm перед каждым кодом — по нему CashierApp узнаёт скан и тип штрихкода.",
      code: code(model, "2051701", "2051701"),
    },
    {
      title: "Enter после кода",
      detail: "Один Enter (CR), без Tab и перевода строки. С завода так и есть — код на случай, если меняли.",
      code: code(model, "3030052", "3030052"),
    },
  ];
}

const L8_PAIRING: Step = {
  title: "Привязка к приёмнику",
  detail: "Выньте приёмник из USB и отсканируйте код — сканер начнёт часто пищать. Вставьте приёмник обратно: " +
    "писк прекратится, привязка готова.",
  code: code("netum-l8", "24RF23CH02", "$RF#CH02", 715),
};

export const MANUALS: readonly Manual[] = [
  {
    id: "netum-l5",
    name: "Netum L5",
    connection: "проводной",
    docs: { ru: "https://212.scandocs.net/L5/ru/", en: "https://212.scandocs.net/L5/en/" },
    before: "Подключите сканер к кассе USB-кабелем.",
    setup: [
      {
        title: "Клавиатура — США",
        detail: "Это раскладка, которую изображает сканер. Раскладку Windows менять не нужно: CashierApp " +
          "читает клавиши, а не буквы, и работает и на русской.",
        code: code("netum-l5", "6060101", "6060101"),
      },
      ...engineSteps("netum-l5"),
    ],
    reset: [
      {
        title: "Заводские настройки",
        detail: "Стирает всё, что настраивали раньше.",
        code: code("netum-l5", "303FFF0", "303FFF0", 716),
      },
    ],
    problems: [],
  },
  {
    id: "netum-l8",
    name: "Netum L8",
    connection: "беспроводной",
    docs: { ru: "https://doc1.scandocs.net/L8/ru/", en: "https://doc1.scandocs.net/L8/en/" },
    before: "Вставьте приёмник сканера в USB кассы.",
    setup: [
      {
        title: "Клавиатура — США",
        detail: "Это раскладка, которую изображает сканер. Раскладку Windows менять не нужно: CashierApp " +
          "читает клавиши, а не буквы, и работает и на русской.",
        code: code("netum-l8", "24LAN23EN", "$LAN#EN", 660),
      },
      ...engineSteps("netum-l8"),
    ],
    reset: [
      {
        title: "Заводские настройки",
        detail: "Стирает всё, что настраивали раньше, и возвращает работу через приёмник.",
        code: code("netum-l8", "2523IFSNO24B", "%#IFSNO$B", 770),
      },
      { ...L8_PAIRING, detail: `Только если после сброса сканер пищит трижды и ничего не печатает. ${L8_PAIRING.detail}` },
    ],
    problems: [
      { symptom: "Пищит трижды и ничего не печатает", steps: [L8_PAIRING] },
      {
        symptom: "Пищит один раз и ничего не печатает",
        steps: [{
          title: "Обычный режим",
          detail: "Сканер копил коды в памяти, а не отправлял. После этого кода — снова отправляет сразу.",
          code: code("netum-l8", "2523NORMD", "%#NORMD", 660),
        }],
      },
    ],
  },
];

export const manualById = (id: string) => MANUALS.find((m) => m.id === id);

/** Every code a manual shows, once each. */
export function codesOf(manual: Manual): ConfigCode[] {
  const all = [...manual.setup, ...manual.reset, ...manual.problems.flatMap((p) => p.steps)].map((s) => s.code);
  return [...new Map(all.map((c) => [c.file, c])).values()];
}
