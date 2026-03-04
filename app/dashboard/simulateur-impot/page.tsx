"use client";

import { useState, useEffect } from "react";
import { useProfileContext } from "@/components/ProfileProvider";
import { getIncomeAmountForTax, type IncomeSource } from "@/lib/types";
import {
  getTaxBrackets,
  BAREME_META,
  computeIncomeTax,
  getTaxBreakdown,
  getOptimizationHints,
  getExtraGrossForNetGain,
  type TaxBracket,
} from "@/lib/impot";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

/**
 * Revenu annuel pris en compte : somme des revenus "indexé impôt" × 12.
 */
function getAnnualIncomeForTax(sources: IncomeSource[]): number {
  return (
    sources
      .filter((s) => s.taxIndexed === true)
      .reduce((sum, s) => sum + getIncomeAmountForTax(s), 0) * 12
  );
}

function formatEur(n: number): string {
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

const SLIDER_MAX = 200_000;

export default function SimulateurImpotPage() {
  const { incomeSources, loading } = useProfileContext();
  const annualIncome = getAnnualIncomeForTax(incomeSources);
  const result = computeIncomeTax(annualIncome);
  const hints = getOptimizationHints(annualIncome, result);
  const extraFor1000Net =
    hints.marginalNetPerEuro != null
      ? getExtraGrossForNetGain(annualIncome, 1000)
      : null;
  const [simulatedRevenue, setSimulatedRevenue] = useState(() =>
    Math.min(Math.max(0, Math.round(annualIncome)), SLIDER_MAX),
  );
  useEffect(() => {
    const clamped = Math.min(SLIDER_MAX, Math.max(0, Math.round(annualIncome)));
    setSimulatedRevenue((prev) => (prev === 0 && annualIncome > 0 ? clamped : prev));
  }, [annualIncome]);
  const simulatedResult = computeIncomeTax(simulatedRevenue);
  const simulatedNet = simulatedRevenue - simulatedResult.totalTax;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Simulateur impôt sur le revenu
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Barème {BAREME_META.annee} (revenus {BAREME_META.annee}). Les montants sont issus des revenus
          cochés « Indexé impôt » dans la page Revenus, multipliés par 12.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Calcul selon le barème progressif officiel : chaque tranche n&apos;est imposée qu&apos;à son taux sur la part du revenu qui la concerne. Source :{" "}
          <a
            href="https://impots.gouv.fr/particulier/questions/comment-calculer-mon-taux-dimposition-dapres-le-bareme-progressif-de-limpot"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            impots.gouv.fr — barème progressif
          </a>
          .
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Votre situation</CardTitle>
          <CardDescription>
            Revenu annuel pris en compte pour le barème (une part).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-2xl font-semibold tabular-nums">
            {formatEur(annualIncome)} €
            <span className="ml-2 text-base font-normal text-muted-foreground">
              / an
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Impôt estimé :{" "}
            <span className="font-medium text-foreground">
              {formatEur(result.totalTax)} €
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Vous êtes dans la tranche :{" "}
            <span className="font-medium text-foreground">
              {result.bracket.label} ({result.bracket.ratePercent} %)
            </span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Simulation</CardTitle>
          <CardDescription>
            Déplacez le curseur pour simuler un revenu annuel (0 à {formatEur(SLIDER_MAX)} €) et voir l&apos;impôt ainsi que le net restant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Revenu annuel simulé</span>
              <div className="flex items-center gap-2">
                {annualIncome > 0 && simulatedRevenue !== Math.round(annualIncome) && (
                  <span
                    className={`tabular-nums font-medium ${
                      simulatedRevenue > annualIncome
                        ? "text-primary"
                        : "text-destructive"
                    }`}
                  >
                    {simulatedRevenue > annualIncome ? "+" : ""}
                    {(
                      ((simulatedRevenue - annualIncome) / annualIncome) *
                      100
                    ).toFixed(1)}
                    % par rapport à votre revenu
                  </span>
                )}
                <span className="font-semibold tabular-nums">
                  {formatEur(simulatedRevenue)} €
                </span>
              </div>
            </div>
            <Slider
              value={[simulatedRevenue]}
              onValueChange={(v) =>
                setSimulatedRevenue(Math.min(SLIDER_MAX, Math.max(0, v[0] ?? annualIncome)))
              }
              min={0}
              max={SLIDER_MAX}
              step={500}
              className="w-full"
            />
          </div>
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
            <p className="font-medium text-foreground">
              Pourquoi ce n&apos;est pas {simulatedResult.bracket.ratePercent} % de {formatEur(simulatedRevenue)} € ?
            </p>
            <p className="mt-1 text-muted-foreground">
              En France l&apos;impôt est <strong>progressif par tranches</strong> : le taux affiché ({simulatedResult.bracket.ratePercent} %) s&apos;applique uniquement à la part du revenu <em>dans cette tranche</em>. Le reste est imposé aux taux des tranches en dessous (0 %, 11 %, 30 %…). Donc on ne multiplie jamais tout le revenu par {simulatedResult.bracket.ratePercent} %.
            </p>
          </div>
          <div className="grid gap-2 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Impôt à payer</p>
              <p className="text-lg font-semibold tabular-nums text-destructive">
                {formatEur(simulatedResult.totalTax)} €
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Il vous restera (net)</p>
              <p className="text-lg font-semibold tabular-nums text-primary">
                {formatEur(simulatedNet)} €
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Tranche d&apos;imposition (taux marginal)</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">
                {simulatedResult.bracket.ratePercent} %
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ce taux s&apos;applique uniquement à la part du revenu dans cette tranche, pas à l&apos;ensemble du revenu. Voir le détail ci-dessous.
              </p>
              {simulatedRevenue !== Math.round(annualIncome) &&
                result.bracket.ratePercent !== simulatedResult.bracket.ratePercent && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {simulatedResult.bracket.ratePercent > result.bracket.ratePercent
                      ? "Taux en hausse"
                      : "Taux en baisse"}{" "}
                    par rapport à votre situation actuelle ({result.bracket.ratePercent} %)
                  </p>
                )}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/10 p-4">
            <p className="mb-2 text-sm font-medium text-foreground">
              Détail du calcul pour {formatEur(simulatedRevenue)} €
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              L&apos;impôt est progressif : chaque tranche est imposée à son taux uniquement sur la part du revenu qui la concerne.
            </p>
            <ul className="space-y-1.5 text-xs">
              {getTaxBreakdown(simulatedRevenue).map((row, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
                  <span className="text-muted-foreground">
                    {formatEur(row.amountInBracket)} € dans la tranche {row.bracket.label} ({row.bracket.ratePercent} %) →
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatEur(row.taxInBracket)} €
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Total impôt :{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatEur(simulatedResult.totalTax)} €
              </span>
            </p>
          </div>
          {simulatedRevenue !== Math.round(annualIncome) && (
            <p className="text-xs text-muted-foreground">
              Votre revenu actuel : {formatEur(annualIncome)} € — Impôt actuel :{" "}
              {formatEur(result.totalTax)} € — Net actuel :{" "}
              {formatEur(annualIncome - result.totalTax)} €
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Optimisation</CardTitle>
          <CardDescription>
            Recommandations des experts en gestion financière : seuils d&apos;imposition et impact sur votre net.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hints.eurosToNextBracket != null &&
            hints.eurosToNextBracket > 0 &&
            hints.eurosToNextBracket <= 1000 &&
            hints.nextBracketLabel != null &&
            hints.nextBracketRatePercent != null && (
              <div className="rounded-lg border border-amber-500/60 bg-amber-500/10 p-4">
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  Attention
                </p>
                <p className="mt-1 text-sm text-foreground">
                  Pour{" "}
                  <span className="font-semibold tabular-nums">
                    {formatEur(hints.eurosToNextBracket)} €
                  </span>{" "}
                  de plus, vous passerez au palier « {hints.nextBracketLabel} » (taux marginal{" "}
                  {hints.nextBracketRatePercent} % sur la part au-dessus du seuil). Vous ne
                  perdrez pas d&apos;argent en gagnant plus (barème progressif), mais les experts
                  recommandent d&apos;anticiper ce seuil (épargne, défiscalisation, report de revenus).
                </p>
                {extraFor1000Net != null && (
                  <p className="mt-2 text-sm text-foreground">
                    Pour évoluer sans être perdant : pour 1 000 € net de plus par
                    an (calcul réel avec l&apos;impôt), visez environ{" "}
                    <span className="font-semibold tabular-nums">
                      {formatEur(extraFor1000Net.extraGross)} €
                    </span>{" "}
                    de brut en plus.
                  </p>
                )}
              </div>
            )}

          {hints.eurosAboveCurrentThreshold != null &&
            hints.eurosAboveCurrentThreshold > 0 &&
            hints.eurosAboveCurrentThreshold <= 1000 &&
            hints.netGainIfJustBelowThreshold != null &&
            hints.netGainIfJustBelowThreshold > 0 && (
              <div className="rounded-lg border border-primary/50 bg-primary/10 p-4">
                <p className="font-medium text-primary">
                  Opportunité
                </p>
                <p className="mt-1 text-sm text-foreground">
                  Pour seulement{" "}
                  <span className="font-semibold tabular-nums">
                    {formatEur(hints.eurosAboveCurrentThreshold)} €
                  </span>{" "}
                  de moins (ex. abattement, moins d&apos;heures), vous
                  repasseriez dans le palier en dessous (
                  {hints.prevBracketRatePercent != null
                    ? `${hints.prevBracketRatePercent} % au lieu de ${result.bracket.ratePercent} %`
                    : "taux inférieur"}
                  ). Vous paieriez{" "}
                  <span className="font-semibold tabular-nums">
                    {formatEur(hints.netGainIfJustBelowThreshold)} €
                  </span>{" "}
                  de moins d&apos;impôt, soit{" "}
                  <span className="font-semibold">
                    {formatEur(hints.netGainIfJustBelowThreshold)} € net en plus
                  </span>
                  . C&apos;est bien le gain réel (calcul par tranches).
                </p>
              </div>
            )}

          {extraFor1000Net != null && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="font-medium text-foreground">
                Pour gagner 1 000 € net de plus par an
              </p>
              <p className="mt-1 text-sm text-foreground">
                À{" "}
                <span className="font-semibold tabular-nums">
                  {formatEur(annualIncome)} €
                </span>{" "}
                de revenu annuel, il vous faudrait{" "}
                <span className="font-semibold tabular-nums">
                  {formatEur(extraFor1000Net.extraGross)} €
                </span>{" "}
                de brut en plus par an, soit environ{" "}
                <span className="font-semibold tabular-nums">
                  {(extraFor1000Net.extraGross / 12).toLocaleString("fr-FR", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}{" "}
                  €
                </span>{" "}
                par mois (calcul avec le barème progressif).
              </p>
            </div>
          )}

          {hints.eurosToNextBracket == null &&
            hints.eurosAboveCurrentThreshold == null &&
            hints.marginalNetPerEuro == null && (
              <p className="text-sm text-muted-foreground">
                Vous êtes dans le premier palier (0 %). Tout revenu supplémentaire
                sera imposé au palier supérieur (11 %).
              </p>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Barème progressif {BAREME_META.annee}</CardTitle>
          <CardDescription>
            {BAREME_META.label} (une part). La ligne rouge indique la tranche
            dans laquelle se situe votre revenu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[400px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">
                    Tranches de revenus
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    Taux d&apos;imposition
                  </th>
                </tr>
              </thead>
              <tbody>
                {getTaxBrackets().map((bracket, index) => (
                  <BracketRow
                    key={index}
                    bracket={bracket}
                    isActive={index === result.bracketIndex}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {incomeSources.filter((s) => s.taxIndexed === true).length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucun revenu n&apos;est actuellement indexé pour l&apos;impôt. Cochez
          « Indexé impôt » sur les lignes de la page Revenus pour les inclure
          ici.
        </p>
      )}
    </div>
  );
}

function BracketRow({
  bracket,
  isActive,
}: {
  bracket: TaxBracket;
  isActive: boolean;
}) {
  const label =
    bracket.max == null
      ? `Plus de ${formatEur(bracket.min - 1)} €`
      : bracket.min === 0
        ? `Jusqu'à ${formatEur(bracket.max)} €`
        : `De ${formatEur(bracket.min)} € à ${formatEur(bracket.max)} €`;

  return (
    <tr
      className={
        isActive
          ? "border-l-4 border-l-destructive bg-destructive/10"
          : "border-b border-border last:border-b-0"
      }
    >
      <td className="px-4 py-3 font-medium">{label}</td>
      <td className="px-4 py-3 text-right tabular-nums">
        {bracket.ratePercent} %
      </td>
    </tr>
  );
}
