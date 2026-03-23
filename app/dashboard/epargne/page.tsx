"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfileContext } from "@/components/ProfileProvider";
import { clampPercent } from "@/lib/utils";
import type {
  InterestFrequency,
  SavingsAccount,
  SavingsObjective,
} from "@/lib/types";
import {
  getExpenseAmount,
  getIncomeAmount,
  SÉCURITÉ_OBJECTIVE_NAME,
} from "@/lib/types";
import { Lock, MoreVertical, PiggyBank, Plus, X } from "lucide-react";
import { FinanceAreaChart, type FinanceChartSeries } from "@/components/FinanceAreaChart";
import { SummaryCardRow } from "@/components/SummaryCardRow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
/** Comptes épargne dont le nom est dans l'objectif */
function getAccountsForObjective(
  objective: SavingsObjective,
  accounts: SavingsAccount[],
): SavingsAccount[] {
  const names = new Set(objective.accountNames.map((n) => n.trim()).filter(Boolean));
  return accounts.filter((a) => names.has(a.name.trim()));
}

/**
 * Calcule le versement mensuel par compte : fixes d'abord, le reste partagé en % entre les comptes "percentage".
 */
function getMonthlyContributions(
  accounts: SavingsAccount[],
  totalMonthly: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of accounts) out[a.name] = 0;
  const receive = (a: SavingsAccount) => a.receivesContribution !== false;
  const fixedAccounts = accounts.filter((a) => receive(a) && (a.allocationType ?? "percentage") === "fixed");
  const pctAccounts = accounts.filter((a) => receive(a) && (a.allocationType ?? "percentage") === "percentage");
  const sumFixed = fixedAccounts.reduce((s, a) => s + (Number(a.allocationFixed) || 0), 0);
  const remainder = Math.max(0, totalMonthly - sumFixed);
  const sumPct = pctAccounts.reduce((s, a) => s + (Number(a.allocationPercent) || 0), 0);
  for (const a of fixedAccounts) {
    out[a.name] = Number(a.allocationFixed) || 0;
  }
  for (const a of pctAccounts) {
    out[a.name] = sumPct > 0 ? ((Number(a.allocationPercent) || 0) / sumPct) * remainder : 0;
  }
  return out;
}

/** Données projetées par mois pour un objectif : chaque compte + total (avec plafonds et intérêts). */
function simulateObjectiveByMonth(
  objective: SavingsObjective,
  accounts: SavingsAccount[],
  monthlyContributions: Record<string, number>,
  goalAmount: number,
  maxMonths: number,
): {
  data: { month: number; total: number; [accountName: string]: number }[];
  monthGoalReached: number | null;
} {
  const list = getAccountsForObjective(objective, accounts);
  if (list.length === 0) {
    return {
      data: [{ month: 0, total: 0 }],
      monthGoalReached: null,
    };
  }
  const data: { month: number; total: number; [accountName: string]: number }[] = [];
  const balances: Record<string, number> = {};
  const growthPerMonth: Record<string, number> = {};
  const monthlyIn: Record<string, number> = {};
  const plafondMap: Record<string, number> = {};
  for (const a of list) {
    balances[a.name] = Number(a.currentBalance) || 0;
    const r = (Number(a.ratePercent) || 0) / 100;
    const freq = (a.interestFrequency ?? "daily") as InterestFrequency;
    if (freq === "annual") {
      growthPerMonth[a.name] = 1;
    } else if (freq === "daily") {
      growthPerMonth[a.name] = Math.pow(1 + r / 365, 365 / 12);
    } else if (freq === "weekly") {
      growthPerMonth[a.name] = Math.pow(1 + r / 52, 52 / 12);
    } else {
      growthPerMonth[a.name] = 1 + r / 12;
    }
    monthlyIn[a.name] = monthlyContributions[a.name] ?? 0;
    plafondMap[a.name] = Number(a.plafond) || 0;
  }
  const dataRow: { month: number; total: number; [k: string]: number } = {
    month: 0,
    total: 0,
  };
  for (const a of list) {
    dataRow[a.name] = balances[a.name];
    dataRow.total += balances[a.name];
  }
  data.push({ ...dataRow });
  let monthGoalReached: number | null = dataRow.total >= goalAmount && goalAmount > 0 ? 0 : null;
  for (let m = 1; m <= maxMonths; m++) {
    const row: { month: number; total: number; [k: string]: number } = {
      month: m,
      total: 0,
    };
    for (const a of list) {
      let b = balances[a.name];
      const freq = (a.interestFrequency ?? "daily") as InterestFrequency;
      if (freq === "annual") {
        b += monthlyIn[a.name];
        if (m % 12 === 0) b *= 1 + (Number(a.ratePercent) || 0) / 100;
      } else {
        b = b * (growthPerMonth[a.name] ?? 1) + monthlyIn[a.name];
      }
      const plaf = plafondMap[a.name];
      if (plaf > 0 && b > plaf) b = plaf;
      balances[a.name] = b;
      row[a.name] = b;
      row.total += b;
    }
    data.push(row);
    if (monthGoalReached == null && goalAmount > 0 && row.total >= goalAmount) {
      monthGoalReached = m;
    }
  }
  return { data, monthGoalReached };
}

