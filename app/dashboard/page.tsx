"use client";

import { useEffect, useRef, useState } from "react";
import { PiggyBank, TrendingUp } from "lucide-react";
import { SummaryCardRow } from "@/components/SummaryCardRow";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PlacementAllocation } from "@/lib/types";
import {
  getExpenseAmount,
  getIncomeAmount,
  getIncomeAmountForTax,
  getPEAHoldingValue,
} from "@/lib/types";
import { BAREME_META } from "@/lib/impot";
import { useProfileContext } from "@/components/ProfileProvider";
import { DashboardCard } from "@/components/DashboardCard";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard : synthèse (Total revenu, Total dépense, Reste à investir, Placements).
 * Configuration détaillée des revenus et dépenses sur les pages dédiées.
 */
export default function DashboardPage() {
  const {
    loading,
    incomeSources,
    expenseCategories,
    incomeGroupNames,
    expenseGroupNames,
    placementAllocation,
    setPlacementAllocation,
    savingsAccounts,
    peaActions,
    peaEtfs,
    saveProfile,
    skipNextAutoSave,
    autoSaveDelayMs,
  } = useProfileContext();

  /** Solde PEA = somme des lignes Actions + ETF */
  const peaTotal =
    peaActions.reduce((s, h) => s + getPEAHoldingValue(h), 0) +
    peaEtfs.reduce((s, h) => s + getPEAHoldingValue(h), 0);

  /** Total épargne = somme des soldes actuels des comptes */
  const epargneTotal = savingsAccounts.reduce(
    (s, acc) => s + (Number(acc.currentBalance) || 0),
    0,
  );

  /** Total placements = PEA + Épargne */
  const totalPlacements = peaTotal + epargneTotal;

  /** Données pour le graphique PEA vs Épargne */
  const peaEpargneChartData = [
    {
      name: "PEA",
      value: Math.round(peaTotal * 100) / 100,
      color: "hsl(142, 60%, 42%)",
    },
    {
      name: "Épargne",
      value: Math.round(epargneTotal * 100) / 100,
      color: "hsl(210, 65%, 45%)",
    },
  ].filter((d) => d.value > 0);

  const dataRef = useRef({ placementAllocation });
  dataRef.current.placementAllocation = placementAllocation;

  const [peaExpandedActions, setPeaExpandedActions] = useState(false);
  const [peaExpandedEtfs, setPeaExpandedEtfs] = useState(false);

  const totalIncome = incomeSources.reduce(
    (sum, s) => sum + getIncomeAmount(s),
    0,
  );
  const totalExpenses = expenseCategories.reduce(
    (sum, c) =>
      sum + getExpenseAmount(c, totalIncome, incomeSources, incomeGroupNames),
    0,
  );
  const resteAInvestir = totalIncome - totalExpenses;

  /** Au moins une ligne de revenu indexée pour l'impôt → afficher card et menu Simulateur impôt */
  const showSimulateurImpot = incomeSources.some((s) => s.taxIndexed === true);
  const annualIncomeForTax =
    incomeSources
      .filter((s) => s.taxIndexed === true)
      .reduce((sum, s) => sum + getIncomeAmountForTax(s), 0) * 12;

  /** Cartes Placements / PEA / Épargne actives (contenu cliquable) seulement si revenus et dépenses > 0 et reste à investir > 0 */
  const showPlacementsCards =
    totalIncome > 0 && totalExpenses > 0 && resteAInvestir > 0;
  const placementConditionMessage =
    "Sera disponible lorsque vous aurez saisi revenus et dépenses et que le reste à investir est positif.";

  /** Détail par catégorie de revenus */
  const incomeByGroup = incomeGroupNames.map((groupName) => ({
    groupName,
    amount: incomeSources
      .filter((s) => (s.group ?? incomeGroupNames[0]) === groupName)
      .reduce((sum, s) => sum + getIncomeAmount(s), 0),
  }));

  /** Détail par catégorie de dépenses */
  const expensesByGroup = expenseGroupNames.map((groupName) => ({
    groupName,
    amount: expenseCategories
      .filter((c) => (c.group ?? expenseGroupNames[0]) === groupName)
      .reduce(
        (sum, c) =>
          sum +
          getExpenseAmount(c, totalIncome, incomeSources, incomeGroupNames),
        0,
      ),
  }));

  useEffect(() => {
    if (loading) return;
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }
    const timeoutId = setTimeout(() => {
      saveProfile({
        placement_allocation: dataRef.current.placementAllocation,
      });
    }, autoSaveDelayMs);
    return () => clearTimeout(timeoutId);
  }, [
    loading,
    placementAllocation,
    saveProfile,
    skipNextAutoSave,
    autoSaveDelayMs,
  ]);

  /** Sauvegarde au refresh/fermeture même si l'utilisateur n'a pas quitté l'input */
  useEffect(() => {
    const flush = () => {
      const payload = JSON.stringify({
        placement_allocation: dataRef.current.placementAllocation,
      });
      navigator.sendBeacon(
        "/api/profile/save",
        new Blob([payload], { type: "application/json" }),
      );
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  const updatePlacementPercentage = (index: number, value: number) => {
    const pct = Math.max(0, Math.min(100, value));
    setPlacementAllocation((prev) => {
      const next = prev.map((item, i) =>
        i === index ? { ...item, percentage: pct } : { ...item },
      );
      const lastIndex = next.length - 1;
      // Quand on modifie le dernier (ex. PEA), on réajuste le premier (ex. Épargne) ; sinon on réajuste le dernier.
      const adjustedIndex = index === lastIndex ? 0 : lastIndex;
      const sumExceptAdjusted = next.reduce(
        (s, item, i) => (i === adjustedIndex ? s : s + item.percentage),
        0,
      );
      const remainder = Math.max(
        0,
        Math.min(100, Math.round((100 - sumExceptAdjusted) * 100) / 100),
      );
      return next.map((item, i) =>
        i === adjustedIndex ? { ...item, percentage: remainder } : item,
      );
    });
  };

  const placementTotal = placementAllocation.reduce(
    (s, p) => s + (p.percentage || 0),
    0,
  );

  if (loading) {
    return (
      <div className="min-h-full w-full p-4 sm:p-6">
        <div className="grid gap-6 lg:gap-8 lg:grid-cols-2 lg:items-stretch [&>*]:min-h-0 [&>*]:lg:h-full">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card
              key={i}
              className="min-h-[18rem] flex flex-col"
            >
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-40 rounded bg-muted" />
                <Skeleton className="mt-2 h-4 w-full max-w-[280px] rounded bg-muted" />
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <Skeleton className="h-9 w-32 rounded bg-muted" />
                <div className="space-y-2 border-t border-border pt-3">
                  <Skeleton className="h-4 w-full rounded bg-muted" />
                  <Skeleton className="h-4 w-4/5 rounded bg-muted" />
                  <Skeleton className="h-4 w-3/5 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full p-4 sm:p-6">
      <div className="grid gap-6 lg:gap-8 lg:grid-cols-2 lg:items-stretch [&>*]:min-h-0 [&>*]:lg:h-full">
        <DashboardCard
          title="Total revenus"
          description="Somme de toutes vos sources de revenus (configurées dans Revenus)."
          iconSrc="/resources/icons/revenus.png"
          iconPriority
          linkHref="/dashboard/revenus"
          linkLabel="Revenus"
        >
          <p className="text-3xl font-bold tabular-nums text-white">
            {totalIncome.toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            €
          </p>
          {incomeByGroup.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              {incomeByGroup.map(({ groupName, amount }) => (
                <li key={groupName} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{groupName}</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {amount.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    €
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard
          title="Total dépenses"
          description="Somme de toutes vos dépenses (configurées dans Dépenses)."
          iconSrc="/resources/icons/depenses.png"
          linkHref={totalIncome > 0 ? "/dashboard/depenses" : undefined}
          linkLabel={totalIncome > 0 ? "Dépenses" : undefined}
        >
          {totalIncome > 0 ? (
            <>
              <p className="text-3xl font-bold tabular-nums text-white">
                {totalExpenses.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                €
              </p>
              {expensesByGroup.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                  {expensesByGroup.map(({ groupName, amount }) => (
                    <li key={groupName} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{groupName}</span>
                      <span className="font-medium tabular-nums text-foreground">
                        {amount.toLocaleString("fr-FR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        €
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sera disponible quand vous aurez saisi les revenus.
            </p>
          )}
        </DashboardCard>

        <DashboardCard
          title="Reste à investir"
          description="Revenus totaux − Dépenses totales (calculé automatiquement). Répartition du reste à investir."
          iconSrc="/resources/icons/investir.png"
        >
          {totalIncome === 0 && totalExpenses === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sera disponible quand vous aurez saisi revenus et dépenses.
            </p>
          ) : (
            <>
              <p className="text-3xl font-bold tabular-nums text-white">
                {resteAInvestir.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                €
              </p>
              <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
                Revenus : {totalIncome.toLocaleString("fr-FR")} € — Dépenses :{" "}
                {totalExpenses.toLocaleString("fr-FR")} €
              </p>
              {resteAInvestir < 0 && (
                <p className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  Oh non, il faut changer quelque chose dans vos dépenses ou
                  revenus.
                </p>
              )}
              {showPlacementsCards && resteAInvestir >= 0 && (
                <div className="mt-4 space-y-5 border-t border-border pt-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Répartition
                  </p>
                  {(() => {
                    const epargneIndex = placementAllocation.findIndex(
                      (p) => p.name.toLowerCase().includes("épargne"),
                    );
                    const peaIndex = placementAllocation.findIndex(
                      (p) => p.name.toUpperCase() === "PEA",
                    );
                    const epargne =
                      epargneIndex >= 0 ? placementAllocation[epargneIndex] : null;
                    const pea =
                      peaIndex >= 0 ? placementAllocation[peaIndex] : null;
                    return (
                      <>
                        {epargne != null && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="font-medium text-muted-foreground">
                                {epargne.name}
                              </span>
                              <span className="font-semibold tabular-nums text-foreground">
                                {epargne.percentage ?? 0} %
                              </span>
                            </div>
                            <Slider
                              value={[epargne.percentage ?? 0]}
                              onValueChange={(v) =>
                                updatePlacementPercentage(
                                  epargneIndex,
                                  Math.round((v[0] ?? 0) * 100) / 100,
                                )
                              }
                              min={0}
                              max={100}
                              step={1}
                              className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                              ={" "}
                              {(
                                (resteAInvestir * (epargne.percentage ?? 0)) /
                                100
                              ).toLocaleString("fr-FR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              € / mois
                            </p>
                          </div>
                        )}
                        {pea != null && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="font-medium text-muted-foreground">
                                {pea.name}
                              </span>
                              <span className="font-semibold tabular-nums text-foreground">
                                {pea.percentage ?? 0} %
                              </span>
                            </div>
                            <Slider
                              value={[pea.percentage ?? 0]}
                              onValueChange={(v) =>
                                updatePlacementPercentage(
                                  peaIndex,
                                  Math.round((v[0] ?? 0) * 100) / 100,
                                )
                              }
                              min={0}
                              max={100}
                              step={1}
                              className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                              ={" "}
                              {(
                                (resteAInvestir * (pea.percentage ?? 0)) /
                                100
                              ).toLocaleString("fr-FR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              € / mois
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </DashboardCard>

        <DashboardCard
          title="Total placements"
          description="Somme de l'argent en PEA et sur les comptes épargne."
          dimmed={!showPlacementsCards}
        >
          <div className="space-y-4">
            {!showPlacementsCards ? (
              <p className="text-sm text-muted-foreground">
                {placementConditionMessage}
              </p>
            ) : (
              <>
                <div className="relative my-4 h-[200px] w-full">
                  {peaEpargneChartData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <Pie
                            data={peaEpargneChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius="78%"
                            outerRadius="95%"
                            paddingAngle={2}
                            stroke="transparent"
                            strokeWidth={0}
                          >
                            {peaEpargneChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            cursor={false}
                            content={({ active, payload }) => {
                              if (!active || !payload?.[0]) return null;
                              const d = payload[0];
                              const name = String(d.name ?? "");
                              const v = Number(d.value) ?? 0;
                              const pct =
                                totalPlacements > 0
                                  ? ` (${((v / totalPlacements) * 100).toFixed(1)} %)`
                                  : "";
                              return (
                                <div className="rounded-lg bg-card px-3 py-2 text-xs shadow-md">
                                  <p className="font-medium">{name}</p>
                                  <p className="font-mono text-foreground">
                                    {v.toLocaleString("fr-FR", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}{" "}
                                    €{pct}
                                  </p>
                                </div>
                              );
                            }}
                            allowEscapeViewBox={{ x: false, y: false }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <p className="text-xs font-medium text-muted-foreground">
                          Total des actifs
                        </p>
                        <p className="text-2xl font-bold tabular-nums text-foreground">
                          {totalPlacements.toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          €
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">Total des actifs</p>
                      <p className="mt-1">0,00 €</p>
                      <p className="mt-2 text-xs">Aucune donnée PEA ou Épargne</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2 pt-1">
                  <SummaryCardRow
                    icon={<TrendingUp className="size-5" />}
                    title="PEA"
                    subtitle={`${peaActions.length + peaEtfs.length} ligne${(peaActions.length + peaEtfs.length) > 1 ? "s" : ""}`}
                    value={`${peaTotal.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} €`}
                    percentage={
                      totalPlacements > 0
                        ? `${((peaTotal / totalPlacements) * 100).toFixed(0)} %`
                        : "0 %"
                    }
                    href="/dashboard/pea"
                  />
                  <SummaryCardRow
                    icon={<PiggyBank className="size-5" />}
                    title="Épargne"
                    subtitle={`${savingsAccounts.length} compte${savingsAccounts.length > 1 ? "s" : ""}`}
                    value={`${epargneTotal.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} €`}
                    percentage={
                      totalPlacements > 0
                        ? `${((epargneTotal / totalPlacements) * 100).toFixed(0)} %`
                        : "0 %"
                    }
                    href="/dashboard/epargne"
                  />
                </div>
              </>
            )}
          </div>
        </DashboardCard>

        <DashboardCard
          title="PEA"
          description="Solde calculé à partir de vos lignes Actions et ETF."
          iconSrc="/resources/icons/pea.png"
          dimmed={!showPlacementsCards}
          linkHref={showPlacementsCards ? "/dashboard/pea" : undefined}
          linkLabel={showPlacementsCards ? "PEA" : undefined}
        >
          {!showPlacementsCards ? (
            <p className="text-sm text-muted-foreground">
              {placementConditionMessage}
            </p>
          ) : (
            <>
              <p className="text-3xl font-bold tabular-nums text-foreground">
                {peaTotal.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                €
              </p>
              {(peaActions.length > 0 || peaEtfs.length > 0) && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {peaActions.length > 0 && (
                    <SummaryCardRow
                      icon={<TrendingUp className="size-5" />}
                      title="Actions"
                      subtitle={`${peaActions.length} ligne${peaActions.length > 1 ? "s" : ""}`}
                      value={`${peaActions.reduce((s, h) => s + getPEAHoldingValue(h), 0).toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} €`}
                      percentage={
                        peaTotal > 0
                          ? `${((peaActions.reduce((s, h) => s + getPEAHoldingValue(h), 0) / peaTotal) * 100).toFixed(0)} %`
                          : "0 %"
                      }
                      href="/dashboard/pea"
                      expandable
                      expanded={peaExpandedActions}
                      onToggleExpand={() =>
                        setPeaExpandedActions((prev) => !prev)
                      }
                      expandAriaLabel={
                        peaExpandedActions
                          ? "Masquer le détail des actions"
                          : "Afficher le détail des actions"
                      }
                    >
                      <ul className="space-y-1 text-sm">
                        {peaActions.map((h, i) => (
                          <li
                            key={`action-${i}-${h.name}`}
                            className="flex justify-between gap-2 py-1"
                          >
                            <span className="truncate text-muted-foreground">
                              {h.name || "—"}
                            </span>
                            <span className="shrink-0 font-medium tabular-nums text-foreground">
                              {getPEAHoldingValue(h).toLocaleString("fr-FR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              €
                            </span>
                          </li>
                        ))}
                      </ul>
                    </SummaryCardRow>
                  )}
                  {peaEtfs.length > 0 && (
                    <SummaryCardRow
                      icon={<TrendingUp className="size-5" />}
                      title="ETF"
                      subtitle={`${peaEtfs.length} ligne${peaEtfs.length > 1 ? "s" : ""}`}
                      value={`${peaEtfs.reduce((s, h) => s + getPEAHoldingValue(h), 0).toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} €`}
                      percentage={
                        peaTotal > 0
                          ? `${((peaEtfs.reduce((s, h) => s + getPEAHoldingValue(h), 0) / peaTotal) * 100).toFixed(0)} %`
                          : "0 %"
                      }
                      href="/dashboard/pea"
                      expandable
                      expanded={peaExpandedEtfs}
                      onToggleExpand={() =>
                        setPeaExpandedEtfs((prev) => !prev)
                      }
                      expandAriaLabel={
                        peaExpandedEtfs
                          ? "Masquer le détail des ETF"
                          : "Afficher le détail des ETF"
                      }
                    >
                      <ul className="space-y-1 text-sm">
                        {peaEtfs.map((h, i) => (
                          <li
                            key={`etf-${i}-${h.name}`}
                            className="flex justify-between gap-2 py-1"
                          >
                            <span className="truncate text-muted-foreground">
                              {h.name || "—"}
                            </span>
                            <span className="shrink-0 font-medium tabular-nums text-foreground">
                              {getPEAHoldingValue(h).toLocaleString("fr-FR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              €
                            </span>
                          </li>
                        ))}
                      </ul>
                    </SummaryCardRow>
                  )}
                </div>
              )}
            </>
          )}
        </DashboardCard>

        <DashboardCard
          title="Épargne"
          description="Comptes épargne et soldes actuels."
          iconSrc="/resources/icons/epargne.png"
          dimmed={!showPlacementsCards}
          linkHref={showPlacementsCards ? "/dashboard/epargne" : undefined}
          linkLabel={showPlacementsCards ? "Épargne" : undefined}
        >
          {!showPlacementsCards ? (
            <p className="text-sm text-muted-foreground">
              {placementConditionMessage}
            </p>
          ) : (
            <>
              <p className="text-3xl font-bold tabular-nums text-foreground">
                {epargneTotal.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                €
              </p>
              {savingsAccounts.length > 0 ? (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {savingsAccounts.map((acc, i) => {
                    const balance = Number(acc.currentBalance) || 0;
                    const pct =
                      epargneTotal > 0
                        ? ((balance / epargneTotal) * 100).toFixed(0)
                        : "0";
                    return (
                      <SummaryCardRow
                        key={`${acc.name}-${i}`}
                        icon={<PiggyBank className="size-5" />}
                        title={acc.name}
                        subtitle={
                          acc.ratePercent != null
                            ? `Taux ${Number(acc.ratePercent).toLocaleString("fr-FR")} %`
                            : "Compte épargne"
                        }
                        value={`${balance.toLocaleString("fr-FR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} €`}
                        percentage={`${pct} %`}
                        href="/dashboard/epargne"
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
                  Aucun compte épargne configuré.
                </p>
              )}
            </>
          )}
        </DashboardCard>

        <DashboardCard
          title="Impôt sur le revenu"
          description={`Estimation selon le barème ${BAREME_META.annee} à partir des revenus indexés.`}
          iconSrc="/resources/icons/impotrevenus.png"
          linkHref={showSimulateurImpot ? "/dashboard/simulateur-impot" : undefined}
          linkLabel={showSimulateurImpot ? "Simulateur impôt" : undefined}
          dimmed={!showSimulateurImpot}
        >
          {showSimulateurImpot ? (
            <>
              <p className="text-3xl font-bold tabular-nums text-foreground">
                {annualIncomeForTax.toLocaleString("fr-FR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}{" "}
                €
              </p>
              <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
                Revenu annuel pris en compte (× 12)
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Cochez au moins une ligne « Indexé impôt » dans Revenus pour afficher l&apos;estimation et accéder au simulateur.
            </p>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
