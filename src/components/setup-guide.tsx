import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

const STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Режим USB-клавиатуры, раскладка US English",
    body: (
      <>
        Сканер должен работать как USB-клавиатура (USB HID Keyboard) и «нажимать» клавиши английской
        раскладки. CashierApp читает клавиши, а не символы, поэтому русская раскладка Windows ему не
        мешает, — но сканер, настроенный на другую страну, нажмёт не те клавиши.
      </>
    ),
  },
  {
    title: "Префикс — только AIM ID",
    body: (
      <>
        Включите передачу AIM ID (он же Symbology Identifier, AIM Code ID): три символа{" "}
        <Kbd className="font-mono">]cm</Kbd> перед кодом — флаг, буква символики и цифра-модификатор.
        По ним CashierApp узнаёт, что это скан, и тип штрихкода. Других префиксов быть не должно: ни
        своих символов, ни Code ID производителя.
      </>
    ),
  },
  {
    title: "Суффикс — только Enter",
    body: (
      <>
        После кода — один <Kbd>Enter</Kbd> (CR). Не Tab и не CR+LF: второй Enter нажмёт кнопку на
        экране кассы.
      </>
    ),
  },
  {
    title: "Без Alt-кодов и управляющих символов",
    body: (
      <>
        Режим «Emulate ALT+Keypad» выключен: CashierApp не видит символы, набранные Alt-кодами. Разделитель
        GS в кодах GS1 сканер передаёт как <Kbd>Ctrl+]</Kbd> — CashierApp примет его за начало нового скана.
      </>
    ),
  },
  {
    title: "Регистр — как в коде",
    body: (
      <>
        Без «всё заглавными» и «инвертировать регистр»; Caps Lock на кассе выключен. CashierApp ищет товар
        с учётом регистра.
      </>
    ),
  },
  {
    title: "Без задержки между символами",
    body: <>CashierApp ждёт Enter не дольше 2 секунд после «]». Задержку между символами оставьте нулевой.</>,
  },
  {
    title: "Включены нужные символики",
    body: (
      <>
        EAN/UPC, Code 128, Code 39, ITF, GS1 DataBar, Codabar, QR-код и Data Matrix. DataBar и Codabar у
        многих сканеров выключены по умолчанию — если код «не читается», начните с этого.
      </>
    ),
  },
  {
    title: "Лазерный сканер — только с бумаги",
    body: (
      <>
        Лазерные сканеры не читают с экрана: для них есть «Печать листа». Имиджерам поможет яркость экрана на
        максимуме и размер кода побольше.
      </>
    ),
  },
];

export function SetupGuide({ className }: { className?: string }) {
  return (
    <Card className={cn("print:hidden", className)}>
      <CardHeader>
        <CardTitle>Как настроить сканер для CashierApp</CardTitle>
        <CardDescription>
          В коде CashierApp принимает только латинские буквы, цифры и дефис, не короче 4 символов. Коды на этой
          странице подобраны под это правило, так что ошибка здесь — это настройка сканера, а не код.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion multiple>
          {STEPS.map((step, i) => (
            <AccordionItem key={step.title} value={step.title}>
              <AccordionTrigger>
                <span>
                  <span className="me-2 text-muted-foreground tabular-nums">{i + 1}.</span>
                  {step.title}
                </span>
              </AccordionTrigger>
              <AccordionContent className="max-w-3xl text-muted-foreground">{step.body}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
