import Link from "next/link";
import Logo from "@/components/Logo";

type AppLegalFooterProps = {
  containerClassName?: string;
};

/**
 * Footer légal réutilisable (disclaimer + liens d'accès et pages légales).
 */
export function AppLegalFooter({
  containerClassName = "max-w-6xl",
}: AppLegalFooterProps) {
  return (
    <footer className="border-t border-border/40 px-4 py-6 sm:px-6">
      <div className={`mx-auto flex flex-col gap-4 ${containerClassName}`}>
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 transition-opacity hover:opacity-90"
          >
            <Logo size={28} />
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Horizon
            </span>
          </Link>
          <p className="mt-3 text-xs text-muted-foreground sm:max-w-2xl">
            Investir comporte des risques, y compris un risque de perte en
            capital. Horizon fournit des simulations indicatives et non
            contractuelles, sans conseil en investissement ni conseil fiscal.
            L&apos;outil est actuellement 100 % gratuit.
          </p>
        </div>

        <hr className="border-border/60" />

        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">
            Connexion
          </Link>
          <Link href="/register" className="hover:text-foreground">
            Inscription
          </Link>
          <Link href="/mentions-legales" className="hover:text-foreground">
            Mentions légales
          </Link>
          <Link href="/conditions-utilisation" className="hover:text-foreground">
            CGU
          </Link>
          <Link
            href="/politique-confidentialite"
            className="hover:text-foreground"
          >
            Confidentialité
          </Link>
          <Link href="/avertissement-risques" className="hover:text-foreground">
            Risques
          </Link>
        </nav>
      </div>
    </footer>
  );
}
