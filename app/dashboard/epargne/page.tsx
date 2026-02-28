"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProfileContext } from "@/components/ProfileProvider";
import { useSortableSensors } from "@/lib/dnd-sensors";
import type { InterestFrequency, SavingsAccount } from "@/lib/types";
import { getExpenseAmount, getIncomeAmount } from "@/lib/types";
import { Plus, X, GripVertical } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const INTEREST_FREQUENCY_LABELS: Record<InterestFrequency, string> = {
  daily: "Par jour",
  weekly: "Par semaine",
  monthly: "Par mois",
  annual: "Par an",
};

/** Explication courte : plus la capitalisation est fréquente, plus le cumul est rapide (intérêts réinvestis plus souvent). */
const INTEREST_FREQUENCY_DESCRIPTION: Record<InterestFrequency, string> = {
  daily:
    "Les intérêts sont calculés et réinvestis chaque jour → cumul le plus rapide.",
  weekly:
    "Les intérêts sont calculés et réinvestis chaque semaine.",
  monthly:
    "Les intérêts sont calculés et réinvestis chaque mois.",
  annual:
    "Les intérêts sont appliqués une fois par an → cumul le plus lent.",
};
const SÉCURITÉ_NAME = "Sécurité";

/** Carte compte épargne déplaçable */
function SortableAccountCard({
  id,
  children,
}: {
  id: string;
  children: (grip: React.ReactNode) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const grip = (
    <span
      className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-5 w-5 shrink-0" />
    </span>
  );
  return (
    <div ref={setNodeRef} style={style} className="mb-6">
      {children(grip)}
    </div>
  );
}

/**
 * Calcule le nombre de mois pour atteindre l'objectif selon la fréquence de capitalisation.
 * Plus la capitalisation est fréquente, plus les intérêts sont réinvestis souvent → cumul plus rapide.
 * - Quotidien : intérêts calculés et réinvestis chaque jour (×(1+r/365)^(365/12) par mois) → cumul le plus rapide
 * - Hebdomadaire : ×(1+r/52)^(52/12) par mois
 * - Mensuel : ×(1+r/12) par mois
 * - Annuel : versement chaque mois, intérêts ×(1+r) une fois par an → cumul le plus lent
 */
function monthsToReachGoal(
  initialBalance: number,
  monthlyContribution: number,
  annualRatePercent: number,
  goal: number,
  frequency: InterestFrequency = "daily",
): number | null {
  if (goal <= 0) return null;
  if (initialBalance >= goal) return 0;
  const r = annualRatePercent / 100;
  let balance = initialBalance;
  let months = 0;
  const maxMonths = 1200; // 100 ans

  if (frequency === "annual") {
    while (balance < goal && months < maxMonths) {
      balance += monthlyContribution;
      months++;
      if (months % 12 === 0) balance *= 1 + r;
    }
  } else {
    let growthPerMonth: number;
    if (frequency === "daily") {
      growthPerMonth = Math.pow(1 + r / 365, 365 / 12); // ~30.44 jours par mois
    } else if (frequency === "weekly") {
      growthPerMonth = Math.pow(1 + r / 52, 52 / 12);
    } else {
      growthPerMonth = 1 + r / 12; // monthly
    }
    while (balance < goal && months < maxMonths) {
      balance = balance * growthPerMonth + monthlyContribution;
      months++;
    }
  }
  return balance >= goal ? months : null;
}

/** Données pour la courbe : solde projeté à chaque mois (mois 0 = aujourd'hui). Pas d'arrondi dans la simulation pour rester cohérent avec monthsToReachGoal. */
function getProjectedBalanceByMonth(
  initialBalance: number,
  monthlyContribution: number,
  annualRatePercent: number,
  frequency: InterestFrequency,
  maxMonths: number,
): { month: number; balance: number; label: string }[] {
  const r = annualRatePercent / 100;
  const data: { month: number; balance: number; label: string }[] = [
    { month: 0, balance: initialBalance, label: "Aujourd'hui" },
  ];
  let balance = initialBalance;

  if (frequency === "annual") {
    for (let m = 1; m <= maxMonths; m++) {
      balance += monthlyContribution;
      if (m % 12 === 0) balance *= 1 + r;
      data.push({ month: m, balance, label: `Mois ${m}` });
    }
  } else {
    let growthPerMonth: number;
    if (frequency === "daily") {
      growthPerMonth = Math.pow(1 + r / 365, 365 / 12);
    } else if (frequency === "weekly") {
      growthPerMonth = Math.pow(1 + r / 52, 52 / 12);
    } else {
      growthPerMonth = 1 + r / 12;
    }
    for (let m = 1; m <= maxMonths; m++) {
      balance = balance * growthPerMonth + monthlyContribution;
      data.push({ month: m, balance, label: `Mois ${m}` });
    }
  }
  return data;
}

/** Premier mois (entier) où le solde atteint ou dépasse l'objectif dans les données mensuelles (cohérent avec la courbe). */
function getMonthGoalReachedFromData(
  monthlyData: { month: number; balance: number }[],
  goal: number,
): number | null {
  if (goal <= 0 || monthlyData.length === 0) return null;
  const row = monthlyData.find((d) => d.month > 0 && d.balance >= goal);
  return row ? row.month : null;
}

/** Enrichit les données avec des points tous les 1/10e de mois pour un curseur glissant au centime près */
function expandChartData(
  monthlyData: { month: number; balance: number; label: string }[],
  step = 0.1,
): { month: number; balance: number; label: string }[] {
  if (monthlyData.length === 0) return [];
  const result: { month: number; balance: number; label: string }[] = [];
  const maxMonth = monthlyData[monthlyData.length - 1]?.month ?? 0;
  for (let m = 0; m <= maxMonth; m += step) {
    const idx = Math.min(Math.floor(m), monthlyData.length - 1);
    const source = monthlyData[idx];
    if (!source) continue;
    const label =
      m === 0
        ? "Aujourd'hui"
        : Math.abs(m - Math.round(m)) < 0.01
          ? `Mois ${Math.round(m)}`
          : `Mois ${m.toFixed(1)}`;
    result.push({
      month: Math.round(m * 100) / 100,
      balance: source.balance,
      label,
    });
  }
  return result;
}

/** Libellé pour l’axe horizontal : Aujourd'hui, 6 mois, 1 an, 1 an et 6 mois, etc. */
function formatMonthAxisLabel(month: number): string {
  if (month === 0) return "Aujourd'hui";
  if (month === 6) return "6 mois";
  if (month % 12 === 0) return `${month / 12} an${month / 12 > 1 ? "s" : ""}`;
  const years = Math.floor(month / 12);
  const months = month % 12;
  if (years === 0) return `${months} mois`;
  if (months === 6) return `${years} an${years > 1 ? "s" : ""} et 6 mois`;
  if (months === 3) return `${years} an${years > 1 ? "s" : ""} et 3 mois`;
  return `${years} an${years > 1 ? "s" : ""} et ${months} mois`;
}

/** Répartition du reste à investir : part mensuelle pour "Épargne" en € */
function getMonthlyEpargne(
  resteAInvestir: number,
  placementAllocation: { name: string; percentage: number }[],
): number {
  const epargne = placementAllocation.find(
    (p) => p.name.toLowerCase() === "épargne",
  );
  if (!epargne) return 0;
  return (resteAInvestir * (epargne.percentage || 0)) / 100;
}

export default function EpargnePage() {
  const router = useRouter();
  const {
    loading,
    incomeSources,
    expenseCategories,
    placementAllocation,
    savingsAccounts,
    setSavingsAccounts,
    saveProfile,
    skipNextAutoSave,
    autoSaveDelayMs,
  } = useProfileContext();

  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(
    null,
  );
  const dataRef = useRef({
    savingsAccounts,
  });
  dataRef.current.savingsAccounts = savingsAccounts;

  const totalIncome = incomeSources.reduce(
    (sum, s) => sum + getIncomeAmount(s),
    0,
  );
  const totalExpenses = expenseCategories.reduce(
    (sum, c) => sum + getExpenseAmount(c, totalIncome, incomeSources),
    0,
  );
  const resteAInvestir = totalIncome - totalExpenses;
  const monthlyEpargne = getMonthlyEpargne(resteAInvestir, placementAllocation);
  /** Objectif règle 6 mois de dépenses pour le livret Sécurité */
  const goalSecurite = 6 * totalExpenses;

  /** Redirection vers le dashboard si les conditions d'accès ne sont pas remplies */
  useEffect(() => {
    if (loading) return;
    if (totalIncome <= 0 || totalExpenses <= 0 || resteAInvestir < 0) {
      router.replace("/dashboard");
    }
  }, [loading, totalIncome, totalExpenses, resteAInvestir, router]);

  useEffect(() => {
    if (loading) return;
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }
    const timeoutId = setTimeout(() => {
      saveProfile({
        savings_accounts: dataRef.current.savingsAccounts,
      });
    }, autoSaveDelayMs);
    return () => clearTimeout(timeoutId);
  }, [
    loading,
    savingsAccounts,
    saveProfile,
    skipNextAutoSave,
    autoSaveDelayMs,
  ]);

  useEffect(() => {
    const flush = () => {
      const payload = JSON.stringify({
        savings_accounts: dataRef.current.savingsAccounts,
      });
      navigator.sendBeacon(
        "/api/profile/save",
        new Blob([payload], { type: "application/json" }),
      );
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  const allocationTotal = savingsAccounts.reduce(
    (s, a) => s + (a.allocationPercent ?? 0),
    0,
  );

  const updateAccount = (
    index: number,
    field: keyof SavingsAccount,
    value: string | number,
  ) => {
    setSavingsAccounts((prev) => {
      const next = prev.map((a) => ({ ...a }));
      const cur = next[index];
      if (field === "name") next[index] = { ...cur, name: String(value) };
      else if (field === "ratePercent")
        next[index] = { ...cur, ratePercent: Number(value) || 0 };
      else if (field === "interestFrequency")
        next[index] = {
          ...cur,
          interestFrequency: value as InterestFrequency,
        };
      else if (field === "allocationPercent") {
        const pct = Math.max(0, Math.min(100, Number(value) || 0));
        next[index] = { ...cur, allocationPercent: pct };
        const lastIndex = next.length - 1;
        const adjustedIndex = index === lastIndex ? 0 : lastIndex;
        const sumExceptAdjusted = next.reduce(
          (s, a, i) =>
            i === adjustedIndex ? s : s + (a.allocationPercent ?? 0),
          0,
        );
        const remainder = Math.max(
          0,
          Math.min(100, Math.round((100 - sumExceptAdjusted) * 100) / 100),
        );
        next[adjustedIndex] = {
          ...next[adjustedIndex],
          allocationPercent: remainder,
        };
      } else if (field === "currentBalance")
        next[index] = { ...cur, currentBalance: Number(value) || 0 };
      else if (field === "goalAmount")
        next[index] = {
          ...cur,
          goalAmount: value === "" ? undefined : Number(value) || 0,
        };
      return next;
    });
  };

  const addAccount = () => {
    setSavingsAccounts((prev) => {
      const next = [
        ...prev,
        {
          name: "Nouveau compte",
          ratePercent: 3.75,
          interestFrequency: "daily" as const,
          allocationPercent: 0,
          currentBalance: 0,
        },
      ];
      const n = next.length;
      const per = Math.round((100 / n) * 100) / 100;
      return next.map((a, i) => ({
        ...a,
        allocationPercent:
          i === n - 1 ? Math.max(0, 100 - (n - 1) * per) : per,
      }));
    });
  };

  const removeAccount = (index: number) => {
    if (savingsAccounts.length <= 1) return;
    setSavingsAccounts((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const sum = next.reduce((s, a) => s + (a.allocationPercent ?? 0), 0);
      if (sum !== 100 && next.length > 0) {
        const lastIdx = next.length - 1;
        const others = next.reduce(
          (s, a, i) => s + (i === lastIdx ? 0 : (a.allocationPercent ?? 0)),
          0,
        );
        next[lastIdx] = {
          ...next[lastIdx],
          allocationPercent: Math.max(0, Math.min(100, 100 - others)),
        };
      }
      return next;
    });
    setConfirmDeleteIndex(null);
  };

  const sensors = useSortableSensors();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeStr = String(active.id);
    const overStr = String(over.id);
    if (!activeStr.startsWith("epargne-") || !overStr.startsWith("epargne-"))
      return;
    const oldIndex = parseInt(activeStr.replace("epargne-", ""), 10);
    const newIndex = parseInt(overStr.replace("epargne-", ""), 10);
    if (Number.isNaN(oldIndex) || Number.isNaN(newIndex)) return;
    setSavingsAccounts((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Versement mensuel Épargne</CardTitle>
          <CardDescription>
            Part du reste à investir allouée à l&apos;épargne (depuis le
            dashboard). Objectif livret Sécurité : 6 mois de dépenses (règle
            d&apos;urgence).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-2xl font-bold text-green-600 dark:text-green-500">
            {monthlyEpargne.toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            €{" "}
            <span className="text-sm font-normal text-muted-foreground">
              / mois
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Objectif Sécurité (6 mois de dépenses) :{" "}
            {goalSecurite.toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            €
          </p>
          {savingsAccounts.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Répartition entre comptes : {allocationTotal.toLocaleString("fr-FR")} %
              {allocationTotal !== 100 && (
                <span className="ml-1 text-destructive">(doit faire 100 %)</span>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={savingsAccounts.map((_, i) => `epargne-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          {savingsAccounts.map((account, index) => {
            const balance = Number(account.currentBalance) || 0;
            const rate = Number(account.ratePercent) || 0;
            const allocation = Number(account.allocationPercent) ?? 0;
            const monthlyContribution =
              (monthlyEpargne * allocation) / 100;
            const isSecurite = account.name.trim() === SÉCURITÉ_NAME;
            const goal = isSecurite ? goalSecurite : (account.goalAmount ?? 0);
            const frequency = (account.interestFrequency ?? "daily") as InterestFrequency;
            const months = monthsToReachGoal(
              balance,
              monthlyContribution,
              rate,
              goal,
              frequency,
            );
            const years = months != null ? Math.floor(months / 12) : null;
            const remainingMonths = months != null ? months % 12 : null;
            const chartMonths =
              goal > 0 && months != null
                ? Math.min(months + 6, 120)
                : 24;
            const monthlyData = getProjectedBalanceByMonth(
              balance,
              monthlyContribution,
              rate,
              frequency,
              chartMonths,
            );
            const monthGoalReachedFromChart = getMonthGoalReachedFromData(
              monthlyData,
              goal,
            );
            const chartDataSmooth = monthlyData;

            return (
              <SortableAccountCard key={index} id={`epargne-${index}`}>
                {(grip) => (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          {grip}
                          <Input
                            value={account.name}
                            onChange={(e) => updateAccount(index, "name", e.target.value)}
                            placeholder="Nom du compte"
                            className="h-auto border-0 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
                          />
                        </div>
                        {savingsAccounts.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setConfirmDeleteIndex(index)}
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            title="Supprimer le compte"
                            aria-label={`Supprimer ${account.name}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
            <CardContent className="space-y-4">
              {savingsAccounts.length > 1 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">
                    Part du versement mensuel (%)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <NumberInput
                      value={account.allocationPercent ?? 0}
                      onChange={(n) =>
                        updateAccount(index, "allocationPercent", n)
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    <span className="text-xs text-muted-foreground">
                      ={" "}
                      {monthlyContribution.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      € / mois
                    </span>
                  </div>
                </div>
              )}
              {savingsAccounts.length === 1 && (
                <p className="text-sm text-muted-foreground">
                  Versement mensuel : 100 % ={" "}
                  {monthlyEpargne.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  €
                </p>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">
                  Capitalisation des intérêts
                </label>
                <Select
                  value={(account.interestFrequency ?? "daily") as InterestFrequency}
                  onValueChange={(v: InterestFrequency) =>
                    updateAccount(index, "interestFrequency", v)
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">
                      {INTEREST_FREQUENCY_LABELS.daily}
                    </SelectItem>
                    <SelectItem value="weekly">
                      {INTEREST_FREQUENCY_LABELS.weekly}
                    </SelectItem>
                    <SelectItem value="monthly">
                      {INTEREST_FREQUENCY_LABELS.monthly}
                    </SelectItem>
                    <SelectItem value="annual">
                      {INTEREST_FREQUENCY_LABELS.annual}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Selon votre banque.{" "}
                  {INTEREST_FREQUENCY_DESCRIPTION[
                    (account.interestFrequency ?? "daily") as InterestFrequency
                  ]}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">
                    Taux annuel (%)
                  </label>
                  <NumberInput
                    value={account.ratePercent ?? 0}
                    onChange={(n) => updateAccount(index, "ratePercent", n)}
                    placeholder="3,75"
                    className="w-28"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">
                    Solde actuel (€)
                  </label>
                  <NumberInput
                    value={balance}
                    onChange={(n) =>
                      updateAccount(index, "currentBalance", n)
                    }
                    placeholder="0"
                    className="w-36"
                  />
                </div>
              </div>
              {!isSecurite && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">
                    Objectif (€)
                  </label>
                  <NumberInput
                    value={account.goalAmount ?? 0}
                    onChange={(n) =>
                      updateAccount(
                        index,
                        "goalAmount",
                        n === 0 ? "" : n,
                      )
                    }
                    placeholder="Optionnel"
                    className="w-36"
                  />
                </div>
              )}
              {goal > 0 && (
                <div className="rounded-md bg-muted/50 p-3 text-sm">
                  <p className="font-medium text-foreground">
                    Objectif :{" "}
                    {goal.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    €{isSecurite && " (6 mois de dépenses)"}
                  </p>
                  {months != null && (
                    <p className="mt-1 text-muted-foreground">
                      Temps pour atteindre l&apos;objectif :{" "}
                      {years !== null && remainingMonths !== null && (
                        <>
                          {years > 0 && (
                            <>
                              {years} an{years > 1 ? "s" : ""}{" "}
                            </>
                          )}
                          {remainingMonths} mois
                        </>
                      )}
                    </p>
                  )}
                  {months === null && balance < goal && (
                    <p className="mt-1 text-muted-foreground">
                      Objectif hors atteinte avec les paramètres actuels.
                    </p>
                  )}
                </div>
              )}
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Évolution du solde (jusqu’à l’objectif + 6 mois)
                </p>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartDataSmooth}
                      margin={{ top: 28, right: 8, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id={`fillBalance-${index}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                        vertical={false}
                        horizontal={true}
                      />
                      <XAxis
                        dataKey="month"
                        type="number"
                        domain={[0, "dataMax"]}
                        ticks={(() => {
                          const max =
                            chartDataSmooth.length > 0
                              ? chartDataSmooth[chartDataSmooth.length - 1]
                                  ?.month ?? 0
                              : 0;
                          const t: number[] = [0];
                          for (let m = 6; m <= max; m += 6) t.push(m);
                          return t;
                        })()}
                        tickFormatter={(m) => formatMonthAxisLabel(Number(m))}
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis
                        tickFormatter={(v) => `${v} €`}
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        width={50}
                      />
                      {goal > 0 && (
                        <ReferenceLine
                          y={goal}
                          stroke="hsl(var(--destructive))"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          label={{
                            value: "Objectif",
                            position: "right",
                            fill: "hsl(var(--destructive))",
                            fontSize: 11,
                          }}
                        />
                      )}
                      <Tooltip
                        cursor={false}
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          const d = payload[0].payload;
                          const displayBalance = Math.round(d.balance * 100) / 100;
                          return (
                            <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
                              <p className="font-medium">{d.label}</p>
                              <p className="font-mono text-foreground">
                                {displayBalance.toLocaleString("fr-FR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{" "}
                                €
                              </p>
                            </div>
                          );
                        }}
                        allowEscapeViewBox={{ x: false, y: false }}
                      />
                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill={`url(#fillBalance-${index})`}
                        isAnimationActive={true}
                        connectNulls={false}
                      />
                      {goal > 0 &&
                        monthGoalReachedFromChart != null &&
                        monthGoalReachedFromChart > 0 && (
                          <ReferenceLine
                            x={monthGoalReachedFromChart}
                            stroke="rgba(255, 255, 255, 0.85)"
                            strokeWidth={2.5}
                            strokeDasharray="6 6"
                            label={{
                              value: `Objectif (${formatMonthAxisLabel(monthGoalReachedFromChart)})`,
                              position: "insideTopRight",
                              fill: "hsl(var(--muted-foreground))",
                              fontSize: 11,
                            }}
                          />
                        )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
                  </Card>
                )}
              </SortableAccountCard>
            );
          })}
        </SortableContext>
      </DndContext>

      <Card
        role="button"
        tabIndex={0}
        className="mb-6 cursor-pointer border-2 border-dashed border-muted-foreground/30 bg-transparent transition-colors hover:border-primary/50 hover:bg-muted/20"
        onClick={addAccount}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            addAccount();
          }
        }}
      >
        <CardContent className="flex min-h-[100px] items-center justify-center p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Plus className="h-6 w-6" />
            <span className="text-sm font-medium">
              Ajouter un compte épargne
            </span>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={confirmDeleteIndex != null}
        onOpenChange={(open) => !open && setConfirmDeleteIndex(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce compte ?</DialogTitle>
            <DialogDescription>
              Le compte &quot;
              {confirmDeleteIndex != null &&
                savingsAccounts[confirmDeleteIndex]?.name}
              &quot; et ses données seront supprimés. Cette action est
              irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteIndex(null)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDeleteIndex != null)
                  removeAccount(confirmDeleteIndex);
              }}
            >
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
