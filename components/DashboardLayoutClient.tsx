"use client";

import { useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { DashboardSidebarContent } from "@/components/DashboardSidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

/**
 * Layout client du dashboard : sidebar (cachée sur mobile), Sheet menu mobile, header avec bouton menu.
 */
export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <DashboardHeader onMenuClick={() => setMobileMenuOpen(true)} />
          <main className="min-h-0 flex-1 overflow-auto">{children}</main>
        </div>
      </div>
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="flex h-full w-56 flex-col gap-0 p-0"
          aria-describedby={undefined}
        >
          <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fermer le menu"
          >
            <X className="size-5" />
          </Button>
          <div className="flex h-full flex-col pt-10">
            <DashboardSidebarContent onLinkClick={() => setMobileMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
