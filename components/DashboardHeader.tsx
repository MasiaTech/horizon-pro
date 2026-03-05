"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/revenus": "Revenus",
  "/dashboard/depenses": "Dépenses",
  "/dashboard/epargne": "Épargne",
  "/dashboard/pea": "PEA",
  "/dashboard/parametres": "Paramètres",
  "/dashboard/simulateur-impot": "Simulateur impôt",
};

/**
 * Titre du header selon la route. Sur mobile : bouton menu à gauche pour ouvrir la sidebar.
 */
export default function DashboardHeader({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Dashboard";
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-4 lg:px-6">
      {onMenuClick && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          onClick={onMenuClick}
          aria-label="Ouvrir le menu"
        >
          <Menu className="size-5" />
        </Button>
      )}
      <h1 className="min-w-0 truncate text-base font-medium">{title}</h1>
    </header>
  );
}
