"use client";

import { usePathname } from "next/navigation";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/revenus": "Revenus",
  "/dashboard/depenses": "Dépenses",
  "/dashboard/epargne": "Épargne",
  "/dashboard/pea": "PEA",
};

/**
 * Titre du header selon la route (Dashboard, Revenus, Dépenses).
 */
export default function DashboardHeader() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Dashboard";
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      <h1 className="text-base font-medium">{title}</h1>
    </header>
  );
}
