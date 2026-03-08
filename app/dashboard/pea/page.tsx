"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FinanceAreaChart } from "@/components/FinanceAreaChart";
import { SummaryCardRow } from "@/components/SummaryCardRow";
import { useProfileContext } from "@/components/ProfileProvider";
import { updatePEAHolding } from "@/lib/useProfile";
import { clampPercent } from "@/lib/utils";
import {
  getExpenseAmount,
  getIncomeAmount,
  getPEAHoldingValue,
  type PEAHolding,
} from "@/lib/types";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, MoreVertical, Plus, TrendingUp } from "lucide-react";

const PEA_PLAFOND_EUR = 150_000;

const EMPTY_HOLDING: PEAHolding = {
  name: "",
  quantity: 0,
  price: 0,
  dividendEnabled: false,
};

/** Part du reste à investir allouée au PEA (depuis le dashboard), en €/mois */
function getMonthlyPEA(
  resteAInvestir: number,
  placementAllocation: { name: string; percentage: number }[],
): number {
  const pea = placementAllocation.find((p) => p.name.toUpperCase() === "PEA");
  if (!pea) return 0;
  return (resteAInvestir * (pea.percentage || 0)) / 100;
}

/**
 * Total des dividendes par an (€) pour toutes les lignes du portefeuille.
 */
function getTotalAnnualDividends(holdings: PEAHolding[]): number {
  return holdings.reduce((s, h) => s + getPEAHoldingAnnualDividend(h), 0);
}

/**
 * ROE moyen pondéré par la valeur des lignes qui ont un ROE > 0.
 * Les lignes sans ROE (0 ou vide) ne diluent pas la moyenne : on applique le taux
 * des positions "à croissance" à tout le solde (évite que l'ajout d'une action sans ROE
 * renseigné fasse augmenter le temps pour atteindre 150 k€).
 */
function getWeightedAverageROE(holdings: PEAHolding[]): number {
  let totalValueWithRoe = 0;
  let weightedSum = 0;
  for (const h of holdings) {
    const value = getPEAHoldingValue(h);
    const roe = h.roePercent ?? 0;
    if (value <= 0 || roe <= 0) continue;
    totalValueWithRoe += value;
    weightedSum += value * roe;
  }
  return totalValueWithRoe > 0 ? weightedSum / totalValueWithRoe : 0;
}

/** Prélèvements sociaux (17,2 %) : coefficient pour passer du brut au net. */
const PEA_NET_COEFFICIENT = 1 - 17.2 / 100; // 0.828

/**
 * Données mensuelles jusqu'au plafond 150 k€.
 * Chaque mois : solde = solde × (1 + ROE%/100)^(1/12) + versement + (dividendes/an ÷ 12).
 * netBalance = balance après prélèvements sociaux (17,2 %).
 */
function getPEAProjectionData(
  initialBalance: number,
  monthlyContribution: number,
  monthlyDividendEuro: number,
  plafond: number,
  extraMonthsAfterGoal: number,
  annualRoePercent: number,
): { month: number; balance: number; netBalance: number; label: string }[] {
  const data: {
    month: number;
    balance: number;
    netBalance: number;
    label: string;
  }[] = [
    {
      month: 0,
      balance: initialBalance,
      netBalance: initialBalance * PEA_NET_COEFFICIENT,
      label: "Aujourd'hui",
    },
  ];
  if (initialBalance >= plafond) {
    const netPlafond = plafond * PEA_NET_COEFFICIENT;
    for (let m = 1; m <= extraMonthsAfterGoal; m++) {
      data.push({
        month: m,
        balance: plafond,
        netBalance: netPlafond,
        label: `Mois ${m}`,
      });
    }
    return data;
  }
  const monthlyRoeFactor =
    annualRoePercent > 0 ? Math.pow(1 + annualRoePercent / 100, 1 / 12) : 1;
  const totalMonthly = monthlyContribution + monthlyDividendEuro;
  if (totalMonthly <= 0 && monthlyRoeFactor <= 1) {
    data.push({
      month: 12,
      balance: initialBalance,
      netBalance: initialBalance * PEA_NET_COEFFICIENT,
      label: "1 an",
    });
    return data;
  }
  let balance = initialBalance;
  let month = 1;
  const maxMonths = 600;
  while (balance < plafond && month <= maxMonths) {
    balance = balance * monthlyRoeFactor + totalMonthly;
    balance = Math.min(plafond, balance);
    data.push({
      month,
      balance,
      netBalance: balance * PEA_NET_COEFFICIENT,
      label: month === 0 ? "Aujourd'hui" : `Mois ${month}`,
    });
    if (balance >= plafond) break;
    month++;
  }
  for (let m = 1; m <= extraMonthsAfterGoal && month + m <= maxMonths; m++) {
    data.push({
      month: month + m,
      balance: plafond,
      netBalance: plafond * PEA_NET_COEFFICIENT,
      label: `Mois ${month + m}`,
    });
  }
  return data;
}

