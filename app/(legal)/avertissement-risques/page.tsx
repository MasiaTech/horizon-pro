import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Avertissement risques",
  description:
    "Avertissement sur les risques financiers et limites des simulations Horizon.",
};

export default function AvertissementRisquesPage() {
  return (
    <article>
      <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
        Avertissement risques
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Investir comporte des risques, y compris un risque de perte en capital.
      </p>

      <section className="mt-8 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-medium text-foreground">
          Nature des informations
        </h2>
        <p>
          Les informations et simulations fournies par Horizon sont indicatives et
          non contractuelles.
        </p>
        <p>
          Elles ont une finalité pédagogique et de pilotage personnel : elles
          visent à éclairer vos choix, sans constituer un engagement de résultat
          ni une promesse de performance.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-medium text-foreground">
          Absence de conseil
        </h2>
        <p>
          Horizon ne fournit ni conseil en investissement, ni conseil fiscal, ni
          recommandation personnalisée.
        </p>
        <p>
          Les contenus ne remplacent pas l&apos;avis d&apos;un professionnel habilité
          (conseiller financier, expert-comptable, avocat fiscaliste) lorsque
          votre situation nécessite un accompagnement spécifique.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-medium text-foreground">Hypothèses</h2>
        <p>
          Les projections reposent sur des hypothèses modifiables (marché, fiscalité,
          rendement, horizon temporel). Elles peuvent s&apos;écarter de la réalité.
        </p>
        <p>
          Un changement de contexte économique, de cadre réglementaire ou de
          comportement d&apos;épargne peut modifier sensiblement les résultats
          attendus.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-medium text-foreground">Performances</h2>
        <p>
          Les performances passées ou simulées ne préjugent pas des performances
          futures.
        </p>
        <p>
          Avant toute décision importante, il est recommandé de multiplier les
          scénarios, de vérifier vos hypothèses et d&apos;adapter vos choix à votre
          profil de risque.
        </p>
      </section>
    </article>
  );
}