const SÉCURITÉ_NAME = SÉCURITÉ_OBJECTIVE_NAME;

const DEFAULT_NEW_ACCOUNT: SavingsAccount = {
  name: "",
  ratePercent: 3.75,
  interestFrequency: "daily",
  receivesContribution: true,
  allocationType: "percentage",
  allocationPercent: 0,
  allocationFixed: 0,
  currentBalance: 0,
  plafond: 0,
};

/** Dialog : créer ou modifier un compte épargne (tous les champs) */
function AccountDialog({
  open,
  onOpenChange,
  mode,
  editIndex,
  initialAccount,
  savingsAccounts,
  monthlyEpargne,
  allocationOverflow,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  editIndex: number | null;
  initialAccount: SavingsAccount;
  savingsAccounts: SavingsAccount[];
  monthlyEpargne: number;
  allocationOverflow: boolean;
  onCreate: (account: SavingsAccount) => void;
  onUpdate: (index: number, account: SavingsAccount) => void;
}) {
  const [account, setAccount] = useState<SavingsAccount>(initialAccount);
  useEffect(() => {
    if (open) setAccount(initialAccount);
  }, [open, initialAccount]);

  const otherFixed =
    editIndex !== null
      ? savingsAccounts
          .filter((_, i) => i !== editIndex)
          .filter((a) => a.receivesContribution !== false && (a.allocationType ?? "percentage") === "fixed")
          .reduce((s, a) => s + (Number(a.allocationFixed) || 0), 0)
      : savingsAccounts
          .filter((a) => a.receivesContribution !== false && (a.allocationType ?? "percentage") === "fixed")
          .reduce((s, a) => s + (Number(a.allocationFixed) || 0), 0);
  const thisFixed =
    account.receivesContribution !== false && (account.allocationType ?? "percentage") === "fixed"
      ? Number(account.allocationFixed) || 0
      : 0;
  const totalFixed = otherFixed + thisFixed;
  const overflow = totalFixed > monthlyEpargne;
  const existingNames = savingsAccounts.map((a) => a.name.trim()).filter(Boolean);
  const currentName = mode === "edit" && editIndex != null ? savingsAccounts[editIndex]?.name?.trim() ?? "" : "";
  const otherNames = mode === "edit" ? existingNames.filter((n) => n !== currentName) : existingNames;
  const nameValid = account.name.trim() !== "" && (account.name.trim() === currentName || !otherNames.includes(account.name.trim()));

  const update = (field: keyof SavingsAccount, value: string | number | boolean) => {
    setAccount((prev) => {
      const next = { ...prev };
      if (field === "name") next.name = String(value);
      else if (field === "ratePercent") next.ratePercent = clampPercent(Number(value) || 0);
      else if (field === "interestFrequency") next.interestFrequency = value as InterestFrequency;
      else if (field === "receivesContribution") next.receivesContribution = Boolean(value);
      else if (field === "allocationType") next.allocationType = value as "fixed" | "percentage";
      else if (field === "allocationFixed") next.allocationFixed = Math.max(0, Number(value) || 0);
      else if (field === "allocationPercent") next.allocationPercent = clampPercent(Number(value) || 0);
      else if (field === "currentBalance") next.currentBalance = Number(value) || 0;
      else if (field === "plafond") next.plafond = value === "" || value === 0 ? 0 : Number(value) || 0;
      return next;
    });
  };

  const submit = () => {
    if (!nameValid || overflow) return;
    const trimmed = { ...account, name: account.name.trim() };
    if (mode === "create") {
      onCreate(trimmed);
    } else if (editIndex != null) {
      onUpdate(editIndex, trimmed);
    }
    onOpenChange(false);
  };

  const type = account.allocationType ?? "percentage";
  const allocationPct = Number(account.allocationPercent) ?? 0;
  const allocationFix = Number(account.allocationFixed) ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nouveau compte épargne" : "Modifier le compte"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Renseignez les informations du compte (livret, etc.)."
              : "Modifiez les champs ci-dessous."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div>
            <Label htmlFor="account-name">Nom du compte</Label>
            <Input
              id="account-name"
              value={account.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Ex. Livret A"
              className="mt-1 h-10"
            />
            {account.name.trim() !== "" && !nameValid && (
              <p className="mt-1 text-xs text-destructive">Ce nom est déjà utilisé.</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="account-receives"
              checked={account.receivesContribution !== false}
              onCheckedChange={(c) => update("receivesContribution", c === true)}
            />
            <Label htmlFor="account-receives" className="cursor-pointer font-normal">
              Recevoir une part du versement mensuel (alimenté)
            </Label>
          </div>

          {account.receivesContribution !== false && (
            <>
              <div>
                <Label>Répartition</Label>
                <Select
                  value={type}
                  onValueChange={(v: "fixed" | "percentage") => update("allocationType", v)}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixe (€/mois)</SelectItem>
                    <SelectItem value="percentage">Pourcentage (%) du reste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {type === "fixed" ? (
                <div>
                  <Label>Montant fixe (€/mois)</Label>
                  <NumberInput
                    value={allocationFix}
                    onChange={(n) => update("allocationFixed", n)}
                    className={`mt-1 w-28 ${overflow ? "border-destructive ring-2 ring-destructive/50" : ""}`}
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Reste dispo. :{" "}
                    <span className="tabular-nums font-medium text-foreground">
                      {Math.max(0, monthlyEpargne - totalFixed).toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      €
                    </span>
                    {" "}pour les comptes en %
                  </p>
                </div>
              ) : (
                <div>
                  <Label>Part du reste (%)</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Slider
                      value={[allocationPct]}
                      onValueChange={(v) => update("allocationPercent", clampPercent(v[0] ?? 0))}
                      min={0}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-10 tabular-nums text-sm">{allocationPct} %</span>
                  </div>
                </div>
              )}
            </>
          )}

          {overflow && (
            <p className="rounded-md border border-destructive/80 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Vous dépassez le versement mensuel ({totalFixed.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € en fixe pour {monthlyEpargne.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € disponibles). Réduisez les montants fixes.
            </p>
          )}

          <div>
            <Label>Capitalisation des intérêts</Label>
            <Select
              value={(account.interestFrequency ?? "daily") as InterestFrequency}
              onValueChange={(v: InterestFrequency) => update("interestFrequency", v)}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{INTEREST_FREQUENCY_LABELS.daily}</SelectItem>
                <SelectItem value="weekly">{INTEREST_FREQUENCY_LABELS.weekly}</SelectItem>
                <SelectItem value="monthly">{INTEREST_FREQUENCY_LABELS.monthly}</SelectItem>
                <SelectItem value="annual">{INTEREST_FREQUENCY_LABELS.annual}</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              {INTEREST_FREQUENCY_DESCRIPTION[(account.interestFrequency ?? "daily") as InterestFrequency]}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Taux annuel (%)</Label>
              <NumberInput
                value={account.ratePercent ?? 0}
                onChange={(n) => update("ratePercent", n)}
                placeholder="3,75"
                className="mt-1 w-full"
              />
            </div>
            <div>
              <Label>Solde actuel (€)</Label>
              <NumberInput
                value={Number(account.currentBalance) || 0}
                onChange={(n) => update("currentBalance", n)}
                placeholder="0"
                className="mt-1 w-full"
              />
            </div>
          </div>

          <div>
            <Label>Plafond (€)</Label>
            <NumberInput
              value={Number(account.plafond) ?? 0}
              onChange={(n) => update("plafond", n)}
              placeholder="0 = pas de plafond"
              className="mt-1 w-full"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={submit} disabled={!nameValid || overflow}>
            {mode === "create" ? "Ajouter" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    incomeGroupNames,
    expenseCategories,
    placementAllocation,
    savingsAccounts,
    setSavingsAccounts,
    savingsObjectives,
    setSavingsObjectives,
    saveProfile,
    skipNextAutoSave,
    autoSaveDelayMs,
  } = useProfileContext();

  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(
    null,
  );
  const [confirmDeleteObjectiveIndex, setConfirmDeleteObjectiveIndex] = useState<
    number | null
  >(null);
  const [expandedComptesEpargne, setExpandedComptesEpargne] = useState(true);
  const [accountDialog, setAccountDialog] = useState<{ mode: "create" } | { mode: "edit"; index: number } | null>(null);
  /** Point survolé au-dessus du graphique (total + détail par livret, mis à jour au hover) */
  const [hoveredObjectivePoint, setHoveredObjectivePoint] = useState<{
    objIndex: number;
    total: number;
    month: number;
    row: Record<string, number>;
  } | null>(null);
  const dataRef = useRef({
    savingsAccounts,
    savingsObjectives,
  });
  dataRef.current.savingsAccounts = savingsAccounts;
  dataRef.current.savingsObjectives = savingsObjectives;
  const overflowRef = useRef(false);

  const totalIncome = incomeSources.reduce(
    (sum, s) => sum + getIncomeAmount(s),
    0,
  );
  const totalExpenses = expenseCategories.reduce(
    (sum, c) => sum + getExpenseAmount(c, totalIncome, incomeSources, incomeGroupNames),
    0,
  );
  const resteAInvestir = totalIncome - totalExpenses;
  const monthlyEpargne = getMonthlyEpargne(resteAInvestir, placementAllocation);
  /** Objectif règle 6 mois de dépenses pour le livret Sécurité */
  const goalSecurite = 6 * totalExpenses;
  const monthlyContributions = getMonthlyContributions(savingsAccounts, monthlyEpargne);
  const totalAllocated = Object.values(monthlyContributions).reduce((s, v) => s + v, 0);
  const fixedAccountsForSum = savingsAccounts.filter(
    (a) => a.receivesContribution !== false && (a.allocationType ?? "percentage") === "fixed",
  );
  const sumFixed = fixedAccountsForSum.reduce((s, a) => s + (Number(a.allocationFixed) || 0), 0);
  const allocationOverflow = sumFixed > monthlyEpargne;
  overflowRef.current = allocationOverflow;

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
    if (overflowRef.current) return;
    const timeoutId = setTimeout(() => {
      if (overflowRef.current) return;
      saveProfile({
        savings_accounts: dataRef.current.savingsAccounts,
        savings_objectives: dataRef.current.savingsObjectives,
      });
    }, autoSaveDelayMs);
    return () => clearTimeout(timeoutId);
  }, [
    loading,
    savingsAccounts,
    savingsObjectives,
    saveProfile,
    skipNextAutoSave,
    autoSaveDelayMs,
    allocationOverflow,
  ]);

  useEffect(() => {
    const flush = () => {
      if (overflowRef.current) return;
      const payload = JSON.stringify({
        savings_accounts: dataRef.current.savingsAccounts,
        savings_objectives: dataRef.current.savingsObjectives,
      });
      navigator.sendBeacon(
        "/api/profile/save",
        new Blob([payload], { type: "application/json" }),
      );
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  const updateAccount = (
    index: number,
    field: keyof SavingsAccount,
    value: string | number | boolean,
  ) => {
    setSavingsAccounts((prev) => {
      const next = prev.map((a) => ({ ...a }));
      const cur = next[index];
      if (field === "name") next[index] = { ...cur, name: String(value) };
      else if (field === "ratePercent")
        next[index] = { ...cur, ratePercent: clampPercent(Number(value) || 0) };
      else if (field === "interestFrequency")
        next[index] = { ...cur, interestFrequency: value as InterestFrequency };
      else if (field === "receivesContribution")
        next[index] = { ...cur, receivesContribution: Boolean(value) };
      else if (field === "allocationType")
        next[index] = { ...cur, allocationType: value as "fixed" | "percentage" };
      else if (field === "allocationFixed")
        next[index] = { ...cur, allocationFixed: Math.max(0, Number(value) || 0) };
      else if (field === "allocationPercent")
        next[index] = { ...cur, allocationPercent: clampPercent(Number(value) || 0) };
      else if (field === "currentBalance")
        next[index] = { ...cur, currentBalance: Number(value) || 0 };
      else if (field === "plafond")
        next[index] = { ...cur, plafond: value === "" || value === 0 ? 0 : Number(value) || 0 };
      return next;
    });
  };

  /** Répartit les % pour que le total fasse 100 : le compte à editedIndex garde son %, les autres (en %) se partagent le reste à parts égales. */
  const redistributePercentages = (
    prev: SavingsAccount[],
    editedIndex: number,
    editedAccount: SavingsAccount,
  ): SavingsAccount[] => {
    const next = prev.map((a, i) => (i === editedIndex ? editedAccount : { ...a }));
    const isPct = (a: SavingsAccount) =>
      a.receivesContribution !== false && (a.allocationType ?? "percentage") === "percentage";
    const pctIndices = next.map((a, i) => ({ a, i })).filter(({ a }) => isPct(a)).map(({ i }) => i);
    if (pctIndices.length <= 1) return next;
    const editedPct = Math.max(0, Math.min(100, Number(editedAccount.allocationPercent) ?? 0));
    const otherIndices = pctIndices.filter((i) => i !== editedIndex);
    if (otherIndices.length === 0) return next;
    const remainder = 100 - editedPct;
    const n = otherIndices.length;
    const each = remainder / n;
    let sumAssigned = 0;
    for (let k = 0; k < n - 1; k++) {
      const val = Math.round(each * 100) / 100;
      next[otherIndices[k]] = { ...next[otherIndices[k]], allocationPercent: val };
      sumAssigned += val;
    }
    next[otherIndices[n - 1]] = {
      ...next[otherIndices[n - 1]],
      allocationPercent: Math.round((100 - editedPct - sumAssigned) * 100) / 100,
    };
    return next;
  };

  const addAccountFromDialog = (account: SavingsAccount) => {
    setSavingsAccounts((prev) => redistributePercentages([...prev, account], prev.length, account));
  };

  const updateAccountFromDialog = (index: number, account: SavingsAccount) => {
    setSavingsAccounts((prev) => redistributePercentages(prev, index, account));
  };

  const removeAccount = (index: number) => {
    if (savingsAccounts.length <= 1) return;
    setSavingsAccounts((prev) => prev.filter((_, i) => i !== index));
    setConfirmDeleteIndex(null);
  };

  const updateObjective = (
    objIndex: number,
    field: keyof SavingsObjective,
    value: string | number | string[],
  ) => {
    setSavingsObjectives((prev) => {
      const next = prev.map((o) => ({ ...o, accountNames: [...(o.accountNames ?? [])] }));
      const cur = next[objIndex];
      if (!cur) return prev;
      if (field === "name") next[objIndex] = { ...cur, name: String(value) };
      else if (field === "goalAmount") next[objIndex] = { ...cur, goalAmount: Number(value) || 0 };
      else if (field === "accountNames") next[objIndex] = { ...cur, accountNames: value as string[] };
      return next;
    });
  };

  const addObjective = () => {
    setSavingsObjectives((prev) => [
      ...prev,
      { name: "Nouvel objectif", goalAmount: 0, locked: false, accountNames: [] },
    ]);
  };

  const removeObjective = (objIndex: number) => {
    const obj = savingsObjectives[objIndex];
    if (obj?.locked) return;
    setSavingsObjectives((prev) => prev.filter((_, i) => i !== objIndex));
    setConfirmDeleteObjectiveIndex(null);
  };

  const toggleAccountInObjective = (objIndex: number, accountName: string) => {
    setSavingsObjectives((prev) => {
      const next = prev.map((o) => ({ ...o, accountNames: [...(o.accountNames ?? [])] }));
      const cur = next[objIndex];
      if (!cur) return prev;
      const currentlyIn = cur.accountNames.includes(accountName);
      if (currentlyIn) {
        next[objIndex] = {
          ...cur,
          accountNames: cur.accountNames.filter((n) => n !== accountName),
        };
      } else {
        for (let i = 0; i < next.length; i++) {
          if (i !== objIndex) {
            next[i] = {
              ...next[i],
              accountNames: next[i].accountNames.filter((n) => n !== accountName),
            };
          }
        }
        next[objIndex] = {
          ...cur,
          accountNames: [...cur.accountNames, accountName],
        };
      }
      return next;
    });
  };

  const OBJECTIVE_CHART_COLORS = [
    "hsl(142, 60%, 42%)",
    "hsl(210, 65%, 45%)",
    "hsl(30, 70%, 50%)",
    "hsl(280, 60%, 50%)",
  ];

  if (loading) {
    return (
      <div className="min-h-full w-full p-4 sm:p-6">
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-52 rounded bg-muted" />
            <Skeleton className="mt-2 h-4 w-full max-w-[400px] rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-8 w-28 rounded bg-muted" />
            <Skeleton className="h-4 w-56 rounded bg-muted" />
          </CardContent>
        </Card>
        <div className="mb-6 space-y-6">
          <Skeleton className="h-6 w-24 rounded bg-muted" />
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-36 rounded bg-muted" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-[200px] w-full rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-40 rounded bg-muted" />
            <Skeleton className="mt-2 h-4 w-64 rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3].map((r) => (
                <div key={r} className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-28 rounded bg-muted" />
                  <Skeleton className="h-4 w-20 rounded bg-muted" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full p-4 sm:p-6">
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
          {savingsAccounts.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Versement mensuel total : {monthlyEpargne.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              {Math.abs(totalAllocated - monthlyEpargne) > 0.02 && (
                <span className="ml-1">· Alloué : {totalAllocated.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section Objectifs : un graphique par objectif (une courbe par compte + courbe cumul) */}
      <div className="mb-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Objectifs</h2>
        {savingsObjectives.map((objective, objIndex) => {
          const isSecurite = objective.name.trim() === SÉCURITÉ_OBJECTIVE_NAME;
          const goalAmount =
            isSecurite ? goalSecurite : (objective.goalAmount ?? 0);
          const monthlyContributions = getMonthlyContributions(savingsAccounts, monthlyEpargne);
          const { data: chartData, monthGoalReached } = simulateObjectiveByMonth(
            objective,
            savingsAccounts,
            monthlyContributions,
            goalAmount,
            goalAmount > 0 ? 120 : 24,
          );
          const accountNamesInObjective = getAccountsForObjective(
            objective,
            savingsAccounts,
          ).map((a) => a.name);
          /** Données affichées : jusqu'à l'objectif + 6 mois pour voir la suite */
          const displayData =
            goalAmount > 0 && monthGoalReached != null
              ? chartData.filter(
                  (row) => row.month <= monthGoalReached + 6,
                )
              : chartData;
          const maxMonth =
            displayData.length > 0
              ? (displayData[displayData.length - 1]?.month ?? 0)
              : 0;
          return (
            <Card key={`obj-${objIndex}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {objective.locked && (
                      <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <Input
                      value={objective.name}
                      onChange={(e) =>
                        updateObjective(objIndex, "name", e.target.value)
                      }
                      placeholder="Nom de l'objectif"
                      disabled={objective.locked}
                      className="h-auto border-0 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0 disabled:opacity-100"
                    />
                  </div>
                  {!objective.locked && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDeleteObjectiveIndex(objIndex)}
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      title="Supprimer l'objectif"
                      aria-label={`Supprimer ${objective.name}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-muted-foreground">
                        Objectif (€)
                      </label>
                      {isSecurite ? (
                        <p className="text-sm font-medium text-foreground">
                          {goalSecurite.toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          € (6 mois de dépenses)
                        </p>
                      ) : (
                        <NumberInput
                          value={objective.goalAmount ?? 0}
                          onChange={(n) =>
                            updateObjective(objIndex, "goalAmount", n)
                          }
                          placeholder="0"
                          className="w-36"
                        />
                      )}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">
                        Comptes associés
                      </label>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Un compte ne peut être associé qu&apos;à un seul objectif.
                      </p>
                      {(() => {
                        const currentNames = objective.accountNames ?? [];
                        const availableAccounts = savingsAccounts.filter((acc) => {
                          const name = acc.name.trim();
                          if (currentNames.includes(name)) return false;
                          return !savingsObjectives.some(
                            (o, i) =>
                              i !== objIndex &&
                              (o.accountNames ?? []).includes(name)
                          );
                        });
                        return (
                          <div className="space-y-3">
                            {availableAccounts.length > 0 && (
                              <Select
                                value=""
                                onValueChange={(value) => {
                                  if (value)
                                    toggleAccountInObjective(objIndex, value);
                                }}
                              >
                                <SelectTrigger className="w-full max-w-xs">
                                  <SelectValue placeholder="Ajouter un compte" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableAccounts.map((acc) => (
                                    <SelectItem
                                      key={acc.name}
                                      value={acc.name.trim()}
                                    >
                                      {acc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {currentNames.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {currentNames.map((name) => (
                                  <Badge
                                    key={name}
                                    variant="secondary"
                                    className="gap-1 pr-1"
                                  >
                                    {name}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleAccountInObjective(objIndex, name)
                                      }
                                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                                      aria-label={`Retirer ${name}`}
                                    >
                                      <X className="size-3.5" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Aucun compte associé. Ajoutez-en un ci-dessus.
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    {accountNamesInObjective.length > 0 &&
                      goalAmount > 0 &&
                      monthGoalReached != null && (
                        <p className="text-sm text-muted-foreground">
                          Dans ce scénario, l&apos;objectif pourrait être atteint dans environ{" "}
                          {Math.floor(monthGoalReached / 12) > 0 && (
                            <>
                              {Math.floor(monthGoalReached / 12)} an{" "}
                              {Math.floor(monthGoalReached / 12) > 1 ? "s " : ""}
                            </>
                          )}
                          {monthGoalReached % 12} mois
                        </p>
                      )}
                  </div>
                  {accountNamesInObjective.length > 0 && (
                    <div className="flex flex-col justify-center">
                      {(() => {
                        const currentRow = displayData[0] as Record<string, number> | undefined;
                        const isHovered = hoveredObjectivePoint?.objIndex === objIndex;
                        const row = isHovered && hoveredObjectivePoint?.row
                          ? hoveredObjectivePoint.row
                          : currentRow ?? {};
                        const displayTotal = (row.total ?? 0) as number;
                        const displayLabel = isHovered && hoveredObjectivePoint
                          ? formatMonthAxisLabel(hoveredObjectivePoint.month)
                          : "Actuel";
                        return (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                              {displayLabel}
                            </p>
                            <p className="text-2xl font-semibold tabular-nums text-foreground">
                              {displayTotal.toLocaleString("fr-FR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              €
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                              {accountNamesInObjective.map((name, i) => {
                                const val = Number(row[name]) ?? 0;
                                const color =
                                  OBJECTIVE_CHART_COLORS[i % OBJECTIVE_CHART_COLORS.length];
                                return (
                                  <span
                                    key={name}
                                    className="tabular-nums"
                                    style={{ color }}
                                  >
                                    {name}:{" "}
                                    {val.toLocaleString("fr-FR", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}{" "}
                                    €
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                {accountNamesInObjective.length > 0 && (
                  <FinanceAreaChart
                    data={displayData}
                    series={[
                      ...accountNamesInObjective.map(
                        (name, i): FinanceChartSeries => ({
                          dataKey: name,
                          name,
                          color:
                            OBJECTIVE_CHART_COLORS[
                              i % OBJECTIVE_CHART_COLORS.length
                            ],
                        })
                      ),
                      {
                        dataKey: "total",
                        name: "Total",
                        color: "hsl(45, 88%, 48%)",
                      },
                    ]}
                    xAxisKey="month"
                    formatXLabel={formatMonthAxisLabel}
                    xAxisTicks={(() => {
                      const t: number[] = [0];
                      for (let m = 6; m <= maxMonth; m += 6) t.push(m);
                      return t;
                    })()}
                    totalDataKey="total"
                    height={360}
                    referenceLineY={
                      goalAmount > 0
                        ? { value: goalAmount, label: "Objectif" }
                        : undefined
                    }
                    referenceLineX={
                      goalAmount > 0 &&
                      monthGoalReached != null &&
                      monthGoalReached > 0
                        ? {
                            value: monthGoalReached,
                            label: `Atteint (${formatMonthAxisLabel(monthGoalReached)})`,
                          }
                        : undefined
                    }
                    chartId={`epargne-obj-${objIndex}`}
                    fullWidth={true}
                    showSummaryBlock={false}
                    onHover={(row) =>
                      setHoveredObjectivePoint(
                        row
                          ? {
                              objIndex,
                              total: Number(row.total) || 0,
                              month: Number(row.month) || 0,
                              row: Object.fromEntries(
                                Object.entries(row).map(([k, v]) => [
                                  k,
                                  typeof v === "number" ? v : Number(v) || 0,
                                ])
                              ) as Record<string, number>,
                            }
                          : null
                      )
                    }
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
        <Card
          role="button"
          tabIndex={0}
          className="cursor-pointer border-2 border-dashed border-muted-foreground/30 bg-transparent transition-colors hover:border-primary/50 hover:bg-muted/20"
          onClick={addObjective}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              addObjective();
            }
          }}
        >
          <CardContent className="flex min-h-[80px] items-center justify-center p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Plus className="h-5 w-5" />
              <span className="text-sm font-medium">Ajouter un objectif</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <SummaryCardRow
        icon={<PiggyBank className="size-5" />}
        title="Comptes épargne"
        subtitle={
          savingsAccounts.length > 0
            ? `${savingsAccounts.length} compte${savingsAccounts.length > 1 ? "s" : ""} · ${totalAllocated.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/mois alloués`
            : undefined
        }
        value={`${savingsAccounts.reduce((s, a) => s + (Number(a.currentBalance) || 0), 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
        expandable
        expanded={expandedComptesEpargne}
        onToggleExpand={() => setExpandedComptesEpargne((v) => !v)}
        expandAriaLabel="Afficher la liste des comptes épargne"
      >
        <div className="space-y-2">
          {allocationOverflow && (
            <p className="rounded-md border border-destructive/80 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              Vous dépassez le versement mensuel ({sumFixed.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € en fixe pour {monthlyEpargne.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € disponibles). Ce n&apos;est pas possible. Réduisez les montants fixes pour enregistrer.
            </p>
          )}
          {savingsAccounts.map((account, index) => {
            const name = account.name?.trim() || "Sans nom";
            const initials = name.length >= 2 ? name.slice(0, 2).toUpperCase() : name.slice(0, 1).toUpperCase() || "—";
            const receives = account.receivesContribution !== false;
            const type = account.allocationType ?? "percentage";
            const allocationPct = Number(account.allocationPercent) ?? 0;
            const allocationFix = Number(account.allocationFixed) ?? 0;
            const contrib = monthlyContributions[account.name] ?? 0;
            const balance = Number(account.currentBalance) || 0;
            const plafond = Number(account.plafond) || 0;
            const balanceStr = balance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const plafondStr = plafond.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            const valueRight = plafond > 0 ? `${balanceStr} / ${plafondStr} €` : `${balanceStr} €`;
            const allocLine = receives
              ? type === "fixed"
                ? `${allocationFix.toLocaleString("fr-FR")} €/mois`
                : `${allocationPct} % · ${contrib.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/mois`
              : "—";
            return (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{name}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    {allocLine}
                  </p>
                </div>
                <div className="shrink-0 text-right text-sm tabular-nums font-semibold text-foreground">
                  {valueRight}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
                      aria-label="Menu compte"
                    >
                      <MoreVertical className="size-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 border-0 bg-card shadow-sm">
                    <DropdownMenuItem
                      onClick={() => setAccountDialog({ mode: "edit", index })}
                      className="cursor-pointer"
                    >
                      Modifier le compte
                    </DropdownMenuItem>
                    {savingsAccounts.length > 1 && (
                      <>
                        <DropdownMenuSeparator className="bg-white/20" />
                        <DropdownMenuItem
                          onClick={() => setConfirmDeleteIndex(index)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          Supprimer
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        <button
          type="button"
          onClick={() => setAccountDialog({ mode: "create" })}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-transparent py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/20 hover:text-foreground"
        >
          <Plus className="size-5" />
          Ajouter un compte épargne
        </button>
        </div>
      </SummaryCardRow>

      {accountDialog !== null && (
        <AccountDialog
          open={accountDialog !== null}
          onOpenChange={(open) => !open && setAccountDialog(null)}
          mode={accountDialog.mode}
          editIndex={accountDialog.mode === "edit" ? accountDialog.index : null}
          initialAccount={
            accountDialog.mode === "create"
              ? DEFAULT_NEW_ACCOUNT
              : (savingsAccounts[accountDialog.index] ?? DEFAULT_NEW_ACCOUNT)
          }
          savingsAccounts={savingsAccounts}
          monthlyEpargne={monthlyEpargne}
          allocationOverflow={allocationOverflow}
          onCreate={addAccountFromDialog}
          onUpdate={updateAccountFromDialog}
        />
      )}

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

      <Dialog
        open={confirmDeleteObjectiveIndex != null}
        onOpenChange={(open) =>
          !open && setConfirmDeleteObjectiveIndex(null)
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cet objectif ?</DialogTitle>
            <DialogDescription>
              L&apos;objectif &quot;
              {confirmDeleteObjectiveIndex != null &&
                savingsObjectives[confirmDeleteObjectiveIndex]?.name}
              &quot; sera supprimé. Les comptes épargne ne sont pas supprimés.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteObjectiveIndex(null)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDeleteObjectiveIndex != null)
                  removeObjective(confirmDeleteObjectiveIndex);
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
