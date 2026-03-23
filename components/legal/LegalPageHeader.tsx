import Link from "next/link";
import Logo from "@/components/Logo";
import { LegalSubNav } from "@/components/legal/LegalSubNav";

export type LegalPageHeaderProps = {
  /** Texte sous le nom Horizon (défaut : informations légales) */
  subtitle?: string;
  /** Libellé du lien retour (défaut : Retour à l'accueil) */
  backLabel?: string;
};

/**
 * En-tête commun aux pages légales : logo Horizon, retour accueil, navigation entre les pages.
 * Réutilisable depuis le layout ou directement dans une page.
 */
export function LegalPageHeader({
  subtitle = "Informations légales",
  backLabel = "Retour à l'accueil",
}: LegalPageHeaderProps) {
  return (
    <header className="border-b border-border/50 bg-card/40 backdrop-blur-sm">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <Logo size={44} />
            <div className="flex flex-col">
              <span className="text-lg font-semibold tracking-tight text-foreground">
                Horizon
              </span>
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            </div>
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            ← {backLabel}
          </Link>
        </div>
        <LegalSubNav />
      </div>
    </header>
  );
}
