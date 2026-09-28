"use client";

import { BookOpenText, Moon, ScanBarcode, ScanLine, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Проверка", icon: ScanLine, active: (path: string) => path === "/" },
  { href: "/manuals/", label: "Инструкции по настройке", icon: BookOpenText, active: (path: string) => path.startsWith("/manuals") },
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

/**
 * The site's sections, as tabs on the header's bottom edge.
 *
 * Deliberately nothing like a button: no fill, no outline — an underline under the current one, and
 * a row of their own. Beside the page's actions they read as another action.
 */
function SectionTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Разделы" className="flex min-w-0 gap-5 overflow-x-auto [scrollbar-width:none] sm:gap-6">
      {NAV.map(({ href, label, icon: Icon, active }) => {
        const current = active(path);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={cn(
              // -mb-px lays the underline over the header's own border.
              "-mb-px inline-flex h-11 shrink-0 items-center gap-2 border-b-2 text-[0.9375rem] font-medium outline-none",
              "transition-colors focus-visible:text-foreground focus-visible:underline",
              current
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
            )}
          >
            {/* Dropped on a phone, where the two labels only just fit beside the theme switch. */}
            <Icon className="hidden size-4 sm:block" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Brand and the page's own actions on top; the sections below, with the theme switch at their end. */
export function SiteHeader({ subtitle, children }: { subtitle: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="border-b bg-background print:hidden">
      {/* On a wide screen the brand gives way — its subtitle wraps — rather than the actions dropping a row. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 pt-3 pb-1 md:px-6 lg:flex-nowrap">
        <div className="flex min-w-0 items-center gap-3">
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
        {children && <div className="ms-auto flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
      </div>
      <div className="flex items-center gap-4 px-4 md:px-6">
        <SectionTabs />
        <div className="ms-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
