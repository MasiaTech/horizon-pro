"use client";

import { useEffect, useRef } from "react";
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
  getIncomeAmountForTax,
  getPEAHoldingValue,
  SÉCURITÉ_OBJECTIVE_NAME,
} from "@/lib/types";
import { BAREME_META } from "@/lib/impot";
import { useProfileContext } from "@/components/ProfileProvider";
import { DashboardCard } from "@/components/DashboardCard";
import { Input } from "@/components/ui/input";

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
    savingsObjectives,
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
      <div className="flex min-h-[40dvh] items-center justify-center p-8 sm:min-h-[40vh]">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full p-4 sm:p-6">
      <div className="grid gap-6 lg:gap-8 lg:grid-cols-2">
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

        <DashboardCard
          title="Reste à investir"
          description="Revenus totaux − Dépenses totales (calculé automatiquement)."
          iconSrc="/resources/icons/investir.png"
        >
          {totalIncome === 0 && totalExpenses === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sera disponible quand vous aurez saisi revenus et dépenses.
            </p>
          ) : (
            <>
              <p
                className="text-3xl font-bold tabular-nums text-white"
              >
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
            </>
          )}
        </DashboardCard>

        <DashboardCard
          title="Répartition"
          description="Répartition du reste à investir."
          iconSrc="/resources/icons/repartir.png"
          dimmed={!showPlacementsCards}
        >
          <div className="space-y-4">
            {!showPlacementsCards ? (
              <p className="text-sm text-muted-foreground">
                {placementConditionMessage}
              </p>
            ) : resteAInvestir < 0 ? (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                Oh non, il faut changer quelque chose dans vos dépenses ou
                revenus.
              </p>
            ) : (
              <>
                <ul className="mt-3 space-y-3 border-t border-border pt-3">
                  {placementAllocation.map(
                    (item: PlacementAllocation, index: number) => (
                      <li
                        key={index}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <span className="min-w-[6rem] font-medium text-muted-foreground">
                          {item.name}
                        </span>
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
                        <span className="text-sm font-medium tabular-nums text-foreground">
                          ={" "}
                          {(
                            (resteAInvestir * (item.percentage || 0)) /
                            100
                          ).toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          €
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              </>
            )}
          </div>
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
                <p className="text-3xl font-bold tabular-nums text-foreground">
                  {totalPlacements.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  €
                </p>
                <div className="mt-3 h-[260px] min-h-[200px] w-full border-t border-border pt-3">
                  {peaEpargneChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                      <PieChart
                        margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                      >
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
                                  €{pct}
                                </p>
                              </div>
                            );
                          }}
                          allowEscapeViewBox={{ x: false, y: false }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: "11px" }}
                          formatter={(value) => (
                            <span className="text-muted-foreground">
                              {value}
                            </span>
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
                <ul className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
                  {peaActions.length > 0 && (
                    <>
                      <li className="font-medium text-foreground">Actions</li>
                      {peaActions.map((h, i) => (
                        <li
                          key={`action-${i}-${h.name}`}
                          className="flex justify-between gap-2 pl-2"
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
                    </>
                  )}
                </ul>
              )}
            </>
          )}
        </DashboardCard>

        <DashboardCard
          title="Épargne"
          description="Objectifs et comptes (solde par objectif, objectif si défini)."
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
              {savingsObjectives.length > 0 ? (
                <ul className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
                  {savingsObjectives.map((obj, i) => {
                    const accountNames = new Set(
                      (obj.accountNames ?? [])
                        .map((n) => n.trim())
                        .filter(Boolean),
                    );
                    const balance = savingsAccounts
                      .filter((a) => accountNames.has(a.name.trim()))
                      .reduce((s, a) => s + (Number(a.currentBalance) || 0), 0);
                    const isSecurite =
                      obj.name.trim() === SÉCURITÉ_OBJECTIVE_NAME;
                    const goal = isSecurite
                      ? 6 * totalExpenses
                      : obj.goalAmount != null
                        ? Number(obj.goalAmount)
                        : 0;
                    const showGoal = goal > 0;
                    return (
                      <li
                        key={`${obj.name}-${i}`}
                        className="flex justify-between gap-2"
                      >
                        <span className="text-muted-foreground">
                          {obj.name}
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
                <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
                  Aucun objectif épargne configuré.
                </p>
              )}
            </>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
