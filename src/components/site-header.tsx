"use client";

import { BookOpenText, Moon, ScanBarcode, ScanLine, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Проверка", icon: ScanLine, active: (path: string) => path === "/" },
  { href: "/manuals/", label: "Инструкции", icon: BookOpenText, active: (path: string) => path.startsWith("/manuals") },
];

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

/** Brand, the two sections, and whatever the page wants beside them. */
export function SiteHeader({ subtitle, children }: { subtitle: React.ReactNode; children?: React.ReactNode }) {
  const path = usePathname();
  return (
    <header className="border-b bg-background print:hidden">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="На главную"
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"
          >
            <ScanBarcode className="size-5" aria-hidden />
          </Link>
          <div>
            <p className="text-lg leading-tight font-semibold">Проверка сканера штрихкодов</p>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <nav aria-label="Разделы" className="flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon, active }) => {
            const current = active(path);
            return (
              <Link
                key={href}
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium outline-none",
                  "hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                  current ? "bg-muted text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {children}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
