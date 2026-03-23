import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description:
    "Conditions d'utilisation de Horizon, outil de simulation financière 100 % gratuit.",
};

export default function ConditionsUtilisationPage() {
  return (
    <article>
      <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
        Conditions d&apos;utilisation
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Dernière mise à jour : 23 mars 2026.
      </p>

      <section className="mt-8 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-medium text-foreground">Objet</h2>
        <p>
          Horizon met à disposition un outil de simulation et d&apos;aide à la
          décision pour la gestion budgétaire et la visualisation de scénarios.
        </p>
        <p>
          L&apos;objectif du service est de vous permettre de mieux comprendre vos
          flux financiers, de tester plusieurs hypothèses et de structurer vos
          décisions de manière plus lisible au quotidien.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-medium text-foreground">
          Accès au service
        </h2>
        <p>
          L&apos;accès au service peut nécessiter la création d&apos;un compte.
          Vous vous engagez à fournir des informations exactes et à conserver la
          confidentialité de vos identifiants.
        </p>
        <p>
          Vous êtes responsable des actions réalisées depuis votre compte. En cas
          de suspicion d&apos;accès non autorisé, il est recommandé de modifier votre
          mot de passe rapidement et de contacter le support.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-medium text-foreground">Gratuité</h2>
        <p>
          Le service est actuellement proposé{" "}
          <strong className="text-foreground">100 % gratuit</strong>.
        </p>
        <p>
          Aucun achat n&apos;est requis pour l&apos;utilisation des
          fonctionnalités disponibles à ce jour.
        </p>
        <p>
          Le modèle économique peut évoluer dans le futur. En cas d&apos;évolution
          vers des options payantes, les conditions applicables seront précisées
          de façon transparente avant toute souscription.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-medium text-foreground">Limitation</h2>
        <p>
          Les résultats fournis sont indicatifs, fondés sur vos données et des
          hypothèses paramétrables. Ils ne constituent pas une garantie de
          résultat.
        </p>
        <p>
          Horizon est un outil d&apos;aide à la décision et non un service de
          conseil personnalisé. Vous restez seul décisionnaire de vos choix
          financiers, fiscaux et patrimoniaux.
        </p>
      </section>
    </article>
  );
}
