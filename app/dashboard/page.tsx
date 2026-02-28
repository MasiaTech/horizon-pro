"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PlacementAllocation } from "@/lib/types";
import {
  getExpenseAmount,
  getIncomeAmount,
  getPEAHoldingValue,
} from "@/lib/types";
import { useProfileContext } from "@/components/ProfileProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";

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
    { name: "PEA", value: Math.round(peaTotal * 100) / 100, color: "hsl(142, 60%, 42%)" },
    { name: "Épargne", value: Math.round(epargneTotal * 100) / 100, color: "hsl(210, 65%, 45%)" },
  ].filter((d) => d.value > 0);

  const dataRef = useRef({ placementAllocation });
  dataRef.current.placementAllocation = placementAllocation;

  const totalIncome = incomeSources.reduce(
    (sum, s) => sum + getIncomeAmount(s),
    0,
  );
  const totalExpenses = expenseCategories.reduce(
    (sum, c) => sum + getExpenseAmount(c, totalIncome, incomeSources),
    0,
  );
  const resteAInvestir = totalIncome - totalExpenses;

  /** Afficher les cartes Placements / Total placements / PEA / Épargne seulement si revenus et dépenses > 0 et reste à investir non négatif */
  const showPlacementsCards =
    totalIncome > 0 && totalExpenses > 0 && resteAInvestir >= 0;

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
        (sum, c) => sum + getExpenseAmount(c, totalIncome, incomeSources),
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
  }, [loading, placementAllocation, saveProfile, skipNextAutoSave, autoSaveDelayMs]);

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
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full p-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-h-[12rem]">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>Total revenus</CardTitle>
                <CardDescription>
                  Somme de toutes vos sources de revenus (configurées dans Revenus).
                </CardDescription>
              </div>
              <Link
                href="/dashboard/revenus"
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Revenus
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600 dark:text-green-500">
              {totalIncome.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €
            </p>
            {incomeByGroup.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
                {incomeByGroup.map(({ groupName, amount }) => (
                  <li
                    key={groupName}
                    className="flex justify-between gap-2"
                  >
                    <span>{groupName}</span>
                    <span className="font-medium text-foreground tabular-nums">
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
          </CardContent>
        </Card>

        <Card className="min-h-[12rem]">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>Total dépenses</CardTitle>
                <CardDescription>
                  Somme de toutes vos dépenses (configurées dans Dépenses).
                </CardDescription>
              </div>
              <Link
                href="/dashboard/depenses"
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Dépenses
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">
              {totalExpenses.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €
            </p>
            {expensesByGroup.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
                {expensesByGroup.map(({ groupName, amount }) => (
                  <li
                    key={groupName}
                    className="flex justify-between gap-2"
                  >
                    <span>{groupName}</span>
                    <span className="font-medium text-foreground tabular-nums">
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
          </CardContent>
        </Card>

        <Card className="min-h-[14rem]">
          <CardHeader>
            <CardTitle>Reste à investir</CardTitle>
            <CardDescription>
              Revenus totaux − Dépenses totales (calculé automatiquement).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold ${resteAInvestir < 0 ? "text-destructive" : "text-primary"}`}
            >
              {resteAInvestir.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Revenus : {totalIncome.toLocaleString("fr-FR")} € — Dépenses :{" "}
              {totalExpenses.toLocaleString("fr-FR")} €
            </p>
          </CardContent>
        </Card>

        {showPlacementsCards && (
          <>
            <Card className="min-h-[14rem]">
              <CardHeader>
                <CardTitle>Placements</CardTitle>
                <CardDescription>
                  Répartition du reste à investir. Total = 100 %.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {resteAInvestir < 0 ? (
                  <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    Oh non, il faut changer quelque chose dans vos dépenses ou revenus.
                  </p>
                ) : (
                  <>
                    <ul className="space-y-3">
                      {placementAllocation.map((item: PlacementAllocation, index: number) => (
                        <li key={index} className="flex flex-wrap items-center gap-2">
                          <span className="min-w-[6rem] font-medium">{item.name}</span>
                          <Input
                            type="number"
                            step="0.5"
                            min={0}
                            max={100}
                            value={item.percentage === 0 ? "" : item.percentage}
                            onChange={(e) =>
                              updatePlacementPercentage(
                                index,
                                Number(e.target.value) || 0,
                              )
                            }
                            className="w-20 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                          <span className="text-sm text-muted-foreground">
                            ={" "}
                            {(
                              (resteAInvestir * (item.percentage || 0)) / 100
                            ).toLocaleString("fr-FR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            €
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      Total : {placementTotal.toLocaleString("fr-FR")} %
                      {placementTotal !== 100 && (
                        <span className="ml-1 text-destructive">(doit faire 100 %)</span>
                      )}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="min-h-[16rem]">
              <CardHeader>
                <CardTitle>Total placements (PEA + Épargne)</CardTitle>
                <CardDescription>
                  Somme de l&apos;argent en PEA et sur les comptes épargne.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-3xl font-bold tabular-nums">
                  {totalPlacements.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  €
                </p>
                <div className="h-[220px] w-full">
                  {peaEpargneChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                        <Pie
                          data={peaEpargneChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={2}
                          stroke="hsl(var(--border))"
                          strokeWidth={1}
                          label={({ name, value }) =>
                            `${name}: ${value.toLocaleString("fr-FR", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })} €`
                          }
                          labelLine={{ stroke: "hsl(var(--muted-foreground))" }}
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
                              <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
                                <p className="font-medium">{name}</p>
                                <p className="font-mono text-foreground">
                                  {v.toLocaleString("fr-FR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}{" "}
                                  €
                                  {pct}
                                </p>
                              </div>
                            );
                          }}
                          allowEscapeViewBox={{ x: false, y: false }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: "11px" }}
                          formatter={(value) => (
                            <span className="text-muted-foreground">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-md border border-dashed border-muted-foreground/30 text-sm text-muted-foreground">
                      Aucune donnée PEA ou Épargne à afficher
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="min-h-[12rem]">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>PEA</CardTitle>
                    <CardDescription>
                      Solde calculé à partir de vos lignes Actions et ETF.
                    </CardDescription>
                  </div>
                  <Link
                    href="/dashboard/pea"
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    PEA
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">
                  {peaTotal.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  €
                </p>
                {(peaActions.length > 0 || peaEtfs.length > 0) && (
                  <ul className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm text-muted-foreground">
                    {peaActions.length > 0 && (
                      <>
                        <li className="font-medium text-foreground">Actions</li>
                        {peaActions.map((h, i) => (
                          <li
                            key={`action-${i}-${h.name}`}
                            className="flex justify-between gap-2 pl-2"
                          >
                            <span className="truncate">{h.name || "—"}</span>
                            <span className="shrink-0 font-medium tabular-nums text-foreground">
                              {getPEAHoldingValue(h).toLocaleString("fr-FR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              €
                            </span>
                          </li>
                        ))}
                      </>
                    )}
                    {peaEtfs.length > 0 && (
                      <>
                        <li className="mt-1 font-medium text-foreground">ETF</li>
                        {peaEtfs.map((h, i) => (
                          <li
                            key={`etf-${i}-${h.name}`}
                            className="flex justify-between gap-2 pl-2"
                          >
                            <span className="truncate">{h.name || "—"}</span>
                            <span className="shrink-0 font-medium tabular-nums text-foreground">
                              {getPEAHoldingValue(h).toLocaleString("fr-FR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              €
                            </span>
                          </li>
                        ))}
                      </>
                    )}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="min-h-[12rem]">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>Épargne</CardTitle>
                    <CardDescription>
                      Détail de chaque compte épargne (solde et objectif si défini).
                    </CardDescription>
                  </div>
                  <Link
                    href="/dashboard/epargne"
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Épargne
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {savingsAccounts.length > 0 ? (
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {savingsAccounts.map((acc, i) => {
                      const balance = Number(acc.currentBalance) || 0;
                      const isSecurite = acc.name.trim() === "Sécurité";
                      const goal =
                        isSecurite
                          ? 6 * totalExpenses
                          : (acc.goalAmount != null ? Number(acc.goalAmount) : 0);
                      const showGoal = goal > 0;
                      return (
                        <li
                          key={`${acc.name}-${i}`}
                          className="flex justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0"
                        >
                          <span className="font-medium text-foreground">
                            {acc.name}
                          </span>
                          <span className="tabular-nums text-foreground">
                            {balance.toLocaleString("fr-FR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            €
                            {showGoal && (
                              <>
                                <span className="text-muted-foreground"> / </span>
                                {goal.toLocaleString("fr-FR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{" "}
                                €
                                <span className="ml-0.5 text-xs text-muted-foreground">
                                  (objectif)
                                </span>
                              </>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun compte épargne configuré.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

    </div>
  );
}
