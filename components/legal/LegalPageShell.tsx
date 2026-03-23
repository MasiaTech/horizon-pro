import type { ReactNode } from "react";
import { AppLegalFooter } from "@/components/AppLegalFooter";
import type { LegalPageHeaderProps } from "@/components/legal/LegalPageHeader";
import { LegalPageHeader } from "@/components/legal/LegalPageHeader";

type LegalPageShellProps = {
  children: ReactNode;
} & LegalPageHeaderProps;

/**
 * Conteneur page légale : fond plein hauteur + en-tête réutilisable + zone principale.
 * À utiliser dans le layout du groupe (legal) ou, si besoin, au début d’une page isolée.
 */
export function LegalPageShell({
  children,
  ...headerProps
}: LegalPageShellProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <LegalPageHeader {...headerProps} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        {children}
      </main>
      <AppLegalFooter containerClassName="max-w-4xl" />
    </div>
  );
}
