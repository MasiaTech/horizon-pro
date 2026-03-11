import { Target, TrendingUp, BarChart3 } from "lucide-react";

/**
 * Panneau droit partagé pour les pages Connexion et Inscription.
 * Caché sur mobile, affiché à droite sur desktop (layout 40% / 60%).
 */
export function AuthRightPanel() {
  return (
    <section
      className="hidden border-l border-border/50 bg-gradient-to-br from-primary/10 via-card to-primary/5 md:flex md:flex-col md:justify-center md:px-8 md:py-12 lg:px-12"
      aria-hidden
    >
      <div className="mx-auto max-w-sm space-y-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Votre liberté financière en un tableau de bord
        </h2>
        <ul className="space-y-4 text-sm text-muted-foreground">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <TrendingUp className="size-4" />
            </span>
            <span>
              Revenus, dépenses et reste à investir — tout en un coup d&apos;œil.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <BarChart3 className="size-4" />
            </span>
            <span>
              Simulateur d&apos;impôt et projection PEA pour anticiper.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Target className="size-4" />
            </span>
            <span>
              Objectifs clairs : épargne de précaution, 150 k€ en PEA.
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}
