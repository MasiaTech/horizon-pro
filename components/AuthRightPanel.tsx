import Image from "next/image";
import { Target, TrendingUp, BarChart3 } from "lucide-react";

import demoDashboard from "@/resources/icons/demo-for-register-login.png";

/**
 * Panneau droit partagé pour les pages Connexion et Inscription.
 * 3 plans : 1) dégradé en arrière-plan, 2) image centrée (pas pleine page) avec fondu en bas, 3) texte en bas.
 * Caché sur mobile, affiché à droite sur desktop (layout 40% / 60%).
 */
export function AuthRightPanel() {
  return (
    <section
      className="relative hidden min-h-full overflow-hidden border-l border-border/50 md:block"
      style={{
        background:
          "linear-gradient(135deg, hsl(220 14% 8%) 0%, hsl(220 14% 5%) 50%, hsl(220 14% 4%) 100%)",
      }}
      aria-hidden
    >
      {/* Plan 2 : image au centre vertical et horizontal de la partie droite */}
      <div className="absolute inset-0 flex items-center justify-center px-2 lg:px-4">
        <div
          className="relative -translate-y-10 translate-x-40 h-full max-h-[60vh] w-full max-w-[70vw] min-w-[280px]"
          style={{
            maskImage:
              "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
          }}
        >
          <Image
            src={demoDashboard}
            alt="Aperçu du dashboard Horizon"
            fill
            className="object-contain object-center"
            priority
            sizes="(min-width: 768px) 70vw, 0"
          />
        </div>
      </div>

      {/* Plan 3 : texte en bas du panneau, centré horizontalement */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center px-6 pb-10 pt-4 lg:px-10 lg:pb-12 lg:pt-6">
        <div className="w-full max-w-xl space-y-5">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Votre liberté financière en un tableau de bord
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <TrendingUp className="size-4" />
              </span>
              <span>
                Revenus, dépenses et reste à investir — tout en un coup
                d&apos;œil.
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
      </div>
    </section>
  );
}
