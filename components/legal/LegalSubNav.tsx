"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales", short: "Mentions" },
  {
    href: "/conditions-utilisation",
    label: "Conditions d'utilisation",
    short: "CGU",
  },
  {
    href: "/politique-confidentialite",
    label: "Politique de confidentialité",
    short: "Confidentialité",
  },
  {
    href: "/avertissement-risques",
    label: "Avertissement risques",
    short: "Risques",
  },
] as const;

/**
 * Navigation entre les pages légales, avec état actif (style onglets reliés).
 */
export function LegalSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mt-6 w-full"
      aria-label="Pages légales Horizon"
    >
      <div className="flex flex-wrap gap-1 rounded-xl border border-border/80 bg-muted/30 p-1.5 shadow-sm">
        {LEGAL_LINKS.map(({ href, label, short }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex-1 min-w-[8rem] rounded-lg px-3 py-2.5 text-center text-sm font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              ].join(" ")}
              aria-current={active ? "page" : undefined}
            >
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{short}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
