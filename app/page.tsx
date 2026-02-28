import Link from "next/link";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { SITE_URL } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Horizon — Liberté financière et stratégie d'investissement",
  description:
    "Prenez le contrôle de votre liberté financière. Visualisez combien il vous reste à investir chaque mois. Revenus, dépenses, épargne, PEA : un dashboard pour transformer votre budget en stratégie.",
  openGraph: {
    title: "Horizon — Prenez le contrôle de votre liberté financière",
    description:
      "Visualisez combien il vous reste à investir chaque mois. Revenus, dépenses, épargne et PEA en un seul dashboard.",
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
        "Dashboard stratégique vers l'indépendance financière. Revenus, dépenses, épargne et PEA centralisés.",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#webapp`,
      name: "Horizon",
      url: SITE_URL,
      description:
        "Application web pour visualiser son reste à investir, simuler l'épargne avec intérêts composés et projeter son PEA jusqu'à 150 000 €.",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    },
  ],
};

/**
 * Page d'accueil : landing positionnée sur la liberté financière et la stratégie d'investissement.
 * Connexion / Inscription conservées dans la nav et en CTA.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ----- Nav ----- */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo size={36} href="/" className="shrink-0" />
          <nav className="flex items-center gap-3">
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
            Prenez le contrôle de votre liberté financière.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
            Visualisez combien il vous reste vraiment à investir chaque mois.
          </p>
          <p className="mt-3 max-w-2xl mx-auto text-base text-muted-foreground/90">
            Horizon centralise vos revenus, vos dépenses, votre épargne et votre
            PEA pour transformer votre budget en stratégie d&apos;investissement.
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
            Très peu savent combien ils peuvent investir intelligemment chaque
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
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Wallet className="size-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Revenus & Dépenses maîtrisés
              </h3>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>Revenus fixes ou variables</li>
                <li>Dépenses fixes, fourchettes ou % dynamiques</li>
                <li>Sauvegarde automatique</li>
              </ul>
              <p className="mt-4 text-sm font-medium text-primary">
                Vous savez exactement combien il vous reste chaque mois.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                <BarChart3 className="size-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Projection intelligente
              </h3>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>Simulation épargne avec intérêts composés</li>
                <li>Projection PEA avec dividendes + ROE</li>
                <li>Courbes brut / net</li>
                <li>Temps avant plafond</li>
              </ul>
              <p className="mt-4 text-sm font-medium text-primary">
                Vous ne suivez pas le passé. Vous projetez l&apos;avenir.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Target className="size-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Objectifs concrets
              </h3>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>Épargne de précaution (6 mois de dépenses)</li>
                <li>Atteindre les 150 000 € du PEA</li>
                <li>Répartition stratégique automatique</li>
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
              "Calcul automatique du reste à investir",
              "Répartition Épargne / PEA dynamique",
              "Simulation avancée intérêts composés",
              "Projection fiscale réaliste PEA (17,2 %)",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/50 py-3 px-4"
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
            <div className="rounded-xl border border-border bg-card p-4">
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
            <div className="rounded-xl border border-border bg-card p-4">
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
            <div className="rounded-xl border-2 border-primary/40 bg-primary/10 p-4 flex flex-col justify-center">
              <p className="text-xs font-medium text-muted-foreground">Reste à investir</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-primary">1 240 €</p>
              <p className="text-xs text-muted-foreground">chaque mois</p>
            </div>
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
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground"
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
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              { icon: Briefcase, text: "Indépendants / freelances" },
              { icon: TrendingUp, text: "Salariés qui veulent investir intelligemment" },
              { icon: Target, text: "Personnes qui visent l'indépendance financière" },
              { icon: BarChart3, text: "Ceux qui veulent comprendre leur vrai cashflow" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="size-5" />
                </div>
                <span className="font-medium text-foreground">{text}</span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-lg font-medium text-foreground">
            Dashboard stratégique vers l&apos;indépendance financière — pas une
            simple application de gestion de budget.
          </p>
        </div>
      </section>

      {/* ----- 8. CTA final ----- */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Commencez à construire votre liberté financière aujourd&apos;hui.
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

      {/* Footer minimal ----- */}
      <footer className="border-t border-border/40 px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Logo size={28} href="/" />
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">Connexion</Link>
            <Link href="/register" className="hover:text-foreground">Inscription</Link>
          </nav>
        </div>
      </footer>

      {/* Données structurées SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
