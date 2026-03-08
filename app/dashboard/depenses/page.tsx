"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ExpenseAmountType,
  ExpenseCategory,
  IncomeSource,
} from "@/lib/types";
import { getExpenseAmount, getIncomeAmount, getPercentageBaseAmount } from "@/lib/types";
import { clampPercent } from "@/lib/utils";
import { useProfileContext } from "@/components/ProfileProvider";
import { updateExpenseCategory } from "@/lib/useProfile";
import { Plus, CreditCard, MoreVertical } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { SummaryCardRow } from "@/components/SummaryCardRow";

const EMPTY_EXPENSE: ExpenseCategory = { name: "", type: "fixed", amount: 0 };

type PercentageRefOption = { value: string; label: string };

/** Dialog : créer ou modifier le nom d'une catégorie */
function CategoryDialog({
  open,
  onOpenChange,
  mode,
  initialName,
  existingNames,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialName: string;
  existingNames: string[];
  onSubmit: (name: string) => void;
}) {
  const [value, setValue] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setValue(initialName);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, initialName]);
  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (existingNames.includes(trimmed) && (mode === "create" || trimmed !== initialName)) return;
    onSubmit(trimmed);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nouvelle catégorie" : "Modifier le nom de la catégorie"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Nom de la catégorie de dépenses (ex. Dépenses pro)."
              : "Nouveau nom de la catégorie."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Ex. Dépenses pro"
            className="h-10"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={submit}>
              {mode === "create" ? "Ajouter" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Formulaire commun pour une ligne de dépense (dialog) */
function ExpenseCategoryForm({
  expense,
  onChange,
  showGroup,
  groupName,
  groupNames,
  percentageRefOptions,
  totalIncome,
  incomeSources,
  incomeGroupNames,
}: {
  expense: ExpenseCategory;
  onChange: (field: keyof ExpenseCategory, value: string | number | undefined) => void;
  showGroup?: boolean;
  groupName?: string;
  groupNames?: string[];
  percentageRefOptions: PercentageRefOption[];
  totalIncome?: number;
  incomeSources?: IncomeSource[];
  incomeGroupNames?: string[];
}) {
  const type = expense.type ?? "fixed";
  const percentageOfValue = type === "percentage" ? (expense.percentageOf ?? "total") : "total";
  const referenceAmount =
    type === "percentage" && incomeSources != null && incomeGroupNames != null
      ? getPercentageBaseAmount(expense.percentageOf, incomeSources, incomeGroupNames)
      : 0;
  const percentageNum = expense.percentage ?? 0;
  const resultingAmount =
    type === "percentage" ? (referenceAmount * percentageNum) / 100 : 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Libellé</label>
        <Input
          value={expense.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Ex. Loyer"
          className="h-10"
        />
      </div>
      {showGroup && groupNames && groupNames.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Catégorie</label>
          <Select
            value={expense.group ?? groupName ?? groupNames[0]}
            onValueChange={(v) => onChange("group", v)}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {groupNames.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium">Type</label>
        <Select
          value={type}
          onValueChange={(v: ExpenseAmountType) => {
            onChange("type", v);
            if (v === "fixed") onChange("amount", 0);
            else if (v === "range") {
              onChange("min", 0);
              onChange("max", 0);
            } else {
              onChange("percentage", 0);
              onChange("percentageOf", "total");
            }
          }}
        >
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixe</SelectItem>
            <SelectItem value="range">Fourchette</SelectItem>
            <SelectItem value="percentage">% revenus</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {type === "fixed" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Montant (€)</label>
          <NumberInput
            value={expense.amount ?? 0}
            onChange={(n) => onChange("amount", n)}
            placeholder="0"
            className="h-10"
          />
        </div>
      )}
      {type === "range" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Min (€)</label>
            <NumberInput
              value={expense.min ?? 0}
              onChange={(n) => onChange("min", n)}
              placeholder="0"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Max (€)</label>
            <NumberInput
              value={expense.max ?? 0}
              onChange={(n) => onChange("max", n)}
              placeholder="0"
              className="h-10"
            />
          </div>
        </div>
      )}
      {type === "percentage" && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">Référence</label>
            <Select
              value={percentageRefOptions.some((o) => o.value === percentageOfValue) ? percentageOfValue : "total"}
              onValueChange={(v) => onChange("percentageOf", v)}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Référence" />
              </SelectTrigger>
              <SelectContent>
                {percentageRefOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {incomeSources != null && incomeGroupNames != null && (
              <p className="text-xs text-muted-foreground">
                Somme de la référence :{" "}
                {referenceAmount.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                €
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <label className="font-medium text-muted-foreground">
                Pourcentage
              </label>
              <span className="font-semibold tabular-nums text-foreground">
                {percentageNum} %
              </span>
            </div>
            <Slider
              value={[percentageNum]}
              onValueChange={(v) =>
                onChange("percentage", v[0] === 0 ? undefined : clampPercent(v[0]))
              }
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              ={" "}
              {resultingAmount.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              € / mois
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/** Dialog : créer ou modifier une ligne de dépense */
function ExpenseLineDialog({
  open,
  onOpenChange,
  mode,
  groupName,
  groupNames,
  initialExpense,
  percentageRefOptions,
  totalIncome,
  incomeSources,
  incomeGroupNames,
  onSubmit,
  onUpdate,
  globalIndex,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  groupName: string;
  groupNames: string[];
  initialExpense: ExpenseCategory;
  percentageRefOptions: PercentageRefOption[];
  totalIncome: number;
  incomeSources: IncomeSource[];
  incomeGroupNames: string[];
  onSubmit?: (expense: ExpenseCategory) => void;
  onUpdate?: (index: number, field: keyof ExpenseCategory, value: string | number) => void;
  globalIndex?: number;
}) {
  const [expense, setExpense] = useState<ExpenseCategory>(initialExpense);
  useEffect(() => {
    if (open) setExpense(initialExpense);
  }, [open, initialExpense]);
  const handleChange = (field: keyof ExpenseCategory, value: string | number | undefined) => {
    setExpense((prev) => {
      const next = { ...prev };
      if (field === "name") next.name = String(value ?? "");
      else if (field === "group") next.group = value as string;
      else if (field === "type") {
        next.type = value as ExpenseAmountType;
        if (value === "fixed") next.amount = 0;
        else if (value === "range") { next.min = 0; next.max = 0; }
        else { next.percentage = 0; next.percentageOf = "total"; }
      } else if (field === "amount") next.amount = Number(value) || 0;
      else if (field === "min") next.min = Number(value) || 0;
      else if (field === "max") next.max = Number(value) || 0;
      else if (field === "percentage") next.percentage = value as number | undefined;
      else if (field === "percentageOf") next.percentageOf = value as string | undefined;
      return next;
    });
  };
  const submit = () => {
    if (mode === "create" && onSubmit) {
      onSubmit({ ...expense, group: groupName });
      onOpenChange(false);
    } else if (mode === "edit" && onUpdate && globalIndex !== undefined) {
      const e = expense;
      onUpdate(globalIndex, "name", e.name);
      if (e.group != null) onUpdate(globalIndex, "group", e.group);
      onUpdate(globalIndex, "type", e.type ?? "fixed");
      onUpdate(globalIndex, "amount", e.amount ?? 0);
      onUpdate(globalIndex, "min", e.min ?? 0);
      onUpdate(globalIndex, "max", e.max ?? 0);
      onUpdate(globalIndex, "percentage", e.percentage ?? 0);
      onUpdate(globalIndex, "percentageOf", e.percentageOf ?? "total");
      onOpenChange(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nouvelle ligne de dépense" : "Modifier la ligne"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Ajoutez une dépense dans cette catégorie."
              : "Modifiez les champs ci-dessous."}
          </DialogDescription>
        </DialogHeader>
        <ExpenseCategoryForm
          expense={expense}
          onChange={handleChange}
          showGroup={mode === "edit"}
          groupName={groupName}
          groupNames={groupNames}
          percentageRefOptions={percentageRefOptions}
          totalIncome={totalIncome}
          incomeSources={incomeSources}
          incomeGroupNames={incomeGroupNames}
        />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={submit}>
            {mode === "create" ? "Ajouter" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Page de configuration des dépenses : catégories en cartes dépliables (style Revenus),
 * menu "..." pour modifier/supprimer, dialogs pour créer/éditer.
 */
export default function DepensesPage() {
  const router = useRouter();
  const {
    loading,
    incomeSources,
    incomeGroupNames,
    expenseCategories,
    setExpenseCategories,
    expenseGroupNames,
    setExpenseGroupNames,
    saveProfile,
    skipNextAutoSave,
    autoSaveDelayMs,
  } = useProfileContext();

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [categoryDialog, setCategoryDialog] = useState<
    null | { mode: "create" } | { mode: "edit"; groupName: string }
  >(null);
  const [lineDialog, setLineDialog] = useState<
    null | { mode: "create"; groupName: string } | { mode: "edit"; globalIndex: number }
  >(null);
  const [confirmDelete, setConfirmDelete] = useState<
    | { type: "expense"; globalIndex: number; label: string }
    | { type: "category"; groupName: string }
    | null
  >(null);

  const dataRef = useRef({ expenseCategories, expenseGroupNames });
  dataRef.current.expenseCategories = expenseCategories;
  dataRef.current.expenseGroupNames = expenseGroupNames;

  const totalIncome = incomeSources.reduce((sum, s) => sum + getIncomeAmount(s), 0);
  const defaultGroup = expenseGroupNames[0] ?? "Dépenses perso";

  /** Options pour le Select "Référence" du % : total, catégorie de revenus, ou ligne de revenu */
  const percentageRefOptions = useMemo<PercentageRefOption[]>(() => {
    const opts: PercentageRefOption[] = [
      { value: "total", label: "Total des revenus" },
    ];
    for (const groupName of incomeGroupNames) {
      opts.push({ value: `category:${groupName}`, label: `Catégorie : ${groupName}` });
    }
    for (const src of incomeSources) {
      const group = src.group ?? incomeGroupNames[0] ?? "";
      opts.push({
        value: `source:${group}|${src.name}`,
        label: `Ligne : ${group || "—"} – ${src.name || "—"}`,
      });
    }
    return opts;
  }, [incomeGroupNames, incomeSources]);

  useEffect(() => {
    if (loading) return;
    if (totalIncome <= 0) router.replace("/dashboard");
  }, [loading, totalIncome, router]);

  useEffect(() => {
    if (loading) return;
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }
    const timeoutId = setTimeout(() => {
      saveProfile({
        expense_categories: dataRef.current.expenseCategories,
        expense_group_names: dataRef.current.expenseGroupNames,
      });
    }, autoSaveDelayMs);
    return () => clearTimeout(timeoutId);
  }, [
    loading,
    expenseCategories,
    expenseGroupNames,
    saveProfile,
    skipNextAutoSave,
    autoSaveDelayMs,
  ]);

  const removeExpense = (globalIndex: number) => {
    setExpenseCategories((prev) => prev.filter((_, i) => i !== globalIndex));
    setConfirmDelete(null);
  };

  const handleUpdate = (globalIndex: number, field: keyof ExpenseCategory, value: string | number) => {
    updateExpenseCategory(setExpenseCategories, globalIndex, field, value);
  };

  const addExpenseGroup = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || expenseGroupNames.includes(trimmed)) return;
    setExpenseGroupNames((prev) => [...prev, trimmed]);
  };

  const removeExpenseGroup = (name: string) => {
    if (expenseGroupNames.length <= 1) return;
    setExpenseGroupNames((prev) => prev.filter((g) => g !== name));
    setExpenseCategories((prev) =>
      prev.filter((c) => (c.group ?? defaultGroup) !== name)
    );
  };

  const confirmRemoveExpenseGroup = (groupName: string) => {
    removeExpenseGroup(groupName);
    setConfirmDelete(null);
  };

  const renameExpenseGroup = (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) return;
    if (expenseGroupNames.includes(newName.trim())) return;
    const trimmed = newName.trim();
    const newGroupNames = expenseGroupNames.map((g) => (g === oldName ? trimmed : g));
    const newCategories = expenseCategories.map((c) =>
      c.group === oldName ? { ...c, group: trimmed } : c
    );
    setExpenseGroupNames(() => newGroupNames);
    setExpenseCategories(() => newCategories);
    saveProfile({ expense_categories: newCategories, expense_group_names: newGroupNames });
  };

  const totalExpenses = expenseCategories.reduce(
    (sum, c) => sum + getExpenseAmount(c, totalIncome, incomeSources, incomeGroupNames),
    0,
  );

  const getItemsForGroup = (groupName: string) =>
    expenseCategories
      .map((c, i) => ({ expense: c, globalIndex: i }))
      .filter(({ expense }) => (expense.group ?? defaultGroup) === groupName);

  const addLineToGroup = (groupName: string, expense: ExpenseCategory) => {
    setExpenseCategories((prev) => [...prev, { ...expense, group: groupName }]);
  };

  if (loading) {
    return (
      <div className="min-h-full w-full p-4 sm:p-6">
        <Skeleton className="h-8 w-48 rounded bg-muted" />
        <Skeleton className="mt-2 h-4 w-72 rounded bg-muted" />
        <div className="mt-6 space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-xl bg-muted" />
          ))}
          <Skeleton className="h-12 w-40 rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full p-4 sm:p-6">
      <div className="space-y-3">
        {expenseGroupNames.map((groupName) => {
          const items = getItemsForGroup(groupName);
          const groupTotal = items.reduce(
            (sum, { expense }) =>
              sum + getExpenseAmount(expense, totalIncome, incomeSources, incomeGroupNames),
            0
          );
          const expanded = expandedCategories[groupName] ?? true;
          const pct =
            totalExpenses > 0
              ? ((groupTotal / totalExpenses) * 100).toFixed(0) + " %"
              : undefined;
          return (
            <SummaryCardRow
              key={groupName}
              icon={<CreditCard className="size-5" />}
              title={groupName}
              subtitle={`${items.length} ligne(s)`}
              value={`${groupTotal.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} €`}
              percentage={pct}
              expandable
              expanded={expanded}
              onToggleExpand={() =>
                setExpandedCategories((prev) => ({
                  ...prev,
                  [groupName]: !prev[groupName],
                }))
              }
              expandAriaLabel={`Afficher le détail de la catégorie ${groupName}`}
              trailingAction={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Menu catégorie"
                    >
                      <MoreVertical className="size-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 border-0 bg-card shadow-sm">
                    <DropdownMenuItem
                      onClick={() => setCategoryDialog({ mode: "edit", groupName })}
                      className="cursor-pointer"
                    >
                      Modifier le nom de la catégorie
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/20" />
                    <DropdownMenuItem
                      onClick={() =>
                        setConfirmDelete({ type: "category", groupName })
                      }
                      disabled={expenseGroupNames.length <= 1}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            >
              <div className="space-y-2">
                {items.map(({ expense, globalIndex }) => (
                  <div
                    key={globalIndex}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">
                        {expense.name || "Sans nom"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="tabular-nums text-muted-foreground">
                          {getExpenseAmount(
                            expense,
                            totalIncome,
                            incomeSources,
                            incomeGroupNames
                          ).toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          €
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
                          {expense.type === "percentage"
                            ? "% revenus"
                            : expense.type === "range"
                              ? "Fourchette"
                              : "Fixe"}
                        </span>
                      </div>
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
                        <DropdownMenuItem
                          onClick={() =>
                            setLineDialog({ mode: "edit", globalIndex })
                          }
                          className="cursor-pointer"
                        >
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/20" />
                        <DropdownMenuItem
                          onClick={() =>
                            setConfirmDelete({
                              type: "expense",
                              globalIndex,
                              label: expense.name || "cette dépense",
                            })
                          }
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setLineDialog({ mode: "create", groupName })}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/30 hover:text-foreground"
                >
                  <Plus className="size-4" />
                  Ajouter une ligne
                </button>
              </div>
            </SummaryCardRow>
          );
        })}

        <button
          type="button"
          onClick={() => setCategoryDialog({ mode: "create" })}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-transparent py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/20 hover:text-foreground"
        >
          <Plus className="size-5" />
          Créer une catégorie
        </button>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Total dépenses :{" "}
        <span className="font-medium text-foreground">
          {totalExpenses.toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          €
        </span>
        {totalIncome > 0 && (
          <span className="ml-1">
            (revenus totaux : {totalIncome.toLocaleString("fr-FR")} €)
          </span>
        )}
      </p>

      <CategoryDialog
        open={categoryDialog !== null}
        onOpenChange={(open) => !open && setCategoryDialog(null)}
        mode={categoryDialog?.mode ?? "create"}
        initialName={
          categoryDialog?.mode === "edit" ? categoryDialog.groupName : ""
        }
        existingNames={expenseGroupNames}
        onSubmit={(name) => {
          if (categoryDialog?.mode === "create") {
            addExpenseGroup(name);
          } else if (categoryDialog?.mode === "edit") {
            const oldName = categoryDialog.groupName;
            const wasExpanded = expandedCategories[oldName] ?? true;
            renameExpenseGroup(oldName, name);
            setExpandedCategories((prev) => {
              const next = { ...prev };
              delete next[oldName];
              next[name] = wasExpanded;
              return next;
            });
          }
          setCategoryDialog(null);
        }}
      />

      {(lineDialog?.mode === "create" || lineDialog?.mode === "edit") && (
        <ExpenseLineDialog
          open={true}
          onOpenChange={(open) => !open && setLineDialog(null)}
          mode={lineDialog.mode}
          groupName={
            lineDialog.mode === "create"
              ? lineDialog.groupName
              : (expenseCategories[lineDialog.globalIndex]?.group ?? defaultGroup)
          }
          groupNames={expenseGroupNames}
          initialExpense={
            lineDialog.mode === "create"
              ? { ...EMPTY_EXPENSE, group: lineDialog.groupName }
              : (expenseCategories[lineDialog.globalIndex] ?? EMPTY_EXPENSE)
          }
          percentageRefOptions={percentageRefOptions}
          totalIncome={totalIncome}
          incomeSources={incomeSources}
          incomeGroupNames={incomeGroupNames}
          onSubmit={
            lineDialog.mode === "create"
              ? (expense) => addLineToGroup(lineDialog.groupName, expense)
              : undefined
          }
          onUpdate={lineDialog.mode === "edit" ? handleUpdate : undefined}
          globalIndex={lineDialog.mode === "edit" ? lineDialog.globalIndex : undefined}
        />
      )}

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmDelete?.type === "expense"
                ? "Supprimer cette ligne de dépense ?"
                : "Supprimer cette catégorie ?"}
            </DialogTitle>
            <DialogDescription>
              {confirmDelete?.type === "expense" ? (
                <>
                  Êtes-vous sûr de vouloir supprimer la dépense
                  {confirmDelete.label ? ` « ${confirmDelete.label} »` : ""} ?
                  La ligne et toute sa configuration (type, montant, etc.)
                  seront définitivement supprimées.
                </>
              ) : confirmDelete?.type === "category" ? (
                <>
                  Êtes-vous sûr de vouloir supprimer la catégorie «{" "}
                  {confirmDelete.groupName} » ? Toutes les dépenses de cette
                  catégorie et leur configuration seront supprimées.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (confirmDelete?.type === "expense")
                  removeExpense(confirmDelete.globalIndex);
                else if (confirmDelete?.type === "category")
                  confirmRemoveExpenseGroup(confirmDelete.groupName);
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
