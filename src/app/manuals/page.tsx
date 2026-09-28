import { ChevronRight, Usb, Wifi } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MANUALS } from "@/lib/manuals";

export const metadata: Metadata = { title: "Инструкции по настройке" };

const CODE_FORMS: Record<string, string> = { one: "код", few: "кода", many: "кодов" };
const codes = (n: number) => `${n} ${CODE_FORMS[new Intl.PluralRules("ru").select(n)] ?? "кода"}`;

export default function ManualsPage() {
  return (
    <div className="min-h-dvh bg-muted/40">
      <SiteHeader subtitle="Настройка сканеров для CashierApp" />
      <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Инструкции по настройке</h1>
          <p className="text-muted-foreground">
            Выберите модель сканера. Настройка — несколько кодов по порядку; если проверка не проходит — сброс
            к заводским настройкам и заново.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {MANUALS.map((manual) => {
            const Icon = manual.connection === "проводной" ? Usb : Wifi;
            return (
              <li key={manual.id}>
                <Link href={`/manuals/${manual.id}/`} className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  <Card className="transition-colors group-hover:bg-muted/60">
                    <CardHeader className="grid-cols-[auto_1fr_auto] items-center gap-x-3">
                      <Icon className="row-span-2 size-5 text-muted-foreground" aria-hidden />
                      <CardTitle className="text-base">{manual.name}</CardTitle>
                      <ChevronRight className="row-span-2 size-4 text-muted-foreground" aria-hidden />
                      <CardDescription>
                        {manual.connection}, {codes(manual.setup.length)}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted-foreground">
          Нет вашей модели — общие правила есть на странице <Link href="/" className="underline underline-offset-3 hover:text-foreground">проверки</Link>,
          в разделе «Как настроить сканер».
        </p>
      </main>
    </div>
  );
}
