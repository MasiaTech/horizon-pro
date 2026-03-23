import Link from "next/link";
import Logo from "@/components/Logo";
import { AppLegalFooter } from "@/components/AppLegalFooter";
import { Button } from "@/components/ui/button";
import { HomeDemoSummaryCards } from "@/components/HomeDemoSummaryCards";
import {
  TrendingUp,
  Target,
  Shield,
  BarChart3,
  Wallet,
  ArrowRight,
  Check,
  Zap,
  Users,
  Briefcase,
  Calculator,
} from "lucide-react";
import { SITE_URL } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Horizon — Budget et simulations financières",
  description:
    "Outil pour salariés, particuliers et freelances en France. Simulateur indicatif d'impôt sur le revenu, reste à investir, épargne et PEA. Revenus, dépenses et simulations dans un dashboard unique.",
  openGraph: {
    title: "Horizon — Simulations financières pour la France",
    description:
      "Simulateur indicatif d'impôt sur le revenu, reste à investir, épargne et PEA. Un dashboard pour visualiser des scenarios financiers en France.",
    url: SITE_URL,
  },
  alternates: { canonical: SITE_URL },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Horizon",
      url: SITE_URL,
      description:
        "Outil de simulation financière pour salariés, particuliers et freelances en France. Dashboard, simulateur indicatif d'impôt sur le revenu, épargne et PEA.",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#webapp`,
      name: "Horizon",
      url: SITE_URL,
      description:
        "Application web pour la France : simulation indicative d'impôt sur le revenu, visualisation du reste à investir, simulation épargne et scenarios PEA basés sur des hypothèses.",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    },
  ],
};

/**
 * Page d'accueil : landing axée sur la simulation et la visualisation financière.
 * Connexion / Inscription conservées dans la nav et en CTA.
 */
