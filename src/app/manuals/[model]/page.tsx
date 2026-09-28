import { ChevronRight, ExternalLink, ScanLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StepList, StepNote } from "@/components/manual/step-list";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { manualById, MANUALS } from "@/lib/manuals";

interface Props {
  params: Promise<{ model: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return MANUALS.map((m) => ({ model: m.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const manual = manualById((await params).model);
  return { title: manual ? `${manual.name}: настройка` : "Инструкции по настройке" };
}

export default async function ManualPage({ params }: Props) {
  const manual = manualById((await params).model);
  if (!manual) notFound();

  return (
    <div className="min-h-dvh bg-muted/40">
      <SiteHeader subtitle="Настройка сканеров для CashierApp" />
      <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <nav aria-label="Путь" className="flex items-center gap-1 text-sm text-muted-foreground print:hidden">
          <Link href="/manuals/" className="hover:text-foreground">Инструкции по настройке</Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <span className="text-foreground">{manual.name}</span>
        </nav>
        <h1 className="text-2xl font-semibold">
          {manual.name} <span className="text-base font-normal text-muted-foreground">· {manual.connection}</span>
        </h1>

        <Card id="setup">
          <CardHeader>
            <CardTitle className="text-lg">Настройка</CardTitle>
            <CardDescription>
              {manual.before} Сканируйте коды по порядку, сверху вниз. После каждого сканер коротко пищит — печатать
              он ничего не должен.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StepList steps={manual.setup}>
              <StepNote n={manual.setup.length + 1} title="Проверьте">
                <p className="text-sm text-muted-foreground">
                  Отсканируйте основные коды на странице проверки. Все зелёные — сканер готов;
                  дополнительные читать не обязательно.
                </p>
                <Link href="/" className={buttonVariants({ variant: "outline" })}>
                  <ScanLine />
                  Открыть проверку
                </Link>
              </StepNote>
            </StepList>
          </CardContent>
        </Card>

        <Card id="reset">
          <CardHeader>
            <CardTitle className="text-lg">Если проверка не проходит</CardTitle>
            <CardDescription>Верните заводские настройки и настройте заново.</CardDescription>
          </CardHeader>
          <CardContent>
            <StepList steps={manual.reset}>
              <StepNote n={manual.reset.length + 1} title="Повторите настройку с первого шага">
                <a href="#setup" className={buttonVariants({ variant: "outline" })}>К настройке</a>
              </StepNote>
            </StepList>
          </CardContent>
        </Card>

        {manual.problems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Если сканер ничего не печатает</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {manual.problems.map((problem) => (
                <section key={problem.symptom} className="space-y-3">
                  <h2 className="font-medium">{problem.symptom}</h2>
                  <StepList steps={problem.steps} />
                </section>
              ))}
            </CardContent>
          </Card>
        )}

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          Коды — из руководства производителя:
          <a href={manual.docs.ru} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-3 hover:text-foreground">
            на русском <ExternalLink className="size-3.5" aria-hidden />
          </a>
          <a href={manual.docs.en} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-3 hover:text-foreground">
            на английском <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </p>
      </main>
    </div>
  );
}
