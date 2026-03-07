"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Sur mobile : bouton menu pour ouvrir la sidebar. Pas de titre ni bordure.
 */
export default function DashboardHeader({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center bg-transparent px-3 sm:px-4 lg:px-6">
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
    </header>
  );
}