export default function HomePage() {
  return (
    <div className="min-h-[100dvh] bg-background sm:min-h-screen">
      {/* ----- Nav ----- */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo size={36} href="/" className="shrink-0" />
          {/* Mobile : un seul gros bouton Connexion / Inscription */}
          <div className="sm:hidden">
            <Button asChild size="lg" className="min-w-[180px]">
              <Link href="/login">Connexion / Inscription</Link>
            </Button>
          </div>
          {/* Desktop : Connexion + Inscription séparés */}
          <nav className="hidden items-center gap-3 sm:flex">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Connexion</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Inscription</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* ----- 1. Hero ----- */}
      <section className="relative border-b border-border/40 px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Reprenez le controle de votre budget et de vos projections.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
            Visualisez combien il vous reste vraiment à investir chaque mois.
          </p>
          <p className="mt-3 max-w-2xl mx-auto text-base text-muted-foreground/90">
            Pour salariés, particuliers et freelances en France. Horizon centralise
            vos revenus, vos dépenses, le simulateur d&apos;impôt sur le revenu, votre
            épargne et votre PEA pour vous aider à structurer vos scénarios financiers.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="text-base">
              <Link href="/register">
                Créer mon compte gratuitement
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/dashboard">Accéder à mon dashboard</Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="text-muted-foreground">
              <Link href="#comment-ca-marche">Voir une démo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ----- 2. Le problème ----- */}
      <section className="border-b border-border/40 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
            Le problème
          </h2>
          <p className="mt-6 text-center text-muted-foreground leading-relaxed">
            La plupart des gens suivent leurs dépenses.
            <br />
            Très peu savent combien ils peuvent potentiellement investir chaque
            mois.
            <br />
            Encore moins savent quand ils atteindront leurs objectifs.
          </p>
          <p className="mt-4 text-center text-sm text-muted-foreground/80">
            Les gens ne savent pas : combien ils dépensent vraiment, combien ils
            peuvent investir, combien de temps avant d&apos;atteindre leurs
            objectifs.
          </p>
        </div>
      </section>

      {/* ----- 3. Comment Horizon vous aide ----- */}
      <section
        id="comment-ca-marche"
        className="border-b border-border/40 px-4 py-16 sm:px-6"
      >
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
            Comment Horizon vous aide
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-card p-6 text-center shadow-sm">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Wallet className="size-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Revenus & Dépenses
              </h3>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>Revenus fixes ou variables</li>
                <li>Dépenses fixes, fourchettes ou %</li>
                <li>Sauvegarde automatique</li>
              </ul>
              <p className="mt-4 text-sm font-medium text-primary">
                Vous savez combien il vous reste chaque mois.
              </p>
            </div>
            <div className="rounded-xl bg-card p-6 text-center shadow-sm">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Calculator className="size-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Simulateur impôt sur le revenu
              </h3>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>Barème progressif à jour</li>
                <li>Estimation selon vos revenus indexés</li>
                <li>Informations indicatives et pistes générales</li>
              </ul>
              <p className="mt-4 text-sm font-medium text-primary">
                Anticipez votre impôt en France.
              </p>
            </div>
            <div className="rounded-xl bg-card p-6 text-center shadow-sm">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                <BarChart3 className="size-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Projection intelligente
              </h3>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>Simulation épargne (intérêts composés)</li>
                <li>Simulation PEA basée sur des hypothèses personnalisables</li>
                <li>Courbes brut / net</li>
              </ul>
              <p className="mt-4 text-sm font-medium text-primary">
                Vous visualisez des scénarios possibles.
              </p>
            </div>
            <div className="rounded-xl bg-card p-6 text-center shadow-sm">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Target className="size-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Objectifs concrets
              </h3>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>Épargne de précaution (6 mois)</li>
                <li>Simuler un objectif de 150 000 € sur le PEA</li>
                <li>Répartition Épargne / PEA</li>
              </ul>
              <p className="mt-4 text-sm font-medium text-primary">
                Chaque euro a une destination.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ----- 4. Ce que vous obtenez ----- */}
      <section className="border-b border-border/40 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
            Ce que vous obtenez
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Ce n&apos;est pas un simple tableur.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              "Dashboard synthétique clair",
              "Simulateur impôt sur le revenu (barème progressif France)",
              "Calcul automatique du reste à investir",
              "Répartition Épargne / PEA dynamique",
              "Simulation avancée intérêts composés",
              "Simulation PEA basée sur la fiscalité en vigueur (susceptible d'évolution)",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-lg bg-card py-3 px-4 shadow-sm"
              >
                <Check className="size-5 shrink-0 text-primary" />
                <span className="text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ----- 5. Visuels (avant crédibilité) ----- */}
      <section className="border-b border-border/40 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
            En un coup d&apos;œil
          </h2>
          <p className="mt-2 text-center text-muted-foreground">
            Courbes, répartition, reste à investir : tout est visuel.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-card p-4 shadow-sm">
              <div className="flex h-24 items-end justify-around gap-1 rounded-md bg-muted/30 px-2 py-2">
                {[20, 35, 28, 45, 55, 70, 65, 85, 80, 95].map((h, i) => (
                  <div
                    key={i}
                    className="w-2 flex-1 rounded-t bg-primary/70"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
                Courbe PEA → 150 k€
              </p>
            </div>
            <div className="rounded-xl bg-card p-4 shadow-sm">
              <div className="flex h-24 items-end justify-around gap-1 rounded-md bg-muted/30 px-2 py-2">
                {[15, 22, 32, 42, 55, 68, 78, 88, 95, 100].map((h, i) => (
                  <div
                    key={i}
                    className="w-2 flex-1 rounded-t bg-chart-2"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
                Épargne → objectif
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center justify-center">
              <div
                className="size-20 rounded-full"
                style={{
                  background: "conic-gradient(hsl(142, 60%, 42%) 0deg 144deg, hsl(210, 65%, 45%) 144deg 360deg)",
                }}
              />
              <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
                Répartition Épargne / PEA
              </p>
            </div>
            <div className="rounded-xl bg-card p-4 shadow-sm flex flex-col justify-center ring-1 ring-primary/30">
              <p className="text-xs font-medium text-muted-foreground">Reste à investir</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-primary">1 240 €</p>
              <p className="text-xs text-muted-foreground">chaque mois</p>
            </div>
          </div>
          <div className="mt-12">
            <p className="text-center text-sm font-medium text-muted-foreground mb-4">
              Aperçu des lignes Total placements (PEA, Épargne) — comme dans le dashboard
            </p>
            <HomeDemoSummaryCards />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Cliquez sur la flèche pour afficher ou masquer le détail.
            </p>
          </div>
        </div>
      </section>

      {/* ----- 6. Crédibilité ----- */}
      <section className="border-b border-border/40 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
            Même si vous débutez
          </h2>
          <p className="mt-2 text-center text-muted-foreground">
            Vos données sont protégées et privées.
          </p>
          <ul className="mt-8 flex flex-wrap justify-center gap-4">
            {[
              { icon: Shield, label: "Données sécurisées via Supabase" },
              { icon: Zap, label: "Authentification sécurisée" },
              { icon: Users, label: "Données privées par utilisateur" },
              { icon: Check, label: "Aucune donnée bancaire connectée" },
            ].map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-lg bg-card px-4 py-3 text-sm text-foreground shadow-sm"
              >
                <Icon className="size-4 shrink-0 text-primary" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ----- 7. À qui s'adresse Horizon ----- */}
      <section className="border-b border-border/40 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
            À qui s&apos;adresse Horizon ?
          </h2>
          <p className="mt-3 text-center text-muted-foreground">
            Un outil pensé pour la France : salariés, particuliers et freelances.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              { icon: Briefcase, text: "Freelances et indépendants" },
              { icon: TrendingUp, text: "Salariés qui veulent mieux visualiser leur investissement" },
              { icon: Users, text: "Particuliers qui gèrent leur budget" },
              { icon: BarChart3, text: "Tous ceux qui veulent structurer leurs scénarios financiers" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="size-5" />
                </div>
                <span className="font-medium text-foreground">{text}</span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-lg font-medium text-foreground">
            Dashboard, simulateur impôt et projections — pour construire votre
            vision budgétaire en France. Disponible sur{" "}
            <a href="https://mon-horizon.fr" className="text-primary underline hover:no-underline">
              mon-horizon.fr
            </a>
            .
          </p>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Horizon est un outil de simulation et d&apos;aide à la décision. Les informations
            fournies sont indicatives et non contractuelles. Elles ne constituent ni un conseil
            en investissement, ni un conseil fiscal. Les performances passées ou simulées ne
            préjugent pas des performances futures.
          </p>
        </div>
      </section>

      {/* ----- 8. CTA final ----- */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Commencez à structurer vos scénarios financiers dès aujourd&apos;hui.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="text-base">
              <Link href="/register">
                Créer mon compte gratuitement
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">J&apos;ai déjà un compte</Link>
            </Button>
          </div>
        </div>
      </section>

      <AppLegalFooter />

      {/* Données structurées SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
