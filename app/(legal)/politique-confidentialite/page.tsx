import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité de Horizon : données collectées, finalités et droits utilisateurs.",
};

export default function PolitiqueConfidentialitePage() {
  return (
    <article>
      <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
        Politique de confidentialité
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Dernière mise à jour : 23 mars 2026.
      </p>

      <section className="mt-8 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-medium text-foreground">
          Données traitées
        </h2>
        <p>
          Horizon traite les données nécessaires au fonctionnement du compte et
          des fonctionnalités (authentification, données saisies dans
          l&apos;application, paramètres utilisateur).
        </p>
        <p>
          Nous appliquons un principe de minimisation : seules les données
          utiles au service sont collectées, et nous évitons les informations
          sans utilité opérationnelle.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-medium text-foreground">Finalités</h2>
        <p>
          Les données sont utilisées pour fournir le service, sécuriser
          l&apos;accès, sauvegarder vos informations et améliorer la stabilité
          de la plateforme.
        </p>
        <p>
          Certaines données peuvent aussi être exploitées de manière agrégée et
          anonymisée pour améliorer l&apos;ergonomie, la performance et la qualité
          globale de l&apos;application.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-medium text-foreground">
          Durée de conservation
        </h2>
        <p>
          Les données sont conservées pendant la durée de vie du compte, puis
          supprimées selon les contraintes techniques et légales applicables.
        </p>
        <p>
          Lorsque la suppression immédiate n&apos;est pas possible pour des raisons
          de sauvegarde technique, les données sont isolées puis purgées dans
          les cycles de rétention prévus.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-medium text-foreground">Vos droits</h2>
        <p>
          Conformément à la réglementation applicable (RGPD), vous disposez de
          droits d&apos;accès, de rectification et de suppression de vos
          données.
        </p>
        <p>
          Vous pouvez exercer ces droits en nous contactant via les coordonnées
          disponibles dans les mentions légales. Nous répondons dans les délais
          prévus par la réglementation.
        </p>
      </section>
    </article>
  );
}