function getMonthPlafondReached(
  data: { month: number; balance: number }[],
  plafond: number,
): number | null {
  const row = data.find((d) => d.month > 0 && d.balance >= plafond);
  return row ? row.month : null;
}

function formatYearAxisLabel(month: number): string {
  if (month === 0) return "Aujourd'hui";
  if (month === 12) return "1 an";
  if (month % 12 === 0) return `${month / 12} ans`;
  const years = Math.floor(month / 12);
  const months = month % 12;
  if (years === 0) return `${months} mois`;
  return `${years} an${years > 1 ? "s" : ""} ${months} m`;
}

/** Montant dividendes/an pour une ligne. Vide ou 0 % = pas de dividende. */
function getPEAHoldingAnnualDividend(h: PEAHolding): number {
  if ((h.dividendPercentPerYear ?? 0) <= 0) return 0;
  return getPEAHoldingValue(h) * ((h.dividendPercentPerYear ?? 0) / 100);
}

type PEASection = "actions" | "etf";

/** Bloc dépliable Actions ou ETF : SummaryCardRow + lignes avec menu ... + bouton Ajouter */
function PEAHoldingsSection({
  section,
  title,
  icon,
  items,
  setItems,
  expanded,
  onToggleExpand,
  onAdd,
  onEdit,
  onRequestDelete,
}: {
  section: PEASection;
  title: string;
  icon: React.ReactNode;
  items: PEAHolding[];
  setItems: React.Dispatch<React.SetStateAction<PEAHolding[]>>;
  expanded: boolean;
  onToggleExpand: () => void;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onRequestDelete: (index: number, label: string) => void;
}) {
  const totalValue = items.reduce((s, h) => s + getPEAHoldingValue(h), 0);
  const totalDiv = items.reduce((s, h) => s + getPEAHoldingAnnualDividend(h), 0);
  return (
    <SummaryCardRow
      icon={icon}
      title={title}
      subtitle={`${items.length} ligne(s)${totalDiv > 0 ? ` · Div./an ${totalDiv.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : ""}`}
      value={`${totalValue.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
      expandable
      expanded={expanded}
      onToggleExpand={onToggleExpand}
      expandAriaLabel={`Afficher le détail ${title}`}
    >
      <div className="space-y-2">
        {items.map((h, index) => {
          const name = h.name?.trim() || "Sans nom";
          const initials = name.length >= 2 ? name.slice(0, 2).toUpperCase() : name.slice(0, 1).toUpperCase() || "—";
          const priceStr = Number(h.price).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const valueStr = getPEAHoldingValue(h).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          return (
          <div
            key={`${h.name}-${index}`}
            className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{name}</p>
              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                {h.quantity} · {priceStr} €
              </p>
            </div>
            <div className="shrink-0 text-right tabular-nums font-semibold text-foreground">
              {valueStr} €
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
                  aria-label="Menu ligne"
                >
                  <MoreVertical className="size-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-0 bg-card shadow-sm">
                <DropdownMenuItem onClick={() => onEdit(index)} className="cursor-pointer">
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/20" />
                <DropdownMenuItem
                  onClick={() => onRequestDelete(index, h.name || `Ligne ${index + 1}`)}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          );
        })}
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/30 hover:text-foreground"
        >
          <Plus className="size-4" />
          Ajouter une ligne
        </button>
      </div>
    </SummaryCardRow>
  );
}

/** Dialog : créer ou modifier une ligne Action / ETF */
function HoldingDialog({
  open,
  onOpenChange,
  mode,
  section,
  initialHolding,
  onSubmit,
  onUpdate,
  editIndex,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  section: PEASection;
  initialHolding: PEAHolding;
  onSubmit?: (h: PEAHolding) => void;
  onUpdate?: (index: number, field: keyof PEAHolding, value: string | number | boolean) => void;
  editIndex?: number;
}) {
  const [holding, setHolding] = useState<PEAHolding>(initialHolding);
  useEffect(() => {
    if (open) setHolding(initialHolding);
  }, [open, initialHolding]);

  const handleChange = (field: keyof PEAHolding, value: string | number | boolean) => {
    setHolding((prev) => {
      const next = { ...prev };
      if (field === "name") next.name = String(value);
      else if (field === "quantity") next.quantity = Number(value) || 0;
      else if (field === "price") next.price = Number(value) || 0;
      else if (field === "dividendEnabled") next.dividendEnabled = Boolean(value);
      else if (field === "dividendPercentPerYear")
        next.dividendPercentPerYear = value === "" || value == null ? undefined : clampPercent(Number(value) || 0);
      else if (field === "roePercent")
        next.roePercent = value === "" || value == null ? undefined : clampPercent(Number(value) || 0);
      return next;
    });
  };

  const submit = () => {
    const pct = holding.dividendPercentPerYear ?? 0;
    const trimmed = {
      ...holding,
      name: (holding.name || "").trim(),
      dividendPercentPerYear: pct,
      dividendEnabled: pct > 0,
    };
    if (mode === "create" && onSubmit) {
      onSubmit(trimmed);
      onOpenChange(false);
    } else if (mode === "edit" && onUpdate && editIndex !== undefined) {
      onUpdate(editIndex, "name", trimmed.name);
      onUpdate(editIndex, "quantity", trimmed.quantity);
      onUpdate(editIndex, "price", trimmed.price);
      onUpdate(editIndex, "dividendEnabled", trimmed.dividendEnabled);
      onUpdate(editIndex, "dividendPercentPerYear", trimmed.dividendPercentPerYear ?? 0);
      onUpdate(editIndex, "roePercent", trimmed.roePercent ?? 0);
      onOpenChange(false);
    }
  };

  const sectionLabel = section === "actions" ? "Action" : "ETF";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? `Nouvelle ligne ${sectionLabel}` : "Modifier la ligne"}
          </DialogTitle>
          <DialogDescription>
            Nom, quantité, prix. Dividendes %/an : laisser vide si pas de dividende. ROE (%/an) : estimation de croissance (composition annuelle).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nom</label>
            <Input
              value={holding.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Ex. TotalEnergies"
              className="h-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantité</label>
              <NumberInput value={holding.quantity} onChange={(n) => handleChange("quantity", n)} placeholder="0" className="h-10" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prix (€)</label>
              <NumberInput value={holding.price} onChange={(n) => handleChange("price", n)} placeholder="0" className="h-10" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Dividendes (%/an)</label>
            <NumberInput
              value={holding.dividendPercentPerYear ?? 0}
              onChange={(n) => handleChange("dividendPercentPerYear", clampPercent(n))}
              placeholder="0 si pas de dividende"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">ROE (%/an)</label>
            <p className="text-xs text-muted-foreground">Croissance annuelle estimée (composition). Ex. 20 % : 1 000 € → 1 200 € après 1 an.</p>
            <NumberInput
              value={holding.roePercent ?? 0}
              onChange={(n) => handleChange("roePercent", clampPercent(n))}
              placeholder="0 si pas de croissance"
              className="h-10"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button type="button" onClick={submit}>{mode === "create" ? "Ajouter" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function PEAPage() {
  const router = useRouter();
  const {
    loading,
    incomeSources,
    incomeGroupNames,
    expenseCategories,
    placementAllocation,
    peaActions,
    setPeaActions,
    peaEtfs,
    setPeaEtfs,
    saveProfile,
    skipNextAutoSave,
    autoSaveDelayMs,
  } = useProfileContext();

  const dataRef = useRef({ peaActions, peaEtfs });
  dataRef.current = { peaActions, peaEtfs };

  const [expandedSections, setExpandedSections] = useState({ actions: true, etf: true });
  const [holdingDialog, setHoldingDialog] = useState<
    null | { mode: "create"; section: PEASection } | { mode: "edit"; section: PEASection; index: number }
  >(null);
  const [confirmDeleteHolding, setConfirmDeleteHolding] = useState<{
    section: PEASection;
    index: number;
    label: string;
  } | null>(null);

  const totalIncome = incomeSources.reduce(
    (sum, s) => sum + getIncomeAmount(s),
    0,
  );
  const totalExpenses = expenseCategories.reduce(
    (sum, c) => sum + getExpenseAmount(c, totalIncome, incomeSources, incomeGroupNames),
    0,
  );
  const resteAInvestir = totalIncome - totalExpenses;
  const monthlyPEA = getMonthlyPEA(resteAInvestir, placementAllocation);

  /** Redirection vers le dashboard si les conditions d'accès ne sont pas remplies */
  useEffect(() => {
    if (loading) return;
    if (totalIncome <= 0 || totalExpenses <= 0 || resteAInvestir < 0) {
      router.replace("/dashboard");
    }
  }, [loading, totalIncome, totalExpenses, resteAInvestir, router]);

  const balance = useMemo(() => {
    const fromActions = peaActions.reduce(
      (s, h) => s + getPEAHoldingValue(h),
      0,
    );
    const fromEtfs = peaEtfs.reduce((s, h) => s + getPEAHoldingValue(h), 0);
    return fromActions + fromEtfs;
  }, [peaActions, peaEtfs]);

  const cappedBalance = Math.max(0, Math.min(PEA_PLAFOND_EUR, balance));
  const remainingCap = Math.max(0, PEA_PLAFOND_EUR - cappedBalance);

  /** Total dividendes/an : cumul de toutes les lignes Actions + toutes les lignes ETF */
  const totalAnnualDividends = useMemo(() => {
    const fromActions = getTotalAnnualDividends(peaActions);
    const fromEtfs = getTotalAnnualDividends(peaEtfs);
    return fromActions + fromEtfs;
  }, [peaActions, peaEtfs]);

  const monthlyDividendEuro = totalAnnualDividends / 12;

  /** ROE moyen pondéré (Actions + ETF) pour la courbe : composition annuelle. */
  const weightedAverageROE = useMemo(() => {
    const allHoldings = [...peaActions, ...peaEtfs];
    return getWeightedAverageROE(allHoldings);
  }, [peaActions, peaEtfs]);

  const chartData = useMemo(
    () =>
      getPEAProjectionData(
        cappedBalance,
        monthlyPEA,
        monthlyDividendEuro,
        PEA_PLAFOND_EUR,
        24,
        weightedAverageROE,
      ),
    [cappedBalance, monthlyPEA, monthlyDividendEuro, weightedAverageROE],
  );
  const monthPlafondReached = useMemo(
    () => getMonthPlafondReached(chartData, PEA_PLAFOND_EUR),
    [chartData],
  );
  const yearsToPlafond =
    monthPlafondReached != null ? Math.floor(monthPlafondReached / 12) : null;
  const monthsRemainingToPlafond =
    monthPlafondReached != null ? monthPlafondReached % 12 : null;

  const savePeaHoldings = useCallback(() => {
    saveProfile({
      pea_actions: dataRef.current.peaActions,
      pea_etfs: dataRef.current.peaEtfs,
    });
  }, [saveProfile]);

  useEffect(() => {
    if (loading) return;
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }
    const timeoutId = setTimeout(savePeaHoldings, autoSaveDelayMs);
    return () => clearTimeout(timeoutId);
  }, [
    loading,
    peaActions,
    peaEtfs,
    savePeaHoldings,
    skipNextAutoSave,
    autoSaveDelayMs,
  ]);

  useEffect(() => {
    const flush = () => {
      const payload = JSON.stringify({
        pea_actions: dataRef.current.peaActions,
        pea_etfs: dataRef.current.peaEtfs,
      });
      navigator.sendBeacon(
        "/api/profile/save",
        new Blob([payload], { type: "application/json" }),
      );
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  if (loading) {
    return (
      <div className="min-h-full w-full p-4 sm:p-6">
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-64 rounded bg-muted" />
            <Skeleton className="mt-2 h-4 w-full max-w-[480px] rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Skeleton className="h-4 w-40 rounded bg-muted" />
              <Skeleton className="mt-1 h-8 w-28 rounded bg-muted" />
            </div>
            <div>
              <Skeleton className="h-4 w-32 rounded bg-muted" />
              <Skeleton className="mt-1 h-8 w-24 rounded bg-muted" />
              <Skeleton className="mt-2 h-3 w-56 rounded bg-muted" />
            </div>
            <Skeleton className="h-24 w-full rounded bg-muted" />
          </CardContent>
        </Card>
        <div className="grid gap-6 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-28 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((r) => (
                    <div key={r} className="flex items-center justify-between gap-2">
                      <Skeleton className="h-4 w-24 rounded bg-muted" />
                      <Skeleton className="h-4 w-16 rounded bg-muted" />
                    </div>
                  ))}
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
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Plan d&apos;épargne en actions (PEA)</CardTitle>
          <CardDescription>
            Un seul PEA par personne. Plafond des versements :{" "}
            {PEA_PLAFOND_EUR.toLocaleString("fr-FR")} €. Le solde est calculé à
            partir de vos lignes Actions et ETF (quantité × prix). Le versement
            mensuel correspond à la part PEA du reste à investir (dashboard).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Versement mensuel PEA
            </p>
            <p className="text-2xl font-bold text-primary">
              {monthlyPEA.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €{" "}
              <span className="text-sm font-normal text-muted-foreground">
                / mois
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Solde PEA (calculé)
            </p>
            <p className="text-2xl font-bold text-foreground">
              {cappedBalance.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Plafond : {PEA_PLAFOND_EUR.toLocaleString("fr-FR")} €. Il vous
              reste{" "}
              <span className="font-medium text-foreground">
                {remainingCap.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                €
              </span>{" "}
              de capacité de versement.
            </p>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Évolution du solde jusqu&apos;au plafond de 150 000 €
            </p>
            {(monthlyPEA > 0 ||
              monthlyDividendEuro > 0 ||
              weightedAverageROE > 0) &&
              (() => {
                const fmt = (n: number) =>
                  n.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
                const total = monthlyPEA + monthlyDividendEuro;
                const parts: string[] = [];
                if (monthlyPEA > 0)
                  parts.push(`${fmt(monthlyPEA)} € (versement)`);
                if (monthlyDividendEuro > 0) {
                  parts.push(
                    `${fmt(monthlyDividendEuro)} € (total dividendes/an Actions + ETF : ${fmt(totalAnnualDividends)} € ÷ 12)`,
                  );
                }
                const formula = parts.join(" + ");
                return (
                  <p className="mb-2 text-xs text-muted-foreground">
                    Chaque mois :{" "}
                    {weightedAverageROE > 0 && (
                      <>
                        solde × (1 + ROE {fmt(weightedAverageROE)} %)^(1/12) —
                        composition.{" "}
                      </>
                    )}
                    {formula ? (
                      <>
                        Puis +{" "}
                        <strong className="text-foreground">{formula}</strong> ={" "}
                        <strong className="text-foreground">
                          {fmt(total)} €
                        </strong>{" "}
                        / mois.
                      </>
                    ) : null}
                  </p>
                );
              })()}
            {yearsToPlafond !== null &&
              monthsRemainingToPlafond !== null &&
              (monthlyPEA + monthlyDividendEuro > 0 ||
                weightedAverageROE > 0) && (
                <p className="mb-2 text-sm text-muted-foreground">
                  Plafond atteint en{" "}
                  {yearsToPlafond > 0 && (
                    <span className="font-medium text-foreground">
                      {yearsToPlafond} an{yearsToPlafond > 1 ? "s" : ""}{" "}
                    </span>
                  )}
                  <span className="font-medium text-foreground">
                    {monthsRemainingToPlafond} mois
                  </span>
                </p>
              )}
            {cappedBalance >= PEA_PLAFOND_EUR && (
              <p className="mb-2 text-sm font-medium text-primary">
                Plafond déjà atteint.
              </p>
            )}
            <FinanceAreaChart
              data={chartData}
              series={[
                {
                  dataKey: "netBalance",
                  name: "Net (−17,2 %)",
                  color: "hsl(210, 65%, 45%)",
                },
                {
                  dataKey: "balance",
                  name: "Brut",
                  color: "hsl(142, 60%, 42%)",
                },
              ]}
              xAxisKey="month"
              formatXLabel={formatYearAxisLabel}
              xAxisTicks={(() => {
                const max =
                  chartData.length > 0
                    ? (chartData[chartData.length - 1]?.month ?? 0)
                    : 0;
                const t: number[] = [0];
                for (let m = 12; m <= max; m += 12) t.push(m);
                return t;
              })()}
              height={360}
              referenceLineY={{
                value: PEA_PLAFOND_EUR,
                label: "Plafond 150 000 €",
              }}
              referenceLineX={
                monthPlafondReached != null && monthPlafondReached > 0
                  ? {
                      value: monthPlafondReached,
                      label: `Plafond (${formatYearAxisLabel(monthPlafondReached)})`,
                    }
                  : undefined
              }
              chartId="pea"
              fullWidth={true}
              showSummaryBlock={true}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <PEAHoldingsSection
          section="actions"
          title="Actions"
          icon={<TrendingUp className="size-5" />}
          items={peaActions}
          setItems={setPeaActions}
          expanded={expandedSections.actions}
          onToggleExpand={() => setExpandedSections((p) => ({ ...p, actions: !p.actions }))}
          onAdd={() => setHoldingDialog({ mode: "create", section: "actions" })}
          onEdit={(index) => setHoldingDialog({ mode: "edit", section: "actions", index })}
          onRequestDelete={(index, label) => setConfirmDeleteHolding({ section: "actions", index, label })}
        />
        <PEAHoldingsSection
          section="etf"
          title="ETF"
          icon={<BarChart3 className="size-5" />}
          items={peaEtfs}
          setItems={setPeaEtfs}
          expanded={expandedSections.etf}
          onToggleExpand={() => setExpandedSections((p) => ({ ...p, etf: !p.etf }))}
          onAdd={() => setHoldingDialog({ mode: "create", section: "etf" })}
          onEdit={(index) => setHoldingDialog({ mode: "edit", section: "etf", index })}
          onRequestDelete={(index, label) => setConfirmDeleteHolding({ section: "etf", index, label })}
        />
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Avantages fiscaux du PEA</CardTitle>
            <CardDescription>
              Après 5 ans de détention, les gains (plus-values et revenus) sont
              exonérés d&apos;impôt sur le revenu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="list-inside list-disc space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">
                  Exonération d&apos;impôt sur le revenu
                </strong>{" "}
                : après 5 ans, les plus-values et dividendes ne sont pas imposés à
                l&apos;IR.
              </li>
              <li>
                <strong className="text-foreground">Prélèvements sociaux</strong>{" "}
                : les prélèvements sociaux (17,2 %) peuvent s&apos;appliquer au
                moment du retrait selon la date d&apos;ouverture du PEA. À
                vérifier selon votre situation.
              </li>
              <li>
                <strong className="text-foreground">Un seul PEA</strong> : vous ne
                pouvez avoir qu&apos;un seul PEA. Le plafond de 150 000 € est
                global (versements cumulés depuis l&apos;ouverture).
              </li>
              <li>
                <strong className="text-foreground">
                  Pas de sortie avant 5 ans
                </strong>{" "}
                : un retrait avant 5 ans entraîne la clôture du PEA et une
                imposition des gains. Au-delà de 5 ans, vous pouvez effectuer des
                retraits sans clôturer le plan.
              </li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Ces informations sont données à titre indicatif. Consultez le site
              des impôts ou un conseiller pour votre situation.
            </p>
          </CardContent>
        </Card>
      </div>

      {(holdingDialog?.mode === "create" || holdingDialog?.mode === "edit") && (
        <HoldingDialog
          open={true}
          onOpenChange={(open) => !open && setHoldingDialog(null)}
          mode={holdingDialog.mode}
          section={holdingDialog.section}
          initialHolding={
            holdingDialog.mode === "create"
              ? EMPTY_HOLDING
              : (holdingDialog.section === "actions" ? peaActions[holdingDialog.index] : peaEtfs[holdingDialog.index]) ?? EMPTY_HOLDING
          }
          onSubmit={
            holdingDialog.mode === "create"
              ? (h) => {
                  if (holdingDialog.section === "actions") setPeaActions((prev) => [...prev, h]);
                  else setPeaEtfs((prev) => [...prev, h]);
                  setHoldingDialog(null);
                }
              : undefined
          }
          onUpdate={
            holdingDialog.mode === "edit"
              ? (index, field, value) => {
                  const setter = holdingDialog.section === "actions" ? setPeaActions : setPeaEtfs;
                  updatePEAHolding(setter, index, field, value);
                }
              : undefined
          }
          editIndex={holdingDialog.mode === "edit" ? holdingDialog.index : undefined}
        />
      )}

      <Dialog open={confirmDeleteHolding !== null} onOpenChange={(open) => !open && setConfirmDeleteHolding(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer la ligne</DialogTitle>
            <DialogDescription>
              Supprimer « {confirmDeleteHolding?.label} » ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDeleteHolding(null)}>
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (confirmDeleteHolding) {
                  if (confirmDeleteHolding.section === "actions")
                    setPeaActions((prev) => prev.filter((_, i) => i !== confirmDeleteHolding.index));
                  else setPeaEtfs((prev) => prev.filter((_, i) => i !== confirmDeleteHolding.index));
                  setConfirmDeleteHolding(null);
                }
              }}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
