import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales",
  description:
    "Mentions légales de Horizon : informations éditeur, hébergement et contact.",
};

export default function MentionsLegalesPage() {
  return (
    <article>
      <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
        Mentions légales
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Dernière mise à jour : 23 mars 2026.
      </p>

      <section className="mt-8 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-medium text-foreground">Éditeur du site</h2>
        <p>Le site et l&apos;application Horizon sont édités par MASIATECH.</p>
        <p>
          Nom / raison sociale :{" "}
          <span className="text-foreground">MASIATECH</span>
          <br />
          Site web :{" "}
          <a
            href="https://tech.masia-antoine.fr/"
            className="text-primary underline hover:no-underline"
            target="_blank"
            rel="noreferrer"
          >
            tech.masia-antoine.fr
          </a>
          <br />
          SIRET : <span className="text-foreground">98422451900012</span>
          <br />
          NAF :{" "}
          <span className="text-foreground">
            6201Z - Programmation informatique
          </span>
        </p>
        <p>
          Ces informations sont communiquées afin d&apos;identifier l&apos;éditeur du
          service et de garantir la transparence sur l&apos;exploitant de la
          plateforme.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-medium text-foreground">Hébergement</h2>
        <p>
          Le service est hébergé par des prestataires techniques tiers
          (infrastructure web, base de données, authentification et services
          associés).
        </p>
        <p>
          Les choix d&apos;hébergement sont réalisés pour assurer la disponibilité,
          la sécurité et la continuité du service dans des conditions adaptées à
          un usage en ligne.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-medium text-foreground">
          Activité du service
        </h2>
        <p>
          Horizon est un outil de visualisation budgétaire et de simulation
          financière.
        </p>
        <p>
          Le service est actuellement proposé{" "}
          <strong className="text-foreground">100 % gratuit</strong>.
        </p>
        <p>
          Les informations affichées sur Horizon sont destinées à faciliter
          l&apos;analyse et la projection de vos finances personnelles, sans se
          substituer à une expertise personnalisée.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-medium text-foreground">
          Propriété intellectuelle
        </h2>
        <p>
          Les contenus (textes, interface, éléments graphiques, marque) sont
          protégés par le droit applicable. Toute reproduction non autorisée est
          interdite.
        </p>
        <p>
          Toute utilisation, adaptation ou diffusion des éléments protégés doit
          faire l&apos;objet d&apos;une autorisation préalable de l&apos;éditeur.
        </p>
      </section>
    </article>
  );
}
